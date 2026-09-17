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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RuvoCommissionServiceTest {

    @Mock
    private RuvoCommissionCycleRepository cycleRepository;

    @Mock
    private RuvoCommissionLedgerRepository ledgerRepository;

    @Mock
    private RuvoCommissionPaymentRepository paymentRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private RazorpayService razorpayService;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private RuvoCommissionService commissionService;

    private Shop shop;
    private RuvoCommissionCycle cycle;

    @BeforeEach
    void setUp() {
        shop = Shop.builder().id(1L).name("Metro Electronics").phone("9876543210").codBlocked(false).build();

        cycle = RuvoCommissionCycle.builder()
                .id(10L)
                .cycleId("CYC-1-2026-08-23")
                .shopId(1L)
                .cycleStart(Instant.now().minus(1, ChronoUnit.DAYS))
                .cycleEnd(Instant.now().plus(1, ChronoUnit.DAYS))
                .dueAt(Instant.now().plus(2, ChronoUnit.DAYS))
                .totalCommission(new BigDecimal("150.00"))
                .totalPaid(BigDecimal.ZERO)
                .outstandingAmount(new BigDecimal("150.00"))
                .status("OPEN")
                .build();
    }

    @Test
    @DisplayName("Accrue Commission creates ledger entry and updates cycle totals idempotently")
    void testAccrueCommission_Success() {
        when(ledgerRepository.existsByOrderId(101L)).thenReturn(false);
        when(cycleRepository.findByShopIdAndStatus(1L, "OPEN")).thenReturn(Optional.of(cycle));

        commissionService.accrueCommission(1L, 101L, 50L, new BigDecimal("25.00"));

        verify(ledgerRepository, times(1)).save(any(RuvoCommissionLedger.class));
        assertEquals(new BigDecimal("175.00"), cycle.getTotalCommission());
        assertEquals(new BigDecimal("175.00"), cycle.getOutstandingAmount());
    }

    @Test
    @DisplayName("Accrue Commission skips duplicate order")
    void testAccrueCommission_DuplicateSkip() {
        when(ledgerRepository.existsByOrderId(101L)).thenReturn(true);

        commissionService.accrueCommission(1L, 101L, 50L, new BigDecimal("25.00"));

        verify(ledgerRepository, never()).save(any(RuvoCommissionLedger.class));
    }

    @Test
    @DisplayName("Initiate Commission Payment creates Razorpay order and Payment record")
    void testInitiateCommissionPayment_Success() {
        when(cycleRepository.findByCycleId("CYC-1-2026-08-23")).thenReturn(Optional.of(cycle));
        when(shopRepository.findById(1L)).thenReturn(Optional.of(shop));
        when(razorpayService.createOrder(
                anyString(),
                any(BigDecimal.class),
                any(BigDecimal.class),
                isNull(),
                anyString(),
                anyString()
        )).thenReturn(Map.of("razorpay_order_id", "order_test_123"));

        Map<String, Object> result = commissionService.initiateCommissionPayment("CYC-1-2026-08-23", 1L);

        assertEquals("order_test_123", result.get("razorpayOrderId"));
        assertEquals(new BigDecimal("150.00"), result.get("amount"));
        verify(paymentRepository, times(1)).save(any(RuvoCommissionPayment.class));
    }

    @Test
    @DisplayName("Process Webhook payment.captured marks payment SUCCESS and cycle PAID, restoring shop COD")
    void testProcessWebhook_Success() {
        shop.setCodBlocked(true);

        RuvoCommissionPayment payment = RuvoCommissionPayment.builder()
                .id(100L)
                .cycleId(10L)
                .shopId(1L)
                .amount(new BigDecimal("150.00"))
                .razorpayOrderId("order_rzp_001")
                .status("PENDING")
                .build();

        // Build a minimal Razorpay webhook payload for payment.captured
        String payload = """
                {
                  "event": "payment.captured",
                  "payload": {
                    "payment": {
                      "entity": {
                        "id": "pay_001",
                        "order_id": "order_rzp_001"
                      }
                    }
                  }
                }
                """;

        when(razorpayService.verifyWebhookSignature(anyString(), isNull())).thenReturn(true);
        when(request.getHeader("x-razorpay-signature")).thenReturn(null);
        when(request.getHeader("x-razorpay-event-id")).thenReturn("evt_001");
        when(paymentRepository.findByRazorpayOrderId("order_rzp_001")).thenReturn(Optional.of(payment));
        when(cycleRepository.findById(10L)).thenReturn(Optional.of(cycle));
        when(cycleRepository.existsByShopIdAndStatusIn(eq(1L), anyList())).thenReturn(false);
        when(shopRepository.findById(1L)).thenReturn(Optional.of(shop));

        Map<String, Object> res = commissionService.processCommissionWebhook(payload, request);

        assertTrue((Boolean) res.get("success"));
        assertEquals("SUCCESS", payment.getStatus());
        assertEquals("PAID", cycle.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(cycle.getOutstandingAmount()));
        assertFalse(shop.getCodBlocked());
    }

    @Test
    @DisplayName("Apply COD restrictions blocks shops with grace-expired overdue cycles")
    void testApplyCodRestrictions() {
        cycle.setStatus("OVERDUE");

        when(cycleRepository.findByStatusAndGracePeriodEndsAtBefore(eq("OVERDUE"), any(Instant.class)))
                .thenReturn(List.of(cycle));
        when(shopRepository.findById(1L)).thenReturn(Optional.of(shop));

        commissionService.applyCodRestrictions();

        assertTrue(shop.getCodBlocked());
        verify(shopRepository, times(1)).save(shop);
    }
}
