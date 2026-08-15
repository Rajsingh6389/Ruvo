package Ranex.ruvo.repository;

import Ranex.ruvo.model.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    List<Delivery> findByStatus(String status);
    List<Delivery> findByPartnerId(Long partnerId);
    Optional<Delivery> findByOrderId(Long orderId);
}
