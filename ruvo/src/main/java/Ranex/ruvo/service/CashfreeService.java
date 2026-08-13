package Ranex.ruvo.service;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class CashfreeService {

    @Value("${cashfree.app.id}")
    private String appId;

    @Value("${cashfree.client.secret}")
    private String clientSecret;

    @Value("${cashfree.api.version}")
    private String apiVersion;

    @Value("${cashfree.base.url}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> createOrder(String orderId, double totalAmount, double productAmount, String shopVendorId, String customerId, String customerPhone, String customerEmail, String returnUrl) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-client-id", appId);
        headers.set("x-client-secret", clientSecret);
        headers.set("x-api-version", apiVersion);
        headers.set("Content-Type", "application/json");

        JSONObject customerDetails = new JSONObject();
        customerDetails.put("customer_id", customerId);
        customerDetails.put("customer_phone", customerPhone != null ? customerPhone : "9999999999");
        customerDetails.put("customer_email", customerEmail != null ? customerEmail : "customer@example.com");

        JSONObject orderMeta = new JSONObject();
        orderMeta.put("return_url", returnUrl);

        JSONObject requestBody = new JSONObject();
        requestBody.put("order_id", orderId);
        requestBody.put("order_amount", totalAmount);
        requestBody.put("order_currency", "INR");
        requestBody.put("customer_details", customerDetails);
        requestBody.put("order_meta", orderMeta);

        // Append Vendor Splits if the Shop has a registered Cashfree Vendor ID
        if (shopVendorId != null && !shopVendorId.isBlank() && productAmount > 0) {
            org.json.JSONArray orderSplits = new org.json.JSONArray();
            JSONObject shopSplit = new JSONObject();
            shopSplit.put("vendor_id", shopVendorId);
            shopSplit.put("amount", productAmount);
            orderSplits.put(shopSplit);
            
            requestBody.put("order_splits", orderSplits);
        }

        HttpEntity<String> entity = new HttpEntity<>(requestBody.toString(), headers);
        String url = baseUrl + "/orders";

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JSONObject responseJson = new JSONObject(response.getBody());
            Map<String, Object> result = new HashMap<>();
            result.put("payment_session_id", responseJson.optString("payment_session_id"));
            result.put("order_status", responseJson.optString("order_status"));
            result.put("cf_order_id", responseJson.optString("cf_order_id"));
            result.put("payment_url", "https://payments.cashfree.com/order/" + responseJson.optString("payment_session_id"));
            return result;
        } else {
            throw new RuntimeException("Failed to create order at Cashfree: " + response.getStatusCode());
        }
    }

    public Map<String, Object> getOrderStatus(String orderId) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-client-id", appId);
        headers.set("x-client-secret", clientSecret);
        headers.set("x-api-version", apiVersion);

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        String url = baseUrl + "/orders/" + orderId;

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JSONObject responseJson = new JSONObject(response.getBody());
            Map<String, Object> result = new HashMap<>();
            result.put("order_status", responseJson.optString("order_status"));
            result.put("cf_order_id", responseJson.optString("cf_order_id"));
            result.put("order_amount", responseJson.optDouble("order_amount"));
            return result;
        } else {
            throw new RuntimeException("Failed to fetch order status from Cashfree: " + response.getStatusCode());
        }
    }
}
