package Ranex.ruvo.service;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.DeliveryRepository;
import Ranex.ruvo.repository.DeliveryRequestRepository;
import Ranex.ruvo.repository.NotificationRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.util.DistanceUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DeliveryService {

    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final DeliveryRequestRepository deliveryRequestRepository;
    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    public DeliveryService(DeliveryPartnerRepository deliveryPartnerRepository,
                           DeliveryRequestRepository deliveryRequestRepository,
                           DeliveryRepository deliveryRepository,
                           OrderRepository orderRepository,
                           ShopRepository shopRepository,
                           NotificationService notificationService,
                           NotificationRepository notificationRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.deliveryRequestRepository = deliveryRequestRepository;
        this.deliveryRepository = deliveryRepository;
        this.orderRepository = orderRepository;
        this.shopRepository = shopRepository;
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
    }

    public void findAndAssignNextPartner(Order order) {
        Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
        if (shop == null) {
            System.out.println("⚠️ [DeliveryService] Shop not found for Order #" + order.getId());
            return;
        }

        List<DeliveryRequest> allRequests = deliveryRequestRepository.findByOrderId(order.getId());

        // 1. Check 10-minute overall dispatch window timeout
        Instant dispatchStart = allRequests.stream()
            .map(DeliveryRequest::getSentAt)
            .min(Comparator.naturalOrder())
            .orElse(order.getCreatedAt() != null ? order.getCreatedAt() : Instant.now());

        if (Instant.now().isAfter(dispatchStart.plus(10, ChronoUnit.MINUTES))) {
            System.out.println("❌ [DeliveryService] 10-minute dispatch timeout reached for Order #" + order.getId() + ". Cancelling order.");
            order.setOrderStatus("CANCELLED_NO_PARTNER_FOUND");
            orderRepository.save(order);

            // Expire any remaining pending requests
            for (DeliveryRequest req : allRequests) {
                if ("PENDING".equals(req.getStatus())) {
                    req.setStatus("EXPIRED");
                    deliveryRequestRepository.save(req);
                }
            }

            notificationService.notifyCustomer(
                order,
                "Order Cancelled",
                "No delivery partner was available within 10 minutes. Order cancelled.",
                "CANCELLED_NO_PARTNER_FOUND"
            );
            return;
        }

        // 2. Check if a request is already active (PENDING and not expired)
        boolean activePendingExists = allRequests.stream()
            .anyMatch(r -> "PENDING".equals(r.getStatus()) && Instant.now().isBefore(r.getExpiresAt()));

        if (activePendingExists) {
            System.out.println("⏳ [DeliveryService] Order #" + order.getId() + " has an active pending offer. Waiting for timer.");
            return;
        }

        // Extract partner ID sets
        Set<Long> rejectedPartnerIds = allRequests.stream()
            .filter(r -> "REJECTED".equals(r.getStatus()))
            .map(DeliveryRequest::getPartnerId)
            .collect(Collectors.toSet());

        Set<Long> pendingPartnerIds = allRequests.stream()
            .filter(r -> "PENDING".equals(r.getStatus()))
            .map(DeliveryRequest::getPartnerId)
            .collect(Collectors.toSet());

        double shopLat = shop.getLatitude() != null ? shop.getLatitude() : 28.6139;
        double shopLng = shop.getLongitude() != null ? shop.getLongitude() : 77.2090;

        // Candidate search: Shop partners -> RuVo 25km partners -> All online partners
        List<DeliveryPartner> shopPartners = deliveryPartnerRepository
                .findByShopIdAndApprovedTrueAndActiveTrueAndAvailableTrue(shop.getId());
        
        DeliveryPartner selectedPartner = findNearestEligiblePartner(order, shopPartners, shopLat, shopLng, rejectedPartnerIds, pendingPartnerIds, allRequests);

        if (selectedPartner == null) {
            List<DeliveryPartner> ruvoPartners = deliveryPartnerRepository
                    .findNearbyRuvoPartners(shopLat, shopLng, 25.0);
            selectedPartner = findNearestEligiblePartner(order, ruvoPartners, shopLat, shopLng, rejectedPartnerIds, pendingPartnerIds, allRequests);
        }

        if (selectedPartner == null) {
            List<DeliveryPartner> allOnlinePartners = deliveryPartnerRepository
                    .findByApprovedTrueAndActiveTrueAndAvailableTrue();
            selectedPartner = findNearestEligiblePartner(order, allOnlinePartners, shopLat, shopLng, rejectedPartnerIds, pendingPartnerIds, allRequests);
        }

        if (selectedPartner != null) {
            System.out.println("==========================================");
            System.out.println("🚀 [DeliveryService] Dispatching Order #" + order.getId() + " to Partner: " + selectedPartner.getName() + " (ID: " + selectedPartner.getId() + ", Phone: " + selectedPartner.getPhone() + ")");
            System.out.println("==========================================");
            sendDeliveryRequest(order, selectedPartner, shopLat, shopLng);
        } else {
            System.out.println("⚠️ [DeliveryService] No eligible online partners available for Order #" + order.getId() + " (Rejected count: " + rejectedPartnerIds.size() + ")");
        }
    }

    private DeliveryPartner findNearestEligiblePartner(
            Order order,
            List<DeliveryPartner> partners,
            Double lat,
            Double lng,
            Set<Long> rejectedPartnerIds,
            Set<Long> pendingPartnerIds,
            List<DeliveryRequest> allRequests) {

        // Filter out partners who have explicitly REJECTED this order or currently have PENDING request
        List<DeliveryPartner> eligible = partners.stream()
            .filter(p -> !rejectedPartnerIds.contains(p.getId()))
            .filter(p -> !pendingPartnerIds.contains(p.getId()))
            .toList();

        if (eligible.isEmpty()) return null;

        // Group A: Partners who have NEVER received a request for this order
        List<DeliveryPartner> neverAsked = eligible.stream()
            .filter(p -> allRequests.stream().noneMatch(r -> r.getPartnerId().equals(p.getId())))
            .toList();

        if (!neverAsked.isEmpty()) {
            // Pick nearest partner who hasn't been offered this order yet
            return neverAsked.stream()
                .min(Comparator.comparingDouble(p -> {
                    double pLat = p.getLatitude() != null ? p.getLatitude() : lat;
                    double pLng = p.getLongitude() != null ? p.getLongitude() : lng;
                    return DistanceUtils.calculateDistance(lat, lng, pLat, pLng);
                })).orElse(null);
        }

        // Group B: Loop back to partners whose request EXPIRED (not rejected)
        // Pick the partner whose last offer was sent furthest back in time
        return eligible.stream()
            .min(Comparator.comparing(p -> {
                return allRequests.stream()
                    .filter(r -> r.getPartnerId().equals(p.getId()))
                    .map(DeliveryRequest::getSentAt)
                    .max(Comparator.naturalOrder())
                    .orElse(Instant.MIN);
            })).orElse(null);
    }

    private void sendDeliveryRequest(Order order, DeliveryPartner partner, double sLat, double sLng) {
        double pLat = partner.getLatitude() != null ? partner.getLatitude() : sLat;
        double pLng = partner.getLongitude() != null ? partner.getLongitude() : sLng;

        double distanceKm = DistanceUtils.calculateDistance(sLat, sLng, pLat, pLng);

        DeliveryRequest request = DeliveryRequest.builder()
            .orderId(order.getId())
            .partnerId(partner.getId())
            .distanceKm(distanceKm)
            .status("PENDING")
            .sentAt(Instant.now())
            .expiresAt(Instant.now().plus(1, ChronoUnit.MINUTES))
            .build();
        
        deliveryRequestRepository.save(request);
        System.out.println("✅ [DeliveryService] Created DeliveryRequest ID #" + request.getId() + " for Partner #" + partner.getId());

        // Notify partner — persist the notification so it appears in the partner's Notifications tab
        Notification notif = Notification.builder()
            .userId(partner.getUserId())
            .orderId(order.getId())
            .type("DELIVERY_REQUEST")
            .title("🚴 New Delivery Request")
            .message("Order #" + order.getId() + " • Pickup distance: " + Math.round(distanceKm * 10.0) / 10.0 + " km. Tap to accept within 1 minute.")
            .build();
        notificationRepository.save(notif);
        System.out.println("🔔 [DeliveryService] Notification saved for Partner #" + partner.getId() + " (userId=" + partner.getUserId() + ")");
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

        // Mark assigned on Order
        order.setDeliveryPartnerId(partnerId);
        order.setOrderStatus(OrderStatus.DELIVERY_ASSIGNED);
        orderRepository.save(order);

        // Sync or Create Delivery entity for partner app endpoints
        Delivery delivery = deliveryRepository.findByOrderId(order.getId()).orElse(null);
        if (delivery == null) {
            Shop shop = shopRepository.findById(order.getShopId()).orElse(null);
            String pickupAddress = shop != null && shop.getAddress() != null ? shop.getAddress() : "Shop";
            delivery = Delivery.builder()
                .orderId(order.getId())
                .partnerId(partnerId)
                .status("ASSIGNED")
                .pickupLocation(pickupAddress != null ? pickupAddress : "Shop Location")
                .deliveryLocation(order.getDeliveryAddress() != null ? order.getDeliveryAddress() : "Customer Address")
                .deliveryFee(order.getDeliveryFee() != null ? order.getDeliveryFee() : 40.0)
                .assignedAt(Instant.now())
                .build();
        } else {
            delivery.setPartnerId(partnerId);
            delivery.setStatus("ASSIGNED");
            delivery.setAssignedAt(Instant.now());
        }
        deliveryRepository.save(delivery);

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
