package Ranex.ruvo.controller;

import Ranex.ruvo.model.Delivery;
import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.DeliveryRequest;
import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.DeliveryRepository;
import Ranex.ruvo.repository.DeliveryRequestRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.service.DeliveryService;
import Ranex.ruvo.service.NotificationService;
import Ranex.ruvo.service.RuvoCommissionService;
import Ranex.ruvo.service.CashfreeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Simple typed payload so convertAndSend doesn't get ambiguous with Map<K,V>. */
record LocationPayload(Double latitude, Double longitude) {}

/** Payload describing the current pending delivery request for a shopkeeper poll. */
record CurrentDeliveryRequestPayload(
    Long requestId,
    Long partnerId,
    String partnerName,
    String partnerPhone,
    Double distanceKm,
    String locationName,
    String expiresAt,   // ISO-8601
    String status       // PENDING | NONE | ASSIGNED
) {}

@RestController
@RequestMapping("/api/delivery")
@CrossOrigin(origins = "*")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final DeliveryRequestRepository deliveryRequestRepository;
    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Ranex.ruvo.repository.SettlementRepository settlementRepository;
    private final Ranex.ruvo.repository.UserRepository userRepository;
    private final RuvoCommissionService commissionService;
    private final CashfreeService cashfreeService;
    private final Ranex.ruvo.repository.PaymentRepository paymentRepository;
    private final Ranex.ruvo.repository.OrderItemRepository orderItemRepository;
    private final Ranex.ruvo.repository.ShopRepository shopRepository;

    public DeliveryController(DeliveryService deliveryService, 
                              DeliveryPartnerRepository deliveryPartnerRepository, 
                              DeliveryRequestRepository deliveryRequestRepository,
                              DeliveryRepository deliveryRepository,
                              OrderRepository orderRepository,
                              NotificationService notificationService,
                              SimpMessagingTemplate messagingTemplate,
                              Ranex.ruvo.repository.SettlementRepository settlementRepository,
                              Ranex.ruvo.repository.UserRepository userRepository,
                              RuvoCommissionService commissionService,
                              CashfreeService cashfreeService,
                              Ranex.ruvo.repository.PaymentRepository paymentRepository,
                              Ranex.ruvo.repository.OrderItemRepository orderItemRepository,
                              Ranex.ruvo.repository.ShopRepository shopRepository) {
        this.deliveryService = deliveryService;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.deliveryRequestRepository = deliveryRequestRepository;
        this.deliveryRepository = deliveryRepository;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.settlementRepository = settlementRepository;
        this.userRepository = userRepository;
        this.commissionService = commissionService;
        this.cashfreeService = cashfreeService;
        this.paymentRepository = paymentRepository;
        this.orderItemRepository = orderItemRepository;
        this.shopRepository = shopRepository;
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
        String principal = getCurrentUserEmail();
        if (principal == null) return null;
        if (principal.startsWith("identity:")) {
            try {
                Optional<DeliveryPartner> dpByIdentity = deliveryPartnerRepository.findByAuthIdentityId(Long.parseLong(principal.substring("identity:".length())));
                if (dpByIdentity.isPresent()) return dpByIdentity.get();
            } catch (NumberFormatException ignored) {}
        }
        Optional<DeliveryPartner> dpByUserId = deliveryPartnerRepository.findByUserId(principal);
        if (dpByUserId.isPresent()) return dpByUserId.get();

        Optional<DeliveryPartner> dpByPhone = deliveryPartnerRepository.findByPhone(principal);
        if (dpByPhone.isPresent()) return dpByPhone.get();

        Optional<Ranex.ruvo.model.User> uOpt = userRepository.findByMobileNumber(principal);
        if (uOpt.isPresent()) {
            Ranex.ruvo.model.User u = uOpt.get();
            if (u.getMobileNumber() != null) {
                Optional<DeliveryPartner> dpByMobile = deliveryPartnerRepository.findByPhone(u.getMobileNumber());
                if (dpByMobile.isPresent()) return dpByMobile.get();
            }
        }
        return null;
    }

    @PatchMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestParam Double latitude, @RequestParam Double longitude) {
        DeliveryPartner partner = getCurrentPartner();
        if (partner == null) return ResponseEntity.status(403).build();
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

        List<Ranex.ruvo.model.DeliveryRequest> pending =
            deliveryRequestRepository.findByPartnerIdAndStatus(p.getId(), "PENDING");

        // Enrich with order info for display
        List<java.util.Map<String, Object>> result = pending.stream()
            .filter(req -> !java.time.Instant.now().isAfter(req.getExpiresAt())) // only non-expired
            .map(req -> {
                Order order = orderRepository.findById(req.getOrderId()).orElse(null);
                java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("requestId", req.getId());
                map.put("orderId", req.getOrderId());
                map.put("distanceKm", req.getDistanceKm());
                map.put("expiresAt", req.getExpiresAt().toString());
                map.put("status", req.getStatus());
                if (order != null) {
                    map.put("deliveryAddress", order.getDeliveryAddress());
                    map.put("totalAmount", order.getTotalAmount());
                    map.put("paymentMethod", order.getPaymentMethod());
                    map.put("deliveryFee", order.getDeliveryFee());
                    map.put("productName", order.getProductName());
                    map.put("productImageUrl", order.getProductImageUrl());
                    map.put("quantity", order.getQuantity());

                    if (order.getShopId() != null) {
                        shopRepository.findById(order.getShopId()).ifPresent(shop -> {
                            map.put("shopName", shop.getName());
                            map.put("shopAddress", shop.getAddress());
                        });
                    }

                    List<Ranex.ruvo.model.OrderItem> items = orderItemRepository.findByOrderId(order.getId());
                    if (!items.isEmpty()) {
                        map.put("items", items);
                    } else {
                        map.put("items", List.of(Map.of(
                            "productName", order.getProductName() != null ? order.getProductName() : "Product #" + order.getProductId(),
                            "quantity", order.getQuantity() != null ? order.getQuantity() : 1,
                            "priceAtOrder", order.getTotalAmount() != null ? order.getTotalAmount() : 0,
                            "productImageUrl", order.getProductImageUrl() != null ? order.getProductImageUrl() : ""
                        )));
                    }
                }
                return map;
            })
            .toList();

        return ResponseEntity.ok(result);
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

        // Sync Delivery entity status
        Delivery delivery = deliveryRepository.findByOrderId(order.getId()).orElse(null);
        if (delivery != null) {
            delivery.setStatus("OUT_FOR_DELIVERY");
            delivery.setPickedUpAt(java.time.Instant.now());
            deliveryRepository.save(delivery);
        }

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

            // Sync Delivery entity status
            Delivery delivery = deliveryRepository.findByOrderId(order.getId()).orElse(null);
            if (delivery != null) {
                delivery.setStatus("DELIVERED");
                delivery.setDeliveredAt(java.time.Instant.now());
                deliveryRepository.save(delivery);
            }

            // Phase 12 - Record Ledger correctly
            if ("COD".equalsIgnoreCase(order.getPaymentMethod())) {
                Settlement codSettlement = Settlement.builder()
                    .shopId(order.getShopId())
                    .deliveryPartnerId(p.getId())
                    .deliveryPartnerName(p.getName())
                    .orderCount(1)
                    .codCollected(order.getTotalAmount() != null ? order.getTotalAmount() : java.math.BigDecimal.ZERO)
                    .deliveryCharge(order.getDeliveryFee() != null ? order.getDeliveryFee() : java.math.BigDecimal.ZERO)
                    .ruvoCommission(order.getPlatformFee() != null ? order.getPlatformFee() : java.math.BigDecimal.ZERO)
                    .netCashToShop((order.getTotalAmount() != null ? order.getTotalAmount() : java.math.BigDecimal.ZERO).subtract(order.getDeliveryFee() != null ? order.getDeliveryFee() : java.math.BigDecimal.ZERO))
                    .amount(order.getTotalAmount() != null ? order.getTotalAmount() : java.math.BigDecimal.ZERO) // COD holding amount
                    .settlementType("COD_COLLECTION")
                    .status("PENDING")
                    .dueAt(java.time.Instant.now().plus(2, java.time.temporal.ChronoUnit.DAYS))
                    .build();
                settlementRepository.save(codSettlement);
            } else {
                // ─── UPI / ONLINE PAYMENT ────────────────────────────────
                // Customer already paid via Cashfree. The Cashfree split routed:
                //   productAmount → shop vendor account
                //   deliveryFee   → RuVo (to forward to partner)
                //   platformFee   → RuVo (platform revenue)
                //
                // Create 3 settlement records for full audit trail:

                java.math.BigDecimal deliveryFee = order.getDeliveryFee() != null
                    ? order.getDeliveryFee() : java.math.BigDecimal.ZERO;
                java.math.BigDecimal platformFee = order.getPlatformFee() != null
                    ? order.getPlatformFee() : java.math.BigDecimal.ZERO;
                java.math.BigDecimal totalAmount = order.getTotalAmount() != null
                    ? order.getTotalAmount() : java.math.BigDecimal.ZERO;

                // 1. Partner delivery earning (RuVo owes partner this amount)
                Settlement partnerEarning = Settlement.builder()
                    .shopId(order.getShopId())
                    .deliveryPartnerId(p.getId())
                    .deliveryPartnerName(p.getName())
                    .orderCount(1)
                    .amount(deliveryFee)
                    .settlementType("PARTNER_EARNING")
                    .paymentMethod("UPI")
                    .status("PAID")
                    .build();

                // 2. RuVo platform fee (already collected via Cashfree split)
                Settlement ruvoFee = Settlement.builder()
                    .shopId(order.getShopId())
                    .amount(platformFee)
                    .settlementType("RUVO_PLATFORM_FEE")
                    .paymentMethod("UPI")
                    .status("PAID")
                    .build();

                // 3. Shop UPI revenue (what shop received from Cashfree split)
                java.math.BigDecimal shopNetRevenue = totalAmount.subtract(deliveryFee).subtract(platformFee)
                    .max(java.math.BigDecimal.ZERO);

                Settlement shopRevenue = Settlement.builder()
                    .shopId(order.getShopId())
                    .deliveryPartnerId(p.getId())
                    .deliveryPartnerName(p.getName())
                    .orderCount(1)
                    .amount(shopNetRevenue)
                    .codCollected(totalAmount)
                    .deliveryCharge(deliveryFee)
                    .ruvoCommission(platformFee)
                    .netCashToShop(shopNetRevenue)
                    .settlementType("SHOP_UPI_REVENUE")
                    .paymentMethod("UPI")
                    .status("PAID")
                    .build();

                settlementRepository.saveAll(java.util.List.of(partnerEarning, ruvoFee, shopRevenue));

                // Track commission in ledger (idempotent — prevents double-entry)
                try {
                    commissionService.accrueCommission(
                        order.getShopId(),
                        order.getId(),
                        shopRevenue.getId(),
                        platformFee
                    );
                } catch (Exception e) {
                    System.err.println("[DeliveryController] Commission accrual failed for UPI order #"
                        + order.getId() + ": " + e.getMessage());
                }

                // ─── INSTANT DELIVERY FEE TRANSFER TO PARTNER ─────────────
                // If partner has a Cashfree vendor ID, transfer delivery fee
                // instantly via Cashfree post-payment split API.
                // Otherwise, the PARTNER_EARNING ledger record tracks what
                // RuVo owes the partner (manual payout later).
                if (p.getCashfreeVendorId() != null && !p.getCashfreeVendorId().isBlank()
                        && deliveryFee.compareTo(java.math.BigDecimal.ZERO) > 0) {
                    try {
                        // Find the Cashfree order ID for this order
                        paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
                            String cfOrderId = payment.getCashfreeOrderId();
                            if (cfOrderId != null && !cfOrderId.isBlank()) {
                                cashfreeService.transferToVendor(
                                    cfOrderId,
                                    p.getCashfreeVendorId(),
                                    deliveryFee,
                                    String.valueOf(order.getId())
                                );
                                System.out.println("[DeliveryController] Instant transfer ₹"
                                    + deliveryFee + " to partner #" + p.getId()
                                    + " (vendor: " + p.getCashfreeVendorId() + ")"
                                    + " for order #" + order.getId());
                            }
                        });
                    } catch (Exception e) {
                        // Transfer failed — partner still has the PARTNER_EARNING record
                        // RuVo can settle manually. Don't block delivery confirmation.
                        System.err.println("[DeliveryController] Cashfree transfer to partner failed for order #"
                            + order.getId() + ": " + e.getMessage()
                            + " — partner earning tracked in ledger for manual payout.");
                    }
                }
            }

            notificationService.notifyCustomer(order, "Delivered", "Your order has been delivered using OTP verification.", "DELIVERED");
            return ResponseEntity.ok("OTP Verified. Order Delivered successfully!");
        } else {
            return ResponseEntity.badRequest().body("Invalid OTP");
        }
    }

    // ===============================================
    // GET current pending delivery request (shopkeeper poll)
    // ===============================================

    @GetMapping("/orders/{orderId}/current-request")
    public ResponseEntity<?> getCurrentRequest(@PathVariable Long orderId) {
        // Allow shopkeepers (or any authenticated user) to check assignment status
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        // If already assigned, return ASSIGNED sentinel
        if (OrderStatus.DELIVERY_ASSIGNED.equals(order.getOrderStatus())
                || OrderStatus.PICKED_UP.equals(order.getOrderStatus())
                || OrderStatus.OUT_FOR_DELIVERY.equals(order.getOrderStatus())
                || OrderStatus.DELIVERED.equals(order.getOrderStatus())) {
            return ResponseEntity.ok(new CurrentDeliveryRequestPayload(
                null, order.getDeliveryPartnerId(), null, null, null, null, null, "ASSIGNED"
            ));
        }

        // Find latest PENDING request
        java.util.Optional<Ranex.ruvo.model.DeliveryRequest> reqOpt =
            deliveryRequestRepository.findTopByOrderIdAndStatusOrderBySentAtDesc(orderId, "PENDING");

        if (reqOpt.isEmpty()) {
            return ResponseEntity.ok(new CurrentDeliveryRequestPayload(
                null, null, null, null, null, null, null, "NONE"
            ));
        }

        Ranex.ruvo.model.DeliveryRequest req = reqOpt.get();
        DeliveryPartner partner = deliveryPartnerRepository.findById(req.getPartnerId()).orElse(null);

        String displayPartnerName = partner != null ? partner.getName() : "Partner";
        if (partner != null && ("New Partner".equalsIgnoreCase(displayPartnerName) || displayPartnerName == null)) {
            Optional<Ranex.ruvo.model.User> uOpt = userRepository.findByMobileNumber(partner.getUserId())
                    .or(() -> partner.getPhone() != null ? userRepository.findByMobileNumber(partner.getPhone()) : Optional.empty());
            if (uOpt.isPresent() && uOpt.get().getName() != null && !"New Partner".equalsIgnoreCase(uOpt.get().getName())) {
                displayPartnerName = uOpt.get().getName();
                partner.setName(displayPartnerName);
                deliveryPartnerRepository.save(partner);
            }
        }

        return ResponseEntity.ok(new CurrentDeliveryRequestPayload(
            req.getId(),
            req.getPartnerId(),
            displayPartnerName,
            partner != null ? partner.getPhone() : "",
            req.getDistanceKm(),
            partner != null && partner.getLocationName() != null ? partner.getLocationName() : "Live Location",
            req.getExpiresAt().toString(),
            "PENDING"
        ));
    }

    // ===============================================
    // POST cancel delivery assignment / order by shopkeeper
    // ===============================================

    @PostMapping("/orders/{orderId}/cancel-by-shop")
    public ResponseEntity<?> cancelOrderByShop(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        // Expire all pending delivery requests for this order
        List<Ranex.ruvo.model.DeliveryRequest> requests = deliveryRequestRepository.findByOrderId(orderId);
        for (Ranex.ruvo.model.DeliveryRequest req : requests) {
            if ("PENDING".equals(req.getStatus())) {
                req.setStatus("EXPIRED");
                deliveryRequestRepository.save(req);
            }
        }

        // Set order status to CANCELLED_BY_SHOP
        order.setOrderStatus(OrderStatus.CANCELLED_BY_SHOP);
        orderRepository.save(order);

        // Notify customer
        notificationService.notifyCustomer(
            order,
            "Order Cancelled",
            "The shop has cancelled this order request.",
            "CANCELLED_BY_SHOP"
        );

        return ResponseEntity.ok("Order delivery assignment cancelled by shopkeeper.");
    }
}
