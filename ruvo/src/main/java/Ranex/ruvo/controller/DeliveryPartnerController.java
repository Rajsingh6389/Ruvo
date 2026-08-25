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
    private final Ranex.ruvo.repository.UserRepository userRepository;

    public DeliveryPartnerController(DeliveryPartnerRepository deliveryPartnerRepository, Ranex.ruvo.repository.UserRepository userRepository) {
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.userRepository = userRepository;
    }

    private String getCurrentUserMobile() {
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
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(403).build();

        Optional<DeliveryPartner> existing = deliveryPartnerRepository.findByUserId(mobile);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("User is already registered as a delivery partner.");
        }

        partner.setId(null);
        partner.setUserId(mobile);
        partner.setApproved(false);
        partner.setAvailable(false);
        partner.setActive(true);

        return ResponseEntity.ok(deliveryPartnerRepository.save(partner));
    }

    @PatchMapping("/me/availability")
    public ResponseEntity<?> toggleAvailability(@RequestParam boolean available) {
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(403).build();

        if (userRepository != null) {
            Optional<Ranex.ruvo.model.User> uOpt = userRepository.findByMobileNumberFlexible(mobile);
            if (uOpt.isPresent()) {
                Ranex.ruvo.model.User u = uOpt.get();
                u.setIsAvailable(available);
                userRepository.save(u);
            }
        }

        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserId(mobile)
                .or(() -> deliveryPartnerRepository.findByPhone(mobile));

        if (partnerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Delivery partner profile not found.");
        }

        DeliveryPartner partner = partnerOpt.get();
        if (!Boolean.TRUE.equals(partner.getApproved())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Partner is not yet approved.");
        }

        partner.setAvailable(available);
        if (available) partner.setLastActiveAt(java.time.Instant.now());
        deliveryPartnerRepository.save(partner);
        System.out.println("🟢 [DeliveryPartnerController] Partner #" + partner.getId() + " (" + partner.getName() + ") toggled availability=" + available);
        return ResponseEntity.ok(partner);
    }

    @PatchMapping("/me/location")
    public ResponseEntity<?> updateLocation(@RequestParam Double latitude, @RequestParam Double longitude) {
        String mobile = getCurrentUserMobile();
        if (mobile == null) return ResponseEntity.status(403).build();

        Optional<DeliveryPartner> partnerOpt = deliveryPartnerRepository.findByUserId(mobile);
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
