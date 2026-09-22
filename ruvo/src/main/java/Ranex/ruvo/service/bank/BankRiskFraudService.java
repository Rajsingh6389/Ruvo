package Ranex.ruvo.service.bank;

import Ranex.ruvo.model.SellerBankAccount;
import Ranex.ruvo.repository.SellerBankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BankRiskFraudService {

    private static final Logger log = LoggerFactory.getLogger(BankRiskFraudService.class);

    private final SellerBankAccountRepository sellerBankAccountRepository;

    public record RiskAssessmentResult(
            boolean passed,
            String riskStatus, // PASS, HOLD, REJECT
            String riskReason
    ) {
        public static RiskAssessmentResult pass() {
            return new RiskAssessmentResult(true, "PASS", "All risk and fraud heuristics passed");
        }

        public static RiskAssessmentResult hold(String reason) {
            return new RiskAssessmentResult(false, "HOLD", reason);
        }

        public static RiskAssessmentResult reject(String reason) {
            return new RiskAssessmentResult(false, "REJECT", reason);
        }
    }

    /**
     * Assesses risk for the bank account registration.
     *
     * @param accountNumberMasked Masked account number
     * @param accountNumberEncrypted Encrypted/Hashed account representation
     * @param ifsc IFSC code
     * @param userId Initiating user
     * @param shopId Target shop (null if partner)
     * @param partnerId Target partner (null if shop)
     */
    public RiskAssessmentResult assessRisk(
            String accountNumberMasked,
            String accountNumberEncrypted,
            String ifsc,
            String userId,
            Long shopId,
            Long partnerId
    ) {
        // 1. Velocity check (max 5 verification attempts in 1 hour)
        if (userId != null && !userId.isBlank()) {
            Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
            long attempts = sellerBankAccountRepository.countByUserIdAndCreatedAtAfter(userId, oneHourAgo);
            if (attempts >= 5) {
                log.warn("Risk alert: User {} exceeded bank verification velocity limit ({} attempts in 1h)", userId, attempts);
                return RiskAssessmentResult.hold("Verification rate limit exceeded. Too many attempts in a short period. Please try again later.");
            }
        }

        // 2. Duplicate Account Detection (account already verified for a different merchant/partner)
        if (accountNumberEncrypted != null && !accountNumberEncrypted.isBlank()) {
            List<SellerBankAccount> duplicates = sellerBankAccountRepository.findDuplicateVerifiedAccounts(
                    accountNumberEncrypted, ifsc, shopId, partnerId
            );

            if (!duplicates.isEmpty()) {
                log.warn("Risk alert: Bank account (IFSC {}) is already verified and linked to another entity (Found {} records)", ifsc, duplicates.size());
                return RiskAssessmentResult.reject("This bank account is already registered and verified with another business entity.");
            }
        }

        // 3. Fallback duplicate check on masked account + IFSC if encrypted is not yet available
        if (accountNumberMasked != null && !accountNumberMasked.isBlank()) {
            List<SellerBankAccount> duplicates = sellerBankAccountRepository.findByAccountNumberMaskedAndIfscCodeAndVerificationStatus(
                    accountNumberMasked, ifsc, "VERIFIED"
            );

            for (SellerBankAccount existing : duplicates) {
                boolean isDifferentShop = shopId != null && existing.getShopId() != null && !existing.getShopId().equals(shopId);
                boolean isDifferentPartner = partnerId != null && existing.getPartnerId() != null && !existing.getPartnerId().equals(partnerId);
                if (isDifferentShop || isDifferentPartner) {
                    log.warn("Risk alert: Masked match found on active verified account for a different entity");
                    return RiskAssessmentResult.reject("This bank account is already registered and verified with another entity.");
                }
            }
        }

        // 4. Heuristics check (dummy pattern risk)
        if (accountNumberMasked != null) {
            String rawTail = accountNumberMasked.replaceAll("[^0-9]", "");
            if (rawTail.length() >= 4 && rawTail.chars().distinct().count() == 1 && (rawTail.startsWith("0") || rawTail.startsWith("9"))) {
                log.warn("Risk alert: Suspicious repeating tail digits in account number");
                return RiskAssessmentResult.hold("Bank account number flagged by automated fraud review");
            }
        }

        return RiskAssessmentResult.pass();
    }
}
