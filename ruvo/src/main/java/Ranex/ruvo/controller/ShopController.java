package Ranex.ruvo.controller;

import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shops")
@CrossOrigin(origins = "*") // Allows React Native to call this API
public class ShopController {

    @Autowired
    private ShopRepository shopRepository;

    // 1. Get all approved shops (public listing)
    @GetMapping
    public ResponseEntity<List<Shop>> getAllShops() {
        return ResponseEntity.ok(shopRepository.findByApprovedTrue());
    }

    // 2. Get all shops belonging to the current user, including pending ones.
    // Frontend uses this to show the owner their own shop marked
    // "Pending Approval" even though it isn't in the public listing yet.
    @GetMapping("/mine")
    public ResponseEntity<List<Shop>> getMyShops(@RequestParam String ownerId) {
        return ResponseEntity.ok(shopRepository.findByOwnerId(ownerId));
    }

    // 3. Admin dashboard: shops still awaiting approval
    @GetMapping("/pending")
    public ResponseEntity<List<Shop>> getPendingShops() {
        return ResponseEntity.ok(shopRepository.findByApprovedFalse());
    }

    // 4. Register a new shop (always starts unapproved)
    @PostMapping
    public ResponseEntity<?> addShop(@RequestBody Shop shop) {
        if (shop.getOwnerId() == null || shop.getOwnerId().isBlank()) {
            return ResponseEntity.badRequest().body("ownerId is required");
        }
        shop.setId(null);
        shop.setApproved(false);
        Shop savedShop = shopRepository.save(shop);
        return ResponseEntity.ok(savedShop);
    }

    // 5. Get nearby approved shops using coordinates
    @GetMapping("/nearby")
    public ResponseEntity<List<Shop>> getNearbyShops(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "5.0") Double radius) { // Default 5 KM
        List<Shop> nearbyShops = shopRepository.findNearbyShops(latitude, longitude, radius);
        return ResponseEntity.ok(nearbyShops);
    }

    // 6. Get single shop by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getShopById(@PathVariable Long id) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isPresent()) {
            return ResponseEntity.ok(shopOpt.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Shop not found with id: " + id);
    }

    // 7. Filter approved shops by category
    @GetMapping("/category/{categoryName}")
    public ResponseEntity<List<Shop>> getShopsByCategory(@PathVariable String categoryName) {
        return ResponseEntity.ok(shopRepository.findByCategoryAndApprovedTrue(categoryName));
    }

    // 7. Register a shop with a logo upload (also starts unapproved)
    @PostMapping("/upload")
    public ResponseEntity<?> uploadShop(@RequestParam("shop") String shopJson,
                                         @RequestPart("logo") MultipartFile logo,
                                         @RequestPart(value = "banner", required = false) MultipartFile banner) {
        try {
            org.springframework.boot.json.JsonParser parser = org.springframework.boot.json.JsonParserFactory.getJsonParser();
            java.util.Map<String, Object> map = parser.parseMap(shopJson);
            
            Shop shop = new Shop();
            shop.setName((String) map.get("name"));
            shop.setCategory((String) map.get("category"));
            shop.setAddress((String) map.get("address"));
            shop.setPhone((String) map.get("phone"));
            shop.setOwnerId((String) map.get("ownerId"));
            if (map.get("latitude") != null) shop.setLatitude(Double.parseDouble(map.get("latitude").toString()));
            if (map.get("longitude") != null) shop.setLongitude(Double.parseDouble(map.get("longitude").toString()));
            if (map.get("deliveryAvailable") != null) shop.setDeliveryAvailable(Boolean.parseBoolean(map.get("deliveryAvailable").toString()));
            
            if (shop.getOwnerId() == null || shop.getOwnerId().isBlank()) {
                return ResponseEntity.badRequest().body("ownerId is required");
            }

            String uploadDir = "uploads/logos";
            Files.createDirectories(Paths.get(uploadDir));
            
            String logoFilename = UUID.randomUUID().toString() + "_" + logo.getOriginalFilename();
            Path logoPath = Paths.get(uploadDir, logoFilename);
            Files.copy(logo.getInputStream(), logoPath);
            shop.setLogoUrl(logoPath.toString());
            
            if (banner != null && !banner.isEmpty()) {
                String bannerFilename = UUID.randomUUID().toString() + "_banner_" + banner.getOriginalFilename();
                Path bannerPath = Paths.get(uploadDir, bannerFilename);
                Files.copy(banner.getInputStream(), bannerPath);
                shop.setBannerUrl(bannerPath.toString());
            }

            shop.setId(null);
            shop.setApproved(false); // Requires admin approval
            Shop savedShop = shopRepository.save(shop);
            return ResponseEntity.ok(savedShop);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload shop: " + e.getMessage());
        }
    }

    // 8. Admin approval endpoint
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveShop(@PathVariable Long id) {
        java.util.Optional<Shop> shopOpt = shopRepository.findById(id);
        if (shopOpt.isPresent()) {
            Shop shop = shopOpt.get();
            shop.setApproved(true);
            return ResponseEntity.ok(shopRepository.save(shop));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Shop not found with id: " + id);
    }

    // 9. Admin rejection endpoint — deletes the pending shop.
    // (Swap for a status field like REJECTED instead of delete if you want
    // the owner to see a rejected state rather than have it disappear.)
    @DeleteMapping("/{id}/reject")
    public ResponseEntity<?> rejectShop(@PathVariable Long id) {
        if (!shopRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Shop not found with id: " + id);
        }
        shopRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}