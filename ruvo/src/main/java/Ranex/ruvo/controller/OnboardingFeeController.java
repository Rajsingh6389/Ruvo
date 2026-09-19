package Ranex.ruvo.controller;

import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/onboarding")
public class OnboardingFeeController {

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private DeliveryPartnerRepository deliveryPartnerRepository;

    private static final long FREE_LIMIT = 100;
    private static final double REGULAR_FEE = 99.0;

    @GetMapping("/fee")
    public ResponseEntity<Map<String, Object>> getOnboardingFeeInfo(
            @RequestParam(name = "type", defaultValue = "SHOP") String type) {

        long totalCount;
        String entityName;

        if ("PARTNER".equalsIgnoreCase(type)) {
            totalCount = deliveryPartnerRepository.count();
            entityName = "Delivery Partner";
        } else {
            totalCount = shopRepository.count();
            entityName = "Shop";
        }

        boolean isFree = totalCount < FREE_LIMIT;
        long remainingFreeSlots = isFree ? (FREE_LIMIT - totalCount) : 0;
        double feeAmount = isFree ? 0.0 : REGULAR_FEE;

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("type", type.toUpperCase());
        response.put("entityName", entityName);
        response.put("totalRegistered", totalCount);
        response.put("freeLimit", FREE_LIMIT);
        response.put("remainingFreeSlots", remainingFreeSlots);
        response.put("feeAmount", feeAmount);
        response.put("currency", "INR");
        response.put("isFree", isFree);

        if (isFree) {
            response.put("message", "First 100 " + entityName + "s get FREE onboarding! " + remainingFreeSlots + " free slot(s) remaining.");
        } else {
            response.put("message", "Onboarding fee for " + entityName + " is ₹" + (long) feeAmount + ".");
        }

        return ResponseEntity.ok(response);
    }
}
