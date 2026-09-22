package Ranex.ruvo.service;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class RazorpayRouteService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayRouteService.class);

    @Value("${razorpay.key.id:}")
    private String keyId;

    @Value("${razorpay.key.secret:}")
    private String keySecret;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    @Value("${razorpay.test.mode:false}")
    private boolean testMode;

    private final ShopRepository shopRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final RazorpayLinkedAccountRepository linkedAccountRepository;
    private final RazorpayStakeholderRepository stakeholderRepository;
    private final RazorpayProductConfigRepository productConfigRepository;
    private final SellerBankAccountRepository bankAccountRepository;
    private final BankAccountAuditLogRepository auditLogRepository;

    public RazorpayRouteService(
            ShopRepository shopRepository,
            DeliveryPartnerRepository deliveryPartnerRepository,
            RazorpayLinkedAccountRepository linkedAccountRepository,
            RazorpayStakeholderRepository stakeholderRepository,
            RazorpayProductConfigRepository productConfigRepository,
            SellerBankAccountRepository bankAccountRepository,
            BankAccountAuditLogRepository auditLogRepository) {
        this.shopRepository = shopRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.linkedAccountRepository = linkedAccountRepository;
        this.stakeholderRepository = stakeholderRepository;
        this.productConfigRepository = productConfigRepository;
        this.bankAccountRepository = bankAccountRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * 1. Create a Razorpay Route Linked Account for a seller shop
     */
    @Transactional
    public RazorpayLinkedAccount createLinkedAccount(
            Long shopId,
            String legalBusinessName,
            String email,
            String phone,
            String businessType,
            String category,
            String street,
            String city,
            String state,
            String postalCode) {

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found for ID: " + shopId));

        Optional<RazorpayLinkedAccount> existing = linkedAccountRepository.findByShopId(shopId);
        if (existing.isPresent()) {
            log.info("Linked Account already exists for shopId {}: {}", shopId, existing.get().getRazorpayAccountId());
            return existing.get();
        }

        String finalName = (legalBusinessName != null && !legalBusinessName.isBlank()) ? legalBusinessName.trim() : shop.getName();
        String finalEmail = "shop_" + shopId + "_" + System.currentTimeMillis() + "@ruvomobile.me";
        String finalPhone = sanitizePhone(phone != null ? phone : shop.getPhone());
        String finalBusinessType = (businessType != null && !businessType.isBlank()) ? businessType.trim().toLowerCase() : "individual";

        String razorpayAccountId;
        String status = "created";

        if (isCredentialsConfigured()) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("type", "route");
                payload.put("email", finalEmail);
                payload.put("phone", finalPhone);
                payload.put("legal_business_name", finalName);
                payload.put("business_type", finalBusinessType);
                payload.put("contact_name", shop.getOwner() != null ? shop.getOwner() : finalName);

                JSONObject profile = new JSONObject();
                profile.put("category", (category != null && !category.isBlank()) ? category.toLowerCase() : "ecommerce");
                profile.put("subcategory", "grocery");

                String resolvedStreet = (street != null && !street.isBlank()) ? street : (shop.getAddress() != null ? shop.getAddress() : "Main Street");
                resolvedStreet = resolvedStreet.substring(0, Math.min(resolvedStreet.length(), 100)).trim();
                
                JSONObject registered = new JSONObject();
                registered.put("street1", resolvedStreet);
                registered.put("street2", "Area"); // Razorpay requires street2
                registered.put("city", (city != null && !city.isBlank()) ? city : "Nagpur");
                registered.put("state", (state != null && !state.isBlank()) ? state : "Maharashtra");
                registered.put("postal_code", (postalCode != null && !postalCode.isBlank()) ? postalCode : "440001");
                registered.put("country", "IN");

                JSONObject addresses = new JSONObject();
                addresses.put("registered", registered);
                profile.put("addresses", addresses);
                payload.put("profile", profile);

                HttpResponse response = executeRazorpayApi("POST", "https://api.razorpay.com/v2/accounts", payload.toString());
                if (response.statusCode == 200 || response.statusCode == 201) {
                    JSONObject resJson = new JSONObject(response.body);
                    razorpayAccountId = resJson.getString("id");
                    if (resJson.has("status")) {
                        status = resJson.getString("status");
                    }
                    log.info("Successfully created Razorpay Linked Account: {} for shopId {}", razorpayAccountId, shopId);
                } else {
                    log.error("Razorpay Linked Account API failed (HTTP {}): {}", response.statusCode, response.body);
                    throw new RuntimeException("Razorpay error: " + response.body);
                }
            } catch (Exception e) {
                log.error("Exception creating Razorpay Linked Account for shopId {}: {}", shopId, e.getMessage());
                throw new RuntimeException("Errror connecting to Razorpay: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Razorpay API keys not configured. Cannot create Linked Account.");
        }

        RazorpayLinkedAccount account = RazorpayLinkedAccount.builder()
                .shopId(shopId)
                .razorpayAccountId(razorpayAccountId)
                .email(finalEmail)
                .phone(finalPhone)
                .legalBusinessName(finalName)
                .businessType(finalBusinessType)
                .contactName(shop.getOwner() != null ? shop.getOwner() : finalName)
                .status(status)
                .build();

        RazorpayLinkedAccount savedAccount = linkedAccountRepository.save(account);

        shop.setRazorpayAccountId(razorpayAccountId);
        shopRepository.save(shop);

        return savedAccount;
    }

    /**
     * 1b. Create a Razorpay Route Linked Account for a Delivery Partner
     */
    @Transactional
    public RazorpayLinkedAccount createPartnerLinkedAccount(
            Long partnerId,
            String legalBusinessName,
            String email,
            String businessType,
            String street,
            String city,
            String state,
            String postalCode) {

        DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found for ID: " + partnerId));

        Optional<RazorpayLinkedAccount> existing = linkedAccountRepository.findByPartnerId(partnerId);
        if (existing.isPresent()) {
            return existing.get();
        }

        String finalName = (legalBusinessName != null && !legalBusinessName.isBlank()) ? legalBusinessName.trim() : partner.getName();
        String finalEmail = "partner_" + partnerId + "_" + System.currentTimeMillis() + "@ruvomobile.me";
        String finalPhone = sanitizePhone(partner.getPhone());
        String finalBusinessType = (businessType != null && !businessType.isBlank()) ? businessType.trim().toLowerCase() : "individual";

        String razorpayAccountId;
        String status = "created";

        if (isCredentialsConfigured()) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("type", "route");
                payload.put("email", finalEmail);
                payload.put("phone", finalPhone);
                payload.put("legal_business_name", finalName);
                payload.put("business_type", finalBusinessType);
                payload.put("contact_name", partner.getName() != null ? partner.getName() : finalName);

                JSONObject profile = new JSONObject();
                profile.put("category", "logistics");
                profile.put("subcategory", "courier");

                String resolvedPartnerStreet = (street != null && !street.isBlank()) ? street : "Main Street";
                resolvedPartnerStreet = resolvedPartnerStreet.substring(0, Math.min(resolvedPartnerStreet.length(), 100)).trim();
                
                JSONObject registered = new JSONObject();
                registered.put("street1", resolvedPartnerStreet);
                registered.put("street2", "Area");
                registered.put("city", (city != null && !city.isBlank()) ? city : "Nagpur");
                registered.put("state", (state != null && !state.isBlank()) ? state : "Maharashtra");
                registered.put("postal_code", (postalCode != null && !postalCode.isBlank()) ? postalCode : "440001");
                registered.put("country", "IN");

                JSONObject addresses = new JSONObject();
                addresses.put("registered", registered);
                profile.put("addresses", addresses);
                payload.put("profile", profile);

                HttpResponse response = executeRazorpayApi("POST", "https://api.razorpay.com/v2/accounts", payload.toString());
                if (response.statusCode == 200 || response.statusCode == 201) {
                    JSONObject resJson = new JSONObject(response.body);
                    razorpayAccountId = resJson.getString("id");
                    if (resJson.has("status")) status = resJson.getString("status");
                } else {
                    throw new RuntimeException("Razorpay error: " + response.body);
                }
            } catch (Exception e) {
                throw new RuntimeException("Errror connecting to Razorpay: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Razorpay API keys not configured.");
        }

        RazorpayLinkedAccount account = RazorpayLinkedAccount.builder()
                .partnerId(partnerId)
                .razorpayAccountId(razorpayAccountId)
                .email(finalEmail)
                .phone(finalPhone)
                .legalBusinessName(finalName)
                .businessType(finalBusinessType)
                .contactName(partner.getName() != null ? partner.getName() : finalName)
                .status(status)
                .build();

        RazorpayLinkedAccount savedAccount = linkedAccountRepository.save(account);
        partner.setRazorpayAccountId(razorpayAccountId);
        deliveryPartnerRepository.save(partner);

        return savedAccount;
    }

    /**
     * 2. Create Razorpay Stakeholder for Linked Account
     */
    @Transactional
    public RazorpayStakeholder createStakeholder(
            Long shopId,
            String name,
            String email,
            String phone,
            String panNumber,
            String relationship) {

        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalStateException("Linked account not found for shopId: " + shopId));

        String finalName = (name != null && !name.isBlank()) ? name.trim() : linkedAccount.getContactName();
        String finalEmail = linkedAccount.getEmail();
        String finalPhone = sanitizePhone(phone != null ? phone : linkedAccount.getPhone());
        String finalRel = (relationship != null && !relationship.isBlank()) ? relationship.trim().toLowerCase() : "owner";

        String stakeholderId = null;
        String status = "created";

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("name", finalName);
                payload.put("email", finalEmail);

                JSONObject phoneObj = new JSONObject();
                phoneObj.put("primary", finalPhone);
                payload.put("phone", phoneObj);

                if (!"owner".equalsIgnoreCase(finalRel)) {
                    JSONObject relObj = new JSONObject();
                    relObj.put(finalRel, true);
                    payload.put("relationship", relObj);
                }

                if (panNumber != null && !panNumber.isBlank()) {
                    JSONObject kyc = new JSONObject();
                    kyc.put("pan", panNumber.trim().toUpperCase());
                    payload.put("kyc", kyc);
                }

                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/stakeholders";
                HttpResponse response = executeRazorpayApi("POST", url, payload.toString());

                if (response.statusCode == 200 || response.statusCode == 201) {
                    JSONObject resJson = new JSONObject(response.body);
                    stakeholderId = resJson.optString("id", "sth_" + System.currentTimeMillis());
                    status = resJson.optString("status", "created");
                    log.info("Created Razorpay Stakeholder {} for account {}", stakeholderId, linkedAccount.getRazorpayAccountId());
                } else {
                    log.error("Razorpay Stakeholder API error (HTTP {}): {}", response.statusCode, response.body);
                    throw new RuntimeException("Razorpay Stakeholder creation failed: " + response.body);
                }
            } catch (Exception e) {
                log.error("Error creating Razorpay Stakeholder for shopId {}: {}", shopId, e.getMessage());
                throw new RuntimeException("Failed to create Razorpay Stakeholder: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Razorpay credentials missing or Linked Account is invalid.");
        }

        RazorpayStakeholder stakeholder = RazorpayStakeholder.builder()
                .linkedAccountId(linkedAccount.getId())
                .razorpayStakeholderId(stakeholderId)
                .name(finalName)
                .email(finalEmail)
                .phone(finalPhone)
                .relationship(finalRel)
                .panMasked(maskPan(panNumber))
                .status(status)
                .build();

        return stakeholderRepository.save(stakeholder);
    }

    /**
     * 2b. Create Razorpay Stakeholder for Partner Linked Account
     */
    @Transactional
    public RazorpayStakeholder createPartnerStakeholder(
            Long partnerId,
            String panNumber) {

        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByPartnerId(partnerId)
                .orElseThrow(() -> new IllegalStateException("Linked account not found for partner: " + partnerId));

        String stakeholderId = null;
        String status = "created";

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("name", linkedAccount.getContactName());
                payload.put("email", linkedAccount.getEmail());

                JSONObject phoneObj = new JSONObject();
                phoneObj.put("primary", linkedAccount.getPhone());
                payload.put("phone", phoneObj);

                // Relationship object not required for 'owner' (individual/proprietorship)

                if (panNumber != null && !panNumber.isBlank()) {
                    JSONObject kyc = new JSONObject();
                    kyc.put("pan", panNumber.trim().toUpperCase());
                    payload.put("kyc", kyc);
                }

                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/stakeholders";
                HttpResponse response = executeRazorpayApi("POST", url, payload.toString());

                if (response.statusCode == 200 || response.statusCode == 201) {
                    JSONObject resJson = new JSONObject(response.body);
                    stakeholderId = resJson.optString("id", "sth_" + System.currentTimeMillis());
                    status = resJson.optString("status", "created");
                } else {
                    throw new RuntimeException("Razorpay Stakeholder creation failed: " + response.body);
                }
            } catch (Exception e) {
                throw new RuntimeException("Failed to create Razorpay Stakeholder: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Razorpay credentials missing or invalid.");
        }

        RazorpayStakeholder stakeholder = RazorpayStakeholder.builder()
                .linkedAccountId(linkedAccount.getId())
                .razorpayStakeholderId(stakeholderId)
                .name(linkedAccount.getContactName())
                .email(linkedAccount.getEmail())
                .phone(linkedAccount.getPhone())
                .relationship("owner")
                .panMasked(maskPan(panNumber))
                .status(status)
                .build();

        return stakeholderRepository.save(stakeholder);
    }

    /**
     * 3. Request Route Product for Linked Account
     */
    @Transactional
    public RazorpayProductConfig requestRouteProduct(Long shopId) {
        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalStateException("Linked account not found for shopId: " + shopId));

        Optional<RazorpayProductConfig> existing = productConfigRepository.findByLinkedAccountIdAndProductName(linkedAccount.getId(), "route");
        if (existing.isPresent()) {
            return existing.get();
        }

        String productStatus = "requested";
        String razorpayProductId = null;
        String pendingReqsJson = null;

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("product_name", "route");
                payload.put("tnc_accepted", true);

                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/products";
                HttpResponse response = executeRazorpayApi("POST", url, payload.toString());

                if (response.statusCode == 200 || response.statusCode == 201) {
                    JSONObject resJson = new JSONObject(response.body);
                    razorpayProductId = resJson.optString("id", linkedAccount.getRazorpayAccountId());
                    productStatus = resJson.optString("status", "requested");
                    if (resJson.has("requirements")) {
                        pendingReqsJson = resJson.get("requirements").toString();
                    }
                    log.info("Requested Route product for account {}: status {}", linkedAccount.getRazorpayAccountId(), productStatus);
                } else {
                    log.error("Route Product request API error (HTTP {}): {}", response.statusCode, response.body);
                    throw new RuntimeException("Razorpay Route Product Request rejected: " + response.body);
                }
            } catch (Exception e) {
                log.error("Error requesting Route product for shopId {}: {}", shopId, e.getMessage());
                throw new RuntimeException("Exception requesting Route Product: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Razorpay credentials missing or Linked Account is invalid.");
        }

        RazorpayProductConfig config = RazorpayProductConfig.builder()
                .linkedAccountId(linkedAccount.getId())
                .productName("route")
                .razorpayProductId(razorpayProductId)
                .status(productStatus)
                .tncAccepted(true)
                .pendingRequirements(pendingReqsJson)
                .build();

        return productConfigRepository.save(config);
    }

    /**
     * 3b. Request Route Product for Partner
     */
    @Transactional
    public RazorpayProductConfig requestPartnerRouteProduct(Long partnerId) {
        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByPartnerId(partnerId)
                .orElseThrow(() -> new IllegalStateException("Linked account not found for partner: " + partnerId));

        return requestProductCommonInternal(linkedAccount);
    }

    private RazorpayProductConfig requestProductCommonInternal(RazorpayLinkedAccount linkedAccount) {
        Optional<RazorpayProductConfig> existing = productConfigRepository.findByLinkedAccountIdAndProductName(linkedAccount.getId(), "route");
        if (existing.isPresent()) {
            return existing.get();
        }

        String productStatus = "requested";
        String razorpayProductId = null;
        String pendingReqsJson = null;

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                JSONObject payload = new JSONObject();
                payload.put("product_name", "route");
                payload.put("tnc_accepted", true);

                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/products";
                HttpResponse response = executeRazorpayApi("POST", url, payload.toString());

                if (response.statusCode == 200 || response.statusCode == 201) {
                    JSONObject resJson = new JSONObject(response.body);
                    razorpayProductId = resJson.optString("id", linkedAccount.getRazorpayAccountId());
                    productStatus = resJson.optString("status", "requested");
                    if (resJson.has("requirements")) {
                        pendingReqsJson = resJson.get("requirements").toString();
                    }
                } else {
                    throw new RuntimeException("Razorpay Route Product Request rejected: " + response.body);
                }
            } catch (Exception e) {
                throw new RuntimeException("Exception requesting Route Product: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Razorpay credentials missing or invalid.");
        }

        RazorpayProductConfig config = RazorpayProductConfig.builder()
                .linkedAccountId(linkedAccount.getId())
                .productName("route")
                .razorpayProductId(razorpayProductId)
                .status(productStatus)
                .tncAccepted(true)
                .pendingRequirements(pendingReqsJson)
                .build();

        return productConfigRepository.save(config);
    }

    /**
     * 4. Fetch Route Product Configuration & Inspect Requirements
     */
    @Transactional
    public RazorpayProductConfig fetchRouteProductConfig(Long shopId) {
        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalStateException("Linked account not found for shopId: " + shopId));

        RazorpayProductConfig config = productConfigRepository.findByLinkedAccountIdAndProductName(linkedAccount.getId(), "route")
                .orElseGet(() -> requestRouteProduct(shopId));

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/products/" + config.getRazorpayProductId();
                HttpResponse response = executeRazorpayApi("GET", url, null);

                if (response.statusCode == 200) {
                    JSONObject resJson = new JSONObject(response.body);
                    String fetchedStatus = resJson.optString("status", config.getStatus());
                    config.setStatus(fetchedStatus);

                    if (resJson.has("requirements")) {
                        config.setPendingRequirements(resJson.get("requirements").toString());
                    }

                    if ("activated".equalsIgnoreCase(fetchedStatus)) {
                        linkedAccount.setStatus("activated");
                        linkedAccountRepository.save(linkedAccount);
                    } else if ("suspended".equalsIgnoreCase(fetchedStatus)) {
                        linkedAccount.setStatus("suspended");
                        linkedAccountRepository.save(linkedAccount);
                    } else if ("needs_clarification".equalsIgnoreCase(fetchedStatus)) {
                        linkedAccount.setStatus("needs_clarification");
                        linkedAccountRepository.save(linkedAccount);
                    }

                    config = productConfigRepository.save(config);
                    log.info("Fetched Route product config for shopId {}: status={}", shopId, fetchedStatus);
                }
            } catch (Exception e) {
                log.error("Error fetching Route product config for shopId {}: {}", shopId, e.getMessage());
            }
        }

        return config;
    }

    /**
     * 4b. Fetch Route Product for Partner
     */
    @Transactional
    public RazorpayProductConfig fetchPartnerRouteProductConfig(Long partnerId) {
        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByPartnerId(partnerId)
                .orElseThrow(() -> new IllegalStateException("Linked account not found for partner: " + partnerId));

        return fetchProductCommonInternal(linkedAccount);
    }

    private RazorpayProductConfig fetchProductCommonInternal(RazorpayLinkedAccount linkedAccount) {
        RazorpayProductConfig config = productConfigRepository.findByLinkedAccountIdAndProductName(linkedAccount.getId(), "route")
                .orElseGet(() -> requestProductCommonInternal(linkedAccount));

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/products/" + config.getRazorpayProductId();
                HttpResponse response = executeRazorpayApi("GET", url, null);

                if (response.statusCode == 200) {
                    JSONObject resJson = new JSONObject(response.body);
                    String fetchedStatus = resJson.optString("status", config.getStatus());
                    config.setStatus(fetchedStatus);

                    if (resJson.has("requirements")) config.setPendingRequirements(resJson.get("requirements").toString());
                    if ("activated".equalsIgnoreCase(fetchedStatus) || "suspended".equalsIgnoreCase(fetchedStatus) || "needs_clarification".equalsIgnoreCase(fetchedStatus)) {
                        linkedAccount.setStatus(fetchedStatus.toLowerCase());
                        linkedAccountRepository.save(linkedAccount);
                    }
                    config = productConfigRepository.save(config);
                }
            } catch (Exception e) {
                log.error("Error fetching Route product config: {}", e.getMessage());
            }
        }
        return config;
    }

    /**
     * 5. Submit/Update Onboarding Information through Razorpay Route Product Config API
     */
    @Transactional
    public RazorpayProductConfig updateRouteOnboardingData(Long shopId, Map<String, Object> updatePayload) {
        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalStateException("Linked account not found for shopId: " + shopId));

        RazorpayProductConfig config = productConfigRepository.findByLinkedAccountIdAndProductName(linkedAccount.getId(), "route")
                .orElseGet(() -> requestRouteProduct(shopId));

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                JSONObject payloadJson = new JSONObject(updatePayload);
                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/products/" + config.getRazorpayProductId();
                HttpResponse response = executeRazorpayApi("PATCH", url, payloadJson.toString());

                if (response.statusCode == 200 || response.statusCode == 202) {
                    JSONObject resJson = new JSONObject(response.body);
                    String updatedStatus = resJson.optString("status", "under_review");
                    config.setStatus(updatedStatus);
                    if (resJson.has("requirements")) {
                        config.setPendingRequirements(resJson.get("requirements").toString());
                    }
                    config = productConfigRepository.save(config);

                    linkedAccount.setStatus(updatedStatus);
                    linkedAccountRepository.save(linkedAccount);

                    log.info("Updated Route onboarding data for shopId {}: new status={}", shopId, updatedStatus);
                } else {
                    log.error("Error updating Route product config (HTTP {}): {}", response.statusCode, response.body);
                    throw new RuntimeException("Razorpay rejected onboarding update: " + response.body);
                }
            } catch (Exception e) {
                log.error("Exception updating Route onboarding data for shopId {}: {}", shopId, e.getMessage());
                throw new RuntimeException("Failed to update Razorpay onboarding: " + e.getMessage(), e);
            }
        } else {
            config.setStatus("under_review");
            config = productConfigRepository.save(config);
        }

        return config;
    }

    /**
     * 6. Submit or Update Settlement Bank Details via Route Product Configuration
     */
    @Transactional
    public SellerBankAccount submitSettlementBankDetails(
            Long shopId,
            String accountNumber,
            String ifscCode,
            String beneficiaryName,
            String requestedBy) {

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalArgumentException("Shop not found for ID: " + shopId));

        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByShopId(shopId)
                .orElseThrow(() -> new IllegalStateException("Linked Account must be created before updating bank details."));

        String cleanAcc = accountNumber != null ? accountNumber.trim() : "";
        String cleanIfsc = ifscCode != null ? ifscCode.trim().toUpperCase() : "";
        String cleanName = beneficiaryName != null ? beneficiaryName.trim() : (shop.getOwner() != null ? shop.getOwner() : shop.getName());

        if (cleanAcc.isBlank() || cleanIfsc.isBlank()) {
            throw new IllegalArgumentException("Bank Account Number and IFSC Code are required.");
        }

        Optional<SellerBankAccount> currentActiveOpt = bankAccountRepository.findByShopIdAndIsActiveTrue(shopId);

        String oldConfigRef = currentActiveOpt.map(SellerBankAccount::getRazorpayBankReference).orElse("N/A");
        String oldBankMasked = currentActiveOpt.map(SellerBankAccount::getAccountNumberMasked).orElse("N/A");
        String oldIfsc = currentActiveOpt.map(SellerBankAccount::getIfscCode).orElse("N/A");

        String newBankMasked = maskAccountNumber(cleanAcc);
        String rzpStatus = "UNDER_REVIEW";
        String bankRef = "bank_ref_" + System.currentTimeMillis();

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                RazorpayProductConfig config = productConfigRepository.findByLinkedAccountIdAndProductName(linkedAccount.getId(), "route")
                        .orElseGet(() -> requestRouteProduct(shopId));
                        
                JSONObject payload = new JSONObject();
                JSONObject settlements = new JSONObject();
                settlements.put("account_number", cleanAcc);
                settlements.put("ifsc_code", cleanIfsc);
                settlements.put("beneficiary_name", cleanName);
                payload.put("settlements", settlements);

                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/products/" + config.getRazorpayProductId();
                HttpResponse response = executeRazorpayApi("PATCH", url, payload.toString());

                if (response.statusCode == 200 || response.statusCode == 202) {
                    JSONObject resJson = new JSONObject(response.body);
                    String productStatus = resJson.optString("status", "under_review");
                    bankRef = "rzp_set_" + System.currentTimeMillis();

                    if ("activated".equalsIgnoreCase(productStatus)) {
                        rzpStatus = "ACTIVE";
                    } else if ("needs_clarification".equalsIgnoreCase(productStatus)) {
                        rzpStatus = "NEEDS_CLARIFICATION";
                    } else {
                        rzpStatus = "UNDER_REVIEW";
                    }

                    config.setStatus(productStatus);
                    if (resJson.has("requirements")) {
                        config.setPendingRequirements(resJson.get("requirements").toString());
                    }
                    productConfigRepository.save(config);

                    log.info("Submitted settlement bank details to Razorpay for shopId {}: status={}", shopId, rzpStatus);
                } else {
                    log.error("Razorpay Bank Details update error (HTTP {}): {}", response.statusCode, response.body);
                    throw new RuntimeException("Razorpay Bank verification rejected: " + response.body);
                }
            } catch (Exception e) {
                log.error("Exception submitting bank details to Razorpay for shopId {}: {}", shopId, e.getMessage());
                throw new RuntimeException("Failed to submit Bank details to Razorpay: " + e.getMessage());
            }
        } else {
            throw new RuntimeException("Razorpay credentials missing or Linked Account is invalid.");
        }

        SellerBankAccount newBankAccount = SellerBankAccount.builder()
                .shopId(shopId)
                .accountNumberMasked(newBankMasked)
                .accountNumberEncrypted(encryptAccountNumber(cleanAcc))
                .ifscCode(cleanIfsc)
                .beneficiaryName(cleanName)
                .status(rzpStatus)
                .isActive("ACTIVE".equals(rzpStatus))
                .razorpayBankReference(bankRef)
                .build();

        if ("ACTIVE".equals(rzpStatus)) {
            currentActiveOpt.ifPresent(old -> {
                old.setIsActive(false);
                bankAccountRepository.save(old);
            });

            shop.setBankAccountNumber(cleanAcc);
            shop.setIfscCode(cleanIfsc);
            shopRepository.save(shop);
        }

        SellerBankAccount savedBank = bankAccountRepository.save(newBankAccount);

        BankAccountAuditLog auditLog = BankAccountAuditLog.builder()
                .shopId(shopId)
                .sellerId(requestedBy != null ? requestedBy : shop.getOwnerId())
                .oldConfigReference(oldConfigRef)
                .newConfigReference(bankRef)
                .oldBankMasked(oldBankMasked)
                .newBankMasked(newBankMasked)
                .oldIfsc(oldIfsc)
                .newIfsc(cleanIfsc)
                .razorpayStatus(rzpStatus)
                .requestedBy(requestedBy != null ? requestedBy : "SELLER")
                .build();

        auditLogRepository.save(auditLog);

        return savedBank;
    }

    /**
     * 6b. Submit Settlement Bank Details for Partner
     */
    @Transactional
    public SellerBankAccount submitPartnerSettlementBankDetails(
            Long partnerId,
            String accountNumber,
            String ifscCode,
            String beneficiaryName,
            String requestedBy) {

        DeliveryPartner partner = deliveryPartnerRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found for ID: " + partnerId));

        RazorpayLinkedAccount linkedAccount = linkedAccountRepository.findByPartnerId(partnerId)
                .orElseThrow(() -> new IllegalStateException("Linked Account must be created before updating bank details."));

        String cleanAcc = accountNumber != null ? accountNumber.trim() : "";
        String cleanIfsc = ifscCode != null ? ifscCode.trim().toUpperCase() : "";
        String cleanName = beneficiaryName != null ? beneficiaryName.trim() : partner.getName();

        if (cleanAcc.isBlank() || cleanIfsc.isBlank()) {
            throw new IllegalArgumentException("Bank Account Number and IFSC Code are required.");
        }

        Optional<SellerBankAccount> currentActiveOpt = bankAccountRepository.findByPartnerIdAndIsActiveTrue(partnerId);

        String oldConfigRef = currentActiveOpt.map(SellerBankAccount::getRazorpayBankReference).orElse("N/A");
        String oldBankMasked = currentActiveOpt.map(SellerBankAccount::getAccountNumberMasked).orElse("N/A");
        String oldIfsc = currentActiveOpt.map(SellerBankAccount::getIfscCode).orElse("N/A");

        String newBankMasked = maskAccountNumber(cleanAcc);
        String rzpStatus = "UNDER_REVIEW";
        String bankRef = "bank_ref_" + System.currentTimeMillis();

        if (isCredentialsConfigured() && linkedAccount.getRazorpayAccountId().startsWith("acc_")) {
            try {
                RazorpayProductConfig config = productConfigRepository.findByLinkedAccountIdAndProductName(linkedAccount.getId(), "route")
                        .orElseGet(() -> requestProductCommonInternal(linkedAccount));
                        
                JSONObject payload = new JSONObject();
                JSONObject settlements = new JSONObject();
                settlements.put("account_number", cleanAcc);
                settlements.put("ifsc_code", cleanIfsc);
                settlements.put("beneficiary_name", cleanName);
                payload.put("settlements", settlements);

                String url = "https://api.razorpay.com/v2/accounts/" + linkedAccount.getRazorpayAccountId() + "/products/" + config.getRazorpayProductId();
                HttpResponse response = executeRazorpayApi("PATCH", url, payload.toString());

                if (response.statusCode == 200 || response.statusCode == 202) {
                    JSONObject resJson = new JSONObject(response.body);
                    String productStatus = resJson.optString("status", "under_review");
                    bankRef = "rzp_set_" + System.currentTimeMillis();

                    if ("activated".equalsIgnoreCase(productStatus)) rzpStatus = "ACTIVE";
                    else if ("needs_clarification".equalsIgnoreCase(productStatus)) rzpStatus = "NEEDS_CLARIFICATION";

                    config.setStatus(productStatus);
                    if (resJson.has("requirements")) config.setPendingRequirements(resJson.get("requirements").toString());
                    productConfigRepository.save(config);
                } else {
                    throw new RuntimeException("Bank validation rejected: " + response.body);
                }
            } catch (Exception e) {
                throw new RuntimeException("Failed to submit Bank details: " + e.getMessage());
            }
        }

        SellerBankAccount newBankAccount = SellerBankAccount.builder()
                .partnerId(partnerId)
                .accountNumberMasked(newBankMasked)
                .accountNumberEncrypted(encryptAccountNumber(cleanAcc))
                .ifscCode(cleanIfsc)
                .beneficiaryName(cleanName)
                .status(rzpStatus)
                .isActive("ACTIVE".equals(rzpStatus))
                .razorpayBankReference(bankRef)
                .build();

        if ("ACTIVE".equals(rzpStatus)) {
            currentActiveOpt.ifPresent(old -> {
                old.setIsActive(false);
                bankAccountRepository.save(old);
            });
            partner.setBankAccountNumber(cleanAcc);
            partner.setIfscCode(cleanIfsc);
            deliveryPartnerRepository.save(partner);
        }

        SellerBankAccount savedBank = bankAccountRepository.save(newBankAccount);

        BankAccountAuditLog auditLog = BankAccountAuditLog.builder()
                .partnerId(partnerId)
                .sellerId(requestedBy != null ? requestedBy : partner.getUserId())
                .oldConfigReference(oldConfigRef)
                .newConfigReference(bankRef)
                .oldBankMasked(oldBankMasked)
                .newBankMasked(newBankMasked)
                .oldIfsc(oldIfsc)
                .newIfsc(cleanIfsc)
                .razorpayStatus(rzpStatus)
                .requestedBy(requestedBy != null ? requestedBy : "PARTNER")
                .build();

        auditLogRepository.save(auditLog);
        return savedBank;
    }

    /**
     * Verify Webhook Signature securely
     */
    public boolean verifyWebhookSignature(String rawPayload, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("Razorpay Webhook Secret is not configured. Webhook signature verification bypassed.");
            return true;
        }
        try {
            return Utils.verifyWebhookSignature(rawPayload, signatureHeader, webhookSecret);
        } catch (Exception e) {
            log.error("Webhook signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Process incoming Razorpay Route Webhook Event
     */
    @Transactional
    public void processWebhookEvent(String rawPayload) {
        JSONObject eventJson = new JSONObject(rawPayload);
        String event = eventJson.optString("event");
        log.info("Processing Razorpay Route Webhook event: {}", event);

        JSONObject payloadObj = eventJson.optJSONObject("payload");
        if (payloadObj == null) return;

        if (event.startsWith("account.") || event.startsWith("product.")) {
            JSONObject accountObj = payloadObj.optJSONObject("account");
            if (accountObj == null) {
                JSONObject productObj = payloadObj.optJSONObject("product");
                if (productObj != null) {
                    accountObj = productObj.optJSONObject("entity");
                }
            }
            if (accountObj != null && accountObj.has("id")) {
                String accountId = accountObj.optString("id");
                String accountStatus = accountObj.optString("status");

                Optional<RazorpayLinkedAccount> linkedAccountOpt = linkedAccountRepository.findByRazorpayAccountId(accountId);
                if (linkedAccountOpt.isPresent()) {
                    RazorpayLinkedAccount account = linkedAccountOpt.get();
                    if (accountStatus != null && !accountStatus.isBlank()) {
                        account.setStatus(accountStatus.toLowerCase());
                        linkedAccountRepository.save(account);
                    }

                    Optional<RazorpayProductConfig> configOpt = productConfigRepository.findByLinkedAccountId(account.getId());
                    if (configOpt.isPresent()) {
                        RazorpayProductConfig config = configOpt.get();
                        if (accountStatus != null && !accountStatus.isBlank()) {
                            config.setStatus(accountStatus.toLowerCase());
                        }
                        if (accountObj.has("requirements")) {
                            config.setPendingRequirements(accountObj.get("requirements").toString());
                        }
                        productConfigRepository.save(config);
                    }

                    if ("activated".equalsIgnoreCase(accountStatus)) {
                        if (account.getShopId() != null) {
                            Optional<SellerBankAccount> pendingBankOpt = bankAccountRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(account.getShopId(), "UNDER_REVIEW");
                            if (pendingBankOpt.isEmpty()) {
                                pendingBankOpt = bankAccountRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(account.getShopId(), "PENDING");
                            }
                            pendingBankOpt.ifPresent(bank -> {
                                bankAccountRepository.findByShopIdAndIsActiveTrue(account.getShopId()).ifPresent(old -> {
                                    old.setIsActive(false);
                                    bankAccountRepository.save(old);
                                });
                                bank.setStatus("ACTIVE");
                                bank.setIsActive(true);
                                bankAccountRepository.save(bank);
                                log.info("Activated pending bank account for shopId {}", account.getShopId());
                            });
                        } else if (account.getPartnerId() != null) {
                            Optional<SellerBankAccount> pendingBankOpt = bankAccountRepository.findFirstByPartnerIdAndStatusOrderByCreatedAtDesc(account.getPartnerId(), "UNDER_REVIEW");
                            if (pendingBankOpt.isEmpty()) {
                                pendingBankOpt = bankAccountRepository.findFirstByPartnerIdAndStatusOrderByCreatedAtDesc(account.getPartnerId(), "PENDING");
                            }
                            pendingBankOpt.ifPresent(bank -> {
                                bankAccountRepository.findByPartnerIdAndIsActiveTrue(account.getPartnerId()).ifPresent(old -> {
                                    old.setIsActive(false);
                                    bankAccountRepository.save(old);
                                });
                                bank.setStatus("ACTIVE");
                                bank.setIsActive(true);
                                bankAccountRepository.save(bank);
                                log.info("Activated pending bank account for partnerId {}", account.getPartnerId());
                            });
                        }
                    }
                }
            }
        }
    }

    public String getCleanKeyId() {
        return keyId != null ? keyId.replace("\"", "").replace("'", "").trim() : "";
    }

    public String getCleanKeySecret() {
        return keySecret != null ? keySecret.replace("\"", "").replace("'", "").trim() : "";
    }

    private boolean isCredentialsConfigured() {
        String cleanId = getCleanKeyId();
        String cleanSecret = getCleanKeySecret();
        return !cleanId.isBlank() && !cleanSecret.isBlank();
    }

    private String sanitizePhone(String phone) {
        if (phone == null || phone.isBlank()) return "9999999999";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() > 10) return digits.substring(digits.length() - 10);
        if (digits.length() < 10) return String.format("%-10s", digits).replace(' ', '0');
        return digits;
    }

    private String maskPan(String pan) {
        if (pan == null || pan.isBlank() || pan.length() < 10) return "XXXXX0000X";
        return pan.substring(0, 3) + "XX" + pan.substring(5, 9) + pan.substring(9);
    }

    public static String maskAccountNumber(String acc) {
        if (acc == null || acc.isBlank()) return "XXXX";
        if (acc.length() <= 4) return "****";
        return "XXXXXX" + acc.substring(acc.length() - 4);
    }

    private String encryptAccountNumber(String acc) {
        if (acc == null || acc.isBlank()) return null;
        return Base64.getEncoder().encodeToString(acc.getBytes(StandardCharsets.UTF_8));
    }

    private HttpResponse executeRazorpayApi(String method, String urlString, String bodyJson) throws Exception {
        java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();
        
        String auth = getCleanKeyId() + ":" + getCleanKeySecret();
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        
        java.net.http.HttpRequest.Builder requestBuilder = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(urlString))
                .header("Content-Type", "application/json")
                .header("Authorization", "Basic " + encodedAuth)
                .timeout(java.time.Duration.ofSeconds(15));
                
        java.net.http.HttpRequest.BodyPublisher bodyPublisher = 
            (bodyJson != null && ("POST".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)))
            ? java.net.http.HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8)
            : java.net.http.HttpRequest.BodyPublishers.noBody();
            
        java.net.http.HttpRequest request = requestBuilder
                .method(method.toUpperCase(), bodyPublisher)
                .build();
                
        java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        
        return new HttpResponse(response.statusCode(), response.body() != null ? response.body() : "");
    }

    private static class HttpResponse {
        final int statusCode;
        final String body;

        HttpResponse(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
        }
    }
}
