package Ranex.ruvo.repository;

import Ranex.ruvo.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(String userId);
    List<Order> findByShopId(Long shopId);
    List<Order> findByDeliveryPartnerId(Long deliveryPartnerId);

    /** Drives the stalled-dispatch sweep: orders still waiting for a rider. */
    List<Order> findByOrderStatus(String orderStatus);

    /** Used to spot partners already mid-delivery so dispatch does not interrupt them. */
    List<Order> findByOrderStatusIn(Collection<String> orderStatuses);

    /**
     * Find orders eligible for COD settlement: DELIVERED, COD, not handover-verified,
     * matching shop and delivery partner.
     */
    @Query("SELECT o FROM Order o WHERE o.shopId = :shopId " +
           "AND o.deliveryPartnerId = :partnerId " +
           "AND o.orderStatus = 'DELIVERED' " +
           "AND o.paymentMethod = 'COD' " +
           "AND (o.handoverVerified = false OR o.handoverVerified IS NULL)")
    List<Order> findEligibleForSettlement(@Param("shopId") Long shopId,
                                          @Param("partnerId") Long partnerId);
}
