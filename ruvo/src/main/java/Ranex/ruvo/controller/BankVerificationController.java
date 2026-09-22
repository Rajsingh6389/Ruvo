package Ranex.ruvo.controller;

import Ranex.ruvo.model.SellerBankAccount;
import Ranex.ruvo.repository.SellerBankAccountRepository;
import Ranex.ruvo.service.bank.BankVerificationWorkflowService;
import Ranex.ruvo.service.bank.BankVerificationWorkflowService.BankVerificationRequest;
import Ranex.ruvo.service.bank.BankVerificationWorkflowService.BankVerificationResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bank-account")
@RequiredArgsConstructor
public class BankVerificationController {

    private static final Logger log = LoggerFactory.getLogger(BankVerificationController.class);

    private final BankVerificationWorkflowService workflowService;
    private final SellerBankAccountRepository sellerBankAccountRepository;

    /**
     * Verify and register bank details.
     * Gated execution: never creates admin request unless all checks pass.
     */
    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'DELIVERY_PARTNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> verifyBankAccount(@RequestBody Map<String, Object> body) {
        String userId = getCurrentUserId();

        Long shopId = body.get("shopId") != null ? Long.parseLong(body.get("shopId").toString()) : null;
        Long partnerId = body.get("partnerId") != null ? Long.parseLong(body.get("partnerId").toString()) : null;
        String holderName = (String) body.get("accountHolderName");
        if (holderName == null) holderName = (String) body.get("bankAccountHolder");
        if (holderName == null) holderName = (String) body.get("ownerName");

        String accountNumber = (String) body.get("accountNumber");
        if (accountNumber == null) accountNumber = (String) body.get("bankAccountNumber");

        String ifscCode = (String) body.get("ifscCode");
        String bankName = (String) body.get("bankName");

        BankVerificationRequest req = new BankVerificationRequest(
                shopId, partnerId, userId, holderName, accountNumber, ifscCode, bankName
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", resp.success());
        responseBody.put("verificationStatus", resp.verificationStatus());
        responseBody.put("accountNumberMasked", resp.accountNumberMasked());
        responseBody.put("ifscCode", resp.ifscCode());
        responseBody.put("bankName", resp.bankName());
        responseBody.put("bankHolderName", resp.bankHolderName());
        responseBody.put("nameMatch", resp.nameMatch());
        responseBody.put("nameMatchScore", resp.nameMatchScore());
        responseBody.put("riskStatus", resp.riskStatus());
        responseBody.put("verificationReference", resp.verificationReference());
        responseBody.put("message", resp.message());

        return ResponseEntity.status(resp.statusCode()).body(responseBody);
    }

    /**
     * Check current bank account verification status.
     */
    @GetMapping("/status")
    public ResponseEntity<?> getVerificationStatus(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) Long partnerId
    ) {
        Optional<SellerBankAccount> bankOpt = Optional.empty();
        if (shopId != null) {
            bankOpt = sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(shopId);
        } else if (partnerId != null) {
            bankOpt = sellerBankAccountRepository.findFirstByPartnerIdOrderByCreatedAtDesc(partnerId);
        }

        if (bankOpt.isEmpty()) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("verificationStatus", "NOT_CONFIGURED");
            empty.put("isVerified", false);
            return ResponseEntity.ok(empty);
        }

        SellerBankAccount b = bankOpt.get();
        Map<String, Object> res = new HashMap<>();
        res.put("id", b.getId());
        res.put("shopId", b.getShopId());
        res.put("partnerId", b.getPartnerId());
        res.put("accountNumberMasked", b.getAccountNumberMasked());
        res.put("ifscCode", b.getIfscCode());
        res.put("bankName", b.getBankName());
        res.put("submittedHolderName", b.getSubmittedHolderName());
        res.put("bankHolderName", b.getBankHolderName());
        res.put("verificationStatus", b.getVerificationStatus());
        res.put("nameMatch", b.getNameMatch());
        res.put("nameMatchScore", b.getNameMatchScore());
        res.put("riskStatus", b.getRiskStatus());
        res.put("isVerified", "READY_FOR_ADMIN".equals(b.getVerificationStatus()) || "ACTIVE".equals(b.getStatus()));
        res.put("verifiedAt", b.getVerifiedAt());
        res.put("createdAt", b.getCreatedAt());

        return ResponseEntity.ok(res);
    }

    /**
     * Async Webhook for Razorpay Bank Verification & Fund Account Validations
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleBankWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature
    ) {
        log.info("Received Razorpay Bank Verification Webhook");
        boolean handled = workflowService.processAsyncWebhook(payload, signature);
        if (handled) {
            return ResponseEntity.ok("Webhook processed");
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature or payload");
        }
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        return principal.toString();
    }
}
