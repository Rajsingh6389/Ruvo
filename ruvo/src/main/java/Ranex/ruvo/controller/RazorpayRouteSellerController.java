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
@RequestMapping("/api/seller/razorpay")
@PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
public class RazorpayRouteSellerController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayRouteSellerController.class);

    private final ShopRepository shopRepository;
    private final RazorpayLinkedAccountRepository linkedAccountRepository;
    private final RazorpayStakeholderRepository stakeholderRepository;
    private final RazorpayProductConfigRepository productConfigRepository;
    private final SellerBankAccountRepository bankAccountRepository;
    private final BankAccountAuditLogRepository auditLogRepository;
    private final RazorpayRouteService razorpayRouteService;

    public RazorpayRouteSellerController(
            ShopRepository shopRepository,
            RazorpayLinkedAccountRepository linkedAccountRepository,
            RazorpayStakeholderRepository stakeholderRepository,
            RazorpayProductConfigRepository productConfigRepository,
            SellerBankAccountRepository bankAccountRepository,
            BankAccountAuditLogRepository auditLogRepository,
            RazorpayRouteService razorpayRouteService) {
        this.shopRepository = shopRepository;
        this.linkedAccountRepository = linkedAccountRepository;
        this.stakeholderRepository = stakeholderRepository;
        this.productConfigRepository = productConfigRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.auditLogRepository = auditLogRepository;
        this.razorpayRouteService = razorpayRouteService;
    }

    public static class OnboardSellerRequest {
        public Long shopId;
        public String legalBusinessName;
        public String email;
        public String phone;
        public String businessType;
        public String category;
        public String street;
        public String city;
        public String state;
        public String postalCode;
        public String ownerName;
        public String panNumber;
        public String bankAccountNumber;
        public String ifscCode;
        public String bankName;
    }

    public static class UpdateRequirementsRequest {
        public Long shopId;
        public Map<String, Object> requirementsPayload;
    }

    public static class ChangeBankAccountRequest {
        public Long shopId;
        public String accountNumber;
        public String ifscCode;
        public String beneficiaryName;
        public Boolean confirmChange;
    }

    /**
     * 1. Start Seller Razorpay Route Onboarding
     */
    @PostMapping("/onboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startOnboarding(
            @AuthenticationPrincipal User principal,
            @RequestBody OnboardSellerRequest request) {

        if (request.shopId == null) {
            return badRequest("shopId is required.");
        }

        Shop shop = shopRepository.findById(request.shopId).orElse(null);
        if (shop == null) {
            return badRequest("Shop not found.");
        }

        validateSellerOwnership(principal, shop);

        try {
            RazorpayLinkedAccount account = razorpayRouteService.createLinkedAccount(
                    request.shopId,
                    request.legalBusinessName,
                    request.email,
                    request.phone,
                    request.businessType,
                    request.category,
                    request.street,
                    request.city,
                    request.state,
                    request.postalCode
            );

            RazorpayStakeholder stakeholder = razorpayRouteService.createStakeholder(
                    request.shopId,
                    request.ownerName != null ? request.ownerName : shop.getOwner(),
                    request.email != null ? request.email : account.getEmail(),
                    request.phone != null ? request.phone : account.getPhone(),
                    request.panNumber,
                    "owner"
            );

            RazorpayProductConfig productConfig = razorpayRouteService.requestRouteProduct(request.shopId);

            SellerBankAccount bankAccount = null;
            if (request.bankAccountNumber != null && !request.bankAccountNumber.isBlank() &&
                request.ifscCode != null && !request.ifscCode.isBlank()) {
                bankAccount = razorpayRouteService.submitSettlementBankDetails(
                        request.shopId,
                        request.bankAccountNumber,
                        request.ifscCode,
                        request.ownerName != null ? request.ownerName : shop.getName(),
                        getSellerIdFromPrincipal(principal)
                );
            }

            Map<String, Object> data = new HashMap<>();
            data.put("shopId", shop.getId());
            data.put("razorpayAccountId", account.getRazorpayAccountId());
            data.put("accountStatus", account.getStatus());
            data.put("productStatus", productConfig.getStatus());
            data.put("stakeholderId", stakeholder.getRazorpayStakeholderId());
            data.put("pendingRequirements", productConfig.getPendingRequirements());
            data.put("bankStatus", bankAccount != null ? bankAccount.getStatus() : null);

            return ResponseEntity.ok(ApiResponse.ok("Razorpay Route onboarding initiated successfully.", data));
        } catch (Exception e) {
            log.error("Onboarding failed for shopId {}: {}", request.shopId, e.getMessage());
            return serverError("Onboarding failed: " + e.getMessage());
        }
    }

    /**
     * 2. Get Seller Razorpay Onboarding Status
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOnboardingStatus(
            @AuthenticationPrincipal User principal,
            @RequestParam("shopId") Long shopId) {

        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) return badRequest("Shop not found.");
        validateSellerOwnership(principal, shop);

        Optional<RazorpayLinkedAccount> accountOpt = linkedAccountRepository.findByShopId(shopId);
        if (accountOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok("Shop has not initiated Razorpay onboarding yet.", Map.of(
                    "onboardingStarted", false,
                    "status", "NOT_STARTED",
                    "isPaymentEnabled", false
            )));
        }

        RazorpayLinkedAccount account = accountOpt.get();
        RazorpayProductConfig productConfig = productConfigRepository.findByLinkedAccountId(account.getId()).orElse(null);
        Optional<SellerBankAccount> bankOpt = bankAccountRepository.findByShopIdAndIsActiveTrue(shopId);

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

        return ResponseEntity.ok(ApiResponse.ok("Seller Razorpay onboarding status fetched.", result));
    }

    /**
     * 3. Get Pending Razorpay Requirements Dynamically
     */
    @GetMapping("/requirements")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPendingRequirements(
            @AuthenticationPrincipal User principal,
            @RequestParam("shopId") Long shopId) {

        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) return badRequest("Shop not found.");
        validateSellerOwnership(principal, shop);

        try {
            RazorpayProductConfig config = razorpayRouteService.fetchRouteProductConfig(shopId);
            Map<String, Object> result = new HashMap<>();
            result.put("shopId", shopId);
            result.put("productStatus", config.getStatus());
            result.put("pendingRequirements", config.getPendingRequirements());

            return ResponseEntity.ok(ApiResponse.ok("Fetched current dynamic Razorpay Route requirements.", result));
        } catch (Exception e) {
            return serverError("Failed to fetch pending requirements: " + e.getMessage());
        }
    }

    /**
     * 4. Submit/Update Onboarding Information
     */
    @PostMapping("/onboard/update")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateOnboardingInfo(
            @AuthenticationPrincipal User principal,
            @RequestBody UpdateRequirementsRequest request) {

        if (request.shopId == null || request.requirementsPayload == null) {
            return badRequest("shopId and requirementsPayload are required.");
        }

        Shop shop = shopRepository.findById(request.shopId).orElse(null);
        if (shop == null) return badRequest("Shop not found.");
        validateSellerOwnership(principal, shop);

        try {
            RazorpayProductConfig updatedConfig = razorpayRouteService.updateRouteOnboardingData(request.shopId, request.requirementsPayload);
            Map<String, Object> result = Map.of(
                    "shopId", request.shopId,
                    "productStatus", updatedConfig.getStatus(),
                    "remainingRequirements", updatedConfig.getPendingRequirements() != null ? updatedConfig.getPendingRequirements() : "None"
            );
            return ResponseEntity.ok(ApiResponse.ok("Onboarding information submitted to Razorpay successfully.", result));
        } catch (Exception e) {
            return serverError("Failed to update onboarding info: " + e.getMessage());
        }
    }

    /**
     * 5. Get Current Settlement Bank Status
     */
    @GetMapping("/bank/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBankStatus(
            @AuthenticationPrincipal User principal,
            @RequestParam("shopId") Long shopId) {

        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) return badRequest("Shop not found.");
        validateSellerOwnership(principal, shop);

        Optional<SellerBankAccount> activeBank = bankAccountRepository.findByShopIdAndIsActiveTrue(shopId);
        Optional<SellerBankAccount> pendingBank = bankAccountRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, "UNDER_REVIEW");
        if (pendingBank.isEmpty()) {
            pendingBank = bankAccountRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, "PENDING");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("shopId", shopId);
        response.put("activeBankAccountMasked", activeBank.map(SellerBankAccount::getAccountNumberMasked).orElse("None"));
        response.put("activeIfsc", activeBank.map(SellerBankAccount::getIfscCode).orElse("None"));
        response.put("activeBeneficiaryName", activeBank.map(SellerBankAccount::getBeneficiaryName).orElse("None"));
        response.put("hasPendingBankChange", pendingBank.isPresent() && (activeBank.isEmpty() || !pendingBank.get().getId().equals(activeBank.get().getId())));
        response.put("pendingBankAccountMasked", pendingBank.map(SellerBankAccount::getAccountNumberMasked).orElse(null));
        response.put("pendingBankStatus", pendingBank.map(SellerBankAccount::getStatus).orElse("NONE"));

        return ResponseEntity.ok(ApiResponse.ok("Fetched settlement bank status.", response));
    }

    /**
     * 6. Request/Change Seller Settlement Bank Account
     */
    @PostMapping("/bank/change")
    public ResponseEntity<ApiResponse<Map<String, Object>>> changeBankAccount(
            @AuthenticationPrincipal User principal,
            @RequestBody ChangeBankAccountRequest request) {

        if (request.shopId == null || request.accountNumber == null || request.ifscCode == null) {
            return badRequest("shopId, accountNumber, and ifscCode are required.");
        }

        if (!Boolean.TRUE.equals(request.confirmChange)) {
            return badRequest("Re-verification / confirmChange parameter must be set to true to execute bank account change.");
        }

        Shop shop = shopRepository.findById(request.shopId).orElse(null);
        if (shop == null) return badRequest("Shop not found.");
        validateSellerOwnership(principal, shop);

        try {
            SellerBankAccount newBank = razorpayRouteService.submitSettlementBankDetails(
                    request.shopId,
                    request.accountNumber,
                    request.ifscCode,
                    request.beneficiaryName,
                    getSellerIdFromPrincipal(principal)
            );

            Map<String, Object> result = new HashMap<>();
            result.put("shopId", request.shopId);
            result.put("newBankMasked", newBank.getAccountNumberMasked());
            result.put("ifscCode", newBank.getIfscCode());
            result.put("status", newBank.getStatus());
            result.put("isActive", newBank.getIsActive());
            result.put("message", newBank.getIsActive() ?
                    "Bank details updated and activated." :
                    "Bank detail change submitted to Razorpay. Change is PENDING verification/review. Transfers to old/unverified bank account are paused until Razorpay confirms activation.");

            return ResponseEntity.ok(ApiResponse.ok("Bank account change request submitted successfully.", result));
        } catch (Exception e) {
            return serverError("Bank change request failed: " + e.getMessage());
        }
    }

    /**
     * 7. Get Bank-Change Status & Audit History
     */
    @GetMapping("/bank/change/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBankChangeStatus(
            @AuthenticationPrincipal User principal,
            @RequestParam("shopId") Long shopId) {

        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) return badRequest("Shop not found.");
        validateSellerOwnership(principal, shop);

        List<BankAccountAuditLog> auditLogs = auditLogRepository.findByShopIdOrderByCreatedAtDesc(shopId);
        Optional<SellerBankAccount> pendingBank = bankAccountRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, "UNDER_REVIEW");

        Map<String, Object> result = new HashMap<>();
        result.put("shopId", shopId);
        result.put("isChangePending", pendingBank.isPresent());
        result.put("pendingStatus", pendingBank.map(SellerBankAccount::getStatus).orElse("NONE"));
        result.put("auditLogs", auditLogs);

        return ResponseEntity.ok(ApiResponse.ok("Bank change status and audit history fetched.", result));
    }

    /**
     * 8. Get Seller Route Activation Status
     */
    @GetMapping("/activation-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getActivationStatus(
            @AuthenticationPrincipal User principal,
            @RequestParam("shopId") Long shopId) {

        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) return badRequest("Shop not found.");
        validateSellerOwnership(principal, shop);

        Optional<RazorpayLinkedAccount> accountOpt = linkedAccountRepository.findByShopId(shopId);
        RazorpayProductConfig config = accountOpt.flatMap(acc -> productConfigRepository.findByLinkedAccountId(acc.getId())).orElse(null);
        Optional<SellerBankAccount> activeBank = bankAccountRepository.findByShopIdAndIsActiveTrue(shopId);

        boolean isLinkedAccActive = accountOpt.isPresent() && "activated".equalsIgnoreCase(accountOpt.get().getStatus());
        boolean isProductActive = config != null && "activated".equalsIgnoreCase(config.getStatus());
        boolean isBankActive = activeBank.isPresent() && "ACTIVE".equalsIgnoreCase(activeBank.get().getStatus());

        boolean isPaymentEnabled = isLinkedAccActive && isProductActive && isBankActive;

        Map<String, Object> response = new HashMap<>();
        response.put("shopId", shopId);
        response.put("isPaymentEnabled", isPaymentEnabled);
        response.put("linkedAccountActive", isLinkedAccActive);
        response.put("routeProductActive", isProductActive);
        response.put("settlementBankActive", isBankActive);

        return ResponseEntity.ok(ApiResponse.ok("Seller Route activation status retrieved.", response));
    }

    private void validateSellerOwnership(User principal, Shop shop) {
        if (principal == null || principal.getAuthorities() == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required.");
        }

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) return;

        String username = principal.getUsername();
        if (username.startsWith("identity:")) {
            Long identityId = Long.parseLong(username.substring("identity:".length()));
            if (shop.getAuthIdentityId() != null && !shop.getAuthIdentityId().equals(identityId)) {
                throw new org.springframework.security.access.AccessDeniedException("Seller does not own this shop.");
            }
        } else if (shop.getOwnerId() != null && !shop.getOwnerId().equals(username)) {
            throw new org.springframework.security.access.AccessDeniedException("Seller does not own this shop.");
        }
    }

    private String getSellerIdFromPrincipal(User principal) {
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
