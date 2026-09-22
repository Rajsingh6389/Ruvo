package Ranex.ruvo.service.bank;

public interface BankVerificationProvider {

    /**
     * Verifies if a bank account exists and is valid.
     *
     * @param accountNumber Cleaned numeric account number
     * @param ifsc          Cleaned 11-character uppercase IFSC code
     * @param holderName    Submitted account holder name
     * @return BankVerificationResult with account status and registered name
     */
    BankVerificationResult verifyAccount(String accountNumber, String ifsc, String holderName);

    /**
     * Provider identifier (e.g. "MOCK", "RAZORPAY", "SETU", "CASHFREE").
     */
    String getProviderName();
}
