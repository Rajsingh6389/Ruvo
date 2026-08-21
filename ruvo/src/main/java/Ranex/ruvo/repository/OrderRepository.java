package Ranex.ruvo.repository;

import Ranex.ruvo.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(String userId);
    List<Order> findByShopId(Long shopId);
    List<Order> findByDeliveryPartnerId(Long deliveryPartnerId);
}
