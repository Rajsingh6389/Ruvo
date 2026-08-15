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

    public PartnerController(UserRepository userRepository, DeliveryRepository deliveryRepository,
                             OrderRepository orderRepository, PasswordEncoder encoder, JwtService jwt) {
        this.userRepository = userRepository;
        this.deliveryRepository = deliveryRepository;
        this.orderRepository = orderRepository;
        this.encoder = encoder;
        this.jwt = jwt;
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
            @RequestParam boolean available) {
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        partner.setIsAvailable(available);
        userRepository.save(partner);
        return ResponseEntity.ok(Map.of("success", true, "isAvailable", available));
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
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        List<Delivery> allDeliveries = deliveryRepository.findByPartnerId(partner.getId());
        List<Delivery> active = new ArrayList<>();
        for (Delivery d : allDeliveries) {
            if ("ASSIGNED".equalsIgnoreCase(d.getStatus()) ||
                "PICKED_UP".equalsIgnoreCase(d.getStatus()) ||
                "OUT_FOR_DELIVERY".equalsIgnoreCase(d.getStatus())) {
                active.add(d);
            }
        }
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
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Delivery request not found."));
        }

        if (!"CREATED".equalsIgnoreCase(delivery.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "This run has already been accepted by another partner."));
        }

        delivery.setPartnerId(partner.getId());
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
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null || !partner.getId().equals(delivery.getPartnerId())) {
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
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null || !partner.getId().equals(delivery.getPartnerId())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized or invalid delivery."));
        }

        delivery.setStatus("OUT_FOR_DELIVERY");
        deliveryRepository.save(delivery);

        // Update the order status
        Optional<Order> orderOpt = orderRepository.findById(delivery.getOrderId());
        if (orderOpt.isPresent()) {
            Order order = orderOpt.get();
            order.setOrderStatus("OUT_FOR_DELIVERY");
            orderRepository.save(order);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Order is Out for Delivery."));
    }

    @PutMapping("/deliveries/{id}/delivered")
    public ResponseEntity<?> markDelivered(
            @PathVariable Long id,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        Delivery delivery = deliveryRepository.findById(id).orElse(null);
        if (delivery == null || !partner.getId().equals(delivery.getPartnerId())) {
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

        // Credit delivery fee to partner's wallet
        partner.setWalletBalance(partner.getWalletBalance().add(BigDecimal.valueOf(delivery.getDeliveryFee())));
        userRepository.save(partner);

        return ResponseEntity.ok(Map.of("success", true, "message", "Order marked as Delivered successfully!"));
    }

    @GetMapping("/earnings")
    public ResponseEntity<?> getEarnings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        List<Delivery> runs = deliveryRepository.findByPartnerId(partner.getId());
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

        return ResponseEntity.ok(Map.of(
                "todayEarnings", todayEarnings,
                "totalEarnings", totalEarnings,
                "walletBalance", partner.getWalletBalance()
        ));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Delivery>> getHistory(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User partner = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Partner not found"));

        List<Delivery> runs = deliveryRepository.findByPartnerId(partner.getId());
        List<Delivery> completed = new ArrayList<>();
        for (Delivery d : runs) {
            if ("DELIVERED".equalsIgnoreCase(d.getStatus())) {
                completed.add(d);
            }
        }
        return ResponseEntity.ok(completed);
    }
}
