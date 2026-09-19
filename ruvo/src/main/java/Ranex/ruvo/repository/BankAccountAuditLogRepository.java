package Ranex.ruvo.repository;

import Ranex.ruvo.model.BankAccountAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BankAccountAuditLogRepository extends JpaRepository<BankAccountAuditLog, Long> {

    List<BankAccountAuditLog> findByShopIdOrderByCreatedAtDesc(Long shopId);

    List<BankAccountAuditLog> findBySellerIdOrderByCreatedAtDesc(String sellerId);
}
