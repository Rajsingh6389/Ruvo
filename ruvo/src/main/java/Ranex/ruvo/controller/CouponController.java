package Ranex.ruvo.controller;

import Ranex.ruvo.service.CouponService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateCoupon(@RequestBody Map<String, Object> request) {
        try {
            String code = (String) request.get("code");
            Object subtotalObj = request.get("subtotal");
            
            if (code == null || code.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Coupon code is required"
                ));
            }
            
            BigDecimal subtotal = BigDecimal.ZERO;
            if (subtotalObj instanceof Number) {
                subtotal = new BigDecimal(((Number) subtotalObj).doubleValue());
            } else if (subtotalObj instanceof String) {
                try {
                    subtotal = new BigDecimal((String) subtotalObj);
                } catch (NumberFormatException e) {
                    subtotal = BigDecimal.ZERO;
                }
            }
            
            BigDecimal discount = couponService.validateAndCalculateDiscount(code, subtotal);
            
            if (discount.compareTo(BigDecimal.ZERO) > 0) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "code", code,
                    "discount", discount.doubleValue(),
                    "message", "Coupon applied successfully"
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "Invalid or expired coupon code"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to validate coupon: " + e.getMessage()
            ));
        }
    }
}
