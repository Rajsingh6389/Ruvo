package Ranex.ruvo.controller;

import Ranex.ruvo.model.DeliveryPartner;
import Ranex.ruvo.model.Notification;
import Ranex.ruvo.model.User;
import Ranex.ruvo.repository.DeliveryPartnerRepository;
import Ranex.ruvo.repository.NotificationRepository;
import Ranex.ruvo.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;

    public NotificationController(NotificationRepository notificationRepository,
                                  UserRepository userRepository,
                                  DeliveryPartnerRepository deliveryPartnerRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
    }

    private String getCurrentUserPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            return ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        return principal.toString();
    }

    /**
     * Returns notifications for the current user.
     *
     * Handles three principal formats:
     * 1. "identity:<id>" — identity-system delivery partners (new registration flow)
     * 2. Numeric user ID email — legacy email-based users
     * 3. Mobile number — delivery partners registered by phone
     */
    @GetMapping("/mine")
    public ResponseEntity<List<Notification>> getMyNotifications() {
        String principal = getCurrentUserPrincipal();
        if (principal == null) {
            return ResponseEntity.status(403).build();
        }

        // Format 1: identity:<id> — delivery partner via central auth
        if (principal.startsWith("identity:")) {
            try {
                long identityId = Long.parseLong(principal.substring("identity:".length()));
                DeliveryPartner partner = deliveryPartnerRepository.findByAuthIdentityId(identityId).orElse(null);
                if (partner != null) {
                    List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(partner.getUserId());
                    return ResponseEntity.ok(notifs);
                }
            } catch (NumberFormatException ignored) { }
            return ResponseEntity.ok(List.of());
        }

        // Format 2/3: try to resolve as a regular User (email) and get numeric ID
        User user = userRepository.findByEmail(principal).orElse(null);
        if (user != null) {
            String numericUserId = String.valueOf(user.getId());
            List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(numericUserId);
            if (!notifs.isEmpty()) {
                return ResponseEntity.ok(notifs);
            }
        }

        // Fallback: query directly by principal (mobile number stored as userId for partners)
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(principal));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) return ResponseEntity.notFound().build();

        String principal = getCurrentUserPrincipal();
        if (principal == null) return ResponseEntity.status(403).build();

        boolean authorized = false;

        // Check identity-based partner
        if (principal.startsWith("identity:")) {
            try {
                long identityId = Long.parseLong(principal.substring("identity:".length()));
                DeliveryPartner partner = deliveryPartnerRepository.findByAuthIdentityId(identityId).orElse(null);
                if (partner != null && notification.getUserId().equals(partner.getUserId())) {
                    authorized = true;
                }
            } catch (NumberFormatException ignored) { }
        } else {
            // Check by email → numeric ID
            User user = userRepository.findByEmail(principal).orElse(null);
            String numericUserId = (user != null) ? String.valueOf(user.getId()) : null;
            authorized = notification.getUserId().equals(principal)
                    || (numericUserId != null && notification.getUserId().equals(numericUserId));
        }

        if (!authorized) {
            return ResponseEntity.status(403).body("Not authorized to read this notification");
        }

        notification.setIsRead(true);
        return ResponseEntity.ok(notificationRepository.save(notification));
    }
}
