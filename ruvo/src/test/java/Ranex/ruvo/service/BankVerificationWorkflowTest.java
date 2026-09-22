package Ranex.ruvo.service;

import Ranex.ruvo.controller.ShopController;
import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.SellerBankAccount;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.SellerBankAccountRepository;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.service.bank.*;
import Ranex.ruvo.service.bank.BankVerificationWorkflowService.BankVerificationRequest;
import Ranex.ruvo.service.bank.BankVerificationWorkflowService.BankVerificationResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BankVerificationWorkflowTest {

    @Mock
    private SellerBankAccountRepository sellerBankAccountRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private DeliveryPartnerRepository deliveryPartnerRepository;

    @Mock
    private Ranex.ruvo.repository.PartnerProfileRepository partnerProfileRepository;

    @Mock
    private Ranex.ruvo.repository.UserRepository userRepository;

    @Mock
    private RazorpayService razorpayService;

    @Mock
    private CloudinaryService cloudinaryService;

    private MockBankVerificationProvider mockProvider;
    private RazorpayBankVerificationProvider rzpProvider;
    private NameVerificationService nameVerificationService;
    private BankRiskFraudService bankRiskFraudService;
    private BankVerificationWorkflowService workflowService;
    private ShopController shopController;

    private Shop testShop;

    @BeforeEach
    void setUp() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "8630820486", null, List.of(new SimpleGrantedAuthority("ROLE_SHOP_OWNER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        mockProvider = new MockBankVerificationProvider();
        rzpProvider = new RazorpayBankVerificationProvider(mockProvider);
        nameVerificationService = new NameVerificationService();
        bankRiskFraudService = new BankRiskFraudService(sellerBankAccountRepository);

        workflowService = new BankVerificationWorkflowService(
                rzpProvider,
                nameVerificationService,
                bankRiskFraudService,
                sellerBankAccountRepository,
                shopRepository,
                deliveryPartnerRepository,
                partnerProfileRepository,
                userRepository
        );

        shopController = new ShopController(
                shopRepository,
                null,
                cloudinaryService,
                razorpayService,
                deliveryPartnerRepository
        );

        testShop = Shop.builder()
                .id(100L)
                .name("Raj General Store")
                .ownerId("8630820486")
                .phone("8630820486")
                .approved(false)
                .bankVerificationStatus("UNVERIFIED")
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("TEST 1: Fake/dummy bank account (123456789123) -> Razorpay verification fails -> Admin Request NOT created")
    void test1_invalidBankAccountFails() {
        when(sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(sellerBankAccountRepository.save(any(SellerBankAccount.class)))
                .thenAnswer(i -> i.getArgument(0));

        // Account "123456789123" triggers mock account not found / failed
        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Raj Singh", "123456789123", "SBIN0001234", "State Bank of India"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertFalse(resp.success());
        assertEquals("RAZORPAY_FAILED", resp.verificationStatus());
        assertEquals(422, resp.statusCode());

        // Verify Shop was NEVER set to ADMIN_PENDING or READY_FOR_ADMIN
        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    @DisplayName("TEST 2: Razorpay status = PENDING (Invalid input format) -> Admin Request NOT created")
    void test2_basicValidationFails() {
        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Raj", "1234", "INVALID_IFSC", "SBI"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertFalse(resp.success());
        assertEquals("FAILED", resp.verificationStatus());
        assertEquals(400, resp.statusCode());

        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    @DisplayName("TEST 3: Razorpay status = REJECTED (Mock 987654321012) -> Admin Request NOT created")
    void test3_rejectedAccountFails() {
        when(sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(sellerBankAccountRepository.save(any(SellerBankAccount.class)))
                .thenAnswer(i -> i.getArgument(0));

        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Raj Singh", "987654321012", "SBIN0001234", "State Bank of India"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertFalse(resp.success());
        assertEquals("RAZORPAY_FAILED", resp.verificationStatus());
        assertEquals(422, resp.statusCode());

        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    @DisplayName("TEST 3B: Repeating identical digits (111111111111) -> Basic validation FAILED -> Admin Request NOT created")
    void test3b_repeatingDigitsFailsBasicValidation() {
        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Raj Singh", "111111111111", "SBIN0001234", "State Bank of India"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertFalse(resp.success());
        assertEquals("FAILED", resp.verificationStatus());
        assertEquals(400, resp.statusCode());

        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    @DisplayName("TEST 4: Razorpay API error (888800000000) -> Status VERIFICATION_ERROR -> Admin Request NOT created")
    void test4_providerErrorFails() {
        when(sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(sellerBankAccountRepository.save(any(SellerBankAccount.class)))
                .thenAnswer(i -> i.getArgument(0));

        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Raj Singh", "888800000000", "SBIN0001234", "State Bank of India"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertFalse(resp.success());
        assertEquals("VERIFICATION_ERROR", resp.verificationStatus());
        assertEquals(503, resp.statusCode());

        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    @DisplayName("TEST 5: Razorpay VERIFIED + name mismatch (777700000000) -> Status NAME_MISMATCH -> Admin Request NOT created")
    void test5_nameMismatchFails() {
        when(sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(sellerBankAccountRepository.save(any(SellerBankAccount.class)))
                .thenAnswer(i -> i.getArgument(0));

        // Account starting with 7777 returns registered name "Completely Different Person"
        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Raj Singh", "777700001234", "SBIN0001234", "State Bank of India"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertFalse(resp.success());
        assertEquals("NAME_MISMATCH", resp.verificationStatus());
        assertEquals(422, resp.statusCode());

        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    @DisplayName("TEST 6: Razorpay VERIFIED + duplicate account -> Status RISK_HOLD -> Admin Request NOT created")
    void test6_duplicateAccountFails() {
        when(sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(sellerBankAccountRepository.save(any(SellerBankAccount.class)))
                .thenAnswer(i -> i.getArgument(0));

        // Simulate existing verified account for shop 999
        SellerBankAccount existingDuplicate = SellerBankAccount.builder()
                .id(50L)
                .shopId(999L)
                .accountNumberMasked("XXXXXX4567")
                .ifscCode("SBIN0001234")
                .verificationStatus("VERIFIED")
                .build();

        when(sellerBankAccountRepository.findDuplicateVerifiedAccounts(anyString(), eq("SBIN0001234"), eq(100L), isNull()))
                .thenReturn(List.of(existingDuplicate));

        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Raj Singh", "501002344567", "SBIN0001234", "State Bank of India"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertFalse(resp.success());
        assertEquals("RISK_HOLD", resp.verificationStatus());

        verify(shopRepository, never()).save(any(Shop.class));
    }

    @Test
    @DisplayName("TEST 7: Razorpay VERIFIED + name match + risk checks pass -> Admin Request CREATED")
    void test7_allChecksPass_createsAdminRequest() {
        when(sellerBankAccountRepository.findFirstByShopIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(sellerBankAccountRepository.save(any(SellerBankAccount.class)))
                .thenAnswer(i -> i.getArgument(0));
        when(shopRepository.findById(100L))
                .thenReturn(Optional.of(testShop));
        when(shopRepository.save(any(Shop.class)))
                .thenAnswer(i -> i.getArgument(0));

        BankVerificationRequest req = new BankVerificationRequest(
                100L, null, "8630820486", "Mr. Raj Singh", "501002345678", "SBIN0001234", "State Bank of India"
        );

        BankVerificationResponse resp = workflowService.verifyAndRegisterBankAccount(req);

        assertTrue(resp.success());
        assertEquals("READY_FOR_ADMIN", resp.verificationStatus());
        assertTrue(resp.nameMatch());
        assertEquals("PASS", resp.riskStatus());
        assertEquals(200, resp.statusCode());

        // Verify Shop was admitted into Admin Queue with status ADMIN_PENDING
        ArgumentCaptor<Shop> shopCaptor = ArgumentCaptor.forClass(Shop.class);
        verify(shopRepository).save(shopCaptor.capture());
        Shop savedShop = shopCaptor.getValue();
        assertEquals("ADMIN_PENDING", savedShop.getBankVerificationStatus());
        assertFalse(savedShop.getApproved());
    }

    @Test
    @DisplayName("TEST 8: User directly calls Admin Request API while Razorpay status = PENDING/UNVERIFIED -> Backend rejects request")
    void test8_directAdminRequestBypassBlocked() {
        testShop.setBankVerificationStatus("UNVERIFIED");
        when(shopRepository.findById(100L)).thenReturn(Optional.of(testShop));

        ResponseEntity<?> response = shopController.requestApprovalAgain(100L, "8630820486");

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Bank account must be verified"));
    }

    @Test
    @DisplayName("TEST 9: Frontend sends forged bankVerificationStatus = VERIFIED in createShop -> Backend forces UNVERIFIED")
    void test9_forgedVerificationStatusReset() {
        Shop forgedShop = Shop.builder()
                .name("Hacker Store")
                .ownerId("8630820486")
                .bankVerificationStatus("VERIFIED") // Hacker tried to bypass!
                .approved(true)
                .build();

        when(shopRepository.save(any(Shop.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = shopController.addShop(forgedShop);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Shop saved = (Shop) response.getBody();
        assertNotNull(saved);
        assertEquals("UNVERIFIED", saved.getBankVerificationStatus());
        assertFalse(saved.getApproved());
    }

    @Test
    @DisplayName("TEST 10: Same Razorpay webhook received twice -> Idempotent, Only ONE Admin Request exists")
    void test10_webhookIdempotency() {
        SellerBankAccount alreadyVerified = SellerBankAccount.builder()
                .id(200L)
                .shopId(100L)
                .accountNumberMasked("XXXXXX9012")
                .ifscCode("SBIN0001234")
                .verificationStatus("READY_FOR_ADMIN")
                .razorpayBankReference("fav_123456")
                .build();

        when(sellerBankAccountRepository.findByRazorpayBankReference("fav_123456"))
                .thenReturn(Optional.of(alreadyVerified));

        String webhookPayload = """
        {
          "event": "fund_account.validation.completed",
          "payload": {
            "fund_account_validation": {
              "id": "fav_123456",
              "status": "completed",
              "results": {
                "registered_name": "RAJ SINGH"
              }
            }
          }
        }
        """;

        boolean handled = workflowService.processAsyncWebhook(webhookPayload, null);

        assertTrue(handled);
        // Verify no duplicate state changes or DB saves occurred
        verify(sellerBankAccountRepository, never()).save(any(SellerBankAccount.class));
        verify(shopRepository, never()).save(any(Shop.class));
    }
}
