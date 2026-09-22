package Ranex.ruvo.controller;

import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.util.DistanceUtils;

import Ranex.ruvo.service.CloudinaryService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/shops")
@CrossOrigin(origins = "*")
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
public class ShopController {

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private Ranex.ruvo.repository.AuthIdentityRepository authIdentityRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private Ranex.ruvo.service.RazorpayService razorpayService;

    private String getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        return principal.toString();
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private boolean principalMatchesOwner(String ownerId, Long authIdentityId) {
        if (isAdmin()) return true;
        String principal = getCurrentPrincipal();
        if (principal == null) return false;
        if (principal.startsWith("identity:")) {
            String identity = principal.substring("identity:".length());
            if (identity.equals(ownerId) || (authIdentityId != null && identity.equals(String.valueOf(authIdentityId)))) {
                return true;
            }
            try {
                Long id = Long.parseLong(identity);
                java.util.Optional<Ranex.ruvo.model.AuthIdentity> authOpt = authIdentityRepository.findById(id);
                if (authOpt.isPresent()) {
                    String mobile = authOpt.get().getMobileNumber();
                    String clean = mobile != null ? mobile.replaceAll("[^0-9]", "") : "";
                    if (clean.length() == 12 && clean.startsWith("91")) clean = clean.substring(2);
                    if (mobile != null && mobile.equals(ownerId)) return true;
                    if (!clean.isEmpty() && clean.equals(ownerId)) return true;
                }
            } catch (Exception ignored) {}
            return false;
        }
        return principal.equals(ownerId);
    }

    private boolean canManageShop(Shop shop) {
        if (shop == null) return false;
        if (isAdmin()) return true;
        String principal = getCurrentPrincipal();
        if (principal == null) return false;
        if (principal.startsWith("identity:")) {
            String identity = principal.substring("identity:".length());
            if (identity.equals(shop.getOwnerId()) || (shop.getAuthIdentityId() != null && identity.equals(String.valueOf(shop.getAuthIdentityId())))) {
                return true;
            }
            try {
                Long id = Long.parseLong(identity);
                java.util.Optional<Ranex.ruvo.model.AuthIdentity> authOpt = authIdentityRepository.findById(id);
                if (authOpt.isPresent()) {
                    String mobile = authOpt.get().getMobileNumber();
                    String clean = mobile != null ? mobile.replaceAll("[^0-9]", "") : "";
                    if (clean.length() == 12 && clean.startsWith("91")) clean = clean.substring(2);
                    if (mobile != null && (mobile.equals(shop.getPhone()) || mobile.equals(shop.getOwnerId()))) {
                        return true;
                    }
                    if (!clean.isEmpty() && (clean.equals(shop.getPhone()) || clean.equals(shop.getOwnerId()))) {
                        return true;
                    }
                }
            } catch (Exception ignored) {}
            return false;
        }
        return principal.equals(shop.getOwnerId());
    }


    // =========================================================
    // Helper: Convert stored path into a public URL
    // =========================================================

    private String buildFileUrl(String filePath, HttpServletRequest request) {

        if (filePath == null || filePath.isBlank()) {
            return null;
        }

        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            return filePath;
        }

        // If no request context (e.g. called from non-HTTP thread), return the path as-is
        if (request == null) {
            return filePath;
        }

        String normalizedPath = filePath.replace("\\", "/");

        // Remove leading slash if present
        normalizedPath = normalizedPath.replaceFirst("^/+", "");

        String baseUrl = request.getScheme()
                + "://"
                + request.getServerName()
                + ":"
                + request.getServerPort();

        return baseUrl + "/" + normalizedPath;
    }


    // =========================================================
    // Helper: Add public URLs to shop
    // =========================================================

    private Shop prepareShopResponse(
            Shop shop,
            HttpServletRequest request
    ) {

        if (shop.getLogoUrl() != null) {
            shop.setLogoUrl(
                    buildFileUrl(shop.getLogoUrl(), request)
            );
        }

        if (shop.getBannerUrl() != null) {
            shop.setBannerUrl(
                    buildFileUrl(shop.getBannerUrl(), request)
            );
        }

        if (shop.getAadhaarFrontUrl() != null) {
            shop.setAadhaarFrontUrl(
                    buildFileUrl(shop.getAadhaarFrontUrl(), request)
            );
        }

        if (shop.getAadhaarBackUrl() != null) {
            shop.setAadhaarBackUrl(
                    buildFileUrl(shop.getAadhaarBackUrl(), request)
            );
        }

        if (shop.getImages() != null && !shop.getImages().isEmpty()) {
            java.util.List<String> enriched = new java.util.ArrayList<>();
            for (String imgUrl : shop.getImages()) {
                enriched.add(buildFileUrl(imgUrl, request));
            }
            shop.setImages(enriched);
        }

        return shop;
    }


    // =========================================================
    // 1. Get all approved shops
    // =========================================================

    @GetMapping
    public ResponseEntity<List<Shop>> getAllShops(
            HttpServletRequest request
    ) {

        List<Shop> shops =
                shopRepository.findAllApprovedAndActive();

        shops.forEach(shop ->
                prepareShopResponse(shop, request)
        );

        return ResponseEntity.ok(shops);
    }


    // =========================================================
    // 2. Get shops belonging to owner
    // =========================================================

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<List<Shop>> getMyShops(
            @RequestParam(required = false) String ownerId,
            HttpServletRequest request
    ) {
        String principal = getCurrentPrincipal();
        Long authIdentityId = null;
        String mobile = null;
        String cleanMobile = null;

        if (principal != null && principal.startsWith("identity:")) {
            try {
                authIdentityId = Long.parseLong(principal.substring("identity:".length()));
                java.util.Optional<Ranex.ruvo.model.AuthIdentity> authOpt = authIdentityRepository.findById(authIdentityId);
                if (authOpt.isPresent()) {
                    mobile = authOpt.get().getMobileNumber();
                    if (mobile != null) {
                        cleanMobile = mobile.replaceAll("[^0-9]", "");
                        if (cleanMobile.length() == 12 && cleanMobile.startsWith("91")) {
                            cleanMobile = cleanMobile.substring(2);
                        }
                    }
                }
            } catch (Exception ignored) {}
        } else if (principal != null) {
            mobile = principal;
        }

        List<Shop> shops = shopRepository.findByOwnerFlexible(
                ownerId,
                authIdentityId,
                mobile,
                cleanMobile
        );

        // Auto-link authIdentityId for legacy records
        if (authIdentityId != null) {
            for (Shop shop : shops) {
                if (shop.getAuthIdentityId() == null) {
                    shop.setAuthIdentityId(authIdentityId);
                    shopRepository.save(shop);
                }
            }
        }

        shops.forEach(shop ->
                prepareShopResponse(shop, request)
        );

        return ResponseEntity.ok(shops);
    }


    // =========================================================
    // 3. Admin pending shops
    // =========================================================

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Shop>> getPendingShops(
            HttpServletRequest request
    ) {

        List<Shop> shops =
                shopRepository.findPendingApproval();

        shops.forEach(shop ->
                prepareShopResponse(shop, request)
        );

        return ResponseEntity.ok(shops);
    }


    // =========================================================
    // 4. Register shop without image
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> addShop(
            @RequestBody Shop shop
    ) {

        if (shop.getOwnerId() == null ||
                shop.getOwnerId().isBlank()) {

            return ResponseEntity
                    .badRequest()
                .body("ownerId is required");
        }

        if (!isAdmin() && !principalMatchesOwner(shop.getOwnerId(), shop.getAuthIdentityId())) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body("You can only create shops for your own account.");
        }

        // Set authIdentityId from JWT so ProductController.ownsShop() can verify ownership
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                Object principal = auth.getPrincipal();
                String username = (principal instanceof org.springframework.security.core.userdetails.UserDetails)
                        ? ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername()
                        : principal.toString();
                if (username.startsWith("identity:")) {
                    shop.setAuthIdentityId(Long.parseLong(username.substring("identity:".length())));
                }
            }
        } catch (NumberFormatException ignored) {}

        if (shop.getAuthIdentityId() == null && shop.getOwnerId() != null) {
            try {
                shop.setAuthIdentityId(Long.parseLong(shop.getOwnerId()));
            } catch (NumberFormatException ignored) {}
        }

        shop.setId(null);
        shop.setApproved(false);
        shop.setBankVerificationStatus("UNVERIFIED");
        if (shop.getActive() == null) shop.setActive(true);
        if (shop.getSettlementBlocked() == null) shop.setSettlementBlocked(false);
        if (shop.getCodBlocked() == null) shop.setCodBlocked(false);

        Shop savedShop = shopRepository.save(shop);
        return ResponseEntity.ok(savedShop);
    }

    // =========================================================

    @GetMapping("/nearby")
    public ResponseEntity<Map<String, Object>> getNearbyShops(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "5.0") Double radius,
            HttpServletRequest request
    ) {
        List<Shop> nearbyShops = shopRepository.findNearbyShops(
                latitude, longitude, radius
        );

        Map<String, Object> response = new HashMap<>();

        if (nearbyShops.isEmpty()) {
            response.put("serviceAvailable", false);
            response.put("message", "We are not in your area right now");
            response.put("exploreAnyway", true);
            response.put("shops", List.of());
            return ResponseEntity.ok(response);
        }

        response.put("serviceAvailable", true);
        response.put("message", null);

        // Map shops to include distanceKm
        List<Map<String, Object>> shopDtos = nearbyShops.stream().map(shop -> {
            prepareShopResponse(shop, request);
            double distanceKm = DistanceUtils.calculateDistance(
                    latitude, longitude, shop.getLatitude(), shop.getLongitude()
            );
            
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", shop.getId());
            dto.put("name", shop.getName());
            dto.put("category", shop.getCategory());
            dto.put("bannerUrl", shop.getBannerUrl());
            dto.put("logoUrl", shop.getLogoUrl());
            dto.put("address", shop.getAddress());
            dto.put("phone", shop.getPhone());
            dto.put("rating", shop.getRating());
            dto.put("deliveryAvailable", shop.getDeliveryAvailable());
            dto.put("latitude", shop.getLatitude());
            dto.put("longitude", shop.getLongitude());
            dto.put("openingTime", shop.getOpeningTime());
            dto.put("closingTime", shop.getClosingTime());
            dto.put("approved", shop.getApproved());
            dto.put("active", shop.getActive());
            // Added distanceKm for the response array
            dto.put("distanceKm", Math.round(distanceKm * 10.0) / 10.0);
            return dto;
        }).toList();

        response.put("shops", shopDtos);
        
        return ResponseEntity.ok(response);
    }


    // =========================================================
    // 6. Get single shop
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getShopById(
            @PathVariable Long id,
            HttpServletRequest request
    ) {

        java.util.Optional<Shop> shopOpt =
                shopRepository.findById(id);

        if (shopOpt.isPresent()) {

            Shop shop = shopOpt.get();

            prepareShopResponse(shop, request);

            return ResponseEntity.ok(shop);
        }

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body("Shop not found with id: " + id);
    }


    // =========================================================
    // 7. Category shops
    // =========================================================

    @GetMapping("/category/{categoryName}")
    public ResponseEntity<List<Shop>> getShopsByCategory(
            @PathVariable String categoryName,
            HttpServletRequest request
    ) {

        List<Shop> shops =
                shopRepository.findByCategoryAndApprovedTrue(
                        categoryName
                );
        // We filter manually here to minimize query changes if we want it active too, 
        // assuming standard category browse wants active shops:
        shops = shops.stream().filter(s -> s.getActive() == null || s.getActive()).toList();

        shops.forEach(shop ->
                prepareShopResponse(shop, request)
        );

        return ResponseEntity.ok(shops);
    }


    // =========================================================
    // 8. Register shop + logo + banner
    // =========================================================

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> uploadShop(
            @RequestParam("shop") String shopJson,
            @RequestPart("logo") MultipartFile logo,
            @RequestPart(value = "banner", required = false)
            MultipartFile banner,
            @RequestPart(value = "images", required = false)
            MultipartFile[] images,
            HttpServletRequest request
    ) {

        try {

            // ---------------------------------------------
            // Parse shop JSON
            // ---------------------------------------------

            org.springframework.boot.json.JsonParser parser =
                    org.springframework.boot.json.JsonParserFactory
                            .getJsonParser();

            java.util.Map<String, Object> map =
                    parser.parseMap(shopJson);


            Shop shop = new Shop();

            shop.setName((String) map.get("name"));
            shop.setCategory((String) map.get("category"));
            shop.setAddress((String) map.get("address"));
            shop.setPhone((String) map.get("phone"));
            shop.setOwnerId((String) map.get("ownerId"));

            // Set authIdentityId from JWT so ProductController.ownsShop() can verify ownership
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated()) {
                    Object principal = auth.getPrincipal();
                    String username;
                    if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                        username = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
                    } else {
                        username = principal.toString();
                    }
                    if (username.startsWith("identity:")) {
                        shop.setAuthIdentityId(Long.parseLong(username.substring("identity:".length())));
                    }
                }
            } catch (NumberFormatException ignored) {}

            if (map.containsKey("upiId")) {
                shop.setUpiId((String) map.get("upiId"));
            }
            if (map.containsKey("bankAccountNumber")) {
                shop.setBankAccountNumber((String) map.get("bankAccountNumber"));
            }
            if (map.containsKey("ifscCode")) {
                shop.setIfscCode((String) map.get("ifscCode"));
            }

            if (map.get("latitude") != null) {

                shop.setLatitude(
                        Double.parseDouble(
                                map.get("latitude").toString()
                        )
                );
            }


            if (map.get("longitude") != null) {

                shop.setLongitude(
                        Double.parseDouble(
                                map.get("longitude").toString()
                        )
                );
            }


            if (map.get("deliveryAvailable") != null) {

                shop.setDeliveryAvailable(
                        Boolean.parseBoolean(
                                map.get("deliveryAvailable").toString()
                        )
                );
            }


            // ---------------------------------------------
            // Validate owner
            // ---------------------------------------------

            if (shop.getOwnerId() == null ||
                    shop.getOwnerId().isBlank()) {

                return ResponseEntity
                        .badRequest()
                        .body("ownerId is required");
            }

            if (!isAdmin() && !principalMatchesOwner(shop.getOwnerId(), shop.getAuthIdentityId())) {
                return ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body("You can only create shops for your own account.");
            }


            // ---------------------------------------------
            // Save logo to Cloudinary
            // ---------------------------------------------

            if (logo == null || logo.isEmpty()) {
                return ResponseEntity
                        .badRequest()
                        .body("Shop logo is required");
            }

            String logoUrl = cloudinaryService.uploadImage(logo, "ruvo/shops/logos");
            shop.setLogoUrl(logoUrl);

            // ---------------------------------------------
            // Save banner to Cloudinary
            // ---------------------------------------------

            if (banner != null && !banner.isEmpty()) {
                String bannerUrl = cloudinaryService.uploadImage(banner, "ruvo/shops/banners");
                shop.setBannerUrl(bannerUrl);
            }

            // ---------------------------------------------
            // Save gallery images to Cloudinary
            // ---------------------------------------------

            if (images != null && images.length > 0) {
                for (MultipartFile img : images) {
                    if (img != null && !img.isEmpty()) {
                        String imgUrl = cloudinaryService.uploadImage(img, "ruvo/shops/gallery");
                        if (imgUrl != null) {
                            shop.getImages().add(imgUrl);
                        }
                    }
                }
            }


            // ---------------------------------------------
            // Save shop
            // ---------------------------------------------

            shop.setId(null);

            // Admin approval required
            shop.setApproved(false);
            shop.setBankVerificationStatus("UNVERIFIED");

            Shop savedShop =
                    shopRepository.save(shop);


            return ResponseEntity.ok(prepareShopResponse(savedShop, request));


        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            "Failed to upload shop: "
                                    + e.getMessage()
                    );
        }
    }


    // =========================================================
    // 8.5 Upload Aadhaar Details & Documents
    // =========================================================

    @PostMapping("/{id}/aadhaar")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> uploadAadhaarDetails(
            @PathVariable Long id,
            @RequestParam("aadhaarNumber") String aadhaarNumber,
            @RequestParam("aadhaarName") String aadhaarName,
            @RequestPart(value = "front", required = false) MultipartFile front,
            @RequestPart(value = "back", required = false) MultipartFile back,
            HttpServletRequest request
    ) {
        try {
            java.util.Optional<Shop> shopOpt = shopRepository.findById(id);
            if (shopOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Shop not found with id: " + id);
            }
            Shop shop = shopOpt.get();
            if (!canManageShop(shop)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Unauthorized to update shop Aadhaar details.");
            }

            shop.setAadhaarNumber(aadhaarNumber.trim());
            shop.setAadhaarName(aadhaarName.trim());

            if (front != null && !front.isEmpty()) {
                String frontUrl = cloudinaryService.uploadImage(front, "ruvo/shops/aadhaar");
                shop.setAadhaarFrontUrl(frontUrl);
            }
            if (back != null && !back.isEmpty()) {
                String backUrl = cloudinaryService.uploadImage(back, "ruvo/shops/aadhaar");
                shop.setAadhaarBackUrl(backUrl);
            }

            Shop savedShop = shopRepository.save(shop);
            return ResponseEntity.ok(prepareShopResponse(savedShop, request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload Aadhaar details: " + e.getMessage());
        }
    }


    // =========================================================
    // 9. Approve shop (Trigger Razorpay Linked Account Creation)
    // =========================================================

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveShop(
            @PathVariable Long id,
            HttpServletRequest request
    ) {

        java.util.Optional<Shop> shopOpt =
                shopRepository.findById(id);

        if (shopOpt.isPresent()) {

            Shop shop = shopOpt.get();

            // Strict Gate: Cannot approve shop if bank account has not passed Razorpay & RuVo verification
            String bankStatus = shop.getBankVerificationStatus();
            if (!"READY_FOR_ADMIN".equalsIgnoreCase(bankStatus) && !"ADMIN_PENDING".equalsIgnoreCase(bankStatus) && !"VERIFIED".equalsIgnoreCase(bankStatus)) {
                return ResponseEntity
                        .status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body("Cannot approve shop with unverified bank account. Current bank status: " + (bankStatus != null ? bankStatus : "UNVERIFIED"));
            }

            shop.setApproved(true);
            shop.setAadhaarVerified(true);

            // Automatically create Razorpay Linked Account on Admin Approval
            String ifsc = shop.getIfscCode();
            String acc = shop.getBankAccountNumber();
            if (ifsc != null && acc != null && !ifsc.isBlank() && !acc.isBlank()) {
                String accountId = shop.getRazorpayAccountId();
                if (accountId == null || accountId.isBlank() || accountId.startsWith("acc_dummy")) {
                    String name = shop.getName();
                    String email = (shop.getOwner() != null && shop.getOwner().contains("@")) ? shop.getOwner() : shop.getId() + "@shop.ruvo.in";
                    String phone = shop.getPhone() != null ? shop.getPhone() : "9999999999";
                    accountId = razorpayService.createLinkedAccount(name, email, phone, ifsc, acc);
                    shop.setRazorpayAccountId(accountId);
                }
            }

            Shop savedShop = shopRepository.save(shop);
            return ResponseEntity.ok(prepareShopResponse(savedShop, request));
        }

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body("Shop not found with id: " + id);
    }


    // =========================================================
    // 9.5 Re-request admin approval
    //     Lets a shop owner recover when onboarding reached the pending screen
    //     but the approval queue needs to be refreshed.
    // =========================================================

    @PostMapping("/{id}/request-approval")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> requestApprovalAgain(
            @PathVariable Long id,
            @RequestParam String ownerId
    ) {

        java.util.Optional<Shop> shopOpt =
                shopRepository.findById(id);

        if (shopOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("Shop not found with id: " + id);
        }

        Shop shop = shopOpt.get();

        if (shop.getOwnerId() == null ||
                !shop.getOwnerId().equals(ownerId) ||
                !canManageShop(shop)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body("You can only request approval for your own shop.");
        }

        // Strict Gate: Direct API calls cannot bypass Razorpay Bank Verification
        String bankStatus = shop.getBankVerificationStatus();
        if (!"READY_FOR_ADMIN".equalsIgnoreCase(bankStatus) && !"ADMIN_PENDING".equalsIgnoreCase(bankStatus) && !"VERIFIED".equalsIgnoreCase(bankStatus)) {
            return ResponseEntity
                    .status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body("Bank account must be verified before admin approval request can be created. Current bank status: " + (bankStatus != null ? bankStatus : "UNVERIFIED"));
        }

        if (Boolean.TRUE.equals(shop.getApproved())) {
            return ResponseEntity.ok(shop);
        }

        shop.setApproved(false);
        shop.setActive(true);

        return ResponseEntity.ok(
                shopRepository.save(shop)
        );
    }


    // =========================================================
    // 10. Reject shop
    // =========================================================

    @DeleteMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectShop(
            @PathVariable Long id
    ) {

        if (!shopRepository.existsById(id)) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("Shop not found with id: " + id);
        }

        shopRepository.deleteById(id);

        return ResponseEntity.ok().build();
    }

    // =========================================================
    // 10.1 Delete / Reset Shop (Admin or Owner)
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> deleteShop(
            @PathVariable Long id
    ) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("Shop not found with id: " + id);
        }

        Shop shop = shopOpt.get();
        if (!isAdmin() && !canManageShop(shop)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body("You can only delete your own shop.");
        }

        shopRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Shop deleted successfully. You can now register a fresh shop."));
    }


    // =========================================================
    // 10.5 Toggle Active Status (Admin / Owner)
    // =========================================================

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> toggleActiveStatus(
            @PathVariable Long id,
            @RequestParam boolean active
    ) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(id);

        if (shopOpt.isPresent()) {
            Shop shop = shopOpt.get();
            if (!canManageShop(shop)) {
                return ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body("You can only update your own shop.");
            }
            shop.setActive(active);
            return ResponseEntity.ok(shopRepository.save(shop));
        }

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body("Shop not found with id: " + id);
    }


    // =========================================================
    // 11. Serviceability check
    //     GET /api/shops/serviceable?latitude=&longitude=
    //     Returns whether at least one approved shop exists within 5 km.
    // =========================================================

    @GetMapping("/serviceable")
    public ResponseEntity<Map<String, Object>> checkServiceability(
            @RequestParam Double latitude,
            @RequestParam Double longitude
    ) {
        List<Shop> nearbyShops = shopRepository.findNearbyShops(
                latitude,
                longitude,
                DistanceUtils.MAX_DELIVERY_KM
        );

        Map<String, Object> result = new HashMap<>();
        result.put("serviceable", !nearbyShops.isEmpty());
        result.put("nearbyShopCount", nearbyShops.size());
        return ResponseEntity.ok(result);
    }


    // =========================================================
    // 12. Pricing for a specific shop
    //     GET /api/shops/pricing?shopId=&userLat=&userLng=
    //     Returns deliveryFee, platformFee, distanceKm, serviceable.
    // =========================================================

    @GetMapping("/pricing")
    public ResponseEntity<?> getPricing(
            @RequestParam Long shopId,
            @RequestParam Double userLat,
            @RequestParam Double userLng
    ) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(shopId);

        if (shopOpt.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("Shop not found with id: " + shopId);
        }

        Shop shop = shopOpt.get();

        if (shop.getLatitude() == null || shop.getLongitude() == null) {
            // Shop has no location — use the nearest-neighbour fallback
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("distanceKm", 0.0);
            fallback.put("deliveryFee", 10.0);
            fallback.put("platformFee", 5.0);
            fallback.put("serviceable", true);
            fallback.put("note", "Shop location not set; using default fees");
            return ResponseEntity.ok(fallback);
        }

        double distanceKm = DistanceUtils.calculateDistance(
                userLat, userLng,
                shop.getLatitude(), shop.getLongitude()
        );

        boolean serviceable = DistanceUtils.isServiceable(distanceKm);
        double deliveryFee  = DistanceUtils.calculateDeliveryFee(distanceKm);
        double platformFee  = DistanceUtils.calculatePlatformFee(distanceKm);

        Map<String, Object> result = new HashMap<>();
        result.put("distanceKm",  Math.round(distanceKm * 10.0) / 10.0);
        result.put("deliveryFee", deliveryFee);
        result.put("platformFee", platformFee);
        result.put("serviceable", serviceable);
        return ResponseEntity.ok(result);
    }
    // =========================================================
    // Edit Shop (JSON & Multipart)
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> updateShopJson(
            @PathVariable Long id,
            @RequestBody Shop updatedShop,
            HttpServletRequest request
    ) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Shop not found with id: " + id);
        }

        Shop existingShop = shopOpt.get();
        if (!canManageShop(existingShop)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to edit this shop.");
        }

        if (updatedShop.getName() != null && !updatedShop.getName().isBlank()) {
            existingShop.setName(updatedShop.getName().trim());
        }
        if (updatedShop.getCategory() != null && !updatedShop.getCategory().isBlank()) {
            existingShop.setCategory(updatedShop.getCategory().trim());
        }
        if (updatedShop.getAddress() != null && !updatedShop.getAddress().isBlank()) {
            existingShop.setAddress(updatedShop.getAddress().trim());
        }
        if (updatedShop.getPhone() != null && !updatedShop.getPhone().isBlank()) {
            existingShop.setPhone(updatedShop.getPhone().trim());
        }
        if (updatedShop.getDeliveryAvailable() != null) existingShop.setDeliveryAvailable(updatedShop.getDeliveryAvailable());
        if (updatedShop.getLatitude() != null) existingShop.setLatitude(updatedShop.getLatitude());
        if (updatedShop.getLongitude() != null) existingShop.setLongitude(updatedShop.getLongitude());
        if (updatedShop.getBankAccountNumber() != null) existingShop.setBankAccountNumber(updatedShop.getBankAccountNumber().trim());
        if (updatedShop.getIfscCode() != null) existingShop.setIfscCode(updatedShop.getIfscCode().trim());
        if (updatedShop.getUpiId() != null) existingShop.setUpiId(updatedShop.getUpiId().trim());
        if (updatedShop.getBankName() != null) existingShop.setBankName(updatedShop.getBankName().trim());
        if (updatedShop.getBankAccountHolder() != null) existingShop.setBankAccountHolder(updatedShop.getBankAccountHolder().trim());
        Shop savedShop = shopRepository.save(existingShop);
        return ResponseEntity.ok(prepareShopResponse(savedShop, request));
    }

    @PutMapping("/upload/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'USER')")
    public ResponseEntity<?> updateShopWithImages(
            @PathVariable Long id,
            @RequestParam("shop") String shopJson,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            @RequestPart(value = "banner", required = false) MultipartFile banner,
            @RequestPart(value = "images", required = false) MultipartFile[] images,
            HttpServletRequest request
    ) {
        try {
            java.util.Optional<Shop> shopOpt = shopRepository.findById(id);
            if (shopOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Shop not found with id: " + id);
            }

            Shop existingShop = shopOpt.get();
            if (!canManageShop(existingShop)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to edit this shop.");
            }

            org.springframework.boot.json.JsonParser parser =
                    org.springframework.boot.json.JsonParserFactory.getJsonParser();
            java.util.Map<String, Object> map = parser.parseMap(shopJson);

            if (map.get("name") != null) existingShop.setName((String) map.get("name"));
            if (map.get("category") != null) existingShop.setCategory((String) map.get("category"));
            if (map.get("address") != null) existingShop.setAddress((String) map.get("address"));
            if (map.get("phone") != null) existingShop.setPhone((String) map.get("phone"));
            if (map.get("upiId") != null) existingShop.setUpiId((String) map.get("upiId"));
            if (map.get("bankAccountNumber") != null) existingShop.setBankAccountNumber((String) map.get("bankAccountNumber"));
            if (map.get("ifscCode") != null) existingShop.setIfscCode((String) map.get("ifscCode"));
            if (map.get("latitude") != null) existingShop.setLatitude(Double.parseDouble(map.get("latitude").toString()));
            if (map.get("longitude") != null) existingShop.setLongitude(Double.parseDouble(map.get("longitude").toString()));
            if (map.get("bankName") != null) existingShop.setBankName((String) map.get("bankName"));
            if (map.get("bankAccountHolder") != null) existingShop.setBankAccountHolder((String) map.get("bankAccountHolder"));
            if (map.get("deliveryAvailable") != null) existingShop.setDeliveryAvailable(Boolean.parseBoolean(map.get("deliveryAvailable").toString()));

            if (logo != null && !logo.isEmpty()) {
                String logoUrl = cloudinaryService.uploadImage(logo, "ruvo/shops/logos");
                if (logoUrl != null) existingShop.setLogoUrl(logoUrl);
            }

            if (banner != null && !banner.isEmpty()) {
                String bannerUrl = cloudinaryService.uploadImage(banner, "ruvo/shops/banners");
                if (bannerUrl != null) existingShop.setBannerUrl(bannerUrl);
            }

            if (images != null && images.length > 0) {
                for (MultipartFile img : images) {
                    if (img != null && !img.isEmpty()) {
                        String imgUrl = cloudinaryService.uploadImage(img, "ruvo/shops/gallery");
                        if (imgUrl != null) existingShop.getImages().add(imgUrl);
                    }
                }
            }

            Shop savedShop = shopRepository.save(existingShop);
            return ResponseEntity.ok(prepareShopResponse(savedShop, request));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update shop: " + e.getMessage());
        }
    }

    // =========================================================
    // Get delivery partners associated with shop
    // =========================================================

    @Autowired
    private Ranex.ruvo.repository.DeliveryPartnerRepository deliveryPartnerRepository;

    @GetMapping("/{id}/delivery-partners")
    public ResponseEntity<?> getShopDeliveryPartners(@PathVariable Long id) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Shop not found with id: " + id);
        }

        List<Ranex.ruvo.model.DeliveryPartner> allApproved = deliveryPartnerRepository.findByApprovedTrueAndActiveTrue();
        
        // Filter partners who have selected this shop ID in preferredShopIds or have no restriction
        String shopIdStr = String.valueOf(id);
        List<Map<String, Object>> result = allApproved.stream()
            .filter(p -> {
                if (p.getPreferredShopIds() == null || p.getPreferredShopIds().isBlank()) {
                    return true; // No preference restriction set -> available to all shops
                }
                java.util.Set<String> preferredSet = java.util.Arrays.stream(p.getPreferredShopIds().split(","))
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.toSet());
                return preferredSet.contains(shopIdStr);
            })
            .map(p -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("name", p.getName());
                map.put("phone", p.getPhone());
                map.put("available", Boolean.TRUE.equals(p.getAvailable()));
                map.put("lastActiveAt", p.getLastActiveAt() != null ? p.getLastActiveAt().toString() : null);
                map.put("locationName", p.getLocationName() != null ? p.getLocationName() : "Live Location");
                map.put("latitude", p.getLatitude());
                map.put("longitude", p.getLongitude());
                if (shopOpt.get().getLatitude() != null && shopOpt.get().getLongitude() != null && p.getLatitude() != null && p.getLongitude() != null) {
                    double dist = DistanceUtils.calculateDistance(shopOpt.get().getLatitude(), shopOpt.get().getLongitude(), p.getLatitude(), p.getLongitude());
                    map.put("distanceKm", Math.round(dist * 10.0) / 10.0);
                } else {
                    map.put("distanceKm", null);
                }
                return map;
            })
            .toList();

        return ResponseEntity.ok(result);
    }
}
