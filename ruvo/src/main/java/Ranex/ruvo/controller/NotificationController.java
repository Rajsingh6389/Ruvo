package Ranex.ruvo.controller;

import Ranex.ruvo.model.Notification;
import Ranex.ruvo.repository.NotificationRepository;
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

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
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

    @GetMapping("/mine")
    public ResponseEntity<List<Notification>> getMyNotifications() {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(email));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) return ResponseEntity.notFound().build();
        
        String email = getCurrentUserEmail();
        if (!notification.getUserId().equals(email)) {
            return ResponseEntity.status(403).body("Not authorized to read this notification");
        }

        notification.setIsRead(true);
        return ResponseEntity.ok(notificationRepository.save(notification));
    }
}
