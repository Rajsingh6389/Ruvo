package Ranex.ruvo.service;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.model.SettlementOrder;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.SettlementOrderRepository;
import Ranex.ruvo.repository.SettlementRepository;
import Ranex.ruvo.repository.ShopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SettlementServiceTest {

    @Mock
    private SettlementRepository settlementRepository;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ShopRepository shopRepository;

    @Spy
    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Mock
    private RuvoCommissionService commissionService;

    @InjectMocks
    private SettlementService settlementService;

    private Shop shop;
    private Order order1;
    private Order order2;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(settlementService, "exposeOtp", true);

        shop = Shop.builder().id(1L).name("Test Grocery Shop").phone("9876543210").build();

        order1 = Order.builder()
                .id(101L)
                .shopId(1L)
                .deliveryPartnerId(10L)
                .orderStatus("DELIVERED")
                .paymentMethod("COD")
                .totalAmount(new BigDecimal("500.00"))
                .deliveryFee(new BigDecimal("40.00"))
                .platformFee(new BigDecimal("15.00"))
                .handoverVerified(false)
                .build();

        order2 = Order.builder()
                .id(102L)
                .shopId(1L)
                .deliveryPartnerId(10L)
                .orderStatus("DELIVERED")
                .paymentMethod("COD")
                .totalAmount(new BigDecimal("300.00"))
                .deliveryFee(new BigDecimal("30.00"))
                .platformFee(new BigDecimal("10.00"))
                .handoverVerified(false)
                .build();
    }

    @Test
    @DisplayName("Calculate Settlement Values returns exact BigDecimal financials")
    void testCalculateSettlementValues() {
        Map<String, BigDecimal> res = settlementService.calculateSettlementValues(
                new BigDecimal("800.00"), new BigDecimal("70.00"), new BigDecimal("25.00")
        );

        assertEquals(new BigDecimal("800.00"), res.get("codCollected"));
        assertEquals(new BigDecimal("70.00"), res.get("deliveryCharge"));
        assertEquals(new BigDecimal("25.00"), res.get("ruvoCommission"));
        assertEquals(new BigDecimal("730.00"), res.get("netCashToShop"));
        assertEquals(new BigDecimal("70.00"), res.get("partnerGrossEarning"));
        assertEquals(new BigDecimal("45.00"), res.get("partnerNetEarning"));
    }

    @Test
    @DisplayName("Initiate COD Settlement creates Settlement and SettlementOrder snapshots")
    void testInitiateSettlement_Success() {
        when(settlementRepository.findByPartnerAndShopForUpdate(eq(10L), eq(1L), anyList()))
                .thenReturn(Optional.empty());

        when(orderRepository.findEligibleForSettlement(1L, 10L))
                .thenReturn(List.of(order1, order2));

        when(settlementOrderRepository.existsByOrderId(anyLong())).thenReturn(false);
        when(shopRepository.findById(1L)).thenReturn(Optional.of(shop));

        when(settlementRepository.save(any(Settlement.class))).thenAnswer(inv -> {
            Settlement s = inv.getArgument(0);
            s.setId(1001L);
            return s;
        });

        Map<String, Object> result = settlementService.initiatePartnerToShopCodSettlement(10L, 1L);

        assertNotNull(result.get("settlementId"));
        assertEquals(2, result.get("orderCount"));
        assertEquals(new BigDecimal("800.00"), result.get("codCollected"));
        assertEquals(new BigDecimal("70.00"), result.get("deliveryCharge"));
        assertEquals(new BigDecimal("25.00"), result.get("ruvoCommission"));
        assertEquals(new BigDecimal("730.00"), result.get("netCashToShop"));
        assertNotNull(result.get("otp"));

        // Verify 2 SettlementOrder rows created
        verify(settlementOrderRepository, times(2)).save(any(SettlementOrder.class));
    }

    @Test
    @DisplayName("Verify COD Settlement with correct OTP completes settlement and marks orders handoverVerified")
    void testVerifySettlement_Success() {
        String rawOtp = "123456";
        String hashedOtp = passwordEncoder.encode(rawOtp);

        Settlement pending = Settlement.builder()
                .id(1001L)
                .settlementId("SETT-1001")
                .shopId(1L)
                .shopName("Test Grocery Shop")
                .deliveryPartnerId(10L)
                .orderCount(2)
                .codCollected(new BigDecimal("800.00"))
                .deliveryCharge(new BigDecimal("70.00"))
                .ruvoCommission(new BigDecimal("25.00"))
                .netCashToShop(new BigDecimal("730.00"))
                .partnerGrossEarning(new BigDecimal("70.00"))
                .partnerNetEarning(new BigDecimal("45.00"))
                .status("AWAITING_CONFIRMATION")
                .otpHash(hashedOtp)
                .otpExpiresAt(Instant.now().plusSeconds(300))
                .otpFailedAttempts(0)
                .otpLocked(false)
                .build();

        when(settlementRepository.findByPartnerAndShopForUpdate(eq(10L), eq(1L), anyList()))
                .thenReturn(Optional.of(pending));

        SettlementOrder so1 = SettlementOrder.builder().id(1L).settlementId(1001L).orderId(101L).platformFee(new BigDecimal("15.00")).build();
        SettlementOrder so2 = SettlementOrder.builder().id(2L).settlementId(1001L).orderId(102L).platformFee(new BigDecimal("10.00")).build();

        when(settlementOrderRepository.findBySettlementId(1001L)).thenReturn(List.of(so1, so2));
        when(orderRepository.findById(101L)).thenReturn(Optional.of(order1));
        when(orderRepository.findById(102L)).thenReturn(Optional.of(order2));

        Map<String, Object> result = settlementService.verifyPartnerToShopCodSettlement(10L, 1L, rawOtp);

        assertEquals("COMPLETED", result.get("status"));
        assertTrue(order1.getHandoverVerified());
        assertTrue(order2.getHandoverVerified());

        verify(commissionService, times(2)).accrueCommission(eq(1L), anyLong(), eq(1001L), any(BigDecimal.class));
    }

    @Test
    @DisplayName("Verify COD Settlement locks settlement after 5 failed attempts")
    void testVerifySettlement_MaxAttemptsLock() {
        String hashedOtp = passwordEncoder.encode("123456");

        Settlement pending = Settlement.builder()
                .id(1001L)
                .shopId(1L)
                .deliveryPartnerId(10L)
                .status("AWAITING_CONFIRMATION")
                .otpHash(hashedOtp)
                .otpExpiresAt(Instant.now().plusSeconds(300))
                .otpFailedAttempts(4)
                .otpLocked(false)
                .build();

        when(settlementRepository.findByPartnerAndShopForUpdate(eq(10L), eq(1L), anyList()))
                .thenReturn(Optional.of(pending));

        assertThrows(IllegalStateException.class, () ->
                settlementService.verifyPartnerToShopCodSettlement(10L, 1L, "999999")
        );

        assertTrue(pending.getOtpLocked());
        assertEquals("FAILED", pending.getStatus());
    }
}
