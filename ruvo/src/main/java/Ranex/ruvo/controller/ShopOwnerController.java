package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.Shop;
import Ranex.ruvo.repository.ShopRepository;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Role-scoped merchant API. It does not alter the customer-facing /api/shops routes. */
@RestController
@RequestMapping("/api/shop")
@PreAuthorize("hasRole('SHOP_OWNER')")
public class ShopOwnerController {
    private final ShopRepository shops;
    public ShopOwnerController(ShopRepository shops) { this.shops = shops; }

    @GetMapping("/shops")
    public ResponseEntity<ApiResponse<List<Shop>>> mine(@AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        return ResponseEntity.ok(ApiResponse.ok("Shop owner shops", shops.findByAuthIdentityId(identityId(principal))));
    }

    @PostMapping("/shops")
    public ResponseEntity<ApiResponse<Shop>> create(@AuthenticationPrincipal org.springframework.security.core.userdetails.User principal,
                                                     @RequestBody Shop input) {
        if (input.getName() == null || input.getName().isBlank() || input.getPhone() == null || input.getPhone().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Shop name and phone are required", null));
        }
        long identityId = identityId(principal);
        input.setId(null); input.setAuthIdentityId(identityId); input.setOwnerId(String.valueOf(identityId));
        input.setApproved(false); input.setActive(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Shop submitted for approval", shops.save(input)));
    }

    private long identityId(org.springframework.security.core.userdetails.User principal) {
        String value = principal.getUsername();
        if (!value.startsWith("identity:")) throw new org.springframework.security.access.AccessDeniedException("Central identity token required");
        return Long.parseLong(value.substring("identity:".length()));
    }
}
