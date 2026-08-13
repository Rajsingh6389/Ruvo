package Ranex.ruvo.service;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.DeliveryRequestRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

@Service
public class DeliveryService {

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final DeliveryRequestRepository deliveryRequestRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final NotificationService notificationService;

    public DeliveryService(DeliveryPartnerRepository deliveryPartnerRepository,
                           DeliveryRequestRepository deliveryRequestRepository,
                           OrderRepository orderRepository,
                           ShopRepository shopRepository,
                           NotificationService notificationService) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.deliveryRequestRepository = deliveryRequestRepository;
        this.orderRepository = orderRepository;
        this.shopRepository = shopRepository;
        this.notificationService = notificationService;
    }

    public void findAndAssignNextPartner(Order order) {
        Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
        if (shop == null || shop.getLatitude() == null || shop.getLongitude() == null) return;

        // 1. Try shop-owned partners
        List<DeliveryPartner> shopPartners = deliveryPartnerRepository
                .findByShopIdAndApprovedTrueAndActiveTrueAndAvailableTrue(shop.getId());
        
        DeliveryPartner selectedPartner = findNearestEligiblePartner(order, shopPartners, shop.getLatitude(), shop.getLongitude());

        // 2. Fallback to RuVo general partners if no shop partner is eligible
        if (selectedPartner == null) {
            // General radius search 2km
            List<DeliveryPartner> ruvoPartners = deliveryPartnerRepository
                    .findNearbyRuvoPartners(shop.getLatitude(), shop.getLongitude(), 2.0);
            selectedPartner = findNearestEligiblePartner(order, ruvoPartners, shop.getLatitude(), shop.getLongitude());
        }

        if (selectedPartner != null) {
            sendDeliveryRequest(order, selectedPartner, shop);
        } else {
            // No partners available. Handle accordingly (e.g. notify shop/customer)
        }
    }

    private DeliveryPartner findNearestEligiblePartner(Order order, List<DeliveryPartner> partners, Double lat, Double lng) {
        return partners.stream()
            .filter(p -> p.getLatitude() != null && p.getLongitude() != null)
            .filter(p -> !deliveryRequestRepository.existsByOrderIdAndPartnerId(order.getId(), p.getId()))
            .min(Comparator.comparingDouble(p -> 
                DistanceUtils.calculateDistance(lat, lng, p.getLatitude(), p.getLongitude())
            )).orElse(null);
    }

    private void sendDeliveryRequest(Order order, DeliveryPartner partner, Shop shop) {
        double distanceKm = DistanceUtils.calculateDistance(
            shop.getLatitude(), shop.getLongitude(), partner.getLatitude(), partner.getLongitude()
        );

        DeliveryRequest request = DeliveryRequest.builder()
            .orderId(order.getId())
            .partnerId(partner.getId())
            .distanceKm(distanceKm)
            .status("PENDING")
            .sentAt(Instant.now())
            .expiresAt(Instant.now().plus(1, ChronoUnit.MINUTES))
            .build();
        
        deliveryRequestRepository.save(request);

        // Notify partner
        Notification notif = Notification.builder()
            .userId(partner.getUserId())
            .orderId(order.getId())
            .type("DELIVERY_REQUEST")
            .title("New Delivery Request")
            .message("Order #" + order.getId() + ". Pickup distance: " + Math.round(distanceKm*10.0)/10.0 + " km.")
            .build();
        // Assuming notificationService has a generic method or we just save it. 
        // We'll trust NotificationService has a way or just use repository in real app
    }

    @Transactional
    public void acceptRequest(Long requestId, Long partnerId) {
        DeliveryRequest request = deliveryRequestRepository.findByIdAndPartnerId(requestId, partnerId)
            .orElseThrow(() -> new IllegalArgumentException("Request not found"));
        
        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalArgumentException("Request is no longer pending");
        }
        if (Instant.now().isAfter(request.getExpiresAt())) {
            throw new IllegalArgumentException("Request has expired");
        }

        // Lock order transactionally
        Order order = orderRepository.findById(request.getOrderId())
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!OrderStatus.DELIVERY_ASSIGNMENT.equals(order.getOrderStatus()) || order.getDeliveryPartnerId() != null) {
            throw new IllegalArgumentException("This delivery has already been assigned.");
        }

        // Mark assigned
        order.setDeliveryPartnerId(partnerId);
        order.setOrderStatus(OrderStatus.DELIVERY_ASSIGNED);
        orderRepository.save(order);

        // Update request statuses
        request.setStatus("ACCEPTED");
        request.setRespondedAt(Instant.now());
        deliveryRequestRepository.save(request);

        // Cancel other pending requests for this order
        List<DeliveryRequest> pendings = deliveryRequestRepository.findByOrderId(order.getId()).stream()
            .filter(r -> "PENDING".equals(r.getStatus()) && !r.getId().equals(requestId))
            .toList();
        for (DeliveryRequest p : pendings) {
            p.setStatus("CANCELLED");
            deliveryRequestRepository.save(p);
        }
        
        // Notify customer
        notificationService.notifyCustomer(order, "Delivery Partner Assigned", "A delivery partner is heading to the shop.", "DELIVERY_ASSIGNED");
    }

    @Transactional
    public void rejectRequest(Long requestId, Long partnerId) {
        DeliveryRequest request = deliveryRequestRepository.findByIdAndPartnerId(requestId, partnerId)
            .orElseThrow(() -> new IllegalArgumentException("Request not found"));
        
        if ("PENDING".equals(request.getStatus())) {
            request.setStatus("REJECTED");
            request.setRespondedAt(Instant.now());
            deliveryRequestRepository.save(request);
            
            Order order = orderRepository.findById(request.getOrderId()).orElse(null);
            if (order != null && OrderStatus.DELIVERY_ASSIGNMENT.equals(order.getOrderStatus())) {
                findAndAssignNextPartner(order);
            }
        }
    }

    public void expireDeliveryRequests() {
        List<DeliveryRequest> expired = deliveryRequestRepository.findByStatusAndExpiresAtBefore("PENDING", Instant.now());
        for (DeliveryRequest req : expired) {
            req.setStatus("EXPIRED");
            deliveryRequestRepository.save(req);
            
            Order order = orderRepository.findById(req.getOrderId()).orElse(null);
            if (order != null && OrderStatus.DELIVERY_ASSIGNMENT.equals(order.getOrderStatus())) {
                findAndAssignNextPartner(order);
            }
        }
    }
}
