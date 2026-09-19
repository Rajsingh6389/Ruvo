package Ranex.ruvo.repository;

import Ranex.ruvo.model.RouteTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteTransferRepository extends JpaRepository<RouteTransfer, Long> {

    List<RouteTransfer> findByShopIdOrderByCreatedAtDesc(Long shopId);

    Optional<RouteTransfer> findByOrderId(Long orderId);

    Optional<RouteTransfer> findByPaymentId(Long paymentId);

    Optional<RouteTransfer> findByRazorpayTransferId(String razorpayTransferId);
}
