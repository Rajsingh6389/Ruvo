package Ranex.ruvo.controller;

import Ranex.ruvo.model.Product;
import Ranex.ruvo.repository.ProductRepository;
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
@RequestMapping("/api/products")
@CrossOrigin(origins = "*") // Allows React Native to call this API
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Product>> getProductsByShop(@PathVariable Long shopId) {
        return ResponseEntity.ok(productRepository.findByShopId(shopId));
    }

    @PostMapping
    public ResponseEntity<?> addProduct(@RequestBody Product product) {
        if (product.getShopId() == null) {
            return ResponseEntity.badRequest().body("shopId is required");
        }
        product.setId(null);
        Product savedProduct = productRepository.save(product);
        return ResponseEntity.ok(savedProduct);
    }
    
    @PostMapping("/upload")
    public ResponseEntity<?> uploadProduct(@RequestPart("product") Product product,
                                         @RequestPart("image") MultipartFile image) throws IOException {
        if (product.getShopId() == null) {
            return ResponseEntity.badRequest().body("shopId is required");
        }
        
        String uploadDir = "uploads/products";
        Files.createDirectories(Paths.get(uploadDir));
        String filename = UUID.randomUUID().toString() + "_" + image.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, filename);
        Files.copy(image.getInputStream(), filePath);

        product.setId(null);
        product.setImageUrl(filePath.toString());
        Product savedProduct = productRepository.save(product);
        return ResponseEntity.ok(savedProduct);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
