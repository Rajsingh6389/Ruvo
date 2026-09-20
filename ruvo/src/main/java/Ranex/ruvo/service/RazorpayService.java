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

            boolean isValidSplitAccount = splitAccountId != null 
                    && !splitAccountId.isBlank() 
                    && splitAccountId.startsWith("acc_") 
                    && !splitAccountId.equals("acc_pending_approval") 
                    && !splitAccountId.startsWith("acc_dummy");

            if (isValidSplitAccount && productAmount != null && productAmount.compareTo(BigDecimal.ZERO) > 0) {
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

    public void logRouteDiagnostic(String entityType, String idOrName, String accountNumber, String ifsc) {
        System.out.println("================================================================================");
        System.out.println("🔵 [Razorpay Route Diagnostic] Bank Account Onboard/Edit Event Received");
        System.out.println("🔵 [Razorpay Route] Target: " + entityType + " (" + idOrName + ")");
        System.out.println("🔵 [Razorpay Route] Bank Account: " + (accountNumber != null && !accountNumber.isBlank() ? "XXXX" + accountNumber.substring(Math.max(0, accountNumber.length() - 4)) : "Not Provided"));
        System.out.println("🔵 [Razorpay Route] IFSC Code: " + (ifsc != null ? ifsc : "Not Provided"));
        System.out.println("🔵 [Razorpay Route] Config Check: KeyId=" + (keyId != null && !keyId.isBlank() ? "CONFIGURED (" + keyId.substring(0, Math.min(6, keyId.length())) + "...)" : "MISSING") 
                + ", KeySecret=" + (keySecret != null && !keySecret.isBlank() ? "CONFIGURED" : "MISSING"));
        System.out.println("ℹ️ [Razorpay Route] Status: Bank details validated & saved locally. Razorpay Linked Account creation deferred until Admin Approval.");
        System.out.println("================================================================================");
    }

    public String createLinkedAccount(String name, String email, String phone, String ifsc, String accountNumber) {
        System.out.println("================================================================================");
        System.out.println("🔵 [Razorpay Route API] Initiating Linked Account Creation for Approval...");
        System.out.println("🔵 [Razorpay Route Request] Name: " + name + ", Phone: " + phone + ", Email: " + email + ", IFSC: " + ifsc);

        try {
            if (keyId == null || keySecret == null || keyId.isBlank() || keySecret.isBlank()) {
                throw new IllegalStateException("Razorpay API keys not configured.");
            }

            // Razorpay v2 Account Creation Endpoint
            String urlString = "https://api.razorpay.com/v2/accounts";
            JSONObject accountRequest = new JSONObject();

            String sanitizedEmail = (email != null && email.contains("@")) ? email.trim() : "vendor" + System.currentTimeMillis() + "@ruvomobile.me";
            String sanitizedPhone = (phone != null && !phone.isBlank()) ? phone.replaceAll("[^0-9]", "") : "9999999999";
            if (sanitizedPhone.length() > 10) sanitizedPhone = sanitizedPhone.substring(sanitizedPhone.length() - 10);

            accountRequest.put("email", sanitizedEmail);
            accountRequest.put("phone", sanitizedPhone);
            accountRequest.put("legal_business_name", (name != null && !name.isBlank()) ? name : "RuVo Vendor");
            accountRequest.put("business_type", "individual");
            accountRequest.put("contact_name", (name != null && !name.isBlank()) ? name : "RuVo Vendor");

            // Profile info required by Razorpay Route
            JSONObject profile = new JSONObject();
            profile.put("category", "retail");
            profile.put("sub_category", "grocery");
            JSONObject addresses = new JSONObject();
            JSONObject registered = new JSONObject();
            registered.put("street1", "Main Street");
            registered.put("city", "Nagpur");
            registered.put("state", "Maharashtra");
            registered.put("postal_code", "440001");
            registered.put("country", "IN");
            addresses.put("registered", registered);
            profile.put("addresses", addresses);
            accountRequest.put("profile", profile);

            if (ifsc != null && accountNumber != null && !ifsc.isBlank() && !accountNumber.isBlank()) {
                JSONObject bankDetails = new JSONObject();
                bankDetails.put("ifsc_code", ifsc.trim().toUpperCase());
                bankDetails.put("account_number", accountNumber.trim());
                bankDetails.put("name", (name != null && !name.isBlank()) ? name : "RuVo Vendor");
                accountRequest.put("bank_account", bankDetails);
            }

            java.net.URL url = new java.net.URL(urlString);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");

            String auth = keyId + ":" + keySecret;
            String encodedAuth = java.util.Base64.getEncoder().encodeToString(auth.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            conn.setRequestProperty("Authorization", "Basic " + encodedAuth);
            conn.setDoOutput(true);

            try (java.io.OutputStream os = conn.getOutputStream()) {
                byte[] input = accountRequest.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            java.io.InputStream is = (responseCode >= 200 && responseCode < 300) ? conn.getInputStream() : conn.getErrorStream();

            StringBuilder responseStr = new StringBuilder();
            if (is != null) {
                try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        responseStr.append(line.trim());
                    }
                }
            }

            if (responseCode == 200 || responseCode == 201) {
                JSONObject resJson = new JSONObject(responseStr.toString());
                if (resJson.has("id")) {
                    String accountId = resJson.getString("id");
                    System.out.println("🟢 [Razorpay Route API] SUCCESS (HTTP " + responseCode + ") - Razorpay Route Linked Account Created: " + accountId);
                    System.out.println("🟢 [Razorpay Route API] Status: Razorpay Route is WORKING perfectly!");
                    System.out.println("================================================================================");
                    return accountId;
                }
            }
            
            System.err.println("🔴 [Razorpay Route API] HTTP Error " + responseCode + " - Response: " + responseStr.toString());
            
            String errorMessage = responseStr.toString();
            try {
                JSONObject errJson = new JSONObject(responseStr.toString());
                if (errJson.has("error")) {
                    String desc = errJson.getJSONObject("error").optString("description", "");
                    if (desc.toLowerCase().contains("access denied")) {
                        errorMessage = "Razorpay Route Access Denied: Your API keys do not have active Razorpay Route permissions. Please enable Route in your Razorpay Dashboard.";
                    } else if (desc.toLowerCase().contains("authentication failed")) {
                        errorMessage = "Razorpay Integration Failed: Invalid API Keys. Please contact Admin.";
                    } else if (!desc.isBlank()) {
                        errorMessage = desc;
                    }
                }
            } catch (Exception ignored) {}

            throw new IllegalStateException("Razorpay error: " + errorMessage);
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            System.err.println("🔴 [Razorpay Route API] Connection / Request Exception: " + e.getMessage());
            throw new IllegalStateException(e.getMessage());
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
