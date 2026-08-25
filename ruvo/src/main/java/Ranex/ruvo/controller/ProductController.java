package Ranex.ruvo.controller;

import Ranex.ruvo.model.Product;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.repository.ShopRepository;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import Ranex.ruvo.service.CloudinaryService;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private CloudinaryService cloudinaryService;


    // =========================================================
    // Helper: Build public HTTP URL from a stored file path
    // =========================================================

    private String buildFileUrl(String filePath, HttpServletRequest request) {
        if (filePath == null || filePath.isBlank()) return null;
        // If already a full URL, return as-is
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
        String normalizedPath = filePath.replace("\\", "/").replaceFirst("^/+", "");
        String baseUrl = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();
        return baseUrl + "/" + normalizedPath;
    }


    // =========================================================
    // Helper: Enrich product imageUrl with full HTTP URL
    // =========================================================

    private Product prepareProductResponse(Product product, HttpServletRequest request) {
        if (product.getImageUrl() != null) {
            product.setImageUrl(buildFileUrl(product.getImageUrl(), request));
        }
        if (product.getImageUrls() != null && !product.getImageUrls().isEmpty()) {
            java.util.List<String> enriched = new java.util.ArrayList<>();
            for (String url : product.getImageUrls()) {
                enriched.add(buildFileUrl(url, request));
            }
            product.setImageUrls(enriched);
        }
        return product;
    }


    // =========================================================
    // Helper: Get current authenticated user's principal (mobile/identity)
    // =========================================================

    private String getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        return principal.toString();
    }


    // =========================================================
    // Helper: Check if current user is ADMIN
    // =========================================================

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }


    // =========================================================
    // Helper: Check if current user owns the given shop
    // =========================================================

    private boolean ownsShop(Long shopId) {
        String principal = getCurrentPrincipal();
        if (principal == null) return false;
        Optional<Shop> shopOpt = shopRepository.findById(shopId);
        if (shopOpt.isEmpty()) return false;
        Shop shop = shopOpt.get();
        // Legacy sessions use email/mobile as the JWT subject. Central Shop Owner
        // OTP sessions use identity:<id>; registrations stored that same ID in
        // ownerId and, for new records, authIdentityId.
        if (principal.startsWith("identity:")) {
            try {
                Long identityId = Long.parseLong(principal.substring("identity:".length()));
                String identityIdStr = String.valueOf(identityId);
                // Check authIdentityId first (set by ShopOwnerController and updated ShopController)
                if (identityId.equals(shop.getAuthIdentityId())) return true;
                // Fall back to ownerId comparison (for shops created before authIdentityId was added)
                if (identityIdStr.equals(shop.getOwnerId())) return true;
                return false;
            } catch (NumberFormatException ignored) {
                return false;
            }
        }
        return principal.equals(shop.getOwnerId());
    }


    // =========================================================
    // Helper: Auto-calculate discount from actual & selling price
    // =========================================================

    private Double calculateDiscount(Double actualPrice, Double sellingPrice) {
        if (actualPrice == null || actualPrice <= 0 || sellingPrice == null) return 0.0;
        double disc = ((actualPrice - sellingPrice) / actualPrice) * 100.0;
        // Round to 2 decimal places
        return Math.round(disc * 100.0) / 100.0;
    }


    // =========================================================
    // GET ALL PRODUCTS OF A SHOP (customers + shopkeeper)
    // Returns all products including unavailable ones.
    // Customers will render unavailable products as "Out of stock"
    // =========================================================

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Product>> getProductsByShop(
            @PathVariable Long shopId,
            HttpServletRequest request) {

        List<Product> products = productRepository.findByShopId(shopId);
        products.forEach(p -> prepareProductResponse(p, request));
        return ResponseEntity.ok(products);
    }


    // =========================================================
    // GET ONLY AVAILABLE PRODUCTS — alternative endpoint
    // =========================================================

    @GetMapping("/shop/{shopId}/available")
    public ResponseEntity<List<Product>> getAvailableProducts(
            @PathVariable Long shopId,
            HttpServletRequest request) {

        List<Product> products = productRepository.findByShopIdAndIsAvailableTrue(shopId);
        products.forEach(p -> prepareProductResponse(p, request));
        return ResponseEntity.ok(products);
    }

    // =========================================================
    // EXPLORE ANYWAY — all available products from approved/active shops
    // =========================================================

    @GetMapping("/explore")
    public ResponseEntity<List<Product>> exploreProducts(HttpServletRequest request) {
        List<Product> products = productRepository.findExploreProducts();
        products.forEach(p -> prepareProductResponse(p, request));
        return ResponseEntity.ok()
            .header("X-Explore-Mode", "true")
            .body(products);
    }


    // =========================================================
    // ADD PRODUCT (JSON body, no image)
    // Only the shop owner or admin can add products
    // =========================================================

    @PostMapping
    public ResponseEntity<?> addProduct(
            @RequestBody Product product) {

        if (product.getShopId() == null) {
            return ResponseEntity.badRequest().body("shopId is required");
        }

        // Authorization
        if (!isAdmin() && !ownsShop(product.getShopId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You are not authorized to add products to this shop");
        }

        // Validate prices
        if (product.getActualPrice() == null || product.getSellingPrice() == null) {
            return ResponseEntity.badRequest().body("actualPrice and sellingPrice are required");
        }
        if (product.getSellingPrice() > product.getActualPrice()) {
            return ResponseEntity.badRequest()
                    .body("Selling price cannot be greater than actual price");
        }
        if (product.getStockQuantity() == null || product.getStockQuantity() < 0) {
            return ResponseEntity.badRequest().body("stockQuantity must be a non-negative number");
        }

        product.setId(null);
        product.setDiscount(calculateDiscount(product.getActualPrice(), product.getSellingPrice()));

        if (product.getIsAvailable() == null) {
            product.setIsAvailable(true);
        }

        Product savedProduct = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedProduct);
    }


    // =========================================================
    // ADD PRODUCT WITH IMAGE (multipart)
    // Only the shop owner or admin can add products
    // =========================================================

    @PostMapping("/upload")
    public ResponseEntity<?> uploadProduct(
            @RequestParam("product") String productJson,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestPart(value = "images", required = false) MultipartFile[] images,
            HttpServletRequest request)
            throws IOException {

        // Parse product JSON
        org.springframework.boot.json.JsonParser parser =
                org.springframework.boot.json.JsonParserFactory.getJsonParser();
        java.util.Map<String, Object> map = parser.parseMap(productJson);

        Product product = new Product();
        product.setName((String) map.get("name"));
        product.setCategory((String) map.get("category"));
        product.setBrandName((String) map.get("brandName"));
        product.setDescription((String) map.get("description"));
        product.setUnit((String) map.get("unit"));

        if (map.get("shopId") != null) {
            product.setShopId(Long.parseLong(map.get("shopId").toString()));
        }
        if (map.get("actualPrice") != null) {
            product.setActualPrice(Double.parseDouble(map.get("actualPrice").toString()));
        }
        if (map.get("sellingPrice") != null) {
            product.setSellingPrice(Double.parseDouble(map.get("sellingPrice").toString()));
        }
        if (map.get("stockQuantity") != null) {
            product.setStockQuantity(Integer.parseInt(map.get("stockQuantity").toString()));
        }
        if (map.get("isAvailable") != null) {
            product.setIsAvailable(Boolean.parseBoolean(map.get("isAvailable").toString()));
        } else {
            product.setIsAvailable(true);
        }
        if (map.get("imageUrl") != null) {
            product.setImageUrl((String) map.get("imageUrl"));
        }

        if (product.getShopId() == null) {
            return ResponseEntity.badRequest().body("shopId is required");
        }

        // Authorization
        if (!isAdmin() && !ownsShop(product.getShopId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You are not authorized to add products to this shop");
        }

        // Validate prices
        if (product.getActualPrice() == null || product.getSellingPrice() == null) {
            return ResponseEntity.badRequest().body("actualPrice and sellingPrice are required");
        }
        if (product.getSellingPrice() > product.getActualPrice()) {
            return ResponseEntity.badRequest()
                    .body("Selling price cannot be greater than actual price");
        }
        if (product.getStockQuantity() == null || product.getStockQuantity() < 0) {
            return ResponseEntity.badRequest().body("stockQuantity must be a non-negative number");
        }

        // Handle multiple image upload to Cloudinary
        if (images != null && images.length > 0) {
            for (MultipartFile img : images) {
                if (img != null && !img.isEmpty()) {
                    String uploadedUrl = cloudinaryService.uploadImage(img, "ruvo/products");
                    if (uploadedUrl != null) {
                        product.getImageUrls().add(uploadedUrl);
                    }
                }
            }
        }

        // Handle single primary image upload
        if (image != null && !image.isEmpty()) {
            String imageUrl = cloudinaryService.uploadImage(image, "ruvo/products");
            product.setImageUrl(imageUrl);
            if (!product.getImageUrls().contains(imageUrl)) {
                product.getImageUrls().add(0, imageUrl);
            }
        } else if (product.getImageUrl() == null && !product.getImageUrls().isEmpty()) {
            product.setImageUrl(product.getImageUrls().get(0));
        }

        product.setId(null);
        product.setDiscount(calculateDiscount(product.getActualPrice(), product.getSellingPrice()));

        Product savedProduct = productRepository.save(product);
        prepareProductResponse(savedProduct, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedProduct);
    }


    // =========================================================
    // UPDATE / EDIT PRODUCT
    // Only the shop owner or admin can edit
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Long id,
            @RequestBody Product updatedProduct,
            HttpServletRequest request) {

        Product existingProduct = productRepository.findById(id).orElse(null);
        if (existingProduct == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Product not found with id: " + id);
        }

        // Authorization — check ownership of the EXISTING product's shop
        if (!isAdmin() && !ownsShop(existingProduct.getShopId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You are not authorized to edit this product");
        }

        // Validate prices
        Double newActual = updatedProduct.getActualPrice() != null
                ? updatedProduct.getActualPrice() : existingProduct.getActualPrice();
        Double newSelling = updatedProduct.getSellingPrice() != null
                ? updatedProduct.getSellingPrice() : existingProduct.getSellingPrice();

        if (newSelling != null && newActual != null && newSelling > newActual) {
            return ResponseEntity.badRequest()
                    .body("Selling price cannot be greater than actual price");
        }

        // Apply updates
        if (updatedProduct.getName() != null) existingProduct.setName(updatedProduct.getName());
        if (updatedProduct.getCategory() != null) existingProduct.setCategory(updatedProduct.getCategory());
        if (updatedProduct.getBrandName() != null) existingProduct.setBrandName(updatedProduct.getBrandName());
        if (updatedProduct.getDescription() != null) existingProduct.setDescription(updatedProduct.getDescription());
        if (updatedProduct.getActualPrice() != null) existingProduct.setActualPrice(updatedProduct.getActualPrice());
        if (updatedProduct.getSellingPrice() != null) existingProduct.setSellingPrice(updatedProduct.getSellingPrice());
        if (updatedProduct.getStockQuantity() != null) existingProduct.setStockQuantity(updatedProduct.getStockQuantity());
        if (updatedProduct.getUnit() != null) existingProduct.setUnit(updatedProduct.getUnit());
        if (updatedProduct.getIsAvailable() != null) existingProduct.setIsAvailable(updatedProduct.getIsAvailable());

        // Keep existing image if no new image provided
        if (updatedProduct.getImageUrl() != null && !updatedProduct.getImageUrl().isBlank()) {
            existingProduct.setImageUrl(updatedProduct.getImageUrl());
        }

        // Never allow shopId to change
        // existingProduct.shopId is preserved

        // Recalculate discount
        existingProduct.setDiscount(calculateDiscount(existingProduct.getActualPrice(), existingProduct.getSellingPrice()));

        Product savedProduct = productRepository.save(existingProduct);
        prepareProductResponse(savedProduct, request);

        return ResponseEntity.ok(savedProduct);
    }


    // =========================================================
    // UPDATE PRODUCT WITH IMAGE (multipart for edit)
    // =========================================================

    @PutMapping("/upload/{id}")
    public ResponseEntity<?> updateProductWithImage(
            @PathVariable Long id,
            @RequestPart("product") String productJson,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestPart(value = "images", required = false) MultipartFile[] images,
            HttpServletRequest request)
            throws IOException {

        Product existingProduct = productRepository.findById(id).orElse(null);
        if (existingProduct == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Product not found with id: " + id);
        }

        // Authorization
        if (!isAdmin() && !ownsShop(existingProduct.getShopId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You are not authorized to edit this product");
        }

        // Parse JSON
        org.springframework.boot.json.JsonParser parser =
                org.springframework.boot.json.JsonParserFactory.getJsonParser();
        java.util.Map<String, Object> map = parser.parseMap(productJson);

        if (map.get("name") != null) existingProduct.setName((String) map.get("name"));
        if (map.get("category") != null) existingProduct.setCategory((String) map.get("category"));
        if (map.get("brandName") != null) existingProduct.setBrandName((String) map.get("brandName"));
        if (map.get("description") != null) existingProduct.setDescription((String) map.get("description"));
        if (map.get("unit") != null) existingProduct.setUnit((String) map.get("unit"));
        if (map.get("actualPrice") != null) {
            existingProduct.setActualPrice(Double.parseDouble(map.get("actualPrice").toString()));
        }
        if (map.get("sellingPrice") != null) {
            existingProduct.setSellingPrice(Double.parseDouble(map.get("sellingPrice").toString()));
        }
        if (map.get("stockQuantity") != null) {
            existingProduct.setStockQuantity(Integer.parseInt(map.get("stockQuantity").toString()));
        }
        if (map.get("isAvailable") != null) {
            existingProduct.setIsAvailable(Boolean.parseBoolean(map.get("isAvailable").toString()));
        }

        // Validate prices
        if (existingProduct.getSellingPrice() != null && existingProduct.getActualPrice() != null
                && existingProduct.getSellingPrice() > existingProduct.getActualPrice()) {
            return ResponseEntity.badRequest()
                    .body("Selling price cannot be greater than actual price");
        }

        // Handle multiple image upload to Cloudinary
        if (images != null && images.length > 0) {
            for (MultipartFile img : images) {
                if (img != null && !img.isEmpty()) {
                    String uploadedUrl = cloudinaryService.uploadImage(img, "ruvo/products");
                    if (uploadedUrl != null) {
                        existingProduct.getImageUrls().add(uploadedUrl);
                    }
                }
            }
        }

        // Handle primary image upload to Cloudinary
        if (image != null && !image.isEmpty()) {
            String imageUrl = cloudinaryService.uploadImage(image, "ruvo/products");
            existingProduct.setImageUrl(imageUrl);
            if (!existingProduct.getImageUrls().contains(imageUrl)) {
                existingProduct.getImageUrls().add(0, imageUrl);
            }
        } else if (existingProduct.getImageUrl() == null && !existingProduct.getImageUrls().isEmpty()) {
            existingProduct.setImageUrl(existingProduct.getImageUrls().get(0));
        }

        existingProduct.setDiscount(calculateDiscount(existingProduct.getActualPrice(), existingProduct.getSellingPrice()));

        Product savedProduct = productRepository.save(existingProduct);
        prepareProductResponse(savedProduct, request);

        return ResponseEntity.ok(savedProduct);
    }


    // =========================================================
    // AVAILABILITY TOGGLE
    // Only the shop owner or admin can change availability
    // =========================================================

    @PatchMapping("/{id}/availability")
    public ResponseEntity<?> updateAvailability(
            @PathVariable Long id,
            @RequestParam boolean available) {

        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Product not found with id: " + id);
        }

        // Authorization
        if (!isAdmin() && !ownsShop(product.getShopId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You are not authorized to change availability of this product");
        }

        product.setIsAvailable(available);
        Product savedProduct = productRepository.save(product);
        return ResponseEntity.ok(savedProduct);
    }


    // =========================================================
    // DELETE PRODUCT
    // Only the shop owner or admin can delete
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {

        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Product not found with id: " + id);
        }

        // Authorization
        if (!isAdmin() && !ownsShop(product.getShopId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You are not authorized to delete this product");
        }

        productRepository.deleteById(id);
        return ResponseEntity.ok("Product deleted successfully");
    }
}
