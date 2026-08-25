package Ranex.ruvo.service;

import Ranex.ruvo.model.Review;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ReviewRepository;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ShopRepository shopRepository;

    public ReviewService(ReviewRepository reviewRepository, ShopRepository shopRepository) {
        this.reviewRepository = reviewRepository;
        this.shopRepository = shopRepository;
    }

    /**
     * Create or update a review for a shop
     */
    @Transactional
    public Review createOrUpdateReview(Long userId, Long shopId, Long orderId, Integer rating, String reviewText, Boolean isAnonymous) {
        // Validate rating
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }

        // Check if user already reviewed this order
        Optional<Review> existingReview = reviewRepository.findByOrderIdAndUserId(orderId, userId);
        
        Review review;
        if (existingReview.isPresent()) {
            // Update existing review
            review = existingReview.get();
            review.setRating(rating);
            review.setReviewText(reviewText);
            review.setIsAnonymous(isAnonymous != null ? isAnonymous : false);
            review.setUpdatedAt(Instant.now());
        } else {
            // Create new review
            review = Review.builder()
                .userId(userId)
                .shopId(shopId)
                .orderId(orderId)
                .rating(rating)
                .reviewText(reviewText)
                .isAnonymous(isAnonymous != null ? isAnonymous : false)
                .isApproved(true)
                .build();
        }

        review = reviewRepository.save(review);

        // Update shop's average rating
        updateShopRating(shopId);

        return review;
    }

    /**
     * Get all reviews for a shop
     */
    public List<Review> getShopReviews(Long shopId) {
        return reviewRepository.findByShopIdAndIsApprovedTrueOrderByCreatedAtDesc(shopId);
    }

    /**
     * Get user's reviews
     */
    public List<Review> getUserReviews(Long userId) {
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get average rating for a shop
     */
    public Double getShopAverageRating(Long shopId) {
        return reviewRepository.getAverageRatingByShopId(shopId);
    }

    /**
     * Get review count for a shop
     */
    public Long getShopReviewCount(Long shopId) {
        return reviewRepository.getCountByShopId(shopId);
    }

    /**
     * Update shop's average rating in the shop entity
     */
    @Transactional
    public void updateShopRating(Long shopId) {
        Double avgRating = reviewRepository.getAverageRatingByShopId(shopId);
        if (avgRating != null) {
            shopRepository.findById(shopId).ifPresent(shop -> {
                shop.setRating(Math.round(avgRating * 10.0) / 10.0); // Round to 1 decimal
                shopRepository.save(shop);
            });
        }
    }

    /**
     * Check if user can review an order
     */
    public boolean canUserReviewOrder(Long userId, Long orderId) {
        return !reviewRepository.existsByOrderIdAndUserId(orderId, userId);
    }
}
