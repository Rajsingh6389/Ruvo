package Ranex.ruvo.service.bank;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankVerificationResult {

    private boolean success;
    private boolean accountExists;
    private String bankHolderName;
    private String bankName;
    private String status; // SUCCESS, FAILED, PROVIDER_ERROR
    private String referenceCode;
    private String message;
    private String errorCode;

    public static BankVerificationResult success(String bankHolderName, String bankName, String referenceCode) {
        return BankVerificationResult.builder()
                .success(true)
                .accountExists(true)
                .bankHolderName(bankHolderName)
                .bankName(bankName)
                .status("SUCCESS")
                .referenceCode(referenceCode)
                .message("Bank account verified successfully with provider")
                .build();
    }

    public static BankVerificationResult failed(String errorCode, String message) {
        return BankVerificationResult.builder()
                .success(false)
                .accountExists(false)
                .status("FAILED")
                .errorCode(errorCode)
                .message(message)
                .build();
    }

    public static BankVerificationResult providerError(String message) {
        return BankVerificationResult.builder()
                .success(false)
                .accountExists(false)
                .status("PROVIDER_ERROR")
                .errorCode("PROVIDER_UNAVAILABLE")
                .message(message)
                .build();
    }
}
