package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOverviewController {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PartnerProfileRepository partnerProfileRepository;
    private final PartnerVehicleRepository partnerVehicleRepository;
    private final PartnerVerificationRepository partnerVerificationRepository;
    private final PartnerAccountRepository partnerAccountRepository;
    private final PartnerDeviceSessionRepository partnerDeviceSessionRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementOrderRepository settlementOrderRepository;
    private final SellerBankAccountRepository sellerBankAccountRepository;
    private final BankAccountAuditLogRepository bankAccountAuditLogRepository;
    private final DeliveryRequestRepository deliveryRequestRepository;
    private final DeliveryRepository deliveryRepository;
    private final RefundRepository refundRepository;
    private final ReviewRepository reviewRepository;
    private final HelpTicketRepository helpTicketRepository;
    private final NotificationRepository notificationRepository;
    private final PushNotificationRepository pushNotificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final DeviceTokenRepository deviceTokenRepository;
    private final OtpVerificationRepository otpVerificationRepository;
    private final WalletLedgerRepository walletLedgerRepository;
    private final CouponRepository couponRepository;
    private final OfferRepository offerRepository;
    private final RuvoCommissionPaymentRepository ruvoCommissionPaymentRepository;
    private final RuvoCommissionLedgerRepository ruvoCommissionLedgerRepository;
    private final RuvoCommissionCycleRepository ruvoCommissionCycleRepository;
    private final RazorpayStakeholderRepository razorpayStakeholderRepository;
    private final RazorpayLinkedAccountRepository razorpayLinkedAccountRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final AuthIdentityRoleRepository authIdentityRoleRepository;

    public AdminOverviewController(UserRepository userRepository,
                                  ShopRepository shopRepository,
                                  PartnerProfileRepository partnerProfileRepository,
                                  PartnerVehicleRepository partnerVehicleRepository,
                                  PartnerVerificationRepository partnerVerificationRepository,
                                  PartnerAccountRepository partnerAccountRepository,
                                  PartnerDeviceSessionRepository partnerDeviceSessionRepository,
                                  DeliveryPartnerRepository deliveryPartnerRepository,
                                  OrderRepository orderRepository,
                                  OrderItemRepository orderItemRepository,
                                  ProductRepository productRepository,
                                  PaymentRepository paymentRepository,
                                  SettlementRepository settlementRepository,
                                  SettlementOrderRepository settlementOrderRepository,
                                  SellerBankAccountRepository sellerBankAccountRepository,
                                  BankAccountAuditLogRepository bankAccountAuditLogRepository,
                                  DeliveryRequestRepository deliveryRequestRepository,
                                  DeliveryRepository deliveryRepository,
                                  RefundRepository refundRepository,
                                  ReviewRepository reviewRepository,
                                  HelpTicketRepository helpTicketRepository,
                                  NotificationRepository notificationRepository,
                                  PushNotificationRepository pushNotificationRepository,
                                  RefreshTokenRepository refreshTokenRepository,
                                  DeviceTokenRepository deviceTokenRepository,
                                  OtpVerificationRepository otpVerificationRepository,
                                  WalletLedgerRepository walletLedgerRepository,
                                  CouponRepository couponRepository,
                                  OfferRepository offerRepository,
                                  RuvoCommissionPaymentRepository ruvoCommissionPaymentRepository,
                                  RuvoCommissionLedgerRepository ruvoCommissionLedgerRepository,
                                  RuvoCommissionCycleRepository ruvoCommissionCycleRepository,
                                  RazorpayStakeholderRepository razorpayStakeholderRepository,
                                  RazorpayLinkedAccountRepository razorpayLinkedAccountRepository,
                                  AuthIdentityRepository authIdentityRepository,
                                  AuthIdentityRoleRepository authIdentityRoleRepository) {
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
        this.partnerProfileRepository = partnerProfileRepository;
        this.partnerVehicleRepository = partnerVehicleRepository;
        this.partnerVerificationRepository = partnerVerificationRepository;
        this.partnerAccountRepository = partnerAccountRepository;
        this.partnerDeviceSessionRepository = partnerDeviceSessionRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
        this.settlementRepository = settlementRepository;
        this.settlementOrderRepository = settlementOrderRepository;
        this.sellerBankAccountRepository = sellerBankAccountRepository;
        this.bankAccountAuditLogRepository = bankAccountAuditLogRepository;
        this.deliveryRequestRepository = deliveryRequestRepository;
        this.deliveryRepository = deliveryRepository;
        this.refundRepository = refundRepository;
        this.reviewRepository = reviewRepository;
        this.helpTicketRepository = helpTicketRepository;
        this.notificationRepository = notificationRepository;
        this.pushNotificationRepository = pushNotificationRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.deviceTokenRepository = deviceTokenRepository;
        this.otpVerificationRepository = otpVerificationRepository;
        this.walletLedgerRepository = walletLedgerRepository;
        this.couponRepository = couponRepository;
        this.offerRepository = offerRepository;
        this.ruvoCommissionPaymentRepository = ruvoCommissionPaymentRepository;
        this.ruvoCommissionLedgerRepository = ruvoCommissionLedgerRepository;
        this.ruvoCommissionCycleRepository = ruvoCommissionCycleRepository;
        this.razorpayStakeholderRepository = razorpayStakeholderRepository;
        this.razorpayLinkedAccountRepository = razorpayLinkedAccountRepository;
        this.authIdentityRepository = authIdentityRepository;
        this.authIdentityRoleRepository = authIdentityRoleRepository;
    }

    private boolean isAdminMobile(String mobile) {
        if (mobile == null || mobile.isBlank()) return false;
        String clean = mobile.replaceAll("[^0-9]", "");
        if (clean.length() == 12 && clean.startsWith("91")) clean = clean.substring(2);
        return clean.equals("8630820486") || clean.equals("9125474036") || clean.equals("6389550338");
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverviewStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalUsers = userRepository.count();
        long totalShops = shopRepository.count();
        long totalPartners = partnerProfileRepository.count();
        long totalOrders = orderRepository.count();
        long totalProducts = productRepository.count();

        long pendingShops = shopRepository.findPendingApproval().size();

        long pendingPartners = partnerProfileRepository.findByVerificationStatus(VerificationStatus.UNDER_REVIEW).stream()
                .filter(p -> {
                    User u = p.getUser();
                    return sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(p.getId()).isPresent() ||
                           (u != null && u.getId() != null && sellerBankAccountRepository.findByUserIdAndVerificationStatus(String.valueOf(u.getId()), "READY_FOR_ADMIN").isPresent()) ||
                           (u != null && u.getMobileNumber() != null && sellerBankAccountRepository.findByUserIdAndVerificationStatus(u.getMobileNumber(), "READY_FOR_ADMIN").isPresent());
                }).count();

        BigDecimal totalRevenue = orderRepository.findAll().stream()
                .filter(o -> "DELIVERED".equalsIgnoreCase(o.getOrderStatus()))
                .map(Order::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalUsers", totalUsers);
        stats.put("totalShops", totalShops);
        stats.put("totalPartners", totalPartners);
        stats.put("totalOrders", totalOrders);
        stats.put("totalProducts", totalProducts);
        stats.put("pendingShops", pendingShops);
        stats.put("pendingPartners", pendingPartners);
        stats.put("totalRevenue", totalRevenue);

        return ResponseEntity.ok(ApiResponse.ok("System overview stats retrieved", stats));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok("All users retrieved", userRepository.findAll()));
    }

    @PostMapping("/users/{id}/toggle-status")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(@PathVariable Long id) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User u = opt.get();
        if (u.getStatus() == AccountStatus.BLOCKED) {
            u.setStatus(AccountStatus.APPROVED);
        } else {
            u.setStatus(AccountStatus.BLOCKED);
        }
        User updated = userRepository.save(u);
        return ResponseEntity.ok(ApiResponse.ok("User status updated", updated));
    }

    @GetMapping("/shops")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Shop>>> getAllShops() {
        return ResponseEntity.ok(ApiResponse.ok("All shops retrieved", shopRepository.findAll()));
    }

    @GetMapping("/partners")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllPartners() {
        List<Map<String, Object>> responseList = new ArrayList<>();
        Set<String> processedKeys = new HashSet<>();

        // 1. Process all PartnerProfile entries
        List<PartnerProfile> profiles = partnerProfileRepository.findAll();
        for (PartnerProfile p : profiles) {
            try {
                User user = p.getUser();
                Optional<PartnerVehicle> vehicle = partnerVehicleRepository.findByPartnerProfile(p);
                Optional<PartnerVerification> verification = partnerVerificationRepository.findByPartnerProfile(p);

                Map<String, Object> item = new HashMap<>();
                item.put("id", p.getId());
                item.put("partnerId", p.getId());
                item.put("userId", user != null ? user.getId() : null);

                String partnerName = null;
                if (user != null && user.getName() != null && !user.getName().isBlank()) {
                    partnerName = user.getName();
                } else if (verification.isPresent() && verification.get().getFullName() != null && !verification.get().getFullName().isBlank()) {
                    partnerName = verification.get().getFullName();
                } else {
                    partnerName = "Rider #" + p.getId();
                }

                String mobile = null;
                if (user != null && partnerAccountRepository != null) {
                    mobile = partnerAccountRepository.findBySecurityUser(user)
                            .map(PartnerAccount::getMobileNumber)
                            .orElse(user.getMobileNumber());
                } else if (user != null) {
                    mobile = user.getMobileNumber();
                }

                boolean isApproved = p.getVerificationStatus() == VerificationStatus.APPROVED;
                item.put("name", partnerName);
                item.put("mobileNumber", mobile != null ? mobile : "N/A");
                item.put("phone", mobile != null ? mobile : "N/A");
                item.put("verificationStatus", p.getVerificationStatus() != null ? p.getVerificationStatus().name() : "UNDER_REVIEW");
                item.put("status", p.getVerificationStatus() != null ? p.getVerificationStatus().name() : "UNDER_REVIEW");
                item.put("approved", isApproved);
                item.put("isApproved", isApproved);
                item.put("isAvailable", user != null && Boolean.TRUE.equals(user.getIsAvailable()));

                // Link SellerBankAccount if verified
                Optional<SellerBankAccount> sbaOpt = sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(p.getId());
                if (sbaOpt.isEmpty() && user != null && user.getId() != null) {
                    sbaOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(String.valueOf(user.getId()), "READY_FOR_ADMIN");
                }
                if (sbaOpt.isEmpty() && mobile != null) {
                    sbaOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(mobile, "READY_FOR_ADMIN");
                }
                if (sbaOpt.isPresent()) {
                    SellerBankAccount sba = sbaOpt.get();
                    item.put("bankVerificationStatus", sba.getVerificationStatus());
                    item.put("bankAccountNumberMasked", sba.getAccountNumberMasked());
                    item.put("bankAccountNumber", sba.getAccountNumberMasked());
                    item.put("ifscCode", sba.getIfscCode());
                    item.put("bankName", sba.getBankName());
                    item.put("bankHolderName", sba.getBankHolderName());
                    item.put("submittedHolderName", sba.getSubmittedHolderName());
                    item.put("nameMatchScore", sba.getNameMatchScore());
                    item.put("riskStatus", sba.getRiskStatus());
                }

                // Link matching DeliveryPartner entity if present to extract documents & bank details
                Optional<DeliveryPartner> dpOpt = Optional.empty();
                if (user != null && user.getId() != null) {
                    dpOpt = deliveryPartnerRepository.findByUserIdFlexible(String.valueOf(user.getId()));
                }
                if (dpOpt.isEmpty() && mobile != null) {
                    dpOpt = deliveryPartnerRepository.findByPhoneFlexible(mobile);
                }
                if (dpOpt.isPresent()) {
                    DeliveryPartner dp = dpOpt.get();
                    item.put("aadhaarNumber", dp.getAadhaarNumber());
                    item.put("aadhaarName", dp.getAadhaarName());
                    item.put("aadhaarFrontUrl", dp.getAadhaarFrontUrl());
                    item.put("aadhaarBackUrl", dp.getAadhaarBackUrl());
                    item.put("aadhaarVerified", dp.getAadhaarVerified());
                    if (!item.containsKey("bankAccountNumber") || item.get("bankAccountNumber") == null) {
                        item.put("bankAccountNumber", dp.getBankAccountNumber());
                    }
                    if (!item.containsKey("ifscCode") || item.get("ifscCode") == null) {
                        item.put("ifscCode", dp.getIfscCode());
                    }
                    if (!item.containsKey("bankVerificationStatus") || item.get("bankVerificationStatus") == null) {
                        item.put("bankVerificationStatus", dp.getBankVerificationStatus());
                    }
                    if (!item.containsKey("bankName") || item.get("bankName") == null) {
                        item.put("bankName", dp.getBankName());
                    }
                    if (!item.containsKey("bankHolderName") || item.get("bankHolderName") == null) {
                        item.put("bankHolderName", dp.getBankAccountHolder());
                    }
                    item.put("upiId", dp.getUpiId());
                    item.put("razorpayAccountId", dp.getRazorpayAccountId());
                    item.put("preferredShopIds", dp.getPreferredShopIds());

                    if (dp.getId() != null) processedKeys.add("DP_" + dp.getId());
                }

                if (vehicle.isPresent()) {
                    Map<String, Object> vMap = new HashMap<>();
                    vMap.put("vehicleType", vehicle.get().getVehicleType());
                    vMap.put("vehicleNumber", vehicle.get().getVehicleNumber());
                    vMap.put("vehicleModel", vehicle.get().getVehicleModel());
                    vMap.put("vehicleCapacity", vehicle.get().getVehicleCapacity());
                    item.put("vehicle", vMap);
                }

                if (verification.isPresent()) {
                    Map<String, Object> kMap = new HashMap<>();
                    kMap.put("fullName", verification.get().getFullName());
                    kMap.put("address", verification.get().getAddress());
                    kMap.put("city", verification.get().getCity());
                    kMap.put("state", verification.get().getState());
                    kMap.put("pincode", verification.get().getPincode());
                    kMap.put("identityDocumentType", verification.get().getIdentityDocumentType());
                    kMap.put("identityDocumentNumber", verification.get().getIdentityDocumentNumber());
                    item.put("kyc", kMap);
                }

                if (p.getId() != null) processedKeys.add("PROF_" + p.getId());
                if (mobile != null) processedKeys.add("MOB_" + mobile);
                responseList.add(item);
            } catch (Exception e) {
                // Log and continue to not crash entire list
            }
        }

        // 2. Process DeliveryPartner records that might not be in PartnerProfile list
        List<DeliveryPartner> allDp = deliveryPartnerRepository.findAll();
        for (DeliveryPartner dp : allDp) {
            try {
                if (dp.getId() != null && processedKeys.contains("DP_" + dp.getId())) continue;
                if (dp.getPhone() != null && processedKeys.contains("MOB_" + dp.getPhone())) continue;

                Map<String, Object> item = new HashMap<>();
                item.put("id", dp.getId());
                item.put("partnerId", dp.getId());
                item.put("userId", dp.getUserId());
                item.put("name", dp.getName() != null ? dp.getName() : "Rider #" + dp.getId());
                item.put("mobileNumber", dp.getPhone() != null ? dp.getPhone() : (dp.getUserId() != null ? dp.getUserId() : "N/A"));
                item.put("phone", dp.getPhone() != null ? dp.getPhone() : (dp.getUserId() != null ? dp.getUserId() : "N/A"));

                boolean isApproved = Boolean.TRUE.equals(dp.getApproved());
                String status = isApproved ? "APPROVED" : "UNDER_REVIEW";
                item.put("verificationStatus", status);
                item.put("status", status);
                item.put("approved", isApproved);
                item.put("isApproved", isApproved);
                item.put("isAvailable", Boolean.TRUE.equals(dp.getAvailable()));
                item.put("available", Boolean.TRUE.equals(dp.getAvailable()));
                item.put("active", Boolean.TRUE.equals(dp.getActive()));

                item.put("bankVerificationStatus", dp.getBankVerificationStatus() != null ? dp.getBankVerificationStatus() : "UNVERIFIED");
                item.put("bankAccountNumber", dp.getBankAccountNumber());
                String accNum = dp.getBankAccountNumber();
                if (accNum != null && !accNum.isBlank()) {
                    String masked = accNum.length() > 4 ? "•••• " + accNum.substring(accNum.length() - 4) : accNum;
                    item.put("bankAccountNumberMasked", masked);
                }
                item.put("ifscCode", dp.getIfscCode());
                item.put("bankName", dp.getBankName());
                item.put("bankHolderName", dp.getBankAccountHolder());
                item.put("aadhaarNumber", dp.getAadhaarNumber());
                item.put("aadhaarName", dp.getAadhaarName());
                item.put("aadhaarFrontUrl", dp.getAadhaarFrontUrl());
                item.put("aadhaarBackUrl", dp.getAadhaarBackUrl());
                item.put("aadhaarVerified", dp.getAadhaarVerified());
                item.put("upiId", dp.getUpiId());
                item.put("razorpayAccountId", dp.getRazorpayAccountId());
                item.put("preferredShopIds", dp.getPreferredShopIds());

                // Check for linked SellerBankAccount
                Optional<SellerBankAccount> sbaOpt = sellerBankAccountRepository.findByPartnerIdAndIsActiveTrue(dp.getId());
                if (sbaOpt.isEmpty() && dp.getUserId() != null) {
                    sbaOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(dp.getUserId(), "READY_FOR_ADMIN");
                }
                if (sbaOpt.isEmpty() && dp.getPhone() != null) {
                    sbaOpt = sellerBankAccountRepository.findByUserIdAndVerificationStatus(dp.getPhone(), "READY_FOR_ADMIN");
                }
                if (sbaOpt.isPresent()) {
                    SellerBankAccount sba = sbaOpt.get();
                    item.put("bankVerificationStatus", sba.getVerificationStatus());
                    item.put("bankAccountNumberMasked", sba.getAccountNumberMasked());
                    item.put("nameMatchScore", sba.getNameMatchScore());
                    item.put("riskStatus", sba.getRiskStatus());
                    if (sba.getBankHolderName() != null) item.put("bankHolderName", sba.getBankHolderName());
                }

                responseList.add(item);
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(ApiResponse.ok("All partners retrieved", responseList));
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<Order>>> getAllOrders() {
        return ResponseEntity.ok(ApiResponse.ok("All orders retrieved", orderRepository.findAll()));
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<Product>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.ok("All products retrieved", productRepository.findAll()));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> getAllPayments() {
        return ResponseEntity.ok(ApiResponse.ok("All payments retrieved", paymentRepository.findAll()));
    }

    @GetMapping("/settlements")
    public ResponseEntity<ApiResponse<List<Settlement>>> getAllSettlements() {
        return ResponseEntity.ok(ApiResponse.ok("All settlements retrieved", settlementRepository.findAll()));
    }

    /**
     * Wipes all shops, products, and associated seller bank accounts for a clean fresh registration.
     */
    @PostMapping("/reset-shops")
    public ResponseEntity<ApiResponse<String>> resetAllShops() {
        try {
            bankAccountAuditLogRepository.deleteAll();
            ruvoCommissionPaymentRepository.deleteAll();
            ruvoCommissionLedgerRepository.deleteAll();
            ruvoCommissionCycleRepository.deleteAll();
            razorpayStakeholderRepository.deleteAll();
            razorpayLinkedAccountRepository.deleteAll();
            productRepository.deleteAll();
            sellerBankAccountRepository.deleteAll();
            shopRepository.deleteAll();
            return ResponseEntity.ok(ApiResponse.ok("All shops, products, and bank accounts have been wiped. You can now register fresh.", null));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.ok("Failed to reset shops: " + e.getMessage(), null));
        }
    }

    /**
     * Complete System Reset for Fresh Registration across Shop, Partner, and Mobile apps.
     * Wipes all shops, partner profiles, orders, and non-admin users while keeping the admin account intact.
     */
    @PostMapping("/reset-system")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resetEntireSystem() {
        Map<String, Object> report = new HashMap<>();
        try {
            // 1. Audit logs & Orders & Deliveries & Settlements & Payments & Reviews & Refunds
            bankAccountAuditLogRepository.deleteAll();
            orderItemRepository.deleteAll();
            deliveryRequestRepository.deleteAll();
            deliveryRepository.deleteAll();
            settlementOrderRepository.deleteAll();
            refundRepository.deleteAll();
            reviewRepository.deleteAll();
            paymentRepository.deleteAll();
            orderRepository.deleteAll();
            settlementRepository.deleteAll();
            report.put("ordersDeliveriesAndSettlements", "CLEARED");

            // 2. Commissions & Products & Bank Accounts & Linked Accounts & Shops
            ruvoCommissionPaymentRepository.deleteAll();
            ruvoCommissionLedgerRepository.deleteAll();
            ruvoCommissionCycleRepository.deleteAll();
            razorpayStakeholderRepository.deleteAll();
            razorpayLinkedAccountRepository.deleteAll();
            productRepository.deleteAll();
            sellerBankAccountRepository.deleteAll();
            shopRepository.deleteAll();
            report.put("shopsProductsAndSellerBanks", "CLEARED");

            // 3. Delivery Partner Ecosystem
            partnerVehicleRepository.deleteAll();
            partnerVerificationRepository.deleteAll();
            partnerDeviceSessionRepository.deleteAll();
            partnerAccountRepository.deleteAll();
            partnerProfileRepository.deleteAll();
            deliveryPartnerRepository.deleteAll();
            report.put("deliveryPartnersAndKYC", "CLEARED");

            // 4. Peripherals (Tokens, Tickets, Notifications, Ledger, Coupons)
            helpTicketRepository.deleteAll();
            notificationRepository.deleteAll();
            pushNotificationRepository.deleteAll();
            otpVerificationRepository.deleteAll();
            walletLedgerRepository.deleteAll();
            refreshTokenRepository.deleteAll();
            deviceTokenRepository.deleteAll();
            couponRepository.deleteAll();
            offerRepository.deleteAll();
            report.put("peripheralDataAndTokens", "CLEARED");

            // 5. AuthIdentities & Roles (Preserve Admins)
            List<AuthIdentity> identities = authIdentityRepository.findAll();
            for (AuthIdentity identity : identities) {
                if (!isAdminMobile(identity.getMobileNumber())) {
                    List<AuthIdentityRole> roles = authIdentityRoleRepository.findByIdentity(identity);
                    authIdentityRoleRepository.deleteAll(roles);
                    authIdentityRepository.delete(identity);
                }
            }

            // 6. Non-admin users reset (preserve admins: 8630820486, 9125474036, 6389550338)
            List<User> allUsers = userRepository.findAll();
            for (User u : allUsers) {
                if (u.getRole() != Role.ADMIN && !isAdminMobile(u.getMobileNumber())) {
                    userRepository.delete(u);
                }
            }
            report.put("nonAdminUsersAndIdentities", "CLEARED");
            report.put("adminAccountPreserved", "8630820486 (ROLE_ADMIN)");
            report.put("status", "SUCCESS");

            return ResponseEntity.ok(ApiResponse.ok("Entire system has been reset cleanly. Fresh registration is ready across RuvoShop, RuvoPartner, and RuvoMobile.", report));
        } catch (Exception e) {
            report.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(ApiResponse.ok("Failed to reset system: " + e.getMessage(), report));
        }
    }
}
