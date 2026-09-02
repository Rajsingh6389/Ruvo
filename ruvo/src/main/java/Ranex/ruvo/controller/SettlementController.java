package Ranex.ruvo.controller;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.SettlementRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.service.SettlementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/settlements")
@CrossOrigin(origins = "*")
public class SettlementController {

    private final SettlementService settlementService;
    private final SettlementRepository settlementRepository;
    private final ShopRepository shopRepository;
    private final OrderRepository orderRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public SettlementController(SettlementService settlementService,
                                SettlementRepository settlementRepository,
                                ShopRepository shopRepository,
                                OrderRepository orderRepository,
                                DeliveryPartnerRepository deliveryPartnerRepository) {
        this.settlementService = settlementService;
        this.settlementRepository = settlementRepository;
        this.shopRepository = shopRepository;
        this.orderRepository = orderRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    /**
     * GET /api/settlements/partner?partnerId=1
     * Partner-side Master Summary & Shop-wise List
     */
    @GetMapping("/partner")
    public ResponseEntity<?> getPartnerSettlements(@RequestParam Long partnerId) {
        List<Order> partnerOrders = orderRepository.findByDeliveryPartnerId(partnerId).stream()
            .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
            .toList();

        // COD: partner physically collected cash from customer
        BigDecimal codCollected = partnerOrders.stream()
            .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Total delivery earnings (COD + UPI orders)
        BigDecimal deliveryEarnings = partnerOrders.stream()
            .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // COD delivery charges only (what partner physically owes to shops)
        BigDecimal codDeliveryCharges = partnerOrders.stream()
            .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // UPI orders: partner doesn't hold cash, already settled digitally
        BigDecimal upiDeliveryEarnings = partnerOrders.stream()
            .filter(o -> !"COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Net physical cash partner holds (COD only minus COD delivery fees)
        BigDecimal netCashToShops = codCollected.subtract(codDeliveryCharges).max(BigDecimal.ZERO);

        List<Settlement> pendingSettlements = settlementRepository.findByDeliveryPartnerIdAndStatusIn(
            partnerId, List.of("PENDING", "OTP_GENERATED", "AWAITING_CONFIRMATION", "OVERDUE")
        );

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("partnerId", partnerId);
        summary.put("codCollected", codCollected);
        summary.put("deliveryEarnings", deliveryEarnings);
        summary.put("codDeliveryEarnings", codDeliveryCharges);
        summary.put("upiDeliveryEarnings", upiDeliveryEarnings);
        summary.put("netCashToShops", netCashToShops);
        summary.put("pendingSettlementsCount", pendingSettlements.size());

        // Shop-wise list
        List<Map<String, Object>> shopList = new ArrayList<>();

        Map<Long, List<Order>> byShop = partnerOrders.stream()
            .filter(o -> o.getShopId() != null)
            .collect(Collectors.groupingBy(Order::getShopId));

        byShop.forEach((shopId, orders) -> {
            BigDecimal sCod = orders.stream()
                .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal sDel = orders.stream()
                .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal sRuv = orders.stream()
                .map(o -> o.getPlatformFee() != null ? o.getPlatformFee() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Net cash: for COD orders, partner holds cash minus delivery charge
            BigDecimal sNetCod = sCod.subtract(
                orders.stream()
                    .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
                    .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
            ).max(BigDecimal.ZERO);

            String shopName = shopRepository.findById(shopId).map(Shop::getName).orElse("Shop #" + shopId);

            // Check for pending COD settlement
            Optional<Settlement> sOpt = settlementRepository.findByDeliveryPartnerIdAndShopIdAndStatusIn(
                partnerId, shopId, List.of("PENDING", "OTP_GENERATED", "AWAITING_CONFIRMATION", "COMPLETED")
            );

            boolean hasCodOrders = orders.stream().anyMatch(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()));
            String status = hasCodOrders ? sOpt.map(Settlement::getStatus).orElse("PENDING") : "UPI_SETTLED";

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("shopId", shopId);
            item.put("shopName", shopName);
            item.put("ordersCount", orders.size());
            item.put("codCount", (int) orders.stream().filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod())).count());
            item.put("upiCount", (int) orders.stream().filter(o -> !"COD".equalsIgnoreCase(o.getPaymentMethod())).count());
            item.put("codCollected", sCod);
            item.put("deliveryCharge", sDel);
            item.put("ruvoCommission", sRuv);
            item.put("netCashToShop", sNetCod);
            item.put("partnerGrossEarning", sDel);
            item.put("partnerNetEarning", sDel.subtract(sRuv).max(BigDecimal.ZERO));
            item.put("status", status);
            shopList.add(item);
        });

        summary.put("shops", shopList);
        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/settlements/partner/shop/{shopId}
     * Specific partner & shop detail
     */
    @GetMapping("/partner/shop/{shopId}")
    public ResponseEntity<?> getPartnerShopDetail(@PathVariable Long shopId, @RequestParam Long partnerId) {
        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) {
            return ResponseEntity.notFound().build();
        }

        List<Order> orders = orderRepository.findByShopId(shopId).stream()
            .filter(o -> partnerId.equals(o.getDeliveryPartnerId()))
            .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
            .toList();

        BigDecimal codCollected = orders.stream()
            .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal deliveryCharge = orders.stream()
            .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal ruvoCommission = orders.stream()
            .map(o -> o.getPlatformFee() != null ? o.getPlatformFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netCashToShop = codCollected.subtract(deliveryCharge).max(BigDecimal.ZERO);

        Optional<Settlement> sOpt = settlementRepository.findByDeliveryPartnerIdAndShopIdAndStatusIn(
            partnerId, shopId, List.of("PENDING", "OTP_GENERATED", "AWAITING_CONFIRMATION", "COMPLETED")
        );
        String status = sOpt.map(Settlement::getStatus).orElse("PENDING");
        String settlementId = sOpt.map(Settlement::getSettlementId).orElse(null);

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("settlementId", settlementId);
        detail.put("shopId", shopId);
        detail.put("shopName", shop.getName());
        detail.put("deliveryPartnerId", partnerId);
        detail.put("ordersCount", orders.size());
        detail.put("codCollected", codCollected);
        detail.put("deliveryCharge", deliveryCharge);
        detail.put("ruvoCommission", ruvoCommission);
        detail.put("netCashToShop", netCashToShop);
        detail.put("partnerGrossEarning", deliveryCharge);
        detail.put("partnerNetEarning", deliveryCharge.subtract(ruvoCommission).max(BigDecimal.ZERO));
        detail.put("status", status);
        return ResponseEntity.ok(detail);
    }

    /**
     * GET /api/settlements/shopkeeper?shopId=1
     * Shopkeeper-side Master Summary & Partner-wise Table
     */
    @GetMapping("/shopkeeper")
    public ResponseEntity<?> getShopkeeperSettlements(@RequestParam Long shopId) {
        List<Order> shopOrders = orderRepository.findByShopId(shopId).stream()
            .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
            .toList();

        // ── COD totals ──
        BigDecimal codToReceive = shopOrders.stream()
            .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal codDeliveryCharges = shopOrders.stream()
            .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netCodCashReceived = codToReceive.subtract(codDeliveryCharges).max(BigDecimal.ZERO);

        // ── UPI totals (shop received via Cashfree split) ──
        BigDecimal upiRevenue = shopOrders.stream()
            .filter(o -> !"COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> {
                BigDecimal total = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                BigDecimal del = o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO;
                BigDecimal plat = o.getPlatformFee() != null ? o.getPlatformFee() : BigDecimal.ZERO;
                return total.subtract(del).subtract(plat).max(BigDecimal.ZERO);
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal upiPlatformFees = shopOrders.stream()
            .filter(o -> !"COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getPlatformFee() != null ? o.getPlatformFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── All delivery charges ──
        BigDecimal totalDeliveryCharges = shopOrders.stream()
            .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRevenue = netCodCashReceived.add(upiRevenue);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("shopId", shopId);
        summary.put("codToReceive", codToReceive);
        summary.put("deliveryChargesPayable", totalDeliveryCharges);
        summary.put("netCodCashReceived", netCodCashReceived);
        summary.put("upiRevenue", upiRevenue);
        summary.put("upiPlatformFees", upiPlatformFees);
        summary.put("totalRevenue", totalRevenue);

        List<Map<String, Object>> partnerList = new ArrayList<>();

        Map<Long, List<Order>> byPartner = shopOrders.stream()
            .filter(o -> o.getDeliveryPartnerId() != null)
            .collect(Collectors.groupingBy(Order::getDeliveryPartnerId));

        byPartner.forEach((partnerId, orders) -> {
            BigDecimal pCod = orders.stream()
                .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal pDel = orders.stream()
                .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal pUpi = orders.stream()
                .filter(o -> !"COD".equalsIgnoreCase(o.getPaymentMethod()))
                .map(o -> {
                    BigDecimal t = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                    BigDecimal d = o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO;
                    BigDecimal pf = o.getPlatformFee() != null ? o.getPlatformFee() : BigDecimal.ZERO;
                    return t.subtract(d).subtract(pf).max(BigDecimal.ZERO);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal pNet = pCod.subtract(pDel).max(BigDecimal.ZERO).add(pUpi);

            String partnerName = deliveryPartnerRepository.findById(partnerId)
                .map(DeliveryPartner::getName)
                .orElse("Partner #" + partnerId);

            // Check for pending COD settlement
            Optional<Settlement> sOpt = settlementRepository.findByDeliveryPartnerIdAndShopIdAndStatusIn(
                partnerId, shopId, List.of("PENDING", "OTP_GENERATED", "AWAITING_CONFIRMATION", "COMPLETED")
            );

            String codStatus = sOpt.map(Settlement::getStatus).orElse(null);
            boolean hasCodOrders = orders.stream().anyMatch(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()));
            String status = hasCodOrders ? (codStatus != null ? codStatus : "PENDING") : "UPI_SETTLED";

            Map<String, Object> p = new LinkedHashMap<>();
            p.put("deliveryPartnerId", partnerId);
            p.put("deliveryPartnerName", partnerName);
            p.put("ordersCount", orders.size());
            p.put("codCount", (int) orders.stream().filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod())).count());
            p.put("upiCount", (int) orders.stream().filter(o -> !"COD".equalsIgnoreCase(o.getPaymentMethod())).count());
            p.put("codCollected", pCod);
            p.put("upiRevenue", pUpi);
            p.put("deliveryCharge", pDel);
            p.put("netCash", pNet);
            p.put("status", status);
            p.put("action", "COMPLETED".equals(status) || "UPI_SETTLED".equals(status) ? "VIEW" : "CONFIRM");
            partnerList.add(p);
        });

        summary.put("pendingConfirmations", (int) partnerList.stream()
            .filter(p -> !"COMPLETED".equals(p.get("status")) && !"UPI_SETTLED".equals(p.get("status")))
            .count());
        summary.put("partners", partnerList);
        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/settlements/shopkeeper/partner/{partnerId}
     */
    @GetMapping("/shopkeeper/partner/{partnerId}")
    public ResponseEntity<?> getShopkeeperPartnerDetail(@PathVariable Long partnerId, @RequestParam Long shopId) {
        String partnerName = deliveryPartnerRepository.findById(partnerId)
            .map(DeliveryPartner::getName)
            .orElse("Partner #" + partnerId);

        List<Order> orders = orderRepository.findByShopId(shopId).stream()
            .filter(o -> partnerId.equals(o.getDeliveryPartnerId()))
            .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
            .toList();

        BigDecimal codCollected = orders.stream()
            .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
            .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal deliveryCharge = orders.stream()
            .map(o -> o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netCashReceived = codCollected.subtract(deliveryCharge).max(BigDecimal.ZERO);

        Optional<Settlement> sOpt = settlementRepository.findByDeliveryPartnerIdAndShopIdAndStatusIn(
            partnerId, shopId, List.of("PENDING", "OTP_GENERATED", "AWAITING_CONFIRMATION", "COMPLETED")
        );
        String status = sOpt.map(Settlement::getStatus).orElse("PENDING");

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("deliveryPartnerId", partnerId);
        detail.put("deliveryPartnerName", partnerName);
        detail.put("ordersCount", orders.size());
        detail.put("codCollected", codCollected);
        detail.put("deliveryCharge", deliveryCharge);
        detail.put("netCashReceived", netCashReceived);
        detail.put("status", status);
        return ResponseEntity.ok(detail);
    }

    /**
     * POST /api/settlements/generate-otp
     */
    @PostMapping("/generate-otp")
    public ResponseEntity<?> generateOtp(@RequestParam Long partnerId, @RequestParam Long shopId) {
        Map<String, Object> res = settlementService.initiatePartnerToShopCodSettlement(partnerId, shopId);
        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/settlements/verify-otp
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestParam Long partnerId,
                                       @RequestParam Long shopId,
                                       @RequestParam String otp) {
        Map<String, Object> res = settlementService.verifyPartnerToShopCodSettlement(partnerId, shopId, otp);
        return ResponseEntity.ok(res);
    }

    /**
     * GET /api/settlements/{settlementId}
     */
    @GetMapping("/{settlementId}")
    public ResponseEntity<?> getSettlementById(@PathVariable String settlementId) {
        Optional<Settlement> sOpt = settlementRepository.findBySettlementId(settlementId);
        if (sOpt.isPresent()) {
            return ResponseEntity.ok(sOpt.get());
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * GET /api/settlements/shopkeeper/platform-fee-summary?shopId=1
     */
    @GetMapping("/shopkeeper/platform-fee-summary")
    public ResponseEntity<?> getPlatformFeeSummary(@RequestParam Long shopId) {
        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) return ResponseEntity.notFound().build();

        // Calculate COD platform fee from DELIVERED COD orders
        List<Order> codOrders = orderRepository.findByShopId(shopId).stream()
            .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
            .filter(o -> "COD".equalsIgnoreCase(o.getPaymentMethod()))
            .toList();

        java.math.BigDecimal codUnpaidFee = codOrders.stream()
            .map(o -> o.getPlatformFee() != null ? o.getPlatformFee() : java.math.BigDecimal.ZERO)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.math.BigDecimal totalUnpaidFee = shop.getUnpaidPlatformFee() != null 
            ? shop.getUnpaidPlatformFee().max(codUnpaidFee) 
            : codUnpaidFee;

        java.time.LocalDateTime oldestDate = shop.getOldestUnpaidCodAt();
        if (oldestDate == null && !codOrders.isEmpty()) {
            java.time.Instant firstCreated = codOrders.get(0).getCreatedAt();
            oldestDate = firstCreated != null 
                ? java.time.LocalDateTime.ofInstant(firstCreated, java.time.ZoneId.systemDefault()) 
                : java.time.LocalDateTime.now();
        }

        long hoursRemaining = 48;
        boolean overdue = false;
        if (totalUnpaidFee.compareTo(java.math.BigDecimal.ZERO) > 0 && oldestDate != null) {
            long hoursElapsed = java.time.Duration.between(oldestDate, java.time.LocalDateTime.now()).toHours();
            hoursRemaining = Math.max(0, 48 - hoursElapsed);
            if (hoursElapsed >= 48) overdue = true;
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("shopId", shopId);
        res.put("unpaidPlatformFee", totalUnpaidFee);
        res.put("oldestUnpaidCodAt", oldestDate);
        res.put("hoursRemaining", hoursRemaining);
        res.put("overdue", overdue);
        res.put("disabledDueToSettlement", Boolean.TRUE.equals(shop.getDisabledDueToSettlement()));
        res.put("shopActive", Boolean.TRUE.equals(shop.getActive()));
        res.put("lastSettledAt", shop.getLastCodPlatformFeeSettledAt());

        return ResponseEntity.ok(res);
    }

    /**
     * POST /api/settlements/shopkeeper/pay-platform-fee
     */
    @PostMapping("/shopkeeper/pay-platform-fee")
    public ResponseEntity<?> payPlatformFee(@RequestParam Long shopId, @RequestParam(required = false) String paymentRef) {
        Shop shop = shopRepository.findById(shopId).orElse(null);
        if (shop == null) return ResponseEntity.notFound().build();

        java.math.BigDecimal paidAmount = shop.getUnpaidPlatformFee();
        shop.setUnpaidPlatformFee(java.math.BigDecimal.ZERO);
        shop.setOldestUnpaidCodAt(null);
        shop.setLastCodPlatformFeeSettledAt(java.time.LocalDateTime.now());
        
        // Re-enable shop if disabled due to settlement overdue
        if (Boolean.TRUE.equals(shop.getDisabledDueToSettlement())) {
            shop.setDisabledDueToSettlement(false);
            shop.setActive(true);
        }

        shopRepository.save(shop);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "RuVo Platform Fee COD Settlement completed successfully!");
        res.put("paidAmount", paidAmount);
        res.put("shopActive", shop.getActive());
        return ResponseEntity.ok(res);
    }

    /**
     * Deprecated compatibility endpoint
     */
    @PostMapping("/partner-to-shop/initiate")
    public ResponseEntity<?> initiatePartnerToShop(@RequestParam Long partnerId, @RequestParam Long shopId) {
        return generateOtp(partnerId, shopId);
    }

    /**
     * Deprecated compatibility endpoint
     */
    @PostMapping("/partner-to-shop/verify")
    public ResponseEntity<?> verifyPartnerToShop(@RequestParam Long partnerId, @RequestParam Long shopId, @RequestParam String otp) {
        return verifyOtp(partnerId, shopId, otp);
    }
}
