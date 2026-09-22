package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import Ranex.ruvo.service.RazorpayService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/partners")
@PreAuthorize("hasRole('ADMIN')")
public class PartnerAdminController {

    private final PartnerProfileRepository profiles;
    private final PartnerVehicleRepository vehicles;
    private final PartnerVerificationRepository verifications;
    private final UserRepository users;
    private final PartnerAccountRepository partnerAccounts;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final RazorpayService razorpayService;
    private final SellerBankAccountRepository sellerBankAccountRepository;

    public PartnerAdminController(PartnerProfileRepository p, PartnerVehicleRepository v,
                                  PartnerVerificationRepository vr, UserRepository u, PartnerAccountRepository pa,
                                  DeliveryPartnerRepository deliveryPartnerRepository,
                                  RazorpayService razorpayService,
                                  SellerBankAccountRepository sellerBankAccountRepository) {
        this.profiles = p;
        this.vehicles = v;
        this.verifications = vr;
        this.users = u;
        this.partnerAccounts = pa;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.razorpayService = razorpayService;
        this.sellerBankAccountRepository = sellerBankAccountRepository;
    }

    @GetMapping("/pending")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingPartners() {
        List<Map<String, Object>> responseList = new ArrayList<>();
        Set<String> processedKeys = new HashSet<>();

        List<PartnerProfile> underReviewProfiles = profiles.findByVerificationStatus(VerificationStatus.UNDER_REVIEW);
        for (PartnerProfile p : underReviewProfiles) {
            User user = p.getUser();

            // Strict Gate: Delivery Partner MUST have a verified bank account to enter Admin Queue
            Optional<SellerBankAccount> bankOpt = sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(p.getId());
            if (bankOpt.isEmpty() && user != null && user.getId() != null) {
                bankOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(String.valueOf(user.getId()), "READY_FOR_ADMIN");
            }
            if (bankOpt.isEmpty() && user != null && user.getMobileNumber() != null) {
                bankOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(user.getMobileNumber(), "READY_FOR_ADMIN");
            }

            // GATED: Skip unverified / failed bank accounts completely!
            if (bankOpt.isEmpty()) {
                continue;
            }

            SellerBankAccount bank = bankOpt.get();
            Optional<PartnerVehicle> vehicle = vehicles.findByPartnerProfile(p);
            Optional<PartnerVerification> verification = verifications.findByPartnerProfile(p);

            Map<String, Object> item = new HashMap<>();
            item.put("id", p.getId());
            item.put("partnerId", p.getId());
            item.put("userId", user != null ? user.getId() : null);
            item.put("name", user != null ? user.getName() : "Rider #" + p.getId());
            item.put("mobileNumber", user != null ? partnerAccounts.findBySecurityUser(user)
                    .map(PartnerAccount::getMobileNumber).orElse(user.getMobileNumber()) : "N/A");
            item.put("phone", user != null ? user.getMobileNumber() : "N/A");
            item.put("status", p.getVerificationStatus().name());
            item.put("verificationStatus", p.getVerificationStatus().name());
            item.put("approved", false);
            item.put("isApproved", false);

            // Bank verification metrics
            item.put("bankVerificationStatus", bank.getVerificationStatus());
            item.put("bankAccountNumberMasked", bank.getAccountNumberMasked());
            item.put("bankAccountNumber", bank.getAccountNumberMasked());
            item.put("ifscCode", bank.getIfscCode());
            item.put("bankName", bank.getBankName());
            item.put("bankHolderName", bank.getBankHolderName());
            item.put("submittedHolderName", bank.getSubmittedHolderName());
            item.put("nameMatchScore", bank.getNameMatchScore());
            item.put("riskStatus", bank.getRiskStatus());

            // Link matching DeliveryPartner entity if present to extract documents
            Optional<DeliveryPartner> dpOpt = Optional.empty();
            if (user != null && user.getId() != null) {
                dpOpt = deliveryPartnerRepository.findByUserIdFlexible(String.valueOf(user.getId()));
            }
            if (dpOpt.isEmpty() && user != null && user.getMobileNumber() != null) {
                dpOpt = deliveryPartnerRepository.findByPhoneFlexible(user.getMobileNumber());
            }
            if (dpOpt.isPresent()) {
                DeliveryPartner dp = dpOpt.get();
                item.put("aadhaarNumber", dp.getAadhaarNumber());
                item.put("aadhaarName", dp.getAadhaarName());
                item.put("aadhaarFrontUrl", dp.getAadhaarFrontUrl());
                item.put("aadhaarBackUrl", dp.getAadhaarBackUrl());
                item.put("aadhaarVerified", dp.getAadhaarVerified());
                item.put("upiId", dp.getUpiId());
                item.put("razorpayAccountId", dp.getRazorpayAccountId());
                if (dp.getId() != null) processedKeys.add("DP_" + dp.getId());
            }

            if (vehicle.isPresent()) {
                Map<String, Object> vMap = new HashMap<>();
                vMap.put("vehicleType", vehicle.get().getVehicleType());
                vMap.put("vehicleNumber", vehicle.get().getVehicleNumber());
                vMap.put("vehicleModel", vehicle.get().getVehicleModel());
                vMap.put("vehicleCapacity", vehicle.get().getVehicleCapacity());
                vMap.put("fuelType", vehicle.get().getFuelType());
                item.put("vehicle", vMap);
            }

            if (verification.isPresent()) {
                Map<String, Object> kMap = new HashMap<>();
                kMap.put("fullName", verification.get().getFullName());
                kMap.put("dateOfBirth", verification.get().getDateOfBirth());
                kMap.put("address", verification.get().getAddress());
                kMap.put("city", verification.get().getCity());
                kMap.put("state", verification.get().getState());
                kMap.put("pincode", verification.get().getPincode());
                kMap.put("identityDocumentType", verification.get().getIdentityDocumentType());
                kMap.put("identityDocumentNumber", verification.get().getIdentityDocumentNumber());
                item.put("kyc", kMap);
            }

            if (p.getId() != null) processedKeys.add("PROF_" + p.getId());
            if (user != null && user.getMobileNumber() != null) processedKeys.add("MOB_" + user.getMobileNumber());
            responseList.add(item);
        }

        // Include pending DeliveryPartner records
        List<DeliveryPartner> dpPending = deliveryPartnerRepository.findPendingApproval();
        for (DeliveryPartner dp : dpPending) {
            if (dp.getId() != null && processedKeys.contains("DP_" + dp.getId())) continue;
            if (dp.getPhone() != null && processedKeys.contains("MOB_" + dp.getPhone())) continue;

            Map<String, Object> item = new HashMap<>();
            item.put("id", dp.getId());
            item.put("partnerId", dp.getId());
            item.put("userId", dp.getUserId());
            item.put("name", dp.getName() != null ? dp.getName() : "Rider #" + dp.getId());
            item.put("mobileNumber", dp.getPhone() != null ? dp.getPhone() : dp.getUserId());
            item.put("phone", dp.getPhone() != null ? dp.getPhone() : dp.getUserId());
            item.put("status", "UNDER_REVIEW");
            item.put("verificationStatus", "UNDER_REVIEW");
            item.put("approved", false);
            item.put("isApproved", false);

            item.put("bankVerificationStatus", dp.getBankVerificationStatus() != null ? dp.getBankVerificationStatus() : "ADMIN_PENDING");
            item.put("bankAccountNumber", dp.getBankAccountNumber());
            String accNum = dp.getBankAccountNumber();
            if (accNum != null && !accNum.isBlank()) {
                item.put("bankAccountNumberMasked", accNum.length() > 4 ? "•••• " + accNum.substring(accNum.length() - 4) : accNum);
            }
            item.put("ifscCode", dp.getIfscCode());
            item.put("bankName", dp.getBankName());
            item.put("bankHolderName", dp.getBankAccountHolder());
            item.put("aadhaarNumber", dp.getAadhaarNumber());
            item.put("aadhaarName", dp.getAadhaarName());
            item.put("aadhaarFrontUrl", dp.getAadhaarFrontUrl());
            item.put("aadhaarBackUrl", dp.getAadhaarBackUrl());
            item.put("aadhaarVerified", dp.getAadhaarVerified());
            item.put("upiId", dp.getUpiId());
            item.put("razorpayAccountId", dp.getRazorpayAccountId());

            Optional<SellerBankAccount> sbaOpt = sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(dp.getId());
            if (sbaOpt.isEmpty() && dp.getUserId() != null) {
                sbaOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(dp.getUserId(), "READY_FOR_ADMIN");
            }
            if (sbaOpt.isEmpty() && dp.getPhone() != null) {
                sbaOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(dp.getPhone(), "READY_FOR_ADMIN");
            }
            if (sbaOpt.isPresent()) {
                SellerBankAccount sba = sbaOpt.get();
                item.put("bankVerificationStatus", sba.getVerificationStatus());
                item.put("bankAccountNumberMasked", sba.getAccountNumberMasked());
                item.put("nameMatchScore", sba.getNameMatchScore());
                item.put("riskStatus", sba.getRiskStatus());
                if (sba.getBankHolderName() != null) item.put("bankHolderName", sba.getBankHolderName());
            }

            responseList.add(item);
        }

        return ResponseEntity.ok(ApiResponse.ok("Pending partner reviews retrieved", responseList));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approvePartner(@PathVariable Long id) {
        Optional<PartnerProfile> optProf = profiles.findById(id);
        Optional<DeliveryPartner> optDp = deliveryPartnerRepository.findById(id);

        if (optProf.isEmpty() && optDp.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner not found", null));
        }

        if (optProf.isPresent()) {
            PartnerProfile profile = optProf.get();
            User user = profile.getUser();

            // Strict Gate: Ensure bank is verified before approving
            boolean bankVerified = sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(profile.getId()).isPresent() ||
                    (user != null && user.getId() != null && sellerBankAccountRepository.findByUserIdAndVerificationStatus(String.valueOf(user.getId()), "READY_FOR_ADMIN").isPresent()) ||
                    (user != null && user.getMobileNumber() != null && sellerBankAccountRepository.findByUserIdAndVerificationStatus(user.getMobileNumber(), "READY_FOR_ADMIN").isPresent());

            if (!bankVerified && optDp.isPresent()) {
                String bStatus = optDp.get().getBankVerificationStatus();
                bankVerified = "READY_FOR_ADMIN".equalsIgnoreCase(bStatus) || "ADMIN_PENDING".equalsIgnoreCase(bStatus) || "VERIFIED".equalsIgnoreCase(bStatus);
            }

            if (!bankVerified) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(ApiResponse.ok("Cannot approve partner: Bank account is not verified through the Razorpay Gate.", null));
            }

            profile.setVerificationStatus(VerificationStatus.APPROVED);
            profile.setAdminReason(null);
            profiles.save(profile);

            if (user != null) {
                user.setStatus(AccountStatus.APPROVED);
                users.save(user);
            }

            vehicles.findByPartnerProfile(profile).ifPresent(v -> {
                v.setStatus(VerificationStatus.APPROVED);
                vehicles.save(v);
            });

            verifications.findByPartnerProfile(profile).ifPresent(k -> {
                k.setStatus(VerificationStatus.APPROVED);
                verifications.save(k);
            });

            // Trigger Razorpay Linked Account creation and DB persistence for matching DeliveryPartner
            if (deliveryPartnerRepository != null && razorpayService != null) {
                Optional<DeliveryPartner> dpOpt = optDp;
                if (dpOpt.isEmpty() && user != null && user.getId() != null) {
                    dpOpt = deliveryPartnerRepository.findByUserIdFlexible(String.valueOf(user.getId()));
                }
                if (dpOpt.isEmpty() && user != null && user.getMobileNumber() != null) {
                    dpOpt = deliveryPartnerRepository.findByPhoneFlexible(user.getMobileNumber());
                }
                if (dpOpt.isPresent()) {
                    DeliveryPartner dp = dpOpt.get();
                    dp.setApproved(true);
                    dp.setAadhaarVerified(true);
                    String ifsc = dp.getIfscCode();
                    String acc = dp.getBankAccountNumber();
                    if (ifsc != null && acc != null && !ifsc.isBlank() && !acc.isBlank()) {
                        String accountId = dp.getRazorpayAccountId();
                        if (accountId == null || accountId.isBlank() || accountId.startsWith("acc_dummy") || accountId.equals("acc_pending_approval")) {
                            String name = user != null && user.getName() != null ? user.getName() : dp.getName();
                            String email = (user != null && user.getId() != null ? user.getId() : dp.getId()) + "@partner.ruvo.in";
                            String phone = user != null && user.getMobileNumber() != null ? user.getMobileNumber() : dp.getPhone();
                            accountId = razorpayService.createLinkedAccount(name, email, phone, ifsc, acc);
                            dp.setRazorpayAccountId(accountId);
                        }
                    }
                    deliveryPartnerRepository.save(dp);
                }
            }
        } else {
            // Found by DeliveryPartner ID
            DeliveryPartner dp = optDp.get();
            String bankStatus = dp.getBankVerificationStatus();
            boolean bankVerified = "READY_FOR_ADMIN".equalsIgnoreCase(bankStatus) || "ADMIN_PENDING".equalsIgnoreCase(bankStatus) || "VERIFIED".equalsIgnoreCase(bankStatus) ||
                    sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(dp.getId()).isPresent() ||
                    (dp.getUserId() != null && sellerBankAccountRepository.findByUserIdAndVerificationStatus(dp.getUserId(), "READY_FOR_ADMIN").isPresent()) ||
                    (dp.getPhone() != null && sellerBankAccountRepository.findByUserIdAndVerificationStatus(dp.getPhone(), "READY_FOR_ADMIN").isPresent());

            if (!bankVerified) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(ApiResponse.ok("Cannot approve partner: Bank account is not verified through the Razorpay Gate.", null));
            }

            dp.setApproved(true);
            dp.setAadhaarVerified(true);

            String ifsc = dp.getIfscCode();
            String acc = dp.getBankAccountNumber();
            if (ifsc != null && acc != null && !ifsc.isBlank() && !acc.isBlank() && razorpayService != null) {
                String accountId = dp.getRazorpayAccountId();
                if (accountId == null || accountId.isBlank() || accountId.startsWith("acc_dummy") || accountId.equals("acc_pending_approval")) {
                    String name = dp.getName();
                    String email = dp.getId() + "@partner.ruvo.in";
                    String phone = dp.getPhone() != null ? dp.getPhone() : "9999999999";
                    accountId = razorpayService.createLinkedAccount(name, email, phone, ifsc, acc);
                    dp.setRazorpayAccountId(accountId);
                }
            }
            deliveryPartnerRepository.save(dp);

            // Also approve matching User & PartnerProfile if present
            if (dp.getUserId() != null) {
                users.findByMobileNumberFlexible(dp.getUserId()).ifPresent(u -> {
                    u.setStatus(AccountStatus.APPROVED);
                    users.save(u);
                    profiles.findByUser(u).ifPresent(p -> {
                        p.setVerificationStatus(VerificationStatus.APPROVED);
                        profiles.save(p);
                    });
                });
            }
        }

        return ResponseEntity.ok(ApiResponse.ok("Partner successfully approved", null));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectPartner(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String reason = request.get("reason");
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Rejection reason is required", null));
        }

        Optional<PartnerProfile> optProf = profiles.findById(id);
        Optional<DeliveryPartner> optDp = deliveryPartnerRepository.findById(id);

        if (optProf.isEmpty() && optDp.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner not found", null));
        }

        if (optProf.isPresent()) {
            PartnerProfile profile = optProf.get();
            profile.setVerificationStatus(VerificationStatus.REJECTED);
            profile.setAdminReason(reason);
            profiles.save(profile);

            User user = profile.getUser();
            if (user != null) {
                user.setStatus(AccountStatus.REJECTED);
                users.save(user);
            }

            vehicles.findByPartnerProfile(profile).ifPresent(v -> {
                v.setStatus(VerificationStatus.REJECTED);
                vehicles.save(v);
            });

            verifications.findByPartnerProfile(profile).ifPresent(k -> {
                k.setStatus(VerificationStatus.REJECTED);
                verifications.save(k);
            });
        }

        if (optDp.isPresent()) {
            DeliveryPartner dp = optDp.get();
            dp.setApproved(false);
            deliveryPartnerRepository.save(dp);

            if (dp.getUserId() != null) {
                users.findByMobileNumberFlexible(dp.getUserId()).ifPresent(u -> {
                    u.setStatus(AccountStatus.REJECTED);
                    users.save(u);
                });
            }
        }

        return ResponseEntity.ok(ApiResponse.ok("Partner rejected with specified reason", null));
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendPartner(@PathVariable Long id) {
        Optional<PartnerProfile> optProf = profiles.findById(id);
        if (optProf.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner profile not found", null));
        }

        PartnerProfile profile = optProf.get();
        profile.setVerificationStatus(VerificationStatus.SUSPENDED);
        profiles.save(profile);

        User user = profile.getUser();
        user.setStatus(AccountStatus.BLOCKED);
        users.save(user);

        return ResponseEntity.ok(ApiResponse.ok("Partner profile suspended successfully", null));
    }
}
