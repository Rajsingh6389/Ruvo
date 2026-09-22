package Ranex.ruvo.service.bank;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.PartnerProfile;
import Ranex.ruvo.model.SellerBankAccount;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.model.User;
import Ranex.ruvo.model.VerificationStatus;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.PartnerProfileRepository;
import Ranex.ruvo.repository.SellerBankAccountRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.repository.UserRepository;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class BankVerificationWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(BankVerificationWorkflowService.class);

    private static final Pattern IFSC_PATTERN = Pattern.compile("^[A-Z]{4}0[A-Z0-9]{6}$");

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    private final RazorpayBankVerificationProvider razorpayProvider;
    private final NameVerificationService nameVerificationService;
    private final BankRiskFraudService bankRiskFraudService;
    private final SellerBankAccountRepository sellerBankAccountRepository;
    private final ShopRepository shopRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final PartnerProfileRepository partnerProfileRepository;
    private final UserRepository userRepository;

    public BankVerificationWorkflowService(
            RazorpayBankVerificationProvider razorpayProvider,
            NameVerificationService nameVerificationService,
            BankRiskFraudService bankRiskFraudService,
            SellerBankAccountRepository sellerBankAccountRepository,
            ShopRepository shopRepository,
            DeliveryPartnerRepository deliveryPartnerRepository,
            PartnerProfileRepository partnerProfileRepository,
            UserRepository userRepository) {
        this.razorpayProvider = razorpayProvider;
        this.nameVerificationService = nameVerificationService;
        this.bankRiskFraudService = bankRiskFraudService;
        this.sellerBankAccountRepository = sellerBankAccountRepository;
        this.shopRepository = shopRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.partnerProfileRepository = partnerProfileRepository;
        this.userRepository = userRepository;
    }

    public record BankVerificationRequest(
            Long shopId,
            Long partnerId,
            String userId,
            String accountHolderName,
            String accountNumber,
            String ifscCode,
            String bankName
    ) {}

    public record BankVerificationResponse(
            boolean success,
            String verificationStatus,
            String accountNumberMasked,
            String ifscCode,
            String bankName,
            String bankHolderName,
            Boolean nameMatch,
            Double nameMatchScore,
            String riskStatus,
            String verificationReference,
            String message,
            int statusCode
    ) {
        public static BankVerificationResponse error(String status, String message, int code) {
            return new BankVerificationResponse(
                    false, status, null, null, null, null, false, 0.0, "REJECT", null, message, code
            );
        }
    }

    /**
     * Executes the 5-Stage Verification Workflow:
     * 1. Basic Validation
     * 2. Razorpay Verification (sync lookup / penny drop)
     * 3. Name Verification
     * 4. Duplicate & Risk Checks
     * 5. Gated State Transition to READY_FOR_ADMIN -> ADMIN_PENDING
     */
    @Transactional
    public BankVerificationResponse verifyAndRegisterBankAccount(BankVerificationRequest req) {
        // ----------------------------------------------------
        // Step 1: Basic Backend Validation
        // ----------------------------------------------------
        String cleanHolder = req.accountHolderName() != null ? req.accountHolderName().trim() : "";
        String cleanAcc = req.accountNumber() != null ? req.accountNumber().replaceAll("[^0-9]", "").trim() : "";
        String cleanIfsc = req.ifscCode() != null ? req.ifscCode().toUpperCase().trim() : "";

        if (cleanHolder.length() < 2) {
            return BankVerificationResponse.error("FAILED", "Please provide a valid account holder name (min 2 characters)", 400);
        }

        if (cleanAcc.length() < 9 || cleanAcc.length() > 18) {
            return BankVerificationResponse.error("FAILED", "Invalid bank account number length (must be between 9 and 18 digits)", 400);
        }

        if (cleanAcc.chars().distinct().count() <= 1) {
            return BankVerificationResponse.error("FAILED", "Invalid bank account number format", 400);
        }

        if (!IFSC_PATTERN.matcher(cleanIfsc).matches()) {
            return BankVerificationResponse.error("FAILED", "Invalid IFSC code format (expected 11 alphanumeric characters, e.g. SBIN0001234)", 400);
        }

        String maskedAcc = maskAccountNumber(cleanAcc);
        String encryptedAcc = hashOrEncrypt(cleanAcc);
        log.info("Initiating bank verification for masked account: {}, IFSC: {}, Holder: {}", maskedAcc, cleanIfsc, cleanHolder);

        // Retrieve or initialize bank account record
        SellerBankAccount bankAccount = getOrCreateBankAccount(req.shopId(), req.partnerId(), maskedAcc, cleanIfsc);
        bankAccount.setUserId(req.userId());
        bankAccount.setSubmittedHolderName(cleanHolder);
        bankAccount.setAccountNumberMasked(maskedAcc);
        bankAccount.setAccountNumberEncrypted(encryptedAcc);
        bankAccount.setIfscCode(cleanIfsc);
        bankAccount.setBankName(req.bankName() != null && !req.bankName().isBlank() ? req.bankName() : "Bank (" + cleanIfsc.substring(0, 4) + ")");
        bankAccount.setVerificationStatus("PENDING_RAZORPAY_VERIFICATION");
        bankAccount.setLastAttemptAt(Instant.now());
        bankAccount.setAttemptsCount(bankAccount.getAttemptsCount() != null ? bankAccount.getAttemptsCount() + 1 : 1);
        sellerBankAccountRepository.save(bankAccount);

        // ----------------------------------------------------
        // Step 2: Razorpay Verification Provider
        // ----------------------------------------------------
        BankVerificationResult rzpResult = razorpayProvider.verifyAccount(cleanAcc, cleanIfsc, cleanHolder);

        if (!rzpResult.isSuccess()) {
            if ("PROVIDER_ERROR".equals(rzpResult.getStatus())) {
                bankAccount.setVerificationStatus("VERIFICATION_ERROR");
                bankAccount.setRejectionReason(rzpResult.getMessage());
                sellerBankAccountRepository.save(bankAccount);
                return BankVerificationResponse.error("VERIFICATION_ERROR", "Bank verification provider is temporarily unreachable. Please try again later.", 503);
            } else {
                bankAccount.setVerificationStatus("RAZORPAY_FAILED");
                bankAccount.setRejectionReason(rzpResult.getMessage());
                sellerBankAccountRepository.save(bankAccount);
                String msg = (rzpResult.getMessage() != null && !rzpResult.getMessage().isBlank())
                        ? rzpResult.getMessage()
                        : "Bank account verification failed. Please check your account number and IFSC and try again.";
                return BankVerificationResponse.error("RAZORPAY_FAILED", msg, 422);
            }
        }

        bankAccount.setVerificationStatus("RAZORPAY_VERIFIED");
        bankAccount.setBankHolderName(rzpResult.getBankHolderName());
        bankAccount.setVerificationReference(rzpResult.getReferenceCode());
        if (rzpResult.getBankName() != null && !rzpResult.getBankName().isBlank()) {
            bankAccount.setBankName(rzpResult.getBankName());
        }

        // ----------------------------------------------------
        // Step 3: Name Verification
        // ----------------------------------------------------
        NameVerificationService.NameMatchResult nameResult = nameVerificationService.verifyNameMatch(
                cleanHolder, rzpResult.getBankHolderName()
        );

        bankAccount.setNameMatch(nameResult.isMatch());
        bankAccount.setNameMatchScore(nameResult.similarityScore());

        if (!nameResult.isMatch()) {
            log.warn("Name verification failed for account {}. Submitted: '{}', Bank registered: '{}'", maskedAcc, cleanHolder, rzpResult.getBankHolderName());
            bankAccount.setVerificationStatus("NAME_MISMATCH");
            bankAccount.setRejectionReason("Name mismatch: Submitted '" + cleanHolder + "' does not match bank record '" + rzpResult.getBankHolderName() + "'");
            sellerBankAccountRepository.save(bankAccount);
            return BankVerificationResponse.error(
                    "NAME_MISMATCH",
                    "The account holder name does not match bank records (" + nameResult.reason() + ")",
                    422
            );
        }

        // ----------------------------------------------------
        // Step 4: Duplicate Account & Risk / Fraud Checks
        // ----------------------------------------------------
        BankRiskFraudService.RiskAssessmentResult riskResult = bankRiskFraudService.assessRisk(
                maskedAcc, encryptedAcc, cleanIfsc, req.userId(), req.shopId(), req.partnerId()
        );

        bankAccount.setRiskStatus(riskResult.riskStatus());
        bankAccount.setRiskReason(riskResult.riskReason());

        if (!riskResult.passed()) {
            log.warn("Risk check failed for account {}: {}", maskedAcc, riskResult.riskReason());
            bankAccount.setVerificationStatus("RISK_HOLD");
            bankAccount.setRejectionReason(riskResult.riskReason());
            sellerBankAccountRepository.save(bankAccount);
            int code = "HOLD".equals(riskResult.riskStatus()) ? 422 : 409;
            return BankVerificationResponse.error("RISK_HOLD", riskResult.riskReason(), code);
        }

        // ----------------------------------------------------
        // Step 5: Transition to READY_FOR_ADMIN & ADMIN_PENDING
        // ONLY reached when ALL checks have strictly passed!
        // ----------------------------------------------------
        bankAccount.setVerificationStatus("READY_FOR_ADMIN");
        bankAccount.setStatus("ACTIVE");
        bankAccount.setIsActive(true);
        bankAccount.setVerifiedAt(Instant.now());
        bankAccount.setBeneficiaryName(cleanHolder);
        sellerBankAccountRepository.save(bankAccount);

        // Update Shop / Partner Admin Gate
        if (req.shopId() != null) {
            Optional<Shop> shopOpt = shopRepository.findById(req.shopId());
            if (shopOpt.isPresent()) {
                Shop shop = shopOpt.get();
                shop.setBankAccountNumber(cleanAcc);
                shop.setIfscCode(cleanIfsc);
                shop.setBankAccountHolder(cleanHolder);
                shop.setBankName(bankAccount.getBankName());
                shop.setBankVerificationStatus("ADMIN_PENDING"); // Admitted to Admin Queue
                shop.setApproved(false); // Admin approval is still required
                shopRepository.save(shop);
                log.info("Shop #{} bank account verified and admitted to Admin Queue (ADMIN_PENDING)", shop.getId());
            }
        }

        if (req.partnerId() != null || (req.userId() != null && !req.userId().isBlank())) {
            // Update matching DeliveryPartner entity
            if (req.partnerId() != null) {
                deliveryPartnerRepository.findById(req.partnerId()).ifPresent(partner -> {
                    partner.setBankAccountNumber(cleanAcc);
                    partner.setIfscCode(cleanIfsc);
                    partner.setBankAccountHolder(cleanHolder);
                    partner.setBankName(bankAccount.getBankName());
                    partner.setBankVerificationStatus("ADMIN_PENDING");
                    partner.setApproved(false);
                    deliveryPartnerRepository.save(partner);
                    log.info("Delivery Partner #{} bank account verified and admitted to Admin Queue (ADMIN_PENDING)", partner.getId());
                });
            }
            if (req.userId() != null) {
                deliveryPartnerRepository.findByUserIdFlexible(req.userId()).ifPresent(partner -> {
                    partner.setBankAccountNumber(cleanAcc);
                    partner.setIfscCode(cleanIfsc);
                    partner.setBankAccountHolder(cleanHolder);
                    partner.setBankName(bankAccount.getBankName());
                    partner.setBankVerificationStatus("ADMIN_PENDING");
                    partner.setApproved(false);
                    deliveryPartnerRepository.save(partner);
                    log.info("Delivery Partner (User {}) bank account verified and admitted to Admin Queue (ADMIN_PENDING)", req.userId());
                });
            }

            // Update matching PartnerProfile entity to UNDER_REVIEW (Admitted to Admin Queue ONLY NOW!)
            Optional<PartnerProfile> profileOpt = Optional.empty();
            if (req.partnerId() != null) {
                profileOpt = partnerProfileRepository.findById(req.partnerId());
            }
            if (profileOpt.isEmpty() && req.userId() != null) {
                try {
                    Long uid = Long.parseLong(req.userId());
                    profileOpt = partnerProfileRepository.findByUserId(uid);
                } catch (Exception ignored) {}
                if (profileOpt.isEmpty()) {
                    userRepository.findByMobileNumberFlexible(req.userId()).ifPresent(u -> {
                        partnerProfileRepository.findByUser(u).ifPresent(p -> {
                            p.setVerificationStatus(VerificationStatus.UNDER_REVIEW);
                            partnerProfileRepository.save(p);
                            log.info("Partner Profile #{} bank account verified and admitted to Admin Queue (UNDER_REVIEW)", p.getId());
                        });
                    });
                }
            }
            profileOpt.ifPresent(p -> {
                p.setVerificationStatus(VerificationStatus.UNDER_REVIEW);
                partnerProfileRepository.save(p);
                log.info("Partner Profile #{} bank account verified and admitted to Admin Queue (UNDER_REVIEW)", p.getId());
            });
        }

        return new BankVerificationResponse(
                true,
                "READY_FOR_ADMIN",
                maskedAcc,
                cleanIfsc,
                bankAccount.getBankName(),
                rzpResult.getBankHolderName(),
                true,
                nameResult.similarityScore(),
                "PASS",
                rzpResult.getReferenceCode(),
                "Bank account verified successfully. Submitted for admin approval.",
                200
        );
    }

    /**
     * Idempotent Webhook Event Processor for Async Razorpay Verification
     */
    @Transactional
    public boolean processAsyncWebhook(String rawPayload, String signatureHeader) {
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            try {
                if (!Utils.verifyWebhookSignature(rawPayload, signatureHeader, webhookSecret)) {
                    log.error("Invalid webhook signature for bank verification webhook");
                    return false;
                }
            } catch (Exception e) {
                log.error("Error verifying webhook signature: {}", e.getMessage());
                return false;
            }
        }

        JSONObject eventJson = new JSONObject(rawPayload);
        String event = eventJson.optString("event");
        JSONObject payload = eventJson.optJSONObject("payload");
        if (payload == null) return false;

        JSONObject validationObj = payload.optJSONObject("fund_account_validation");
        if (validationObj == null) {
            validationObj = payload.optJSONObject("validation");
        }
        if (validationObj == null) return false;

        String validationId = validationObj.optString("id");
        String status = validationObj.optString("status");
        log.info("Processing Async Bank Verification Webhook event: {}, validationId: {}, status: {}", event, validationId, status);

        Optional<SellerBankAccount> bankOpt = sellerBankAccountRepository.findByRazorpayBankReference(validationId);
        if (bankOpt.isEmpty()) {
            log.info("No bank account found for validation ID: {}", validationId);
            return true;
        }

        SellerBankAccount bankAccount = bankOpt.get();

        // Idempotency check: if already verified or approved, do nothing
        if ("READY_FOR_ADMIN".equals(bankAccount.getVerificationStatus()) ||
            "ADMIN_PENDING".equals(bankAccount.getVerificationStatus()) ||
            "ADMIN_APPROVED".equals(bankAccount.getVerificationStatus())) {
            log.info("Bank account #{} is already in state {}, ignoring duplicate webhook", bankAccount.getId(), bankAccount.getVerificationStatus());
            return true;
        }

        if ("completed".equalsIgnoreCase(status)) {
            JSONObject results = validationObj.optJSONObject("results");
            String registeredName = results != null ? results.optString("registered_name") : "";
            bankAccount.setVerificationStatus("RAZORPAY_VERIFIED");
            bankAccount.setBankHolderName(registeredName);

            // Run name verification
            NameVerificationService.NameMatchResult nameRes = nameVerificationService.verifyNameMatch(
                    bankAccount.getSubmittedHolderName(), registeredName
            );
            bankAccount.setNameMatch(nameRes.isMatch());
            bankAccount.setNameMatchScore(nameRes.similarityScore());

            if (!nameRes.isMatch()) {
                bankAccount.setVerificationStatus("NAME_MISMATCH");
                bankAccount.setRejectionReason("Name mismatch in async webhook");
                sellerBankAccountRepository.save(bankAccount);
                return true;
            }

            // Run duplicate & risk checks
            BankRiskFraudService.RiskAssessmentResult riskRes = bankRiskFraudService.assessRisk(
                    bankAccount.getAccountNumberMasked(), bankAccount.getAccountNumberEncrypted(),
                    bankAccount.getIfscCode(), bankAccount.getUserId(), bankAccount.getShopId(), bankAccount.getPartnerId()
            );

            bankAccount.setRiskStatus(riskRes.riskStatus());
            bankAccount.setRiskReason(riskRes.riskReason());

            if (!riskRes.passed()) {
                bankAccount.setVerificationStatus("RISK_HOLD");
                sellerBankAccountRepository.save(bankAccount);
                return true;
            }

            // All passed -> admit to admin queue
            bankAccount.setVerificationStatus("READY_FOR_ADMIN");
            bankAccount.setStatus("ACTIVE");
            bankAccount.setIsActive(true);
            bankAccount.setVerifiedAt(Instant.now());
            sellerBankAccountRepository.save(bankAccount);

            if (bankAccount.getShopId() != null) {
                shopRepository.findById(bankAccount.getShopId()).ifPresent(s -> {
                    s.setBankVerificationStatus("ADMIN_PENDING");
                    shopRepository.save(s);
                });
            }
        } else if ("failed".equalsIgnoreCase(status)) {
            bankAccount.setVerificationStatus("RAZORPAY_FAILED");
            bankAccount.setRejectionReason("Async verification failed at bank");
            sellerBankAccountRepository.save(bankAccount);
        }

        return true;
    }

    private SellerBankAccount getOrCreateBankAccount(Long shopId, Long partnerId, String maskedAcc, String ifsc) {
        if (shopId != null) {
            Optional<SellerBankAccount> existing = sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(shopId);
            if (existing.isPresent()) return existing.get();
        } else if (partnerId != null) {
            Optional<SellerBankAccount> existing = sellerBankAccountRepository.findFirstByPartnerIdOrderByCreatedAtDesc(partnerId);
            if (existing.isPresent()) return existing.get();
        }

        return SellerBankAccount.builder()
                .shopId(shopId)
                .partnerId(partnerId)
                .accountNumberMasked(maskedAcc)
                .ifscCode(ifsc)
                .build();
    }

    public static String maskAccountNumber(String rawAcc) {
        if (rawAcc == null || rawAcc.length() <= 4) return "XXXXXX";
        String last4 = rawAcc.substring(rawAcc.length() - 4);
        return "XXXXXX" + last4;
    }

    private static String hashOrEncrypt(String rawAcc) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawAcc.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            return "ENC_" + rawAcc.hashCode();
        }
    }
}
