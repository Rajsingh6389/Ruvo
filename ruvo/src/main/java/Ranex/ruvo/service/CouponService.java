package Ranex.ruvo.service;

import Ranex.ruvo.model.Coupon;
import Ranex.ruvo.repository.CouponRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;

@Service
public class CouponService {

    private final CouponRepository couponRepository;

    public CouponService(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    public BigDecimal validateAndCalculateDiscount(String code, BigDecimal subtotal) {
        if (code == null || code.isBlank() || subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        Optional<Coupon> couponOpt = couponRepository.findByCodeIgnoreCaseAndActiveTrue(code.trim());
        if (couponOpt.isEmpty()) {
            return BigDecimal.ZERO;
        }

        Coupon coupon = couponOpt.get();

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(Instant.now())) {
            return BigDecimal.ZERO;
        }

        if (coupon.getMinOrderAmount() != null && subtotal.compareTo(coupon.getMinOrderAmount()) < 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal discount = BigDecimal.ZERO;
        if ("FLAT".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = coupon.getDiscountValue();
        } else if ("PERCENTAGE".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = subtotal.multiply(coupon.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        if (coupon.getMaxDiscountAmount() != null && discount.compareTo(coupon.getMaxDiscountAmount()) > 0) {
            discount = coupon.getMaxDiscountAmount();
        }

        if (discount.compareTo(subtotal) > 0) {
            discount = subtotal;
        }

        return discount.setScale(2, RoundingMode.HALF_UP);
    }
}
