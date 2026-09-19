package Ranex.ruvo.repository;

import Ranex.ruvo.model.RazorpayLinkedAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RazorpayLinkedAccountRepository extends JpaRepository<RazorpayLinkedAccount, Long> {

    Optional<RazorpayLinkedAccount> findByShopId(Long shopId);

    Optional<RazorpayLinkedAccount> findByRazorpayAccountId(String razorpayAccountId);

    boolean existsByShopId(Long shopId);

    Optional<RazorpayLinkedAccount> findByPartnerId(Long partnerId);
    
    boolean existsByPartnerId(Long partnerId);
}
