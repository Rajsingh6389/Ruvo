package Ranex.ruvo.controller;

import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class SearchController {

    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;

    public SearchController(ProductRepository productRepository, ShopRepository shopRepository) {
        this.productRepository = productRepository;
        this.shopRepository = shopRepository;
    }

    /**
     * Universal search endpoint - searches both products and shops
     */
    @GetMapping
    public ResponseEntity<?> search(
            @RequestParam String query,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(defaultValue = "20") int limit) {
        
        try {
            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "products", List.of(),
                    "shops", List.of(),
                    "message", "Search query is required"
                ));
            }

            String searchQuery = query.trim().toLowerCase();

            // Search products
            List<Product> allProducts = productRepository.findAll();
            List<Product> matchedProducts = allProducts.stream()
                .filter(p -> {
                    String name = p.getName() != null ? p.getName().toLowerCase() : "";
                    String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                    String category = p.getCategory() != null ? p.getCategory().toLowerCase() : "";
                    return name.contains(searchQuery) || 
                           desc.contains(searchQuery) || 
                           category.contains(searchQuery);
                })
                .filter(p -> p.getStockQuantity() != null && p.getStockQuantity() > 0)
                .filter(p -> p.getIsAvailable() == null || p.getIsAvailable())
                .limit(limit)
                .collect(Collectors.toList());

            // Search shops
            List<Shop> allShops = shopRepository.findAll();
            List<Shop> matchedShops = allShops.stream()
                .filter(s -> {
                    String name = s.getName() != null ? s.getName().toLowerCase() : "";
                    String category = s.getCategory() != null ? s.getCategory().toLowerCase() : "";
                    String address = s.getAddress() != null ? s.getAddress().toLowerCase() : "";
                    return name.contains(searchQuery) || 
                           category.contains(searchQuery) || 
                           address.contains(searchQuery);
                })
                .filter(s -> s.getApproved() != null && s.getApproved())
                .filter(s -> s.getActive() != null && s.getActive())
                .limit(limit)
                .collect(Collectors.toList());

            // If location provided, sort shops by distance
            if (latitude != null && longitude != null) {
                matchedShops.sort((s1, s2) -> {
                    double dist1 = calculateDistance(latitude, longitude, 
                        s1.getLatitude() != null ? s1.getLatitude() : 0, 
                        s1.getLongitude() != null ? s1.getLongitude() : 0);
                    double dist2 = calculateDistance(latitude, longitude, 
                        s2.getLatitude() != null ? s2.getLatitude() : 0, 
                        s2.getLongitude() != null ? s2.getLongitude() : 0);
                    return Double.compare(dist1, dist2);
                });
            }

            // Map products
            List<Map<String, Object>> productList = matchedProducts.stream()
                .map(this::mapProduct)
                .collect(Collectors.toList());

            // Map shops
            List<Map<String, Object>> shopList = matchedShops.stream()
                .map(this::mapShop)
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "query", query,
                "products", productList,
                "shops", shopList,
                "productCount", productList.size(),
                "shopCount", shopList.size()
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Search failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Search products only
     */
    @GetMapping("/products")
    public ResponseEntity<?> searchProducts(
            @RequestParam String query,
            @RequestParam(defaultValue = "20") int limit) {
        
        try {
            String searchQuery = query.trim().toLowerCase();
            List<Product> allProducts = productRepository.findAll();
            List<Product> matchedProducts = allProducts.stream()
                .filter(p -> {
                    String name = p.getName() != null ? p.getName().toLowerCase() : "";
                    String desc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                    String category = p.getCategory() != null ? p.getCategory().toLowerCase() : "";
                    return name.contains(searchQuery) || 
                           desc.contains(searchQuery) || 
                           category.contains(searchQuery);
                })
                .filter(p -> p.getStockQuantity() != null && p.getStockQuantity() > 0)
                .filter(p -> p.getIsAvailable() == null || p.getIsAvailable())
                .limit(limit)
                .collect(Collectors.toList());

            List<Map<String, Object>> productList = matchedProducts.stream()
                .map(this::mapProduct)
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "query", query,
                "products", productList,
                "count", productList.size()
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Product search failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Search shops only
     */
    @GetMapping("/shops")
    public ResponseEntity<?> searchShops(
            @RequestParam String query,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(defaultValue = "20") int limit) {
        
        try {
            String searchQuery = query.trim().toLowerCase();
            List<Shop> allShops = shopRepository.findAll();
            List<Shop> matchedShops = allShops.stream()
                .filter(s -> {
                    String name = s.getName() != null ? s.getName().toLowerCase() : "";
                    String category = s.getCategory() != null ? s.getCategory().toLowerCase() : "";
                    String address = s.getAddress() != null ? s.getAddress().toLowerCase() : "";
                    return name.contains(searchQuery) || 
                           category.contains(searchQuery) || 
                           address.contains(searchQuery);
                })
                .filter(s -> s.getApproved() != null && s.getApproved())
                .filter(s -> s.getActive() != null && s.getActive())
                .limit(limit)
                .collect(Collectors.toList());

            // Sort by distance if location provided
            if (latitude != null && longitude != null) {
                matchedShops.sort((s1, s2) -> {
                    double dist1 = calculateDistance(latitude, longitude, 
                        s1.getLatitude() != null ? s1.getLatitude() : 0, 
                        s1.getLongitude() != null ? s1.getLongitude() : 0);
                    double dist2 = calculateDistance(latitude, longitude, 
                        s2.getLatitude() != null ? s2.getLatitude() : 0, 
                        s2.getLongitude() != null ? s2.getLongitude() : 0);
                    return Double.compare(dist1, dist2);
                });
            }

            List<Map<String, Object>> shopList = matchedShops.stream()
                .map(this::mapShop)
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "query", query,
                "shops", shopList,
                "count", shopList.size()
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Shop search failed: " + e.getMessage()
            ));
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        if (lat1 == 0 || lon1 == 0 || lat2 == 0 || lon2 == 0) return Double.MAX_VALUE;
        // Simple distance calculation (not accurate but good enough for sorting)
        return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
    }

    private Map<String, Object> mapProduct(Product p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", p.getId());
        map.put("name", p.getName());
        map.put("description", p.getDescription() != null ? p.getDescription() : "");
        map.put("category", p.getCategory() != null ? p.getCategory() : "");
        map.put("sellingPrice", p.getSellingPrice());
        map.put("mrp", p.getActualPrice());
        map.put("stockQuantity", p.getStockQuantity());
        map.put("imageUrl", p.getImageUrl() != null ? p.getImageUrl() : "");
        map.put("shopId", p.getShopId());
        map.put("isAvailable", p.getIsAvailable() != null ? p.getIsAvailable() : true);
        return map;
    }

    private Map<String, Object> mapShop(Shop s) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", s.getId());
        map.put("name", s.getName());
        map.put("category", s.getCategory() != null ? s.getCategory() : "");
        map.put("address", s.getAddress() != null ? s.getAddress() : "");
        map.put("phone", s.getPhone() != null ? s.getPhone() : "");
        map.put("rating", s.getRating() != null ? s.getRating() : 0.0);
        map.put("logoUrl", s.getLogoUrl() != null ? s.getLogoUrl() : "");
        map.put("bannerUrl", s.getBannerUrl() != null ? s.getBannerUrl() : "");
        map.put("latitude", s.getLatitude());
        map.put("longitude", s.getLongitude());
        map.put("deliveryAvailable", s.getDeliveryAvailable() != null ? s.getDeliveryAvailable() : true);
        return map;
    }
}
