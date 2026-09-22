package Ranex.ruvo.repository;

import Ranex.ruvo.model.SellerBankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SellerBankAccountRepository extends JpaRepository<SellerBankAccount, Long> {

    List<SellerBankAccount> findByShopIdOrderByCreatedAtDesc(Long shopId);

    Optional<SellerBankAccount> findFirstByShopIdAndIsActiveTrueOrderByCreatedAtDesc(Long shopId);

    default Optional<SellerBankAccount> findByShopIdAndIsActiveTrue(Long shopId) {
        return findFirstByShopIdAndIsActiveTrueOrderByCreatedAtDesc(shopId);
    }

    Optional<SellerBankAccount> findFirstByShopIdAndStatusOrderByCreatedAtDesc(Long shopId, String status);

    Optional<SellerBankAccount> findFirstByShopIdOrderByCreatedAtDesc(Long shopId);

    List<SellerBankAccount> findByPartnerIdOrderByCreatedAtDesc(Long partnerId);

    Optional<SellerBankAccount> findFirstByPartnerIdAndIsActiveTrueOrderByCreatedAtDesc(Long partnerId);

    default Optional<SellerBankAccount> findByPartnerIdAndIsActiveTrue(Long partnerId) {
        return findFirstByPartnerIdAndIsActiveTrueOrderByCreatedAtDesc(partnerId);
    }

    Optional<SellerBankAccount> findFirstByPartnerIdAndStatusOrderByCreatedAtDesc(Long partnerId, String status);

    Optional<SellerBankAccount> findFirstByPartnerIdOrderByCreatedAtDesc(Long partnerId);

    Optional<SellerBankAccount> findFirstByRazorpayBankReferenceOrderByCreatedAtDesc(String razorpayBankReference);

    default Optional<SellerBankAccount> findByRazorpayBankReference(String razorpayBankReference) {
        return findFirstByRazorpayBankReferenceOrderByCreatedAtDesc(razorpayBankReference);
    }

    List<SellerBankAccount> findByAccountNumberMaskedAndIfscCodeAndVerificationStatus(
            String accountNumberMasked, String ifscCode, String verificationStatus);

    List<SellerBankAccount> findByAccountNumberEncrypted(String accountNumberEncrypted);

    @Query("SELECT b FROM SellerBankAccount b WHERE b.accountNumberEncrypted = :accountNumberEncrypted " +
           "AND b.ifscCode = :ifscCode AND b.verificationStatus = 'VERIFIED' " +
           "AND (:currentShopId IS NULL OR b.shopId IS NULL OR b.shopId != :currentShopId) " +
           "AND (:currentPartnerId IS NULL OR b.partnerId IS NULL OR b.partnerId != :currentPartnerId)")
    List<SellerBankAccount> findDuplicateVerifiedAccounts(
            @Param("accountNumberEncrypted") String accountNumberEncrypted,
            @Param("ifscCode") String ifscCode,
            @Param("currentShopId") Long currentShopId,
            @Param("currentPartnerId") Long currentPartnerId);

    Optional<SellerBankAccount> findFirstByUserIdAndVerificationStatusOrderByCreatedAtDesc(String userId, String verificationStatus);

    default Optional<SellerBankAccount> findByUserIdAndVerificationStatus(String userId, String verificationStatus) {
        return findFirstByUserIdAndVerificationStatusOrderByCreatedAtDesc(userId, verificationStatus);
    }

    Optional<SellerBankAccount> findFirstByPartnerIdAndVerificationStatus(Long partnerId, String verificationStatus);

    long countByUserIdAndCreatedAtAfter(String userId, Instant after);
}

