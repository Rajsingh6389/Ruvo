package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.dto.AuthDtos.AuthToken;
import Ranex.ruvo.dto.AuthDtos.RegisterRequest;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import Ranex.ruvo.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/partner")
public class PartnerController {

    private final UserRepository userRepository;
    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final ShopRepository shopRepository;

    public PartnerController(UserRepository userRepository, DeliveryRepository deliveryRepository,
                             OrderRepository orderRepository, PasswordEncoder encoder, JwtService jwt,
                             DeliveryPartnerRepository deliveryPartnerRepository,
                             ShopRepository shopRepository) {
        this.userRepository = userRepository;
        this.deliveryRepository = deliveryRepository;
        this.orderRepository = orderRepository;
        this.encoder = encoder;
        this.jwt = jwt;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.shopRepository = shopRepository;
    }

    private DeliveryPartner resolveDeliveryPartner(org.springframework.security.core.userdetails.User principal) {
        if (principal == null) return null;
        String username = principal.getUsername();
        if (username != null && username.startsWith("identity:")) {
            try {
                Long identityId = Long.parseLong(username.substring(9));
                Optional<DeliveryPartner> dp = deliveryPartnerRepository.findByAuthIdentityId(identityId);
                if (dp.isPresent()) return dp.get();
            } catch (Exception ignored) {}
        }
        Optional<DeliveryPartner> dpByUserId = deliveryPartnerRepository.findByUserId(username);
        if (dpByUserId.isPresent()) return dpByUserId.get();

        Optional<DeliveryPartner> dpByPhone = deliveryPartnerRepository.findByPhone(username);
        if (dpByPhone.isPresent()) return dpByPhone.get();

        Optional<User> uOpt = userRepository.findByEmail(username);
        if (uOpt.isPresent()) {
            User u = uOpt.get();
            if (u.getMobileNumber() != null) {
                Optional<DeliveryPartner> dpByMobile = deliveryPartnerRepository.findByPhone(u.getMobileNumber());
                if (dpByMobile.isPresent()) return dpByMobile.get();
            }
        }
        return null;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequest r) {
        if (userRepository.existsByEmail(r.email().toLowerCase())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.ok("Email already registered", null));
        }

        User u = userRepository.save(User.builder()
                .name(r.name())
                .email(r.email().toLowerCase())
                .password(encoder.encode(r.password()))
                .mobileNumber(r.mobileNumber())
                .role(Role.DELIVERY_PARTNER)
                .status(AccountStatus.APPROVED)
                .isAvailable(false)
                .build());

        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.ok("Partner registration successful",
                        new AuthToken(jwt.create(u), "Bearer", u.getId(), u.getRole().name()))
        );
    }

    @PutMapping("/availability")
    public ResponseEntity<?> toggleAvailability(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal,
            @RequestParam boolean available,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) String locationName) {

        if (principal != null) {
            String username = principal.getUsername();
            Optional<User> uOpt = userRepository.findByEmail(username);
            if (uOpt.isPresent()) {
                User u = uOpt.get();
                u.setIsAvailable(available);
                userRepository.save(u);
            }
        }

        DeliveryPartner dp = resolveDeliveryPartner(principal);
        if (dp != null) {
            dp.setAvailable(available);
            if (latitude != null) dp.setLatitude(latitude);
            if (longitude != null) dp.setLongitude(longitude);
            if (locationName != null && !locationName.isBlank()) dp.setLocationName(locationName);
            dp.setLastActiveAt(Instant.now());
            deliveryPartnerRepository.save(dp);
        }

        return ResponseEntity.ok(Map.of("success", true, "isAvailable", available));
    }

    @PutMapping("/location")
    public ResponseEntity<?> updateLocation(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(required = false) String locationName) {

        DeliveryPartner dp = resolveDeliveryPartner(principal);
        if (dp != null) {
            dp.setLatitude(latitude);
            dp.setLongitude(longitude);
            if (locationName != null && !locationName.isBlank()) {
                dp.setLocationName(locationName);
            }
            dp.setLastActiveAt(Instant.now());
            deliveryPartnerRepository.save(dp);
        }

        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/deliveries/available")
    public ResponseEntity<List<Delivery>> getAvailableDeliveries(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        // Only return deliveries in status CREATED (unassigned)
        List<Delivery> deliveries = deliveryRepository.findByStatus("CREATED");
        return ResponseEntity.ok(deliveries);
    }

    @GetMapping("/deliveries")
    public ResponseEntity<List<Delivery>> getActiveDeliveries(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {

        // Delivery.partnerId references DeliveryPartner.id — NOT User.id.
        // We must resolve the DeliveryPartner record to get the correct ID.
        DeliveryPartner dp = resolveDeliveryPartner(principal);
        if (dp == null) {
            // Fallback: try via User ID (legacy delivery records if any)
            try {
                User partner = userRepository.findByEmail(principal.getUsername())
                        .orElseThrow(() -> new RuntimeException("Partner not found"));
                List<Delivery> allDeliveries = deliveryRepository.findByPartnerId(partner.getId());
                List<Delivery> active = allDeliveries.stream()
                        .filter(d -> "ASSIGNED".equalsIgnoreCase(d.getStatus())
                                || "PICKED_UP".equalsIgnoreCase(d.getStatus())
                                || "OUT_FOR_DELIVERY".equalsIgnoreCase(d.getStatus()))
                        .toList();
                return ResponseEntity.ok(active);
            } catch (Exception e) {
                return ResponseEntity.ok(List.of());
            }
        }

        List<Delivery> allDeliveries = deliveryRepository.findByPartnerId(dp.getId());
        List<Delivery> active = allDeliveries.stream()
                .filter(d -> "ASSIGNED".equalsIgnoreCase(d.getStatus())
                        || "PICKED_UP".equalsIgnoreCase(d.getStatus())
                        || "OUT_FOR_DELIVERY".equalsIgnoreCase(d.getStatus()))
                .toList();
        return ResponseEntity.ok(active);
    }

    @GetMapping("/deliveries/{id}")
    public ResponseEntity<?> getDeliveryDetails(@PathVariable Long id) {
        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Delivery request not found."));
        }
        return ResponseEntity.ok(delivery);
    }

    @PostMapping("/deliveries/{id}/accept")
    public ResponseEntity<?> acceptDelivery(
            @PathVariable Long id,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Delivery request not found."));
        }

        if (!"CREATED".equalsIgnoreCase(delivery.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "This run has already been accepted by another partner."));
        }

        DeliveryPartner dp = resolveDeliveryPartner(principal);
        User partner = userRepository.findByEmail(principal.getUsername()).orElse(null);
        Long pId = dp != null ? dp.getId() : (partner != null ? partner.getId() : null);

        delivery.setPartnerId(pId);
        delivery.setStatus("ASSIGNED");
        delivery.setAssignedAt(Instant.now());
        deliveryRepository.save(delivery);

        // Update the order status
        Optional<Order> orderOpt = orderRepository.findById(delivery.getOrderId());
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setOrderStatus("PARTNER_ASSIGNED");
            orderRepository.save(order);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Delivery run accepted successfully."));
    }

    @PostMapping("/deliveries/{id}/reject")
    public ResponseEntity<?> rejectDelivery(@PathVariable Long id) {
        // Typically a reject just closes/ignores the delivery card on the partner's UI,
        // so it remains in CREATED status for other partners to accept.
        return ResponseEntity.ok(Map.of("success", true, "message", "Delivery run ignored."));
    }

    @PutMapping("/deliveries/{id}/pickup")
    public ResponseEntity<?> markPickedUp(
            @PathVariable Long id,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        DeliveryPartner dp = resolveDeliveryPartner(principal);
        User partner = userRepository.findByEmail(principal.getUsername()).orElse(null);

        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Delivery request not found."));
        }

        boolean isAuthorized = (dp != null && dp.getId().equals(delivery.getPartnerId()))
                || (partner != null && partner.getId().equals(delivery.getPartnerId()));

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized or invalid delivery."));
        }

        delivery.setStatus("PICKED_UP");
        delivery.setPickedUpAt(Instant.now());
        deliveryRepository.save(delivery);

        // Update the order status
        Optional<Order> orderOpt = orderRepository.findById(delivery.getOrderId());
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setOrderStatus("PICKED_UP");
            orderRepository.save(order);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Order marked as Picked Up."));
    }

    @PutMapping("/deliveries/{id}/out-for-delivery")
    public ResponseEntity<?> markOutForDelivery(
            @PathVariable Long id,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        DeliveryPartner dp = resolveDeliveryPartner(principal);
        User partner = userRepository.findByEmail(principal.getUsername()).orElse(null);

        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Delivery request not found."));
        }

        boolean isAuthorized = (dp != null && dp.getId().equals(delivery.getPartnerId()))
                || (partner != null && partner.getId().equals(delivery.getPartnerId()));

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized or invalid delivery."));
        }

        delivery.setStatus("OUT_FOR_DELIVERY");
        deliveryRepository.save(delivery);

        // Update the order status & generate 6-digit Delivery Verification OTP if missing
        Optional<Order> orderOpt = orderRepository.findById(delivery.getOrderId());
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setOrderStatus("OUT_FOR_DELIVERY");
            if (order.getDeliveryOtpHash() == null || order.getDeliveryOtpHash().trim().isEmpty()) {
                String otp = String.format("%06d", new java.util.Random().nextInt(999999));
                order.setDeliveryOtpHash(otp);
                order.setDeliveryOtpVerified(false);
            }
            orderRepository.save(order);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Order is Out for Delivery."));
    }

    @PutMapping("/deliveries/{id}/delivered")
    public ResponseEntity<?> markDelivered(
            @PathVariable Long id,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        DeliveryPartner dp = resolveDeliveryPartner(principal);
        User partner = userRepository.findByEmail(principal.getUsername()).orElse(null);

        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Delivery request not found."));
        }

        boolean isAuthorized = (dp != null && dp.getId().equals(delivery.getPartnerId()))
                || (partner != null && partner.getId().equals(delivery.getPartnerId()));

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized or invalid delivery."));
        }

        delivery.setStatus("DELIVERED");
        delivery.setDeliveredAt(Instant.now());
        deliveryRepository.save(delivery);

        // Update the order status
        Optional<Order> orderOpt = orderRepository.findById(delivery.getOrderId());
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setOrderStatus("DELIVERED");
            order.setPaymentStatus("PAID"); // Mark as paid upon delivery (crucial for COD)
            orderRepository.save(order);
        }

        // Credit delivery fee to partner's wallet if partner account exists
        if (partner != null) {
            partner.setWalletBalance(partner.getWalletBalance().add(BigDecimal.valueOf(delivery.getDeliveryFee())));
            userRepository.save(partner);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Order marked as Delivered successfully!"));
    }

    @GetMapping("/earnings")
    public ResponseEntity<?> getEarnings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        DeliveryPartner dp = resolveDeliveryPartner(principal);
        User partner = userRepository.findByEmail(principal.getUsername()).orElse(null);

        Long partnerId = dp != null ? dp.getId() : (partner != null ? partner.getId() : null);
        if (partnerId == null) {
            return ResponseEntity.ok(Map.of("todayEarnings", 0.0, "totalEarnings", 0.0, "walletBalance", 0.0));
        }

        List<Delivery> runs = deliveryRepository.findByPartnerId(partnerId);
        double totalEarnings = 0;
        double todayEarnings = 0;

        Instant startOfToday = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();

        for (Delivery d : runs) {
            if ("DELIVERED".equalsIgnoreCase(d.getStatus())) {
                totalEarnings += d.getDeliveryFee();
                if (d.getDeliveredAt() != null && d.getDeliveredAt().isAfter(startOfToday)) {
                    todayEarnings += d.getDeliveryFee();
                }
            }
        }

        BigDecimal walletBalance = partner != null ? partner.getWalletBalance() : BigDecimal.ZERO;

        return ResponseEntity.ok(Map.of(
                "todayEarnings", todayEarnings,
                "totalEarnings", totalEarnings,
                "walletBalance", walletBalance
        ));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getHistory(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        DeliveryPartner dp = resolveDeliveryPartner(principal);
        User partner = userRepository.findByEmail(principal.getUsername()).orElse(null);

        Long partnerId = dp != null ? dp.getId() : (partner != null ? partner.getId() : null);
        if (partnerId == null) {
            return ResponseEntity.ok(List.of());
        }

        List<Delivery> runs = deliveryRepository.findByPartnerId(partnerId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Delivery d : runs) {
            if ("DELIVERED".equalsIgnoreCase(d.getStatus())) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", d.getId());
                item.put("orderId", d.getOrderId());
                item.put("status", d.getStatus());
                item.put("pickupLocation", d.getPickupLocation());
                item.put("deliveryLocation", d.getDeliveryLocation());
                item.put("deliveryFee", d.getDeliveryFee());
                item.put("deliveredAt", d.getDeliveredAt() != null ? d.getDeliveredAt().toString() : null);
                item.put("assignedAt", d.getAssignedAt() != null ? d.getAssignedAt().toString() : null);

                // Enrich with order details (COD amount, payment method, shop info)
                orderRepository.findById(d.getOrderId()).ifPresent(order -> {
                    item.put("paymentMethod", order.getPaymentMethod());
                    item.put("totalAmount", order.getTotalAmount());
                    item.put("codCollected", "COD".equalsIgnoreCase(order.getPaymentMethod()) ? order.getTotalAmount() : 0);
                    item.put("shopId", order.getShopId());
                    // Fetch shop name for display
                    shopRepository.findById(order.getShopId()).ifPresent(shop -> {
                        item.put("shopName", shop.getName());
                    });
                });

                result.add(item);
            }
        }

        // Sort descending by deliveredAt
        result.sort((a, b) -> {
            String ta = (String) a.get("deliveredAt");
            String tb = (String) b.get("deliveredAt");
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return tb.compareTo(ta);
        });

        return ResponseEntity.ok(result);
    }

    /** 
     * Partner calls this to generate a 4-digit OTP for shop COD cash handover verification.
     * Shopkeeper reads the OTP and the partner presents it; shopkeeper confirms.
     */
    @PostMapping("/settlements/{orderId}/generate-handover-otp")
    public ResponseEntity<?> generateHandoverOtp(
            @PathVariable Long orderId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        DeliveryPartner dp = resolveDeliveryPartner(principal);
        User partner = userRepository.findByEmail(principal.getUsername()).orElse(null);
        Long partnerId = dp != null ? dp.getId() : (partner != null ? partner.getId() : null);

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Order order = orderOpt.get();
        if (!partnerId.equals(order.getDeliveryPartnerId())) {
            return ResponseEntity.status(403).body("Not authorized for this order");
        }

        // Generate 4-digit OTP and store as handoverOtp on order
        String otp = String.format("%04d", new java.util.Random().nextInt(10000));
        order.setHandoverOtp(otp);
        order.setHandoverOtpGeneratedAt(Instant.now());
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of("handoverOtp", otp, "message", "Show this OTP to the shopkeeper."));
    }

    /**
     * Shopkeeper calls this to verify the handover OTP and confirm COD cash receipt.
     * Once verified, settlement is marked PAID.
     */
    @PostMapping("/settlements/{orderId}/verify-handover-otp")
    public ResponseEntity<?> verifyHandoverOtp(
            @PathVariable Long orderId,
            @RequestParam String otp) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Order order = orderOpt.get();

        if (order.getHandoverOtp() == null || !order.getHandoverOtp().equals(otp)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid OTP. Please try again."));
        }

        // Expire check: 10 minutes
        if (order.getHandoverOtpGeneratedAt() != null &&
                Instant.now().isAfter(order.getHandoverOtpGeneratedAt().plusSeconds(600))) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "OTP has expired. Please ask partner to regenerate."));
        }

        order.setHandoverOtp(null);
        order.setHandoverOtpGeneratedAt(null);
        order.setHandoverVerified(true);
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of("success", true, "message", "Cash handover verified. Settlement complete."));
    }
}
