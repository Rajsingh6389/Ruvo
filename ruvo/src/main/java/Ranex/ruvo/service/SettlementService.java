package Ranex.ruvo.service;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.model.SettlementOrder;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.SettlementOrderRepository;
import Ranex.ruvo.repository.SettlementRepository;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class SettlementService {

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_SECONDS = 300; // 5 minutes
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final SettlementRepository settlementRepository;
    private final SettlementOrderRepository settlementOrderRepository;
    private final OrderRepository orderRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;
    private final RuvoCommissionService commissionService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${ruvo.settlement.expose-otp:false}")
    private boolean exposeOtp;

    public SettlementService(SettlementRepository settlementRepository,
                             SettlementOrderRepository settlementOrderRepository,
                             OrderRepository orderRepository,
                             ShopRepository shopRepository,
                             PasswordEncoder passwordEncoder,
                             RuvoCommissionService commissionService) {
        this.settlementRepository = settlementRepository;
        this.settlementOrderRepository = settlementOrderRepository;
        this.orderRepository = orderRepository;
        this.shopRepository = shopRepository;
        this.passwordEncoder = passwordEncoder;
        this.commissionService = commissionService;
    }

    /**
     * Calculate settlement financial values using BigDecimal.
     */
    public Map<String, BigDecimal> calculateSettlementValues(BigDecimal codCollected,
                                                              BigDecimal deliveryCharge,
                                                              BigDecimal ruvoCommission) {
        BigDecimal netCashToShop = codCollected.subtract(deliveryCharge).max(BigDecimal.ZERO);
        BigDecimal partnerGrossEarning = deliveryCharge;
        BigDecimal partnerNetEarning = deliveryCharge.subtract(ruvoCommission).max(BigDecimal.ZERO);

        Map<String, BigDecimal> map = new LinkedHashMap<>();
        map.put("codCollected", codCollected);
        map.put("deliveryCharge", deliveryCharge);
        map.put("ruvoCommission", ruvoCommission);
        map.put("netCashToShop", netCashToShop);
        map.put("partnerGrossEarning", partnerGrossEarning);
        map.put("partnerNetEarning", partnerNetEarning);
        return map;
    }

    /**
     * Create a settlement with OTP for partner-to-shop COD handover.
     *
     * 1. Finds eligible orders (DELIVERED + COD + not handover-verified)
     * 2. Creates immutable SettlementOrder snapshot
     * 3. Generates BCrypt-hashed 6-digit OTP via SecureRandom
     * 4. Returns settlement details (OTP only if configured)
     */
    @Transactional
    public Map<String, Object> initiatePartnerToShopCodSettlement(Long partnerId, Long shopId) {
        // Check for existing pending settlement (pessimistic lock)
        Optional<Settlement> existing = settlementRepository.findByPartnerAndShopForUpdate(
            partnerId, shopId, List.of("PENDING", "OTP_GENERATED", "AWAITING_CONFIRMATION")
        );
        if (existing.isPresent()) {
            throw new IllegalStateException("A pending settlement already exists for this partner and shop. Complete or cancel it first.");
        }

        // Fetch eligible orders from DB
        List<Order> orders = orderRepository.findEligibleForSettlement(shopId, partnerId);
        if (orders.isEmpty()) {
            throw new IllegalArgumentException("No eligible orders found for settlement. Orders must be DELIVERED, COD, and not yet verified.");
        }

        // Check none of these orders are already in another settlement
        for (Order o : orders) {
            if (settlementOrderRepository.existsByOrderId(o.getId())) {
                throw new IllegalStateException("Order #" + o.getId() + " is already part of another settlement.");
            }
        }

        // Aggregate financial values
        BigDecimal codCollected = BigDecimal.ZERO;
        BigDecimal deliveryCharge = BigDecimal.ZERO;
        BigDecimal ruvoCommission = BigDecimal.ZERO;

        for (Order o : orders) {
            codCollected = codCollected.add(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO);
            deliveryCharge = deliveryCharge.add(o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO);
            ruvoCommission = ruvoCommission.add(o.getPlatformFee() != null ? o.getPlatformFee() : BigDecimal.ZERO);
        }

        BigDecimal netCashToShop = codCollected.subtract(deliveryCharge).max(BigDecimal.ZERO);
        BigDecimal partnerGrossEarning = deliveryCharge;
        BigDecimal partnerNetEarning = deliveryCharge.subtract(ruvoCommission).max(BigDecimal.ZERO);

        // Generate OTP
        String rawOtp = generateOtp();
        String otpHash = passwordEncoder.encode(rawOtp);

        String settlementId = "SETT-" + System.currentTimeMillis();
        String shopName = shopRepository.findById(shopId).map(Shop::getName).orElse("Unknown Shop");

        // Create settlement
        Settlement s = Settlement.builder()
            .settlementId(settlementId)
            .shopId(shopId)
            .shopName(shopName)
            .deliveryPartnerId(partnerId)
            .deliveryPartnerName("Partner #" + partnerId)
            .orderCount(orders.size())
            .codCollected(codCollected)
            .deliveryCharge(deliveryCharge)
            .ruvoCommission(ruvoCommission)
            .netCashToShop(netCashToShop)
            .partnerGrossEarning(partnerGrossEarning)
            .partnerNetEarning(partnerNetEarning)
            .amount(netCashToShop)
            .settlementType("MASTER_SETTLEMENT")
            .paymentMethod("CASH")
            .status("AWAITING_CONFIRMATION")
            .otpHash(otpHash)
            .otpExpiresAt(Instant.now().plusSeconds(OTP_EXPIRY_SECONDS))
            .otpFailedAttempts(0)
            .otpLocked(false)
            .dueAt(Instant.now().plus(2, ChronoUnit.DAYS))
            .build();

        Settlement saved = settlementRepository.save(s);

        // Create immutable SettlementOrder snapshot for each order
        for (Order o : orders) {
            SettlementOrder so = SettlementOrder.builder()
                .settlementId(saved.getId())
                .orderId(o.getId())
                .codAmount(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .deliveryFee(o.getDeliveryFee() != null ? o.getDeliveryFee() : BigDecimal.ZERO)
                .platformFee(o.getPlatformFee() != null ? o.getPlatformFee() : BigDecimal.ZERO)
                .build();
            settlementOrderRepository.save(so);
        }

        // Build response
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("settlementId", settlementId);
        resp.put("shopId", shopId);
        resp.put("shopName", shopName);
        resp.put("deliveryPartnerId", partnerId);
        resp.put("orderCount", orders.size());
        resp.put("codCollected", codCollected);
        resp.put("deliveryCharge", deliveryCharge);
        resp.put("ruvoCommission", ruvoCommission);
        resp.put("netCashToShop", netCashToShop);
        resp.put("partnerGrossEarning", partnerGrossEarning);
        resp.put("partnerNetEarning", partnerNetEarning);
        resp.put("expiresInSeconds", OTP_EXPIRY_SECONDS);
        resp.put("status", "AWAITING_CONFIRMATION");

        // Only expose OTP in dev/test mode
        if (exposeOtp) {
            resp.put("otp", rawOtp);
        }

        return resp;
    }

    /**
     * Atomic OTP verification and settlement completion.
     *
     * 1. Validates OTP (BCrypt compare, expiry, lock check)
     * 2. Marks settlement COMPLETED
     * 3. Marks ONLY SettlementOrder-linked orders handoverVerified=true
     * 4. Creates commission ledger entries via RuvoCommissionService
     */
    @Transactional
    public Map<String, Object> verifyPartnerToShopCodSettlement(Long partnerId, Long shopId, String otp) {
        Settlement s = settlementRepository.findByPartnerAndShopForUpdate(
            partnerId, shopId, List.of("PENDING", "OTP_GENERATED", "AWAITING_CONFIRMATION")
        ).orElseThrow(() -> new IllegalArgumentException("No pending settlement found for this partner and shop."));

        if ("COMPLETED".equals(s.getStatus())) {
            throw new IllegalStateException("Settlement has already been completed.");
        }

        // Check OTP lock
        if (Boolean.TRUE.equals(s.getOtpLocked())) {
            throw new IllegalStateException("Settlement OTP is locked due to too many failed attempts. Please generate a new settlement.");
        }

        // Check OTP expiry
        if (s.getOtpExpiresAt() != null && Instant.now().isAfter(s.getOtpExpiresAt())) {
            s.setStatus("EXPIRED");
            settlementRepository.save(s);
            throw new IllegalArgumentException("OTP has expired. Please generate a new settlement.");
        }

        // Verify OTP using BCrypt
        if (s.getOtpHash() == null || !passwordEncoder.matches(otp.trim(), s.getOtpHash())) {
            int attempts = (s.getOtpFailedAttempts() != null ? s.getOtpFailedAttempts() : 0) + 1;
            s.setOtpFailedAttempts(attempts);
            if (attempts >= MAX_OTP_ATTEMPTS) {
                s.setOtpLocked(true);
                s.setStatus("FAILED");
                settlementRepository.save(s);
                throw new IllegalStateException("Maximum OTP attempts exceeded. Settlement has been locked.");
            }
            settlementRepository.save(s);
            throw new IllegalArgumentException("Invalid OTP. " + (MAX_OTP_ATTEMPTS - attempts) + " attempt(s) remaining.");
        }

        // OTP verified — complete settlement atomically
        Instant now = Instant.now();
        s.setStatus("COMPLETED");
        s.setPaidAt(now);
        s.setCompletedAt(now);
        s.setOtpVerified(true);
        s.setOtpVerifiedAt(now);
        s.setOtpHash(null); // Clear OTP hash
        settlementRepository.save(s);

        // Mark ONLY SettlementOrder-linked orders as handover-verified
        List<SettlementOrder> settlementOrders = settlementOrderRepository.findBySettlementId(s.getId());
        for (SettlementOrder so : settlementOrders) {
            orderRepository.findById(so.getOrderId()).ifPresent(order -> {
                order.setHandoverVerified(true);
                orderRepository.save(order);

                // Create commission ledger entry for this order
                commissionService.accrueCommission(
                    s.getShopId(),
                    order.getId(),
                    s.getId(),
                    so.getPlatformFee() != null ? so.getPlatformFee() : BigDecimal.ZERO
                );
            });
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "COMPLETED");
        result.put("settlementId", s.getSettlementId());
        result.put("shopId", s.getShopId());
        result.put("shopName", s.getShopName());
        result.put("deliveryPartnerId", s.getDeliveryPartnerId());
        result.put("orderCount", s.getOrderCount());
        result.put("codCollected", s.getCodCollected());
        result.put("deliveryCharge", s.getDeliveryCharge());
        result.put("ruvoCommission", s.getRuvoCommission());
        result.put("netCashToShop", s.getNetCashToShop());
        result.put("partnerGrossEarning", s.getPartnerGrossEarning());
        result.put("partnerNetEarning", s.getPartnerNetEarning());
        result.put("completedAt", now.toString());
        return result;
    }

    /**
     * Generate a cryptographically secure 6-digit OTP.
     */
    private String generateOtp() {
        int otp = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(otp);
    }
}
