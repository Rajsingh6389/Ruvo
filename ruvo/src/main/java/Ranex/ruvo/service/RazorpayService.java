package Ranex.ruvo.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
public class RazorpayService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;
    
    @Value("${razorpay.webhook.secret}")
    private String webhookSecret;

    private RazorpayClient getClient() throws RazorpayException {
        return new RazorpayClient(keyId, keySecret);
    }

    public Map<String, Object> createOrder(
            String orderId,
            BigDecimal totalAmount,
            BigDecimal productAmount,
            String splitAccountId,
            String customerEmail,
            String customerPhone
    ) {
        try {
            RazorpayClient client = getClient();
            
            JSONObject orderRequest = new JSONObject();
            // Amount in paise (multiply by 100)
            int amountInPaise = totalAmount.multiply(new BigDecimal("100")).intValueExact();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", orderId);

            if (splitAccountId != null && !splitAccountId.isBlank() && productAmount != null && productAmount.compareTo(BigDecimal.ZERO) > 0) {
                int splitAmountInPaise = productAmount.multiply(new BigDecimal("100")).intValueExact();
                JSONArray transfers = new JSONArray();
                JSONObject transfer = new JSONObject();
                transfer.put("account", splitAccountId);
                transfer.put("amount", splitAmountInPaise);
                transfer.put("currency", "INR");
                transfer.put("notes", new JSONObject().put("ruvo_order", orderId));
                transfer.put("on_hold", false); // can set to true if you want to hold funds until delivery
                transfers.put(transfer);
                orderRequest.put("transfers", transfers);
            }

            Order razorpayOrder = client.orders.create(orderRequest);

            Map<String, Object> result = new HashMap<>();
            result.put("razorpay_order_id", razorpayOrder.get("id"));
            result.put("status", razorpayOrder.get("status"));
            return result;

        } catch (RazorpayException e) {
            throw new RuntimeException("Razorpay order creation failed: " + e.getMessage(), e);
        }
    }

    public String createLinkedAccount(String name, String email, String phone, String ifsc, String accountNumber) {
        try {
            RazorpayClient client = getClient();

            JSONObject accountRequest = new JSONObject();
            accountRequest.put("name", name);
            accountRequest.put("email", email);
            accountRequest.put("contact_name", name);
            accountRequest.put("contact_phone", phone);
            accountRequest.put("type", "route");
            
            if (ifsc != null && accountNumber != null) {
                JSONObject bankDetails = new JSONObject();
                bankDetails.put("ifsc_code", ifsc);
                bankDetails.put("account_number", accountNumber);
                accountRequest.put("bank_account", bankDetails);
                
                JSONObject legalInfo = new JSONObject();
                legalInfo.put("pan", "ABCDE1234F"); // Optional or require user to provide
                accountRequest.put("legal_info", legalInfo);
            }

            // NOTE: The Razorpay Java SDK does not expose an 'accounts' API on RazorpayClient.
            // Linked account creation for Route must be done via direct HTTP to api.razorpay.com/v2/accounts.
            // For now, return a placeholder ID; replace with an OkHttp/Feign call when going live.
            System.out.println("[RazorpayService] createLinkedAccount: returning dummy ID for testing. " +
                               "Implement via direct HTTP POST to Razorpay Route /v2/accounts for production.");
            return "acc_dummy" + System.currentTimeMillis();
        } catch (RazorpayException e) {
            throw new RuntimeException("Failed to create Razorpay linked account.", e);
        }
    }

    public void transferToLinkedAccount(String sourcePaymentId, String linkedAccountId, BigDecimal amount, String reference) {
        try {
            RazorpayClient client = getClient();
            
            JSONObject transferRequest = new JSONObject();
            transferRequest.put("account", linkedAccountId);
            transferRequest.put("amount", amount.multiply(new BigDecimal("100")).intValueExact());
            transferRequest.put("currency", "INR");
            transferRequest.put("notes", new JSONObject().put("reference", reference));

            // Razorpay Transfers API allows transferring from a payment to a linked account
            if (sourcePaymentId != null && !sourcePaymentId.isBlank()) {
                client.payments.transfer(sourcePaymentId, transferRequest);
            } else {
                throw new UnsupportedOperationException("Direct transfer without payment ID requires Route Direct transfers, not supported in basic Route integration.");
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to transfer to linked account: " + e.getMessage(), e);
        }
    }

    public boolean verifyWebhookSignature(String payload, String signature) {
        try {
            return Utils.verifyWebhookSignature(payload, signature, webhookSecret);
        } catch (RazorpayException e) {
            return false;
        }
    }
}
