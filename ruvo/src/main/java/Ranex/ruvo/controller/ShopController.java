package Ranex.ruvo.controller;

import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ShopRepository;
import Ranex.ruvo.util.DistanceUtils;

import Ranex.ruvo.service.CloudinaryService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.core.Authentication;
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
public class ShopController {

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private CloudinaryService cloudinaryService;


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
    public ResponseEntity<List<Shop>> getMyShops(
            @RequestParam String ownerId,
            HttpServletRequest request
    ) {

        List<Shop> shops =
                shopRepository.findByOwnerId(ownerId);

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
    public ResponseEntity<?> addShop(
            @RequestBody Shop shop
    ) {

        if (shop.getOwnerId() == null ||
                shop.getOwnerId().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body("ownerId is required");
        }

        shop.setId(null);
        shop.setApproved(false);

        Shop savedShop =
                shopRepository.save(shop);

        return ResponseEntity.ok(savedShop);
    }


    // =========================================================
    // 5. Nearby shops (Now computes distance & wraps response)
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
    public ResponseEntity<?> uploadShop(
            @RequestParam("shop") String shopJson,
            @RequestPart("logo") MultipartFile logo,
            @RequestPart(value = "banner", required = false)
            MultipartFile banner,
            @RequestPart(value = "images", required = false)
            MultipartFile[] images
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

            Shop savedShop =
                    shopRepository.save(shop);


            return ResponseEntity.ok(savedShop);


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
    // 9. Approve shop
    // =========================================================

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveShop(
            @PathVariable Long id
    ) {

        java.util.Optional<Shop> shopOpt =
                shopRepository.findById(id);

        if (shopOpt.isPresent()) {

            Shop shop = shopOpt.get();

            shop.setApproved(true);

            return ResponseEntity.ok(
                    shopRepository.save(shop)
            );
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
                !shop.getOwnerId().equals(ownerId)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body("You can only request approval for your own shop.");
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
    // 10.5 Toggle Active Status (Admin / Owner)
    // =========================================================

    @PatchMapping("/{id}/active")
    public ResponseEntity<?> toggleActiveStatus(
            @PathVariable Long id,
            @RequestParam boolean active
    ) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(id);

        if (shopOpt.isPresent()) {
            Shop shop = shopOpt.get();
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
}
