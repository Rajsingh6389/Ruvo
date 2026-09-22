package Ranex.ruvo.service.bank;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class MockBankVerificationProvider implements BankVerificationProvider {

    private static final Logger log = LoggerFactory.getLogger(MockBankVerificationProvider.class);

    private static final Map<String, String> BANK_PREFIX_MAP = Map.of(
            "SBIN", "State Bank of India",
            "HDFC", "HDFC Bank",
            "ICIC", "ICICI Bank",
            "UTIB", "Axis Bank",
            "PUNB", "Punjab National Bank",
            "KKBK", "Kotak Mahindra Bank",
            "BARB", "Bank of Baroda",
            "CNRB", "Canara Bank",
            "UBIN", "Union Bank of India",
            "YESB", "Yes Bank"
    );

    @Override
    public BankVerificationResult verifyAccount(String accountNumber, String ifsc, String holderName) {
        log.info("MockBankVerificationProvider: verifying account with IFSC {}", ifsc);

        if (accountNumber == null || accountNumber.isBlank() || ifsc == null || ifsc.isBlank()) {
            return BankVerificationResult.failed("INVALID_INPUT", "Account number and IFSC are required");
        }

        // Test Trigger: Provider Error / Timeout simulation
        if (accountNumber.startsWith("8888") || ifsc.startsWith("ERRR")) {
            log.warn("MockBankVerificationProvider: simulating provider error");
            return BankVerificationResult.providerError("Bank verification service is temporarily unreachable");
        }

        // Test Trigger: Dummy / Invalid / Fake Account Numbers
        if (accountNumber.startsWith("0000") || accountNumber.endsWith("0000") ||
                accountNumber.startsWith("123456") || accountNumber.startsWith("987654") ||
                accountNumber.startsWith("1111") || accountNumber.startsWith("2222") ||
                accountNumber.startsWith("3333") || accountNumber.startsWith("4444") ||
                accountNumber.startsWith("5555") || accountNumber.startsWith("6666") ||
                accountNumber.startsWith("9999") || accountNumber.equals("123456789123") ||
                accountNumber.equals("123456789012") || accountNumber.equals("999999999999") ||
                accountNumber.chars().distinct().count() <= 1) {
            log.warn("MockBankVerificationProvider: account number {} rejected as invalid / not found", accountNumber);
            return BankVerificationResult.failed("ACCOUNT_NOT_FOUND", "Invalid bank account number or details. Account does not exist in bank records.");
        }

        // Test Trigger: Invalid IFSC
        if (ifsc.startsWith("FAIL") || ifsc.startsWith("ERRR") || ifsc.startsWith("0000") || ifsc.equals("INVALID0000")) {
            log.warn("MockBankVerificationProvider: invalid IFSC code");
            return BankVerificationResult.failed("INVALID_IFSC", "The provided IFSC code is invalid or bank branch does not exist.");
        }

        // Determine bank name from IFSC prefix
        String prefix = ifsc.length() >= 4 ? ifsc.substring(0, 4).toUpperCase() : "BANK";
        String bankName = BANK_PREFIX_MAP.getOrDefault(prefix, "Reserve Bank Linked Bank (" + prefix + ")");

        // Test Trigger: Name Mismatch (returns a completely different registered name)
        String registeredName;
        if (accountNumber.startsWith("7777")) {
            registeredName = "Completely Different Person";
        } else {
            // In normal mock verification, the bank returns the registered name matching the user or sanitized uppercase
            registeredName = (holderName != null && !holderName.isBlank()) ? holderName.trim().toUpperCase() : "ACCOUNT HOLDER";
        }

        String referenceCode = "MOCK_TXN_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        return BankVerificationResult.success(registeredName, bankName, referenceCode);
    }

    @Override
    public String getProviderName() {
        return "MOCK";
    }
}
