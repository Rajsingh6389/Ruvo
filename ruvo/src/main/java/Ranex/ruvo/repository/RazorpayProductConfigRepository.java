package Ranex.ruvo.repository;

import Ranex.ruvo.model.RazorpayProductConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RazorpayProductConfigRepository extends JpaRepository<RazorpayProductConfig, Long> {

    Optional<RazorpayProductConfig> findByLinkedAccountIdAndProductName(Long linkedAccountId, String productName);

    Optional<RazorpayProductConfig> findByLinkedAccountId(Long linkedAccountId);
}
