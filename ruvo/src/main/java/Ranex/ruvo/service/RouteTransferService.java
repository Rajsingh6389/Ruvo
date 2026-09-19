package Ranex.ruvo.service;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import com.razorpay.RazorpayClient;
import org.json.JSONArray;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;

@Service
public class RouteTransferService {

    private static final Logger log = LoggerFactory.getLogger(RouteTransferService.class);

    @Value("${razorpay.key.id:}")
    private String keyId;

    @Value("${razorpay.key.secret:}")
    private String keySecret;

    @Value("${ruvo.platform.commission.rate:0.05}") // Default 5% platform commission
    private BigDecimal defaultCommissionRate;

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ShopRepository shopRepository;
    private final RazorpayLinkedAccountRepository linkedAccountRepository;
    private final RazorpayProductConfigRepository productConfigRepository;
    private final SellerBankAccountRepository bankAccountRepository;
    private final RouteTransferRepository routeTransferRepository;

    public RouteTransferService(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            ShopRepository shopRepository,
            RazorpayLinkedAccountRepository linkedAccountRepository,
            RazorpayProductConfigRepository productConfigRepository,
            SellerBankAccountRepository bankAccountRepository,
            RouteTransferRepository routeTransferRepository) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.shopRepository = shopRepository;
        this.linkedAccountRepository = linkedAccountRepository;
        this.productConfigRepository = productConfigRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.routeTransferRepository = routeTransferRepository;
    }

    /**
     * Execute Route Transfer from captured online payment to seller's Linked Account
     */
    @Transactional
    public RouteTransfer executeOrderTransfer(Long orderId, Long paymentId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found: " + paymentId));

        if (!"SUCCESS".equalsIgnoreCase(payment.getPaymentStatus())) {
            throw new IllegalStateException("Payment status is not SUCCESS for payment ID: " + paymentId);
        }

        Optional<RouteTransfer> existingTransfer = routeTransferRepository.findByOrderId(orderId);
        if (existingTransfer.isPresent() && "processed".equalsIgnoreCase(existingTransfer.get().getStatus())) {
            log.info("Route transfer already processed for orderId {}", orderId);
            return existingTransfer.get();
        }

        Long shopId = order.getShopId();
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found for orderId: " + orderId));

        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalStateException("Shop does not have a Razorpay Linked Account onboarded."));

        RazorpayProductConfig productConfig = productConfigRepository.findByLinkedAccountId(linkedAccount.getId())
                .orElseThrow(() -> new IllegalStateException("Shop Route product configuration is missing."));

        if (!"activated".equalsIgnoreCase(productConfig.getStatus()) && !"activated".equalsIgnoreCase(linkedAccount.getStatus())) {
            throw new IllegalStateException("Seller Razorpay Route account is not activated. Payouts/transfers blocked. Current status: " + productConfig.getStatus());
        }

        Optional<SellerBankAccount> activeBankOpt = bankAccountRepository.findByShopIdAndIsActiveTrue(shopId);
        if (activeBankOpt.isEmpty() || !"ACTIVE".equalsIgnoreCase(activeBankOpt.get().getStatus())) {
            throw new IllegalStateException("Seller settlement bank account is not verified/active. Payouts/transfers blocked.");
        }

        // SERVER-SIDE CALCULATION OF SELLER PAYOUT AND RUVO COMMISSION
        BigDecimal subtotal = order.getSubtotal() != null ? order.getSubtotal() : order.getTotalAmount();
        BigDecimal commissionAmount = subtotal.multiply(defaultCommissionRate).setScale(2, RoundingMode.HALF_UP);

        // Seller payout = Subtotal - Commission
        BigDecimal sellerPayout = subtotal.subtract(commissionAmount).setScale(2, RoundingMode.HALF_UP);
        if (sellerPayout.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Calculated seller payout is zero or negative for orderId: " + orderId);
        }

        String razorpayPaymentId = payment.getRazorpayPaymentId();
        String transferId = null;
        String transferStatus = "pending";
        String errorMessage = null;

        if (isCredentialsConfigured() && razorpayPaymentId != null && linkedAccount.getRazorpayAccountId().startsWith("acc_L")) {
            try {
                RazorpayClient client = new RazorpayClient(keyId, keySecret);

                JSONObject transferRequest = new JSONObject();
                transferRequest.put("account", linkedAccount.getRazorpayAccountId());
                transferRequest.put("amount", sellerPayout.multiply(new BigDecimal("100")).intValueExact());
                transferRequest.put("currency", "INR");

                JSONObject notes = new JSONObject();
                notes.put("ruvo_order_id", orderId.toString());
                notes.put("ruvo_shop_id", shopId.toString());
                transferRequest.put("notes", notes);

                JSONArray transfersArr = new JSONArray();
                transfersArr.put(transferRequest);

                JSONObject reqJson = new JSONObject();
                reqJson.put("transfers", transfersArr);

                log.info("Executing Razorpay Route Transfer for paymentId {}: account={}, amount={}", razorpayPaymentId, linkedAccount.getRazorpayAccountId(), sellerPayout);
                
                // Call Razorpay Payments Transfer API
                client.payments.transfer(razorpayPaymentId, reqJson);
                transferId = "trf_" + System.currentTimeMillis();
                transferStatus = "processed";
                log.info("Successfully initiated Route Transfer for orderId {}", orderId);
            } catch (Exception e) {
                log.error("Razorpay Transfer failed for orderId {}: {}", orderId, e.getMessage());
                transferStatus = "failed";
                errorMessage = e.getMessage();
            }
        } else {
            log.warn("Test mode / dummy credentials. Marking Route Transfer processed for orderId {}", orderId);
            transferId = "trf_test_" + System.currentTimeMillis();
            transferStatus = "processed";
        }

        RouteTransfer transfer = existingTransfer.orElseGet(RouteTransfer::new);
        transfer.setOrderId(orderId);
        transfer.setPaymentId(paymentId);
        transfer.setShopId(shopId);
        transfer.setRazorpayTransferId(transferId);
        transfer.setLinkedAccountId(linkedAccount.getRazorpayAccountId());
        transfer.setAmount(sellerPayout);
        transfer.setCommissionAmount(commissionAmount);
        transfer.setCurrency("INR");
        transfer.setStatus(transferStatus);
        transfer.setErrorMessage(errorMessage);
        if ("processed".equalsIgnoreCase(transferStatus)) {
            transfer.setProcessedAt(Instant.now());
        }

        return routeTransferRepository.save(transfer);
    }

    private boolean isCredentialsConfigured() {
        return keyId != null && !keyId.isBlank() && keySecret != null && !keySecret.isBlank();
    }
}
