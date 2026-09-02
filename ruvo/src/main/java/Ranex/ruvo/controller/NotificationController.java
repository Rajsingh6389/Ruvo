package Ranex.ruvo.controller;

import Ranex.ruvo.model.PushNotification;
import Ranex.ruvo.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Register device token for push notifications
     */
    @PostMapping("/register-token")
    public ResponseEntity<?> registerToken(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.parseLong(request.get("userId").toString());
            String userType = (String) request.get("userType");
            String token = (String) request.get("token");
            String platform = (String) request.getOrDefault("platform", "ANDROID");
            String appVersion = (String) request.getOrDefault("appVersion", "1.0");

            notificationService.registerDeviceToken(userId, userType, token, platform, appVersion);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Device token registered successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to register token: " + e.getMessage()
            ));
        }
    }

    /**
     * Unregister device token
     */
    @PostMapping("/unregister-token")
    public ResponseEntity<?> unregisterToken(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            notificationService.unregisterDeviceToken(token);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Device token unregistered successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to unregister token: " + e.getMessage()
            ));
        }
    }

    /**
     * Get user notifications
     */
    @GetMapping("/mine")
    public ResponseEntity<?> getUserNotifications(@RequestParam Long userId) {
        try {
            List<PushNotification> notifications = notificationService.getUserNotifications(userId);
            List<Map<String, Object>> notifList = notifications.stream()
                .map(this::mapNotification)
                .toList();

            return ResponseEntity.ok(notifList);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch notifications: " + e.getMessage()
            ));
        }
    }

    /**
     * Get unread notification count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@RequestParam Long userId) {
        try {
            long count = notificationService.getUnreadCount(userId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", count
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch unread count: " + e.getMessage()
            ));
        }
    }

    /**
     * Mark notification as read
     */
    @PostMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId) {
        try {
            notificationService.markAsRead(notificationId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification marked as read"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to mark as read: " + e.getMessage()
            ));
        }
    }

    /**
     * Mark all notifications as read
     */
    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(@RequestParam Long userId) {
        try {
            notificationService.markAllAsRead(userId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All notifications marked as read"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to mark all as read: " + e.getMessage()
            ));
        }
    }

    private Map<String, Object> mapNotification(PushNotification n) {
        return Map.of(
            "id", n.getId(),
            "userId", n.getUserId(),
            "title", n.getTitle(),
            "body", n.getBody(),
            "type", n.getType(),
            "referenceType", n.getReferenceType() != null ? n.getReferenceType() : "",
            "referenceId", n.getReferenceId() != null ? n.getReferenceId() : 0,
            "isRead", n.getIsRead(),
            "createdAt", n.getCreatedAt().toString(),
            "readAt", n.getReadAt() != null ? n.getReadAt().toString() : ""
        );
    }
}
