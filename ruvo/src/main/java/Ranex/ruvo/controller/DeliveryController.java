package Ranex.ruvo.controller;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.DeliveryRequest;
import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.DeliveryRequestRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.service.DeliveryService;
import Ranex.ruvo.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/** Simple typed payload so convertAndSend doesn't get ambiguous with Map<K,V>. */
record LocationPayload(Double latitude, Double longitude) {}

@RestController
@RequestMapping("/api/delivery")
@CrossOrigin(origins = "*")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final DeliveryRequestRepository deliveryRequestRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Ranex.ruvo.repository.SettlementRepository settlementRepository;

    public DeliveryController(DeliveryService deliveryService, 
                              DeliveryPartnerRepository deliveryPartnerRepository, 
                              DeliveryRequestRepository deliveryRequestRepository,
                              OrderRepository orderRepository,
                              NotificationService notificationService,
                              SimpMessagingTemplate messagingTemplate,
                              Ranex.ruvo.repository.SettlementRepository settlementRepository) {
        this.deliveryService = deliveryService;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.deliveryRequestRepository = deliveryRequestRepository;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.settlementRepository = settlementRepository;
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        return principal.toString();
    }

    private DeliveryPartner getCurrentPartner() {
        String email = getCurrentUserEmail();
        if (email == null) return null;
        return deliveryPartnerRepository.findByUserId(email).orElse(null);
    }

    @PatchMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestParam Double latitude, @RequestParam Double longitude) {
        String email = getCurrentUserEmail();
        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserId(email);
        if (partnerOpt.isEmpty()) return ResponseEntity.status(403).build();

        DeliveryPartner partner = partnerOpt.get();
        partner.setLatitude(latitude);
        partner.setLongitude(longitude);
        deliveryPartnerRepository.save(partner);

        // Phase 9: Broadcast new location to /topic/delivery/{partnerId}
        messagingTemplate.convertAndSend(
            "/topic/delivery/" + partner.getId(),
            new LocationPayload(latitude, longitude)
        );

        return ResponseEntity.ok(partner);
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getMyRequests() {
        DeliveryPartner p = getCurrentPartner();
        if (p == null) return ResponseEntity.status(403).build();

        // Normally we might add a custom query to find by partnerId.
        // Let's assume we fetch all and filter or add a query in repository
        return ResponseEntity.ok("Not implemented yet -- get filtered requests");
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long id) {
        DeliveryPartner p = getCurrentPartner();
        if (p == null) return ResponseEntity.status(403).build();

        try {
            deliveryService.acceptRequest(id, p.getId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long id) {
        DeliveryPartner p = getCurrentPartner();
        if (p == null) return ResponseEntity.status(403).build();

        try {
            deliveryService.rejectRequest(id, p.getId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ===============================================
    // Phase 8: Pickup and OTP Verification
    // ===============================================

    @PatchMapping("/orders/{id}/pickup")
    public ResponseEntity<?> pickupOrder(@PathVariable Long id) {
        DeliveryPartner p = getCurrentPartner();
        if (p == null) return ResponseEntity.status(403).build();

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !p.getId().equals(order.getDeliveryPartnerId())) {
            return ResponseEntity.status(403).body("Not authorized for this order");
        }

        if (!OrderStatus.DELIVERY_ASSIGNED.equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().body("Order is not in ASSIGNED state");
        }

        // Generate 6-digit OTP
        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        
        order.setOrderStatus(OrderStatus.OUT_FOR_DELIVERY);
        order.setPickedUpAt(java.time.Instant.now());
        // In a real app we'd hash the OTP, but since customer needs to see it we can store it plainly securely or use BCrypt
        // We will store plaintext hash purely for demo (or use Spring password encoder)
        order.setDeliveryOtpHash(otp);
        order.setDeliveryOtpVerified(false);
        orderRepository.save(order);

        // Send OTP to customer via Notification
        notificationService.notifyCustomer(
            order, 
            "Order Picked Up", 
            "Partner is on the way! Your Delivery OTP is: " + otp, 
            "OUT_FOR_DELIVERY"
        );

        return ResponseEntity.ok("Order picked up. OTP generated.");
    }

    @PatchMapping("/orders/{id}/verify-otp")
    public ResponseEntity<?> verifyOtp(@PathVariable Long id, @RequestParam String otp) {
        DeliveryPartner p = getCurrentPartner();
        if (p == null) return ResponseEntity.status(403).build();

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !p.getId().equals(order.getDeliveryPartnerId())) {
            return ResponseEntity.status(403).body("Not authorized for this order");
        }

        if (!OrderStatus.OUT_FOR_DELIVERY.equals(order.getOrderStatus())) {
            return ResponseEntity.badRequest().body("Order is not OUT_FOR_DELIVERY");
        }

        if (order.getDeliveryOtpHash() != null && order.getDeliveryOtpHash().equals(otp)) {
            order.setOrderStatus(OrderStatus.DELIVERED);
            order.setDeliveredAt(java.time.Instant.now());
            order.setDeliveryOtpVerified(true);
            orderRepository.save(order);

            // Phase 12 - Record Ledger correctly
            if ("COD".equalsIgnoreCase(order.getPaymentMethod())) {
                Settlement codSettlement = Settlement.builder()
                    .orderId(order.getId())
                    .shopId(order.getShopId())
                    .deliveryPartnerId(p.getId())
                    .amount(order.getTotalAmount()) // COD holding amount
                    .settlementType("COD_COLLECTION")
                    .status("PENDING")
                    .dueAt(java.time.Instant.now().plus(2, java.time.temporal.ChronoUnit.DAYS))
                    .build();
                settlementRepository.save(codSettlement);
            } else {
                // If it is UPI, records the splits immediately
                Settlement partnerEarning = Settlement.builder()
                    .orderId(order.getId())
                    .shopId(order.getShopId())
                    .deliveryPartnerId(p.getId())
                    .amount(order.getDeliveryFee() != null ? order.getDeliveryFee() : 0.0)
                    .settlementType("PARTNER_EARNING")
                    .paymentMethod("UPI")
                    .status("PAID") // Instantly settled virtually since paid online
                    .build();
                
                Settlement ruvoFee = Settlement.builder()
                    .orderId(order.getId())
                    .shopId(order.getShopId())
                    .amount(order.getPlatformFee() != null ? order.getPlatformFee() : 0.0)
                    .settlementType("RUVO_PLATFORM_FEE")
                    .paymentMethod("UPI")
                    .status("PAID")
                    .build();
                settlementRepository.saveAll(java.util.List.of(partnerEarning, ruvoFee));
            }

            notificationService.notifyCustomer(order, "Delivered", "Your order has been delivered using OTP verification.", "DELIVERED");
            return ResponseEntity.ok("OTP Verified. Order Delivered successfully!");
        } else {
            return ResponseEntity.badRequest().body("Invalid OTP");
        }
    }
}
