package Ranex.ruvo.repository;

import Ranex.ruvo.model.DeliveryRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRequestRepository extends JpaRepository<DeliveryRequest, Long> {
    
    List<DeliveryRequest> findByOrderId(Long orderId);

    List<DeliveryRequest> findByStatusAndExpiresAtBefore(String status, Instant now);

    Optional<DeliveryRequest> findByIdAndPartnerId(Long id, Long partnerId);

    boolean existsByOrderIdAndPartnerId(Long orderId, Long partnerId);
}
