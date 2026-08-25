package Ranex.ruvo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
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

    @Value("${cashfree.return.url}")
    private String returnBaseUrl;

    @Value("${cashfree.webhook.url}")
    private String webhookUrl;

    private final RestTemplate restTemplate;

    private final ObjectMapper objectMapper;

    public CashfreeService(
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {

        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    // =========================================================
    // CREATE CASHFREE ORDER
    // =========================================================

    public Map<String, Object> createOrder(
            String orderId,
            BigDecimal totalAmount,
            BigDecimal productAmount,
            String shopVendorId,
            String customerId,
            String customerPhone,
            String customerEmail,
            String returnUrl
    ) {

        try {

            HttpHeaders headers = createHeaders();

            Map<String, Object> customerDetails =
                    new HashMap<>();

            customerDetails.put(
                    "customer_id",
                    customerId
            );

            customerDetails.put(
                    "customer_phone",
                    customerPhone
            );

            customerDetails.put(
                    "customer_email",
                    customerEmail
            );

            Map<String, Object> orderMeta =
                    new HashMap<>();

            orderMeta.put(
                    "return_url",
                    returnUrl
            );

            /*
             * IMPORTANT:
             *
             * notify_url is required for webhook delivery.
             *
             * Cashfree will send server-to-server
             * payment events to this URL.
             */
            orderMeta.put(
                    "notify_url",
                    webhookUrl
            );

            Map<String, Object> requestBody =
                    new HashMap<>();

            requestBody.put(
                    "order_id",
                    orderId
            );

            requestBody.put(
                    "order_amount",
                    totalAmount
            );

            requestBody.put(
                    "order_currency",
                    "INR"
            );

            requestBody.put(
                    "customer_details",
                    customerDetails
            );

            requestBody.put(
                    "order_meta",
                    orderMeta
            );

            /*
             * -------------------------------------------------
             * SHOP SPLIT
             * -------------------------------------------------
             *
             * Only add this when the shop has a valid
             * Cashfree split/vendor configuration.
             *
             * DO NOT assume that every Cashfree PG account
             * supports this automatically.
             */

            if (shopVendorId != null &&
                    !shopVendorId.isBlank() &&
                    productAmount != null &&
                    productAmount.compareTo(
                            BigDecimal.ZERO
                    ) > 0) {

                Map<String, Object> split =
                        new HashMap<>();

                split.put(
                        "vendor_id",
                        shopVendorId
                );

                split.put(
                        "amount",
                        productAmount
                );

                requestBody.put(
                        "order_splits",
                        new Object[]{split}
                );
            }

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(
                            requestBody,
                            headers
                    );

            String url =
                    normalizeBaseUrl(baseUrl)
                            + "/orders";

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.POST,
                            entity,
                            String.class
                    );

            if (!response.getStatusCode()
                    .is2xxSuccessful()) {

                throw new RuntimeException(
                        "Cashfree order creation failed: "
                                + response.getStatusCode()
                );
            }

            if (response.getBody() == null ||
                    response.getBody().isBlank()) {

                throw new RuntimeException(
                        "Empty response received from Cashfree."
                );
            }

            JsonNode json =
                    objectMapper.readTree(
                            response.getBody()
                    );

            String paymentSessionId =
                    text(json, "payment_session_id");

            String cfOrderId =
                    text(json, "cf_order_id");

            String orderStatus =
                    text(json, "order_status");

            if (paymentSessionId == null ||
                    paymentSessionId.isBlank()) {

                throw new RuntimeException(
                        "Cashfree payment_session_id missing."
                );
            }

            if (cfOrderId == null ||
                    cfOrderId.isBlank()) {

                throw new RuntimeException(
                        "Cashfree cf_order_id missing."
                );
            }

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "payment_session_id",
                    paymentSessionId
            );

            result.put(
                    "cf_order_id",
                    cfOrderId
            );

            result.put(
                    "order_status",
                    orderStatus
            );

            /*
             * Do not construct a fake payment URL from the
             * payment_session_id.
             *
             * Return the session ID to the mobile app.
             */

            return result;

        } catch (HttpStatusCodeException e) {

            throw new RuntimeException(
                    "Cashfree API error: "
                            + e.getResponseBodyAsString(),
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to create Cashfree order.",
                    e
            );
        }
    }

    // =========================================================
    // GET CASHFREE ORDER STATUS
    // =========================================================

    public Map<String, Object> getOrderStatus(
            String orderId) {

        try {

            HttpHeaders headers =
                    createHeaders();

            HttpEntity<Void> entity =
                    new HttpEntity<>(headers);

            String url =
                    normalizeBaseUrl(baseUrl)
                            + "/orders/"
                            + encodePath(orderId);

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.GET,
                            entity,
                            String.class
                    );

            if (!response.getStatusCode()
                    .is2xxSuccessful()) {

                throw new RuntimeException(
                        "Failed to fetch Cashfree order."
                );
            }

            JsonNode json =
                    objectMapper.readTree(
                            response.getBody()
                    );

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "order_status",
                    text(json, "order_status")
            );

            result.put(
                    "cf_order_id",
                    text(json, "cf_order_id")
            );

            result.put(
                    "order_amount",
                    json.path("order_amount")
                            .asDouble()
            );

            return result;

        } catch (HttpStatusCodeException e) {

            throw new RuntimeException(
                    "Cashfree status API error: "
                            + e.getResponseBodyAsString(),
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to fetch Cashfree order status.",
                    e
            );
        }
    }

    // =========================================================
    // BUILD RETURN URL
    // =========================================================

    public String buildReturnUrl(
            Long orderId) {

        return normalizeBaseUrl(returnBaseUrl)
                + "?order_id="
                + orderId;
    }

    // =========================================================
    // VERIFY WEBHOOK
    // =========================================================

    public boolean verifyWebhook(
            String rawPayload,
            HttpServletRequest request) {

        try {

            String signature =
                    request.getHeader(
                            "x-webhook-signature"
                    );

            String timestamp =
                    request.getHeader(
                            "x-webhook-timestamp"
                    );

            if (signature == null ||
                    timestamp == null ||
                    signature.isBlank() ||
                    timestamp.isBlank()) {

                return false;
            }

            /*
             * Cashfree webhook signature is generated from:
             *
             * timestamp + raw request body
             *
             * IMPORTANT:
             * Use the RAW request body.
             * Do not parse and reconstruct JSON before
             * verification.
             */

            String signedPayload =
                    timestamp + rawPayload;

            String expectedSignature =
                    generateHmacSha256(
                            signedPayload,
                            clientSecret
                    );

            return constantTimeEquals(
                    expectedSignature,
                    signature
            );

        } catch (Exception e) {

            return false;
        }
    }

    // =========================================================
    // PARSE WEBHOOK
    // =========================================================

    public CashfreeWebhookData parseWebhook(
            String rawPayload) {

        try {

            JsonNode root =
                    objectMapper.readTree(
                            rawPayload
                    );

            JsonNode data =
                    root.path("data");

            JsonNode order =
                    data.path("order");

            JsonNode payment =
                    data.path("payment");

            JsonNode customerDetails =
                    data.path("customer_details");

            String eventType =
                    root.path("type")
                            .asText(null);

            String eventId =
                    root.path("event_time")
                            .asText(null);

            String cfOrderId =
                    firstNonBlank(
                            text(order, "order_id"),
                            text(order, "cf_order_id")
                    );

            String cfPaymentId =
                    firstNonBlank(
                            text(payment, "cf_payment_id"),
                            text(payment, "payment_id")
                    );

            String paymentStatus =
                    firstNonBlank(
                            text(payment, "payment_status"),
                            text(data, "payment_status")
                    );

            String paymentMethod =
                    firstNonBlank(
                            text(payment, "payment_group"),
                            text(payment, "payment_method")
                    );

            String failureCode =
                    firstNonBlank(
                            text(payment, "payment_message"),
                            text(payment, "error_details")
                    );

            String failureReason =
                    firstNonBlank(
                            text(payment, "payment_message"),
                            text(payment, "error_details")
                    );

            return CashfreeWebhookData.builder()
                    .eventId(eventId)
                    .eventType(eventType)
                    .cashfreeOrderId(cfOrderId)
                    .cashfreePaymentId(cfPaymentId)
                    .paymentStatus(paymentStatus)
                    .paymentMethod(paymentMethod)
                    .failureCode(failureCode)
                    .failureReason(failureReason)
                    .build();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Invalid Cashfree webhook payload.",
                    e
            );
        }
    }

    // =========================================================
    // HTTP HEADERS
    // =========================================================

    private HttpHeaders createHeaders() {

        HttpHeaders headers =
                new HttpHeaders();

        headers.set(
                "x-client-id",
                appId
        );

        headers.set(
                "x-client-secret",
                clientSecret
        );

        headers.set(
                "x-api-version",
                apiVersion
        );

        headers.setContentType(
                MediaType.APPLICATION_JSON
        );

        headers.setAccept(
                java.util.List.of(
                        MediaType.APPLICATION_JSON
                )
        );

        return headers;
    }

    // =========================================================
    // HMAC SHA256
    // =========================================================

    private String generateHmacSha256(
            String payload,
            String secret)
            throws Exception {

        Mac mac =
                Mac.getInstance("HmacSHA256");

        SecretKeySpec secretKey =
                new SecretKeySpec(
                        secret.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        "HmacSHA256"
                );

        mac.init(secretKey);

        byte[] hash =
                mac.doFinal(
                        payload.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

        return Base64.getEncoder()
                .encodeToString(hash);
    }

    // =========================================================
    // CONSTANT TIME COMPARISON
    // =========================================================

    private boolean constantTimeEquals(
            String a,
            String b) {

        if (a == null || b == null) {
            return false;
        }

        return java.security.MessageDigest
                .isEqual(
                        a.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        b.getBytes(
                                StandardCharsets.UTF_8
                        )
                );
    }

    // =========================================================
    // JSON HELPERS
    // =========================================================

    private String text(
            JsonNode node,
            String field) {

        if (node == null ||
                node.isMissingNode() ||
                node.isNull()) {

            return null;
        }

        JsonNode value =
                node.get(field);

        if (value == null ||
                value.isNull()) {

            return null;
        }

        String result =
                value.asText();

        return result == null ||
                result.isBlank()
                ? null
                : result;
    }

    private String firstNonBlank(
            String first,
            String second) {

        if (first != null &&
                !first.isBlank()) {

            return first;
        }

        return second;
    }

    private String normalizeBaseUrl(
            String url) {

        if (url == null) {
            throw new IllegalArgumentException(
                    "Cashfree URL is not configured."
            );
        }

        return url.endsWith("/")
                ? url.substring(
                        0,
                        url.length() - 1
                )
                : url;
    }

    private String encodePath(
            String value) {

        return java.net.URLEncoder
                .encode(
                        value,
                        StandardCharsets.UTF_8
                );
    }

    // =========================================================
    // PROCESS REFUND VIA CASHFREE
    // =========================================================

    /**
     * Initiate a refund against a Cashfree order.
     *
     * POST /orders/{cf_order_id}/refunds
     * Body: { "refund_amount", "refund_id", "refund_note" }
     *
     * Returns the Cashfree refund response map containing
     * "refund_id", "refund_status", etc.
     */
    public Map<String, Object> processRefund(
            String cfOrderId,
            BigDecimal refundAmount,
            String refundId,
            String refundNote
    ) {

        try {

            HttpHeaders headers = createHeaders();

            Map<String, Object> requestBody =
                    new HashMap<>();

            requestBody.put(
                    "refund_amount",
                    refundAmount
            );

            requestBody.put(
                    "refund_id",
                    refundId
            );

            requestBody.put(
                    "refund_note",
                    refundNote != null
                            ? refundNote
                            : "RuVo refund"
            );

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(
                            requestBody,
                            headers
                    );

            String url =
                    normalizeBaseUrl(baseUrl)
                            + "/orders/"
                            + encodePath(cfOrderId)
                            + "/refunds";

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.POST,
                            entity,
                            String.class
                    );

            if (!response.getStatusCode()
                    .is2xxSuccessful()) {

                throw new RuntimeException(
                        "Cashfree refund failed: "
                                + response.getStatusCode()
                );
            }

            if (response.getBody() == null ||
                    response.getBody().isBlank()) {

                throw new RuntimeException(
                        "Empty refund response from Cashfree."
                );
            }

            JsonNode json =
                    objectMapper.readTree(
                            response.getBody()
                    );

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "refund_id",
                    text(json, "refund_id")
            );

            result.put(
                    "refund_status",
                    text(json, "refund_status")
            );

            result.put(
                    "cf_order_id",
                    text(json, "cf_order_id")
            );

            return result;

        } catch (HttpStatusCodeException e) {

            throw new RuntimeException(
                    "Cashfree refund API error: "
                            + e.getResponseBodyAsString(),
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to process Cashfree refund.",
                    e
            );
        }
    }

    // =========================================================
    // TRANSFER TO DELIVERY PARTNER (POST-PAYMENT SPLIT)
    // =========================================================

    /**
     * Transfer delivery fee to a delivery partner's vendor account
     * after a UPI order is delivered.
     *
     * Uses Cashfree's post-payment split API:
     *   POST /orders/{cf_order_id}/split
     *   Body: { "transfers": [{ "vendor_id", "amount" }] }
     *
     * This enables instant 3-way split:
     *   1. At checkout: shop gets productAmount (via order_splits)
     *   2. After delivery: partner gets deliveryFee (via this method)
     *   3. RuVo keeps platformFee (stays in main account)
     */
    public Map<String, Object> transferToVendor(
            String cfOrderId,
            String vendorId,
            BigDecimal amount,
            String orderId
    ) {

        try {

            HttpHeaders headers = createHeaders();

            Map<String, Object> transfer =
                    new HashMap<>();

            transfer.put("vendor_id", vendorId);
            transfer.put("amount", amount);

            Map<String, Object> requestBody =
                    new HashMap<>();

            requestBody.put(
                    "transfers",
                    new Object[]{transfer}
            );

            requestBody.put("order_id", orderId);

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(
                            requestBody,
                            headers
                    );

            String url =
                    normalizeBaseUrl(baseUrl)
                            + "/orders/"
                            + encodePath(cfOrderId)
                            + "/split";

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.POST,
                            entity,
                            String.class
                    );

            if (!response.getStatusCode()
                    .is2xxSuccessful()) {

                throw new RuntimeException(
                        "Cashfree transfer failed: "
                                + response.getStatusCode()
                );
            }

            if (response.getBody() == null ||
                    response.getBody().isBlank()) {

                throw new RuntimeException(
                        "Empty transfer response from Cashfree."
                );
            }

            JsonNode json =
                    objectMapper.readTree(
                            response.getBody()
                    );

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "cf_order_id",
                    text(json, "cf_order_id")
            );

            result.put(
                    "transfer_status",
                    text(json, "transfer_status")
            );

            result.put(
                    "vendor_id",
                    text(json, "vendor_id")
            );

            return result;

        } catch (HttpStatusCodeException e) {

            throw new RuntimeException(
                    "Cashfree transfer API error: "
                            + e.getResponseBodyAsString(),
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to transfer to vendor.",
                    e
            );
        }
    }

    // =========================================================
    // VENDOR ONBOARDING (Register shop/partner as Cashfree vendor)
    // =========================================================

    /**
     * Register a shop or delivery partner as a Cashfree vendor/sub-merchant.
     *
     * POST /vendors
     * Body: { vendor_id, status, name, phone, email, pan, bank }
     *
     * After creation, save the returned vendor_id on the
     * shop.cashfreeVendorId or deliveryPartner.cashfreeVendorId field.
     *
     * Prerequisites:
     *   - Split/Transfer feature must be enabled on your Cashfree account
     *   - Contact Cashfree support or enable from dashboard
     */
    public Map<String, Object> createVendor(
            String vendorId,
            String name,
            String phone,
            String email,
            String pan,
            String accountNumber,
            String ifsc,
            String beneficiaryName
    ) {

        try {

            HttpHeaders headers = createHeaders();

            Map<String, Object> bankDetails =
                    new HashMap<>();

            bankDetails.put(
                    "account_number",
                    accountNumber
            );

            bankDetails.put(
                    "ifsc",
                    ifsc
            );

            bankDetails.put(
                    "beneficiary_name",
                    beneficiaryName != null
                            ? beneficiaryName
                            : name
            );

            Map<String, Object> requestBody =
                    new HashMap<>();

            requestBody.put(
                    "vendor_id",
                    vendorId
            );

            requestBody.put(
                    "status",
                    "ACTIVE"
            );

            requestBody.put(
                    "name",
                    name
            );

            requestBody.put(
                    "phone",
                    phone
            );

            requestBody.put(
                    "email",
                    email
            );

            if (pan != null && !pan.isBlank()) {
                requestBody.put(
                        "pan",
                        pan
                );
            }

            requestBody.put(
                    "bank",
                    bankDetails
            );

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(
                            requestBody,
                            headers
                    );

            String url =
                    normalizeBaseUrl(baseUrl)
                            + "/vendors";

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.POST,
                            entity,
                            String.class
                    );

            if (!response.getStatusCode()
                    .is2xxSuccessful()) {

                throw new RuntimeException(
                        "Cashfree vendor creation failed: "
                                + response.getStatusCode()
                );
            }

            if (response.getBody() == null ||
                    response.getBody().isBlank()) {

                throw new RuntimeException(
                        "Empty vendor creation response."
                );
            }

            JsonNode json =
                    objectMapper.readTree(
                            response.getBody()
                    );

            Map<String, Object> result =
                    new HashMap<>();

            result.put(
                    "vendor_id",
                    text(json, "vendor_id")
            );

            result.put(
                    "status",
                    text(json, "status")
            );

            result.put(
                    "message",
                    text(json, "message")
            );

            return result;

        } catch (HttpStatusCodeException e) {

            throw new RuntimeException(
                    "Cashfree vendor API error: "
                            + e.getResponseBodyAsString(),
                    e
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to create Cashfree vendor.",
                    e
            );
        }
    }

    // =========================================================
    // WEBHOOK DTO
    // =========================================================

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class CashfreeWebhookData {

        private String eventId;

        private String eventType;

        private String cashfreeOrderId;

        private String cashfreePaymentId;

        private String paymentStatus;

        private String paymentMethod;

        private String failureCode;

        private String failureReason;
    }
}