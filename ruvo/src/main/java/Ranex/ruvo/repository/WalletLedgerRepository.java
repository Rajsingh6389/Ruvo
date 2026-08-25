package Ranex.ruvo.repository;

import Ranex.ruvo.model.WalletLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WalletLedgerRepository extends JpaRepository<WalletLedger, Long> {

    Optional<WalletLedger> findFirstByUserIdOrderByIdDesc(String userId);
}
