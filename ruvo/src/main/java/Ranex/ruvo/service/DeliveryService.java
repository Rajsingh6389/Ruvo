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

    /** Riders this close are offered the pickup first. */
    private static final double PREFERRED_RADIUS_KM = 2.0;

    /** Hard ceiling: a rider further than this from the shop is never offered the pickup. */
    private static final double MAX_DISPATCH_KM = 3.0;

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

        // Stamp the start of the rider search on first attempt so the 10-minute window below
        // is measured from here rather than from order creation.
        if (order.getDispatchStartedAt() == null) {
            order.setDispatchStartedAt(Instant.now());
            orderRepository.save(order);
        }

        // 1. Check 10-minute overall dispatch window timeout
        Instant dispatchStart = allRequests.stream()
            .map(DeliveryRequest::getSentAt)
            .min(Comparator.naturalOrder())
            .orElse(order.getDispatchStartedAt());

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

        // Partners already holding a live offer, or already carrying a delivery, are left alone.
        Set<Long> busyPartnerIds = findBusyPartnerIds();

        // Candidate search: the shop's own riders first, then everyone online closest-first,
        // widening from PREFERRED_RADIUS_KM to MAX_DISPATCH_KM and never past it.
        List<DeliveryPartner> shopPartners = deliveryPartnerRepository
                .findByShopIdAndApprovedTrueAndActiveTrueAndAvailableTrue(shop.getId());

        DeliveryPartner selectedPartner = findNearestEligiblePartner(
                order, shopPartners, shopLat, shopLng, rejectedPartnerIds, pendingPartnerIds,
                busyPartnerIds, allRequests, MAX_DISPATCH_KM, "shop's own riders");

        if (selectedPartner == null) {
            List<DeliveryPartner> onlinePartners = deliveryPartnerRepository
                    .findByApprovedTrueAndActiveTrueAndAvailableTrue();

            selectedPartner = findNearestEligiblePartner(
                    order, onlinePartners, shopLat, shopLng, rejectedPartnerIds, pendingPartnerIds,
                    busyPartnerIds, allRequests, PREFERRED_RADIUS_KM, "within " + PREFERRED_RADIUS_KM + " km");

            if (selectedPartner == null) {
                selectedPartner = findNearestEligiblePartner(
                        order, onlinePartners, shopLat, shopLng, rejectedPartnerIds, pendingPartnerIds,
                        busyPartnerIds, allRequests, MAX_DISPATCH_KM, "within " + MAX_DISPATCH_KM + " km");
            }
        }

        if (selectedPartner != null) {
            System.out.println("==========================================");
            System.out.println("🚀 [DeliveryService] Dispatching Order #" + order.getId() + " to Partner: " + selectedPartner.getName() + " (ID: " + selectedPartner.getId() + ", Phone: " + selectedPartner.getPhone() + ")");
            System.out.println("==========================================");
            sendDeliveryRequest(order, selectedPartner, shopLat, shopLng);
        } else {
            System.out.println("⚠️ [DeliveryService] No eligible partner within " + MAX_DISPATCH_KM + " km for Order #"
                    + order.getId() + " (rejected=" + rejectedPartnerIds.size() + ", busy=" + busyPartnerIds.size()
                    + "). Will retry when a partner comes online.");
        }
    }

    /**
     * Re-runs dispatch for orders that are still waiting on a rider but have no live offer
     * outstanding. Without this an order whose first search found nobody was never revisited:
     * no PENDING request existed, so the expiry sweep had nothing to trigger it from, and the
     * order sat in DELIVERY_ASSIGNMENT until a partner happened to reject something. This is
     * what lets a partner who comes online mid-search pick up the waiting order.
     */
    public void retryStalledAssignments() {
        List<Order> waiting = orderRepository.findByOrderStatus(OrderStatus.DELIVERY_ASSIGNMENT);
        if (waiting.isEmpty()) return;

        System.out.println("🔄 [DeliveryService] Retrying " + waiting.size() + " stalled orders...");

        for (Order order : waiting) {
            if (order.getDeliveryPartnerId() != null) continue;

            boolean hasLiveOffer = deliveryRequestRepository.findByOrderId(order.getId()).stream()
                    .anyMatch(r -> "PENDING".equals(r.getStatus()) && Instant.now().isBefore(r.getExpiresAt()));
            
            if (hasLiveOffer) {
                // System.out.println("⏳ [DeliveryService] Order #" + order.getId() + " still has a PENDING offer, skipping.");
                continue;
            }

            System.out.println("🔍 [DeliveryService] Re-searching for Order #" + order.getId() + " inside stalled assignment loop...");
            findAndAssignNextPartner(order);
        }
    }

    /** Partner IDs holding a live offer or already assigned to an in-flight delivery. */
    private Set<Long> findBusyPartnerIds() {
        Set<Long> busy = deliveryRequestRepository
                .findByStatusAndExpiresAtAfter("PENDING", Instant.now()).stream()
                .map(DeliveryRequest::getPartnerId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toCollection(java.util.HashSet::new));

        orderRepository.findByOrderStatusIn(List.of(
                        OrderStatus.DELIVERY_ASSIGNED,
                        OrderStatus.PICKED_UP,
                        OrderStatus.OUT_FOR_DELIVERY)).stream()
                .map(Order::getDeliveryPartnerId)
                .filter(java.util.Objects::nonNull)
                .forEach(busy::add);

        return busy;
    }

    private DeliveryPartner findNearestEligiblePartner(
            Order order,
            List<DeliveryPartner> partners,
            Double lat,
            Double lng,
            Set<Long> rejectedPartnerIds,
            Set<Long> pendingPartnerIds,
            Set<Long> busyPartnerIds,
            List<DeliveryRequest> allRequests,
            double radiusKm,
            String tierLabel) {

        // Filter out partners who have explicitly REJECTED this order or currently have PENDING request
        // Also ensure partner is truly available for the current calendar day
        java.time.Instant startOfToday = java.time.LocalDate.now().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();

        System.out.println("🔍 [DeliveryService] Order #" + order.getId() + " — inspecting " + partners.size()
                + " candidates (" + tierLabel + "), shop at " + round(lat) + "," + round(lng) + ":");

        List<DeliveryPartner> eligible = new java.util.ArrayList<>();
        for (DeliveryPartner p : partners) {
            String rejectReason = null;
            if (!Boolean.TRUE.equals(p.getAvailable()) || !Boolean.TRUE.equals(p.getApproved()) || !Boolean.TRUE.equals(p.getActive())) {
                rejectReason = "Status false (avail=" + p.getAvailable() + ", appr=" + p.getApproved() + ", active=" + p.getActive() + ")";
            } else if (p.getLastActiveAt() != null && p.getLastActiveAt().isBefore(startOfToday)) {
                p.setAvailable(false);
                deliveryPartnerRepository.save(p);
                rejectReason = "Auto-offlining stale partner - last active before today";
            } else if (p.getPreferredShopIds() != null && !p.getPreferredShopIds().isBlank()) {
                Long orderShopId = order.getShopId();
                if (orderShopId != null) {
                    java.util.Set<Long> preferredSet = java.util.Arrays.stream(p.getPreferredShopIds().split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).map(Long::parseLong)
                            .collect(java.util.stream.Collectors.toSet());
                    if (!preferredSet.contains(orderShopId)) {
                        rejectReason = "Shop ID " + orderShopId + " not in preferred shops";
                    }
                }
            }
            if (rejectReason == null) {
                if (rejectedPartnerIds.contains(p.getId())) rejectReason = "Rejected this order before";
                else if (pendingPartnerIds.contains(p.getId())) rejectReason = "Already has PENDING request for this order";
                else if (busyPartnerIds.contains(p.getId())) rejectReason = "BUSY (assigned to another order or live request)";
                else if (!withinRadius(p, lat, lng, radiusKm)) rejectReason = "Outside " + radiusKm + " km radius";
            }

            System.out.println("   -> Partner #" + p.getId() + " (" + p.getName() + ", phone=" + p.getPhone() + "): "
                    + describeDistance(p, lat, lng)
                    + (rejectReason == null ? " ✅ ELIGIBLE" : " ❌ SKIPPED: " + rejectReason));
            
            if (rejectReason == null) {
                if (p.getLastActiveAt() == null) {
                    p.setLastActiveAt(java.time.Instant.now());
                    deliveryPartnerRepository.save(p);
                }
                eligible.add(p);
            }
        }

        if (eligible.isEmpty()) return null;

        // Group A: Partners who have NEVER received a request for this order
        List<DeliveryPartner> neverAsked = eligible.stream()
            .filter(p -> allRequests.stream().noneMatch(r -> r.getPartnerId().equals(p.getId())))
            .toList();

        if (!neverAsked.isEmpty()) {
            // Pick nearest partner who hasn't been offered this order yet
            return neverAsked.stream()
                .min(Comparator.comparingDouble(p -> distanceFrom(p, lat, lng)))
                .orElse(null);
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

    /** A partner who has never reported GPS cannot be distance-checked, so assume they might be in range to ensure fallback delivery assignment. */
    private static boolean withinRadius(DeliveryPartner p, double shopLat, double shopLng, double radiusKm) {
        if (p.getLatitude() == null || p.getLongitude() == null) return true; // Include as fallback
        return DistanceUtils.calculateDistance(shopLat, shopLng, p.getLatitude(), p.getLongitude()) <= radiusKm;
    }

    private static double distanceFrom(DeliveryPartner p, double shopLat, double shopLng) {
        if (p.getLatitude() == null || p.getLongitude() == null) return Double.MAX_VALUE;
        return DistanceUtils.calculateDistance(shopLat, shopLng, p.getLatitude(), p.getLongitude());
    }

    private static String describeDistance(DeliveryPartner p, double shopLat, double shopLng) {
        if (p.getLatitude() == null || p.getLongitude() == null) {
            return "distance=unknown (partner has never reported GPS)";
        }
        double km = DistanceUtils.calculateDistance(shopLat, shopLng, p.getLatitude(), p.getLongitude());
        return "distance=" + round(km) + " km (at " + round(p.getLatitude()) + "," + round(p.getLongitude()) + ")";
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
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
            .expiresAt(Instant.now().plus(30, ChronoUnit.SECONDS))
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
                .deliveryFee(order.getDeliveryFee() != null ? order.getDeliveryFee().doubleValue() : 40.0)
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
