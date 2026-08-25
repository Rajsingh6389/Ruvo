package Ranex.ruvo.controller;

import Ranex.ruvo.model.Review;
import Ranex.ruvo.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * Create or update a review
     */
    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.parseLong(request.get("userId").toString());
            Long shopId = Long.parseLong(request.get("shopId").toString());
            Long orderId = request.get("orderId") != null ? Long.parseLong(request.get("orderId").toString()) : null;
            Integer rating = Integer.parseInt(request.get("rating").toString());
            String reviewText = (String) request.getOrDefault("reviewText", "");
            Boolean isAnonymous = (Boolean) request.getOrDefault("isAnonymous", false);

            Review review = reviewService.createOrUpdateReview(userId, shopId, orderId, rating, reviewText, isAnonymous);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Review submitted successfully",
                "review", mapReview(review)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to submit review: " + e.getMessage()
            ));
        }
    }

    /**
     * Get shop reviews
     */
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<?> getShopReviews(@PathVariable Long shopId) {
        try {
            List<Review> reviews = reviewService.getShopReviews(shopId);
            Double avgRating = reviewService.getShopAverageRating(shopId);
            Long reviewCount = reviewService.getShopReviewCount(shopId);

            List<Map<String, Object>> reviewList = reviews.stream()
                .map(this::mapReview)
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "reviews", reviewList,
                "averageRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0,
                "totalReviews", reviewCount
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch reviews: " + e.getMessage()
            ));
        }
    }

    /**
     * Get user's reviews
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserReviews(@PathVariable Long userId) {
        try {
            List<Review> reviews = reviewService.getUserReviews(userId);
            List<Map<String, Object>> reviewList = reviews.stream()
                .map(this::mapReview)
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "reviews", reviewList
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch user reviews: " + e.getMessage()
            ));
        }
    }

    /**
     * Check if user can review an order
     */
    @GetMapping("/can-review")
    public ResponseEntity<?> canReview(@RequestParam Long userId, @RequestParam Long orderId) {
        try {
            boolean canReview = reviewService.canUserReviewOrder(userId, orderId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "canReview", canReview
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to check review eligibility: " + e.getMessage()
            ));
        }
    }

    private Map<String, Object> mapReview(Review review) {
        return Map.of(
            "id", review.getId(),
            "userId", review.getUserId(),
            "shopId", review.getShopId(),
            "orderId", review.getOrderId() != null ? review.getOrderId() : 0,
            "rating", review.getRating(),
            "reviewText", review.getReviewText() != null ? review.getReviewText() : "",
            "isAnonymous", review.getIsAnonymous(),
            "createdAt", review.getCreatedAt().toString()
        );
    }
}
