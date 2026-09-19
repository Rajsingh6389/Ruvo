package Ranex.ruvo.service;

import Ranex.ruvo.model.RuvoCommissionCycle;
import Ranex.ruvo.model.RuvoCommissionLedger;
import Ranex.ruvo.model.RuvoCommissionPayment;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.RuvoCommissionCycleRepository;
import Ranex.ruvo.repository.RuvoCommissionLedgerRepository;
import Ranex.ruvo.repository.RuvoCommissionPaymentRepository;
import Ranex.ruvo.repository.ShopRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class RuvoCommissionService {

    private static final ZoneId KOLKATA_ZONE = ZoneId.of("Asia/Kolkata");
    private static final int DEFAULT_CYCLE_DAYS = 2;
    private static final int DEFAULT_GRACE_HOURS = 48;

    private final RuvoCommissionCycleRepository cycleRepository;
    private final RuvoCommissionLedgerRepository ledgerRepository;
    private final RuvoCommissionPaymentRepository paymentRepository;
    private final ShopRepository shopRepository;
    private final RazorpayService razorpayService;

    @Value("${ruvo.commission.cycle-days:2}")
    private int cycleDays = DEFAULT_CYCLE_DAYS;

    @Value("${ruvo.commission.grace-period-hours:48}")
    private int gracePeriodHours = DEFAULT_GRACE_HOURS;

    public RuvoCommissionService(RuvoCommissionCycleRepository cycleRepository,
                                  RuvoCommissionLedgerRepository ledgerRepository,
                                  RuvoCommissionPaymentRepository paymentRepository,
                                  ShopRepository shopRepository,
                                  RazorpayService razorpayService) {
        this.cycleRepository = cycleRepository;
        this.ledgerRepository = ledgerRepository;
        this.paymentRepository = paymentRepository;
        this.shopRepository = shopRepository;
        this.razorpayService = razorpayService;
    }

    /**
     * Accrue commission for an order upon settlement completion.
     * Prevents duplicate ledger creation for the same order.
     */
    @Transactional
    public void accrueCommission(Long shopId, Long orderId, Long settlementId, BigDecimal commissionAmount) {
        if (ledgerRepository.existsByOrderId(orderId)) {
            return; // Idempotent check
        }

        RuvoCommissionCycle cycle = getOrCreateOpenCycle(shopId);

        RuvoCommissionLedger ledger = RuvoCommissionLedger.builder()
                .shopId(shopId)
                .orderId(orderId)
                .settlementId(settlementId)
                .cycleId(cycle.getId())
                .commissionAmount(commissionAmount)
                .build();
        ledgerRepository.save(ledger);

        // Update cycle aggregate totals
        cycle.setTotalCommission(cycle.getTotalCommission().add(commissionAmount));
        cycle.setOutstandingAmount(cycle.getTotalCommission().subtract(cycle.getTotalPaid()).max(BigDecimal.ZERO));
        cycleRepository.save(cycle);
    }

    /**
     * Get or create current OPEN 2-day commission cycle for a shop (Asia/Kolkata timezone).
     */
    @Transactional
    public RuvoCommissionCycle getOrCreateOpenCycle(Long shopId) {
        Optional<RuvoCommissionCycle> openOpt = cycleRepository.findByShopIdAndStatus(shopId, "OPEN");
        if (openOpt.isPresent()) {
            RuvoCommissionCycle existing = openOpt.get();
            // Check if current open cycle has passed its cycleEnd
            if (Instant.now().isBefore(existing.getCycleEnd())) {
                return existing;
            } else {
                // Close current cycle and start new one
                existing.setStatus(existing.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0 ? "CLOSED" : "PAID");
                cycleRepository.save(existing);
            }
        }

        ZonedDateTime nowKolkata = ZonedDateTime.now(KOLKATA_ZONE);
        ZonedDateTime startKolkata = nowKolkata.truncatedTo(ChronoUnit.DAYS);
        ZonedDateTime endKolkata = startKolkata.plusDays(cycleDays);
        ZonedDateTime dueKolkata = endKolkata.plusDays(1); // Due 1 day after cycle end
        ZonedDateTime graceKolkata = dueKolkata.plusHours(gracePeriodHours);

        String cycleId = "CYC-" + shopId + "-" + startKolkata.toLocalDate() + "-" + System.currentTimeMillis();

        RuvoCommissionCycle newCycle = RuvoCommissionCycle.builder()
                .cycleId(cycleId)
                .shopId(shopId)
                .cycleStart(startKolkata.toInstant())
                .cycleEnd(endKolkata.toInstant())
                .dueAt(dueKolkata.toInstant())
                .gracePeriodEndsAt(graceKolkata.toInstant())
                .totalCommission(BigDecimal.ZERO)
                .totalPaid(BigDecimal.ZERO)
                .outstandingAmount(BigDecimal.ZERO)
                .status("OPEN")
                .build();

        return cycleRepository.save(newCycle);
    }

    /**
     * Shopkeeper initiates "Pay RuVo" for outstanding commission on a cycle.
     * Backend calculates the exact outstanding amount — NEVER trusts frontend amount.
     */
    @Transactional
    public Map<String, Object> initiateCommissionPayment(String cycleIdentifier, Long shopId) {
        RuvoCommissionCycle cycle = cycleRepository.findByCycleId(cycleIdentifier)
                .orElseGet(() -> cycleRepository.findById(Long.parseLong(cycleIdentifier))
                        .orElseThrow(() -> new IllegalArgumentException("Commission cycle not found: " + cycleIdentifier)));

        if (!cycle.getShopId().equals(shopId)) {
            throw new IllegalArgumentException("Shop mismatch for commission cycle.");
        }

        BigDecimal outstanding = cycle.getOutstandingAmount();
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Commission cycle has zero outstanding balance.");
        }

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found: " + shopId));

        String rzpOrderIdStr = "RUVO-COMM-" + cycle.getCycleId() + "-" + System.currentTimeMillis();

        // Create Razorpay order for the commission payment
        Map<String, Object> rzpResponse = razorpayService.createOrder(
                rzpOrderIdStr,
                outstanding,
                outstanding,
                null, // RuVo commission is directly paid to RuVo, no split
                "shop" + shopId + "@ruvomobile.me",
                shop.getPhone() != null && !shop.getPhone().isBlank() ? shop.getPhone() : "9999999999"
        );

        String rzpOrderId = rzpResponse.get("razorpay_order_id") != null ? rzpResponse.get("razorpay_order_id").toString() : null;

        RuvoCommissionPayment payment = RuvoCommissionPayment.builder()
                .cycleId(cycle.getId())
                .shopId(shopId)
                .amount(outstanding)
                .currency("INR")
                .razorpayOrderId(rzpOrderId)
                .status("PENDING")
                .build();
        paymentRepository.save(payment);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("razorpayOrderId", rzpOrderId);
        response.put("amount", outstanding);
        response.put("currency", "INR");
        response.put("cycleId", cycle.getCycleId());
        response.put("status", "PENDING");
        return response;
    }

    /**
     * Razorpay Webhook processor for RuVo commission payments.
     * Verified with HMAC SHA256 signature, idempotent, updates cycle and unblocks shop COD if fully paid.
     */
    @Transactional
    public Map<String, Object> processCommissionWebhook(String rawPayload, HttpServletRequest request) {
        String signature = request.getHeader("x-razorpay-signature");
        boolean valid = razorpayService.verifyWebhookSignature(rawPayload, signature);
        if (!valid) {
            throw new IllegalArgumentException("Invalid Razorpay webhook signature.");
        }

        org.json.JSONObject json = new org.json.JSONObject(rawPayload);
        String event = json.optString("event");

        if ("order.paid".equals(event) || "payment.captured".equals(event)) {
            org.json.JSONObject payloadObj = json.optJSONObject("payload");
            if (payloadObj != null) {
                org.json.JSONObject orderObj = payloadObj.optJSONObject("order");
                org.json.JSONObject paymentObj = payloadObj.optJSONObject("payment");

                String eventId = request.getHeader("x-razorpay-event-id");
                
                String rzpOrderId = orderObj != null ? orderObj.optJSONObject("entity").optString("id") : null;
                if (rzpOrderId == null && paymentObj != null) {
                    rzpOrderId = paymentObj.optJSONObject("entity").optString("order_id");
                }
                
                if (rzpOrderId == null) {
                    throw new IllegalArgumentException("Invalid Razorpay webhook payload: missing order ID.");
                }

                RuvoCommissionPayment payment = paymentRepository.findByRazorpayOrderId(rzpOrderId).orElse(null);

                if (payment == null) {
                    // Might be a customer order payment, ignore here safely
                    return Map.of("success", true, "message", "Payment record not found for commission.");
                }

                // Idempotency check
                if (eventId != null && eventId.equals(payment.getWebhookEventId())) {
                    return Map.of("success", true, "message", "Webhook already processed.");
                }
                payment.setWebhookEventId(eventId);

                if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
                    return Map.of("success", true, "message", "Payment already marked successful.");
                }

                payment.setStatus("SUCCESS");
                payment.setRazorpayPaymentId(paymentObj != null ? paymentObj.optJSONObject("entity").optString("id") : null);
                payment.setPaidAt(Instant.now());
                paymentRepository.save(payment);

                // Allocate payment to commission cycle
                RuvoCommissionCycle cycle = cycleRepository.findById(payment.getCycleId())
                        .orElseThrow(() -> new IllegalStateException("Commission cycle not found for payment."));

                BigDecimal newPaid = cycle.getTotalPaid().add(payment.getAmount());
                BigDecimal newOutstanding = cycle.getTotalCommission().subtract(newPaid).max(BigDecimal.ZERO);

                cycle.setTotalPaid(newPaid);
                cycle.setOutstandingAmount(newOutstanding);

                if (newOutstanding.compareTo(BigDecimal.ZERO) == 0) {
                    cycle.setStatus("PAID");
                    restoreCodIfNoOutstanding(cycle.getShopId());
                } else {
                    cycle.setStatus("PARTIALLY_PAID");
                }
                cycleRepository.save(cycle);
            }
        } else if ("payment.failed".equals(event)) {
            org.json.JSONObject payloadObj = json.optJSONObject("payload");
            if (payloadObj != null) {
                org.json.JSONObject paymentObj = payloadObj.optJSONObject("payment");
                String rzpOrderId = paymentObj != null ? paymentObj.optJSONObject("entity").optString("order_id") : null;
                if (rzpOrderId != null) {
                    RuvoCommissionPayment payment = paymentRepository.findByRazorpayOrderId(rzpOrderId).orElse(null);
                    if (payment != null) {
                        payment.setStatus("FAILED");
                        payment.setFailureCode(paymentObj.optJSONObject("entity").optString("error_code"));
                        payment.setFailureReason(paymentObj.optJSONObject("entity").optString("error_description"));
                        paymentRepository.save(payment);
                    }
                }
            }
        }

        return Map.of("success", true);
    }

    /**
     * Check if shop has any remaining overdue cycles. If 0 outstanding across all cycles, restore COD.
     */
    @Transactional
    public void restoreCodIfNoOutstanding(Long shopId) {
        boolean hasOutstanding = cycleRepository.existsByShopIdAndStatusIn(
                shopId, List.of("OVERDUE", "CLOSED", "PENDING_PAYMENT", "PARTIALLY_PAID")
        );
        if (!hasOutstanding) {
            shopRepository.findById(shopId).ifPresent(shop -> {
                if (Boolean.TRUE.equals(shop.getCodBlocked())) {
                    shop.setCodBlocked(false);
                    shopRepository.save(shop);
                    System.out.println("[CommissionService] Shop " + shop.getName() + " (ID: " + shopId + ") COD restored.");
                }
            });
        }
    }

    /**
     * Scheduled Job helper: Close OPEN cycles that passed cycleEnd.
     */
    @Transactional
    public void closeExpiredCycles() {
        List<RuvoCommissionCycle> openCycles = cycleRepository.findByStatusAndCycleEndBefore("OPEN", Instant.now());
        for (RuvoCommissionCycle cycle : openCycles) {
            if (cycle.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0) {
                cycle.setStatus("CLOSED");
            } else {
                cycle.setStatus("PAID");
            }
            cycleRepository.save(cycle);
        }
    }

    /**
     * Scheduled Job helper: Mark unpaid CLOSED cycles as OVERDUE after dueAt.
     */
    @Transactional
    public void markOverdueCycles() {
        List<RuvoCommissionCycle> overdueCandidates = cycleRepository.findByStatusInAndDueAtBefore(
                List.of("CLOSED", "PENDING_PAYMENT", "PARTIALLY_PAID"), Instant.now()
        );
        for (RuvoCommissionCycle cycle : overdueCandidates) {
            if (cycle.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0) {
                cycle.setStatus("OVERDUE");
                cycleRepository.save(cycle);
            }
        }
    }

    /**
     * Scheduled Job helper: Apply COD restriction on shops with OVERDUE cycles past grace period.
     */
    @Transactional
    public void applyCodRestrictions() {
        List<RuvoCommissionCycle> graceExpired = cycleRepository.findByStatusAndGracePeriodEndsAtBefore("OVERDUE", Instant.now());
        for (RuvoCommissionCycle cycle : graceExpired) {
            if (cycle.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0) {
                shopRepository.findById(cycle.getShopId()).ifPresent(shop -> {
                    if (!Boolean.TRUE.equals(shop.getCodBlocked())) {
                        shop.setCodBlocked(true);
                        shopRepository.save(shop);
                        System.out.println("[CommissionService] Shop " + shop.getName() + " (ID: " + shop.getId() + ") COD blocked due to overdue commission cycle.");
                    }
                });
            }
        }
    }

    public List<RuvoCommissionCycle> getShopCycles(Long shopId) {
        return cycleRepository.findByShopId(shopId);
    }

    public Optional<RuvoCommissionCycle> getCycleById(String cycleId) {
        return cycleRepository.findByCycleId(cycleId);
    }
}
