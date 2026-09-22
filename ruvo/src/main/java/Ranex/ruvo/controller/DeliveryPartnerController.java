package Ranex.ruvo.controller;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping({"/api/delivery-partners", "/api/partners"})
@CrossOrigin(origins = "*")
public class DeliveryPartnerController {

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final Ranex.ruvo.repository.UserRepository userRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private Ranex.ruvo.service.CloudinaryService cloudinaryService;
    @org.springframework.beans.factory.annotation.Autowired
    private Ranex.ruvo.service.RazorpayService razorpayService;

    public DeliveryPartnerController(DeliveryPartnerRepository deliveryPartnerRepository, Ranex.ruvo.repository.UserRepository userRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.userRepository = userRepository;
    }

    private String getCurrentUserMobile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        return principal.toString();
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyPartnerProfile() {
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");

        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserIdFlexible(mobile)
                .or(() -> deliveryPartnerRepository.findByPhoneFlexible(mobile));

        Optional<Ranex.ruvo.model.User> uOpt = Optional.empty();
        if (userRepository != null) {
            uOpt = userRepository.findByMobileNumberFlexible(mobile);
        }

        // Self-heal status synchronization
        boolean isApproved = false;
        if (partnerOpt.isPresent() && Boolean.TRUE.equals(partnerOpt.get().getApproved())) {
            isApproved = true;
        } else if (uOpt.isPresent() && uOpt.get().getStatus() == Ranex.ruvo.model.AccountStatus.APPROVED) {
            isApproved = true;
            if (partnerOpt.isPresent()) {
                partnerOpt.get().setApproved(true);
                deliveryPartnerRepository.save(partnerOpt.get());
            }
        }

        String status = isApproved ? "APPROVED" : (partnerOpt.isPresent() && !"UNVERIFIED".equalsIgnoreCase(partnerOpt.get().getBankVerificationStatus()) ? "UNDER_REVIEW" : "NEW");

        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        if (partnerOpt.isPresent()) {
            DeliveryPartner dp = partnerOpt.get();
            resp.put("id", dp.getId());
            resp.put("partnerId", dp.getId());
            resp.put("userId", dp.getUserId());
            resp.put("name", dp.getName());
            resp.put("phone", dp.getPhone());
            resp.put("mobileNumber", dp.getPhone());
            resp.put("approved", isApproved);
            resp.put("isApproved", isApproved);
            resp.put("status", status);
            resp.put("verificationStatus", status);
            resp.put("profileStatus", status);
            resp.put("bankVerificationStatus", dp.getBankVerificationStatus());
            resp.put("bankAccountNumber", dp.getBankAccountNumber());
            resp.put("ifscCode", dp.getIfscCode());
            resp.put("bankName", dp.getBankName());
            resp.put("bankAccountHolder", dp.getBankAccountHolder());
            resp.put("aadhaarVerified", dp.getAadhaarVerified());
            resp.put("available", dp.getAvailable());
            resp.put("isAvailable", dp.getAvailable());
            resp.put("active", dp.getActive());
            resp.put("razorpayAccountId", dp.getRazorpayAccountId());
            resp.put("preferredShopIds", dp.getPreferredShopIds());
        } else if (uOpt.isPresent()) {
            Ranex.ruvo.model.User u = uOpt.get();
            resp.put("id", u.getId());
            resp.put("partnerId", u.getId());
            resp.put("userId", u.getId());
            resp.put("name", u.getName());
            resp.put("phone", u.getMobileNumber());
            resp.put("mobileNumber", u.getMobileNumber());
            resp.put("approved", isApproved);
            resp.put("isApproved", isApproved);
            resp.put("status", status);
            resp.put("verificationStatus", status);
            resp.put("profileStatus", status);
            resp.put("isAvailable", u.getIsAvailable());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Partner profile not found");
        }

        resp.put("data", new java.util.HashMap<>(resp));
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerDeliveryPartner(@RequestBody DeliveryPartner partner) {
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(403).build();

        Optional<DeliveryPartner> existing = deliveryPartnerRepository.findByUserId(mobile);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("User is already registered as a delivery partner.");
        }

        partner.setId(null);
        partner.setUserId(mobile);
        partner.setApproved(false);
        partner.setAvailable(false);
        partner.setActive(true);

        return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
    }

    @PatchMapping("/me/availability")
    public ResponseEntity<?> toggleAvailability(@RequestParam boolean available) {
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(403).build();

        if (userRepository != null) {
            Optional<Ranex.ruvo.model.User> uOpt = userRepository.findByMobileNumberFlexible(mobile);
            if (uOpt.isPresent()) {
                Ranex.ruvo.model.User u = uOpt.get();
                u.setIsAvailable(available);
                userRepository.save(u);
            }
        }

        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserId(mobile)
                .or(() -> deliveryPartnerRepository.findByPhone(mobile));

        if (partnerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Delivery partner profile not found.");
        }

        DeliveryPartner partner = partnerOpt.get();
        if (!Boolean.TRUE.equals(partner.getApproved())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Partner is not yet approved.");
        }

        partner.setAvailable(available);
        if (partner.getActive() == null) {
            partner.setActive(true); // Self-heal old registrations
        }
        if (available) partner.setLastActiveAt(java.time.Instant.now());
        deliveryPartnerRepository.save(partner);
        System.out.println("🟢 [DeliveryPartnerController] Partner #" + partner.getId() + " (" + partner.getName() + ") toggled availability=" + available);
        return ResponseEntity.ok(partner);
    }

    @PatchMapping("/me/location")
    public ResponseEntity<?> updateLocation(@RequestParam Double latitude, @RequestParam Double longitude) {
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(403).build();

        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserId(mobile);
        if (partnerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        DeliveryPartner partner = partnerOpt.get();
        partner.setLatitude(latitude);
        partner.setLongitude(longitude);
        return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
    }

    // Aadhaar Document Photo Upload
    @PostMapping("/{id}/aadhaar")
    public ResponseEntity<?> uploadAadhaarDetails(
            @PathVariable Long id,
            @RequestParam("aadhaarNumber") String aadhaarNumber,
            @RequestParam("aadhaarName") String aadhaarName,
            @RequestPart(value = "front", required = false) org.springframework.web.multipart.MultipartFile front,
            @RequestPart(value = "back", required = false) org.springframework.web.multipart.MultipartFile back
    ) {
        try {
            Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findById(id);
            if (partnerOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Delivery Partner not found");
            DeliveryPartner partner = partnerOpt.get();

            partner.setAadhaarNumber(aadhaarNumber.trim());
            partner.setAadhaarName(aadhaarName.trim());

            if (front != null && !front.isEmpty() && cloudinaryService != null) {
                String frontUrl = cloudinaryService.uploadImage(front, "ruvo/partners/aadhaar");
                partner.setAadhaarFrontUrl(frontUrl);
            }
            if (back != null && !back.isEmpty() && cloudinaryService != null) {
                String backUrl = cloudinaryService.uploadImage(back, "ruvo/partners/aadhaar");
                partner.setAadhaarBackUrl(backUrl);
            }

            return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload Aadhaar details: " + e.getMessage());
        }
    }

    // Bank Account Details Endpoint
    @PostMapping("/{id}/bank-account")
    public ResponseEntity<?> updateBankAccount(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body
    ) {
        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findById(id);
        if (partnerOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Delivery Partner not found");
        DeliveryPartner partner = partnerOpt.get();

        String acc = body.get("bankAccountNumber") != null ? body.get("bankAccountNumber") : body.get("accountNumber");
        String ifsc = body.get("ifscCode") != null ? body.get("ifscCode") : body.get("ifsc");
        String upi = body.get("upiId");

        if (acc != null && !acc.isBlank()) partner.setBankAccountNumber(acc.trim());
        if (ifsc != null && !ifsc.isBlank()) partner.setIfscCode(ifsc.trim().toUpperCase());
        if (upi != null && !upi.isBlank()) partner.setUpiId(upi.trim());

        if (!Boolean.TRUE.equals(partner.getApproved()) && partner.getRazorpayAccountId() == null) {
            partner.setRazorpayAccountId("acc_pending_approval");
        }

        return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
    }

    // Admin Endpoints
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingPartners() {
        if (!isAdmin()) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(deliveryPartnerRepository.findPendingApproval());
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approvePartner(@PathVariable Long id) {
        if (!isAdmin()) return ResponseEntity.status(403).build();
        
        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findById(id);
        if (partnerOpt.isPresent()) {
            DeliveryPartner partner = partnerOpt.get();

            String bankStatus = partner.getBankVerificationStatus();
            if (!"READY_FOR_ADMIN".equalsIgnoreCase(bankStatus) && !"ADMIN_PENDING".equalsIgnoreCase(bankStatus) && !"VERIFIED".equalsIgnoreCase(bankStatus)) {
                return ResponseEntity
                        .status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body("Cannot approve delivery partner with unverified bank account. Current bank status: " + (bankStatus != null ? bankStatus : "UNVERIFIED"));
            }

            partner.setApproved(true);
            partner.setAadhaarVerified(true);

            // Automatically create Razorpay Linked Account on Admin Approval
            String ifsc = partner.getIfscCode();
            String acc = partner.getBankAccountNumber();
            if (ifsc != null && acc != null && !ifsc.isBlank() && !acc.isBlank() && razorpayService != null) {
                String accountId = partner.getRazorpayAccountId();
                if (accountId == null || accountId.isBlank() || accountId.startsWith("acc_dummy") || accountId.equals("acc_pending_approval")) {
                    String name = partner.getName();
                    String email = partner.getId() + "@partner.ruvo.in";
                    String phone = partner.getPhone() != null ? partner.getPhone() : "9999999999";
                    accountId = razorpayService.createLinkedAccount(name, email, phone, ifsc, acc);
                    partner.setRazorpayAccountId(accountId);
                }
            }

            return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<?> getShopRiders(@PathVariable Long shopId) {
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<DeliveryPartner> shopRiders = new java.util.ArrayList<>(deliveryPartnerRepository.findByShopId(shopId));
        List<DeliveryPartner> allPartners = deliveryPartnerRepository.findAll();
        for (DeliveryPartner dp : allPartners) {
            if (dp.getPreferredShopIds() != null && !dp.getPreferredShopIds().isEmpty()) {
                String[] prefs = dp.getPreferredShopIds().split(",");
                for (String pId : prefs) {
                    if (pId.trim().equals(shopId.toString()) && !shopRiders.contains(dp)) {
                        shopRiders.add(dp);
                        break;
                    }
                }
            }
        }
        return ResponseEntity.ok(shopRiders);
    }
}
