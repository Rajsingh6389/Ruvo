package Ranex.ruvo.model;

public enum VerificationStatus {
    NEW,
    PENDING,
    UNDER_REVIEW,
    APPROVED,
    REJECTED,
    SUSPENDED,
    
    // KYC status sub-states
    KYC_SUBMITTED,
    KYC_UNDER_REVIEW,
    KYC_APPROVED,
    KYC_REJECTED
}
