package Ranex.ruvo.controller;

import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ShopRepository;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shops")
@CrossOrigin(origins = "*")
public class ShopController {

    @Autowired
    private ShopRepository shopRepository;


    // =========================================================
    // Helper: Convert stored path into a public URL
    // =========================================================

    private String buildFileUrl(String filePath, HttpServletRequest request) {

        if (filePath == null || filePath.isBlank()) {
            return null;
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
                shopRepository.findByApprovedTrue();

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
    public ResponseEntity<List<Shop>> getPendingShops(
            HttpServletRequest request
    ) {

        List<Shop> shops =
                shopRepository.findByApprovedFalse();

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
    // 5. Nearby shops
    // =========================================================

    @GetMapping("/nearby")
    public ResponseEntity<List<Shop>> getNearbyShops(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "5.0") Double radius,
            HttpServletRequest request
    ) {

        List<Shop> nearbyShops =
                shopRepository.findNearbyShops(
                        latitude,
                        longitude,
                        radius
                );

        nearbyShops.forEach(shop ->
                prepareShopResponse(shop, request)
        );

        return ResponseEntity.ok(nearbyShops);
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
            MultipartFile banner
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
            // Validate logo
            // ---------------------------------------------

            if (logo == null || logo.isEmpty()) {

                return ResponseEntity
                        .badRequest()
                        .body("Shop logo is required");
            }


            // ---------------------------------------------
            // Create directories
            // ---------------------------------------------

            Path logoDirectory =
                    Paths.get("uploads/logos");

            Path bannerDirectory =
                    Paths.get("uploads/banners");

            Files.createDirectories(logoDirectory);
            Files.createDirectories(bannerDirectory);


            // ---------------------------------------------
            // Save logo
            // ---------------------------------------------

            String originalLogoName =
                    logo.getOriginalFilename();

            String logoExtension = "";

            if (originalLogoName != null &&
                    originalLogoName.contains(".")) {

                logoExtension =
                        originalLogoName.substring(
                                originalLogoName.lastIndexOf(".")
                        );
            }

            String logoFilename =
                    UUID.randomUUID()
                            + logoExtension;

            Path logoPath =
                    logoDirectory.resolve(logoFilename);

            Files.copy(
                    logo.getInputStream(),
                    logoPath
            );


            // IMPORTANT:
            // Store relative path in database
            shop.setLogoUrl(
                    "uploads/logos/" + logoFilename
            );


            // ---------------------------------------------
            // Save banner
            // ---------------------------------------------

            if (banner != null &&
                    !banner.isEmpty()) {

                String originalBannerName =
                        banner.getOriginalFilename();

                String bannerExtension = "";

                if (originalBannerName != null &&
                        originalBannerName.contains(".")) {

                    bannerExtension =
                            originalBannerName.substring(
                                    originalBannerName.lastIndexOf(".")
                            );
                }

                String bannerFilename =
                        UUID.randomUUID()
                                + bannerExtension;

                Path bannerPath =
                        bannerDirectory.resolve(
                                bannerFilename
                        );

                Files.copy(
                        banner.getInputStream(),
                        bannerPath
                );


                // Store relative path
                shop.setBannerUrl(
                        "uploads/banners/"
                                + bannerFilename
                );
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
    // 10. Reject shop
    // =========================================================

    @DeleteMapping("/{id}/reject")
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
}