package Ranex.ruvo.repository;

import Ranex.ruvo.model.RuvoCommissionPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RuvoCommissionPaymentRepository extends JpaRepository<RuvoCommissionPayment, Long> {

    Optional<RuvoCommissionPayment> findByCashfreeOrderId(String cashfreeOrderId);

    List<RuvoCommissionPayment> findByCycleId(Long cycleId);

    boolean existsByCashfreeOrderId(String cashfreeOrderId);
}
