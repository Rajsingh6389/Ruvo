package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import Ranex.ruvo.service.RazorpayRouteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/partner/razorpay")
@PreAuthorize("hasAnyRole('DELIVERY_PARTNER', 'ADMIN')")
public class RazorpayRoutePartnerController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayRoutePartnerController.class);

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final RazorpayLinkedAccountRepository linkedAccountRepository;
    private final RazorpayStakeholderRepository stakeholderRepository;
    private final RazorpayProductConfigRepository productConfigRepository;
    private final SellerBankAccountRepository bankAccountRepository;
    private final BankAccountAuditLogRepository auditLogRepository;
    private final RazorpayRouteService razorpayRouteService;

    public RazorpayRoutePartnerController(
            DeliveryPartnerRepository deliveryPartnerRepository,
            RazorpayLinkedAccountRepository linkedAccountRepository,
            RazorpayStakeholderRepository stakeholderRepository,
            RazorpayProductConfigRepository productConfigRepository,
            SellerBankAccountRepository bankAccountRepository,
            BankAccountAuditLogRepository auditLogRepository,
            RazorpayRouteService razorpayRouteService) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.linkedAccountRepository = linkedAccountRepository;
        this.stakeholderRepository = stakeholderRepository;
        this.productConfigRepository = productConfigRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.auditLogRepository = auditLogRepository;
        this.razorpayRouteService = razorpayRouteService;
    }

    public static class OnboardPartnerRequest {
        public Long partnerId;
        public String legalBusinessName;
        public String email;
        public String businessType;
        public String street;
        public String city;
        public String state;
        public String postalCode;
        public String panNumber;
        public String bankAccountNumber;
        public String ifscCode;
        public String bankName;
        public String beneficiaryName;
    }

    public static class ChangeBankAccountRequest {
        public Long partnerId;
        public String accountNumber;
        public String ifscCode;
        public String beneficiaryName;
        public String bankName;
        public Boolean confirmChange;
    }

    /**
     * 1. Start Partner Razorpay Route Onboarding
     */
    @PostMapping("/onboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startOnboarding(
            @AuthenticationPrincipal User principal,
            @RequestBody OnboardPartnerRequest request) {

        if (request.partnerId == null) {
            return badRequest("partnerId is required.");
        }

        DeliveryPartner partner = deliveryPartnerRepository.findById(request.partnerId).orElse(null);
        if (partner == null) return badRequest("Partner not found.");
        validatePartnerOwnership(principal, partner);

        try {
            RazorpayLinkedAccount account = razorpayRouteService.createPartnerLinkedAccount(
                    request.partnerId,
                    request.legalBusinessName,
                    request.email,
                    request.businessType,
                    request.street,
                    request.city,
                    request.state,
                    request.postalCode
            );

            RazorpayStakeholder stakeholder = razorpayRouteService.createPartnerStakeholder(
                    request.partnerId,
                    request.panNumber
            );

            RazorpayProductConfig productConfig = razorpayRouteService.requestPartnerRouteProduct(request.partnerId);

            SellerBankAccount bankAccount = null;
            if (request.bankAccountNumber != null && !request.bankAccountNumber.isBlank() &&
                request.ifscCode != null && !request.ifscCode.isBlank()) {
                bankAccount = razorpayRouteService.submitPartnerSettlementBankDetails(
                        request.partnerId,
                        request.bankAccountNumber,
                        request.ifscCode,
                        request.beneficiaryName != null ? request.beneficiaryName : partner.getName(),
                        getPartnerIdFromPrincipal(principal)
                );
            }

            Map<String, Object> data = new HashMap<>();
            data.put("partnerId", partner.getId());
            data.put("razorpayAccountId", account.getRazorpayAccountId());
            data.put("accountStatus", account.getStatus());
            data.put("productStatus", productConfig.getStatus());
            data.put("stakeholderId", stakeholder.getRazorpayStakeholderId());
            data.put("pendingRequirements", productConfig.getPendingRequirements());
            data.put("bankStatus", bankAccount != null ? bankAccount.getStatus() : null);

            return ResponseEntity.ok(ApiResponse.ok("Razorpay Route onboarding initiated successfully.", data));
        } catch (Exception e) {
            log.error("Onboarding failed for partnerId {}: {}", request.partnerId, e.getMessage());
            return serverError("Onboarding failed: " + e.getMessage());
        }
    }

    /**
     * 2. Get Partner Razorpay Onboarding Status
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOnboardingStatus(
            @AuthenticationPrincipal User principal,
            @RequestParam("partnerId") Long partnerId) {

        DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId).orElse(null);
        if (partner == null) return badRequest("Partner not found.");
        validatePartnerOwnership(principal, partner);

        Optional<RazorpayLinkedAccount> accountOpt = linkedAccountRepository.findByPartnerId(partnerId);
        if (accountOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok("Partner has not initiated Razorpay onboarding yet.", Map.of(
                    "onboardingStarted", false,
                    "status", "NOT_STARTED",
                    "isPaymentEnabled", false
            )));
        }

        RazorpayLinkedAccount account = accountOpt.get();
        RazorpayProductConfig productConfig = productConfigRepository.findByLinkedAccountId(account.getId()).orElse(null);
        Optional<SellerBankAccount> bankOpt = bankAccountRepository.findByPartnerIdAndIsActiveTrue(partnerId);

        boolean isPaymentEnabled = "activated".equalsIgnoreCase(account.getStatus()) &&
                                   productConfig != null && "activated".equalsIgnoreCase(productConfig.getStatus()) &&
                                   bankOpt.isPresent() && "ACTIVE".equalsIgnoreCase(bankOpt.get().getStatus());

        Map<String, Object> result = new HashMap<>();
        result.put("onboardingStarted", true);
        result.put("razorpayAccountId", account.getRazorpayAccountId());
        result.put("accountStatus", account.getStatus());
        result.put("productStatus", productConfig != null ? productConfig.getStatus() : "NOT_REQUESTED");
        result.put("pendingRequirements", productConfig != null ? productConfig.getPendingRequirements() : null);
        result.put("activeBankMasked", bankOpt.map(SellerBankAccount::getAccountNumberMasked).orElse("Not Verified"));
        result.put("bankStatus", bankOpt.map(SellerBankAccount::getStatus).orElse("NONE"));
        result.put("isPaymentEnabled", isPaymentEnabled);

        return ResponseEntity.ok(ApiResponse.ok("Partner Razorpay onboarding status fetched.", result));
    }

    /**
     * 3. Get Current Settlement Bank Status
     */
    @GetMapping("/bank/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBankStatus(
            @AuthenticationPrincipal User principal,
            @RequestParam("partnerId") Long partnerId) {

        DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId).orElse(null);
        if (partner == null) return badRequest("Partner not found.");
        validatePartnerOwnership(principal, partner);

        Optional<SellerBankAccount> activeBank = bankAccountRepository.findByPartnerIdAndIsActiveTrue(partnerId);
        Optional<SellerBankAccount> pendingBank = bankAccountRepository.findFirstByPartnerIdAndStatusOrderByCreatedAtDesc(partnerId, "UNDER_REVIEW");
        if (pendingBank.isEmpty()) {
            pendingBank = bankAccountRepository.findFirstByPartnerIdAndStatusOrderByCreatedAtDesc(partnerId, "PENDING");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("partnerId", partnerId);
        
        // Legacy fallback from delivery_partners table
        boolean hasLegacyBank = activeBank.isEmpty() && pendingBank.isEmpty() && partner.getBankAccountNumber() != null && !partner.getBankAccountNumber().isEmpty();
        
        if (activeBank.isPresent()) {
            response.put("activeBankAccountMasked", activeBank.get().getAccountNumberMasked());
            response.put("activeIfsc", activeBank.get().getIfscCode());
            response.put("activeBeneficiaryName", activeBank.get().getBeneficiaryName());
        } else if (hasLegacyBank) {
            String acc = partner.getBankAccountNumber();
            String masked = acc.length() > 4 ? "******" + acc.substring(acc.length() - 4) : acc;
            response.put("activeBankAccountMasked", masked);
            response.put("activeIfsc", partner.getIfscCode() != null ? partner.getIfscCode() : "None");
            response.put("activeBeneficiaryName", partner.getBankAccountHolder() != null ? partner.getBankAccountHolder() : "None");
        } else {
            response.put("activeBankAccountMasked", "None");
            response.put("activeIfsc", "None");
            response.put("activeBeneficiaryName", "None");
        }

        response.put("hasPendingBankChange", pendingBank.isPresent() && (activeBank.isEmpty() || !pendingBank.get().getId().equals(activeBank.get().getId())));
        response.put("pendingBankAccountMasked", pendingBank.map(SellerBankAccount::getAccountNumberMasked).orElse(null));
        response.put("pendingBankStatus", pendingBank.map(SellerBankAccount::getStatus).orElse("NONE"));

        return ResponseEntity.ok(ApiResponse.ok("Fetched settlement bank status.", response));
    }

    /**
     * 4. Request/Change Partner Settlement Bank Account
     */
    @PostMapping("/bank/change")
    public ResponseEntity<ApiResponse<Map<String, Object>>> changeBankAccount(
            @AuthenticationPrincipal User principal,
            @RequestBody ChangeBankAccountRequest request) {

        if (request.partnerId == null || request.accountNumber == null || request.ifscCode == null) {
            return badRequest("partnerId, accountNumber, and ifscCode are required.");
        }

        if (!Boolean.TRUE.equals(request.confirmChange)) {
            return badRequest("Re-verification / confirmChange parameter must be set to true to execute bank account change.");
        }

        DeliveryPartner partner = deliveryPartnerRepository.findById(request.partnerId).orElse(null);
        if (partner == null) return badRequest("Partner not found.");
        validatePartnerOwnership(principal, partner);

        try {
            SellerBankAccount newBank = razorpayRouteService.submitPartnerSettlementBankDetails(
                    request.partnerId,
                    request.accountNumber,
                    request.ifscCode,
                    request.beneficiaryName,
                    getPartnerIdFromPrincipal(principal)
            );

            Map<String, Object> result = new HashMap<>();
            result.put("partnerId", request.partnerId);
            result.put("newBankMasked", newBank.getAccountNumberMasked());
            result.put("ifscCode", newBank.getIfscCode());
            result.put("status", newBank.getStatus());
            result.put("isActive", newBank.getIsActive());
            result.put("message", newBank.getIsActive() ?
                    "Bank details updated and activated." :
                    "Bank detail change submitted to Razorpay. Change is PENDING verification.");

            return ResponseEntity.ok(ApiResponse.ok("Bank account change request submitted successfully.", result));
        } catch (Exception e) {
            return serverError("Bank change request failed: " + e.getMessage());
        }
    }

    private void validatePartnerOwnership(User principal, DeliveryPartner partner) {
        if (principal == null || principal.getAuthorities() == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required.");
        }
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) return;
        
        String username = principal.getUsername();
        if (username.startsWith("identity:")) {
            Long identityId = Long.parseLong(username.substring("identity:".length()));
            if (partner.getAuthIdentityId() != null && !partner.getAuthIdentityId().equals(identityId)) {
                throw new org.springframework.security.access.AccessDeniedException("User does not own this partner profile.");
            }
        }
    }

    private String getPartnerIdFromPrincipal(User principal) {
        if (principal == null) return "UNKNOWN";
        return principal.getUsername();
    }

    private <T> ResponseEntity<ApiResponse<T>> badRequest(String msg) {
        return ResponseEntity.badRequest().body(ApiResponse.ok(msg, null));
    }

    private <T> ResponseEntity<ApiResponse<T>> serverError(String msg) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.ok(msg, null));
    }
}
