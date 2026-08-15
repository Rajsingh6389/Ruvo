package Ranex.ruvo.controller;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/delivery-partners")
@CrossOrigin(origins = "*")
public class DeliveryPartnerController {

    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public DeliveryPartnerController(DeliveryPartnerRepository deliveryPartnerRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        return principal.toString();
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerDeliveryPartner(@RequestBody DeliveryPartner partner) {
        String email = getCurrentUserEmail();
        if (email == null) return ResponseEntity.status(403).build();

        Optional<DeliveryPartner> existing = deliveryPartnerRepository.findByUserId(email);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("User is already registered as a delivery partner.");
        }

        partner.setId(null);
        partner.setUserId(email);
        partner.setApproved(false);
        partner.setAvailable(false);
        partner.setActive(true);

        return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
    }

    @PatchMapping("/me/availability")
    public ResponseEntity<?> toggleAvailability(@RequestParam boolean available) {
        String email = getCurrentUserEmail();
        if (email == null) return ResponseEntity.status(403).build();

        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserId(email);
        if (partnerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Delivery partner profile not found.");
        }

        DeliveryPartner partner = partnerOpt.get();
        if (!partner.getApproved()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Partner is not yet approved.");
        }

        partner.setAvailable(available);
        return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
    }

    @PatchMapping("/me/location")
    public ResponseEntity<?> updateLocation(@RequestParam Double latitude, @RequestParam Double longitude) {
        String email = getCurrentUserEmail();
        if (email == null) return ResponseEntity.status(403).build();

        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserId(email);
        if (partnerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        DeliveryPartner partner = partnerOpt.get();
        partner.setLatitude(latitude);
        partner.setLongitude(longitude);
        return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
    }

    // Admin Endpoints
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingPartners() {
        if (!isAdmin()) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(deliveryPartnerRepository.findByApprovedFalse());
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approvePartner(@PathVariable Long id) {
        if (!isAdmin()) return ResponseEntity.status(403).build();
        
        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findById(id);
        if (partnerOpt.isPresent()) {
            DeliveryPartner partner = partnerOpt.get();
            partner.setApproved(true);
            return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
        }
        return ResponseEntity.notFound().build();
    }
}
