package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOverviewController {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PartnerProfileRepository partnerProfileRepository;
    private final PartnerVehicleRepository partnerVehicleRepository;
    private final PartnerVerificationRepository partnerVerificationRepository;
    private final PartnerAccountRepository partnerAccountRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final SettlementRepository settlementRepository;

    public AdminOverviewController(UserRepository userRepository,
                                  ShopRepository shopRepository,
                                  PartnerProfileRepository partnerProfileRepository,
                                  PartnerVehicleRepository partnerVehicleRepository,
                                  PartnerVerificationRepository partnerVerificationRepository,
                                  PartnerAccountRepository partnerAccountRepository,
                                  OrderRepository orderRepository,
                                  ProductRepository productRepository,
                                  PaymentRepository paymentRepository,
                                  SettlementRepository settlementRepository) {
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
        this.partnerProfileRepository = partnerProfileRepository;
        this.partnerVehicleRepository = partnerVehicleRepository;
        this.partnerVerificationRepository = partnerVerificationRepository;
        this.partnerAccountRepository = partnerAccountRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
        this.settlementRepository = settlementRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverviewStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalUsers = userRepository.count();
        long totalShops = shopRepository.count();
        long totalPartners = partnerProfileRepository.count();
        long totalOrders = orderRepository.count();
        long totalProducts = productRepository.count();

        long pendingShops = shopRepository.findAll().stream()
                .filter(s -> Boolean.FALSE.equals(s.getApproved()))
                .count();

        long pendingPartners = partnerProfileRepository.findByVerificationStatus(VerificationStatus.UNDER_REVIEW).size();

        BigDecimal totalRevenue = orderRepository.findAll().stream()
                .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
                .map(Order::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalUsers", totalUsers);
        stats.put("totalShops", totalShops);
        stats.put("totalPartners", totalPartners);
        stats.put("totalOrders", totalOrders);
        stats.put("totalProducts", totalProducts);
        stats.put("pendingShops", pendingShops);
        stats.put("pendingPartners", pendingPartners);
        stats.put("totalRevenue", totalRevenue);

        return ResponseEntity.ok(ApiResponse.ok("System overview stats retrieved", stats));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok("All users retrieved", userRepository.findAll()));
    }

    @PostMapping("/users/{id}/toggle-status")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(@PathVariable Long id) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User u = opt.get();
        if (u.getStatus() == AccountStatus.BLOCKED) {
            u.setStatus(AccountStatus.APPROVED);
        } else {
            u.setStatus(AccountStatus.BLOCKED);
        }
        User updated = userRepository.save(u);
        return ResponseEntity.ok(ApiResponse.ok("User status updated", updated));
    }

    @GetMapping("/shops")
    public ResponseEntity<ApiResponse<List<Shop>>> getAllShops() {
        return ResponseEntity.ok(ApiResponse.ok("All shops retrieved", shopRepository.findAll()));
    }

    @GetMapping("/partners")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllPartners() {
        List<PartnerProfile> profiles = partnerProfileRepository.findAll();
        List<Map<String, Object>> responseList = new ArrayList<>();

        for (PartnerProfile p : profiles) {
            User user = p.getUser();
            Optional<PartnerVehicle> vehicle = partnerVehicleRepository.findByPartnerProfile(p);
            Optional<PartnerVerification> verification = partnerVerificationRepository.findByPartnerProfile(p);

            Map<String, Object> item = new HashMap<>();
            item.put("id", p.getId());
            item.put("partnerId", p.getId());
            item.put("userId", user != null ? user.getId() : null);

            String partnerName = null;
            if (user != null && user.getName() != null && !user.getName().isBlank()) {
                partnerName = user.getName();
            } else if (verification.isPresent() && verification.get().getFullName() != null && !verification.get().getFullName().isBlank()) {
                partnerName = verification.get().getFullName();
            } else {
                partnerName = "Rider #" + p.getId();
            }

            String mobile = null;
            if (user != null && partnerAccountRepository != null) {
                mobile = partnerAccountRepository.findBySecurityUser(user)
                        .map(PartnerAccount::getMobileNumber)
                        .orElse(user.getMobileNumber());
            } else if (user != null) {
                mobile = user.getMobileNumber();
            }

            item.put("name", partnerName);
            item.put("mobileNumber", mobile != null ? mobile : "N/A");
            item.put("verificationStatus", p.getVerificationStatus() != null ? p.getVerificationStatus().name() : "APPROVED");
            item.put("status", p.getVerificationStatus() != null ? p.getVerificationStatus().name() : "APPROVED");
            item.put("isAvailable", user != null && Boolean.TRUE.equals(user.getIsAvailable()));

            if (vehicle.isPresent()) {
                Map<String, Object> vMap = new HashMap<>();
                vMap.put("vehicleType", vehicle.get().getVehicleType());
                vMap.put("vehicleNumber", vehicle.get().getVehicleNumber());
                item.put("vehicle", vMap);
            }

            if (verification.isPresent()) {
                Map<String, Object> kMap = new HashMap<>();
                kMap.put("fullName", verification.get().getFullName());
                kMap.put("address", verification.get().getAddress());
                item.put("kyc", kMap);
            }

            responseList.add(item);
        }

        return ResponseEntity.ok(ApiResponse.ok("All partners retrieved", responseList));
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<Order>>> getAllOrders() {
        return ResponseEntity.ok(ApiResponse.ok("All orders retrieved", orderRepository.findAll()));
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<Product>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.ok("All products retrieved", productRepository.findAll()));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> getAllPayments() {
        return ResponseEntity.ok(ApiResponse.ok("All payments retrieved", paymentRepository.findAll()));
    }

    @GetMapping("/settlements")
    public ResponseEntity<ApiResponse<List<Settlement>>> getAllSettlements() {
        return ResponseEntity.ok(ApiResponse.ok("All settlements retrieved", settlementRepository.findAll()));
    }
}
