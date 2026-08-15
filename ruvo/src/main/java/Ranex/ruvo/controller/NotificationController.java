package Ranex.ruvo.controller;

import Ranex.ruvo.model.Notification;
import Ranex.ruvo.model.User;
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

    public NotificationController(NotificationRepository notificationRepository,
                                  UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
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

    /**
     * Returns notifications for the current user.
     * Notifications are stored with userId = user's numeric ID (Long as String).
     * We resolve the numeric ID from the JWT email, then query by that ID.
     */
    @GetMapping("/mine")
    public ResponseEntity<List<Notification>> getMyNotifications() {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(403).build();
        }

        // Try to resolve the numeric user ID from email
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            String numericUserId = String.valueOf(user.getId());
            // Return notifications keyed by numeric userId (as stored by NotificationService)
            List<Notification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(numericUserId);
            if (!notifs.isEmpty()) {
                return ResponseEntity.ok(notifs);
            }
        }

        // Fallback: query by email string (for backwards compatibility)
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(email));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) return ResponseEntity.notFound().build();

        String email = getCurrentUserEmail();
        if (email == null) return ResponseEntity.status(403).build();

        // Allow mark-read if either the email or numeric ID matches
        User user = userRepository.findByEmail(email).orElse(null);
        String numericUserId = (user != null) ? String.valueOf(user.getId()) : null;
        boolean authorized = notification.getUserId().equals(email)
                || (numericUserId != null && notification.getUserId().equals(numericUserId));

        if (!authorized) {
            return ResponseEntity.status(403).body("Not authorized to read this notification");
        }

        notification.setIsRead(true);
        return ResponseEntity.ok(notificationRepository.save(notification));
    }
}
