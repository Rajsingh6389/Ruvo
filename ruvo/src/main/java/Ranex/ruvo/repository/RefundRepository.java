package Ranex.ruvo.repository;

import Ranex.ruvo.model.Refund;
import Ranex.ruvo.model.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {
    List<Refund> findByOrderId(Long orderId);
    List<Refund> findByUserId(Long userId);
    List<Refund> findByStatus(RefundStatus status);
    Optional<Refund> findByOrderIdAndStatus(Long orderId, RefundStatus status);
    boolean existsByOrderId(Long orderId);
}
