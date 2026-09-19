package Ranex.ruvo.repository;

import Ranex.ruvo.model.SellerBankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SellerBankAccountRepository extends JpaRepository<SellerBankAccount, Long> {

    List<SellerBankAccount> findByShopIdOrderByCreatedAtDesc(Long shopId);

    Optional<SellerBankAccount> findByShopIdAndIsActiveTrue(Long shopId);

    Optional<SellerBankAccount> findFirstByShopIdAndStatusOrderByCreatedAtDesc(Long shopId, String status);

    List<SellerBankAccount> findByPartnerIdOrderByCreatedAtDesc(Long partnerId);

    Optional<SellerBankAccount> findByPartnerIdAndIsActiveTrue(Long partnerId);

    Optional<SellerBankAccount> findFirstByPartnerIdAndStatusOrderByCreatedAtDesc(Long partnerId, String status);

    Optional<SellerBankAccount> findByRazorpayBankReference(String razorpayBankReference);
}
