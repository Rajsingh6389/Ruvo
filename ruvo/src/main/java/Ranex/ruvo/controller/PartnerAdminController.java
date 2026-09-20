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
    private final RazorpayLinkedAccountRepository linkedAccountRepository;

    public PartnerAdminController(PartnerProfileRepository p, PartnerVehicleRepository v,
                                  PartnerVerificationRepository vr, UserRepository u, PartnerAccountRepository pa,
                                  DeliveryPartnerRepository deliveryPartnerRepository,
                                  RazorpayService razorpayService,
                                  SellerBankAccountRepository sellerBankAccountRepository,
                                  RazorpayLinkedAccountRepository linkedAccountRepository) {
        this.profiles = p;
        this.vehicles = v;
        this.verifications = vr;
        this.users = u;
        this.partnerAccounts = pa;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.razorpayService = razorpayService;
        this.sellerBankAccountRepository = sellerBankAccountRepository;
        this.linkedAccountRepository = linkedAccountRepository;
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingPartners() {
        List<PartnerProfile> underReviewProfiles = profiles.findByVerificationStatus(VerificationStatus.UNDER_REVIEW);
        List<Map<String, Object>> responseList = new ArrayList<>();

        for (PartnerProfile p : underReviewProfiles) {
            User user = p.getUser();
            Optional<PartnerVehicle> vehicle = vehicles.findByPartnerProfile(p);
            Optional<PartnerVerification> verification = verifications.findByPartnerProfile(p);

            Map<String, Object> item = new HashMap<>();
            item.put("partnerId", p.getId());
            item.put("userId", user.getId());
            item.put("name", user.getName());
            item.put("mobileNumber", partnerAccounts.findBySecurityUser(user)
                    .map(PartnerAccount::getMobileNumber).orElse(user.getMobileNumber()));
            item.put("status", p.getVerificationStatus().name());

            // Link matching DeliveryPartner entity if present to extract documents & bank details
            Optional<DeliveryPartner> dpOpt = Optional.empty();
            if (user != null && user.getId() != null) {
                dpOpt = deliveryPartnerRepository.findByUserIdFlexible(String.valueOf(user.getId()));
            }
            if (dpOpt.isEmpty() && user.getMobileNumber() != null) {
                dpOpt = deliveryPartnerRepository.findByPhoneFlexible(user.getMobileNumber());
            }
            if (dpOpt.isPresent()) {
                DeliveryPartner dp = dpOpt.get();
                
                Optional<SellerBankAccount> activeBank = sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(dp.getId());
                if (activeBank.isEmpty()) {
                    continue;
                }
                
                item.put("aadhaarNumber", dp.getAadhaarNumber());
                item.put("aadhaarName", dp.getAadhaarName());
                item.put("aadhaarFrontUrl", dp.getAadhaarFrontUrl());
                item.put("aadhaarBackUrl", dp.getAadhaarBackUrl());
                
                String accNum = dp.getBankAccountNumber();
                String ifsc = dp.getIfscCode();
                if (accNum == null || accNum.isBlank()) {
                    List<SellerBankAccount> banks = sellerBankAccountRepository.findByPartnerIdOrderByCreatedAtDesc(dp.getId());
                    if (banks != null && !banks.isEmpty()) {
                        SellerBankAccount bank = banks.get(0);
                        if (bank.getAccountNumberEncrypted() != null) {
                            accNum = new String(java.util.Base64.getDecoder().decode(bank.getAccountNumberEncrypted()), java.nio.charset.StandardCharsets.UTF_8);
                            ifsc = bank.getIfscCode();
                        }
                    }
                }
                
                item.put("bankAccountNumber", accNum);
                item.put("ifscCode", ifsc);
                item.put("upiId", dp.getUpiId());
                item.put("razorpayAccountId", dp.getRazorpayAccountId());
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

            responseList.add(item);
        }

        return ResponseEntity.ok(ApiResponse.ok("Pending partner reviews retrieved", responseList));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approvePartner(@PathVariable Long id) {
        Optional<PartnerProfile> optProf = profiles.findById(id);
        if (optProf.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner profile not found", null));
        }

        PartnerProfile profile = optProf.get();
        profile.setVerificationStatus(VerificationStatus.APPROVED);
        profile.setAdminReason(null);
        profiles.save(profile);

        User user = profile.getUser();
        user.setStatus(AccountStatus.APPROVED);
        users.save(user);

        vehicles.findByPartnerProfile(profile).ifPresent(v -> {
            v.setStatus(VerificationStatus.APPROVED);
            vehicles.save(v);
        });

        verifications.findByPartnerProfile(profile).ifPresent(k -> {
            k.setStatus(VerificationStatus.APPROVED);
            verifications.save(k);
        });

        // Trigger Razorpay Linked Account creation and DB persistence for matching DeliveryPartner
        if (deliveryPartnerRepository != null && razorpayService != null && user != null) {
            Optional<DeliveryPartner> dpOpt = deliveryPartnerRepository.findByUserIdFlexible(String.valueOf(user.getId()));
            if (dpOpt.isEmpty() && user.getMobileNumber() != null) {
                dpOpt = deliveryPartnerRepository.findByPhoneFlexible(user.getMobileNumber());
            }
            if (dpOpt.isPresent()) {
                DeliveryPartner dp = dpOpt.get();
                dp.setApproved(true);
                
                List<SellerBankAccount> banks = sellerBankAccountRepository.findByPartnerIdOrderByCreatedAtDesc(dp.getId());
                if (banks != null && !banks.isEmpty()) {
                    SellerBankAccount bank = banks.get(0);
                    if (bank.getAccountNumberEncrypted() != null) {
                        String decAcc = new String(java.util.Base64.getDecoder().decode(bank.getAccountNumberEncrypted()), java.nio.charset.StandardCharsets.UTF_8);
                        dp.setBankAccountNumber(decAcc);
                        dp.setIfscCode(bank.getIfscCode());
                    }
                }
                
                String ifsc = dp.getIfscCode();
                String acc = dp.getBankAccountNumber();
                if (ifsc != null && acc != null && !ifsc.isBlank() && !acc.isBlank()) {
                    Optional<RazorpayLinkedAccount> linkedAccountOpt = linkedAccountRepository.findByPartnerId(dp.getId());
                    if (linkedAccountOpt.isPresent()) {
                        dp.setRazorpayAccountId(linkedAccountOpt.get().getRazorpayAccountId());
                    }
                }
                deliveryPartnerRepository.save(dp);
            }
        }

        return ResponseEntity.ok(ApiResponse.ok("Partner profile successfully approved", null));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectPartner(@PathVariable Long id, @RequestBody Map<String, String> request) {
        Optional<PartnerProfile> optProf = profiles.findById(id);
        if (optProf.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner profile not found", null));
        }

        String reason = request.get("reason");
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Rejection reason is required", null));
        }

        PartnerProfile profile = optProf.get();
        profile.setVerificationStatus(VerificationStatus.REJECTED);
        profile.setAdminReason(reason);
        profiles.save(profile);

        User user = profile.getUser();
        user.setStatus(AccountStatus.REJECTED);
        users.save(user);

        vehicles.findByPartnerProfile(profile).ifPresent(v -> {
            v.setStatus(VerificationStatus.REJECTED);
            vehicles.save(v);
        });

        verifications.findByPartnerProfile(profile).ifPresent(k -> {
            k.setStatus(VerificationStatus.REJECTED);
            verifications.save(k);
        });

        return ResponseEntity.ok(ApiResponse.ok("Partner profile rejected with specified reason", null));
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
