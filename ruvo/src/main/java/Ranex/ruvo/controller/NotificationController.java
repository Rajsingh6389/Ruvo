package Ranex.ruvo.controller;

import Ranex.ruvo.model.PushNotification;
import Ranex.ruvo.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
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
     * Register device token for push notifications (Supports both /register-token and /device-token)
     */
    @PostMapping(value = {"/register-token", "/device-token"})
    public ResponseEntity<?> registerToken(@RequestBody Map<String, Object> request) {
        try {
            Object rawUserId = request.get("userId");
            if (rawUserId == null) {
                rawUserId = request.get("id");
            }
            if (rawUserId == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "userId is required"
                ));
            }
            String userId = String.valueOf(rawUserId).trim();

            String userType = (String) request.get("userType");
            if (userType == null || userType.isBlank()) {
                userType = (String) request.get("appType");
            }
            if (userType == null || userType.isBlank()) {
                userType = "CUSTOMER";
            }

            String token = (String) request.get("token");
            if (token == null || token.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "token is required"
                ));
            }

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
     * Unregister device token (Supports /unregister-token and DELETE /device-token)
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

    @DeleteMapping("/device-token")
    public ResponseEntity<?> deleteDeviceToken(@RequestParam(required = false) String token,
                                               @RequestBody(required = false) Map<String, String> body) {
        try {
            String tok = token;
            if (tok == null && body != null) {
                tok = body.get("token");
            }
            if (tok != null) {
                notificationService.unregisterDeviceToken(tok);
            }
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
     * Get user notifications (Supports /mine and GET /api/notifications)
     */
    @GetMapping({"/mine", ""})
    public ResponseEntity<?> getUserNotifications(@RequestParam(required = false) String userId,
                                                 @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String effectiveUserId = (userId != null && !userId.isBlank()) ? userId : headerUserId;
            if (effectiveUserId == null || effectiveUserId.isBlank()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            List<PushNotification> notifications = notificationService.getUserNotifications(effectiveUserId);
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
    public ResponseEntity<?> getUnreadCount(@RequestParam(required = false) String userId,
                                            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String effectiveUserId = (userId != null && !userId.isBlank()) ? userId : headerUserId;
            if (effectiveUserId == null || effectiveUserId.isBlank()) {
                return ResponseEntity.ok(Map.of("success", true, "count", 0));
            }

            long count = notificationService.getUnreadCount(effectiveUserId);
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
    @RequestMapping(value = "/{notificationId}/read", method = {RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH})
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
    @RequestMapping(value = "/mark-all-read", method = {RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<?> markAllAsRead(@RequestParam(required = false) String userId,
                                           @RequestBody(required = false) Map<String, Object> body,
                                           @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        try {
            String effectiveUserId = (userId != null && !userId.isBlank()) ? userId : null;
            if (effectiveUserId == null && body != null && body.containsKey("userId")) {
                effectiveUserId = String.valueOf(body.get("userId"));
            }
            if (effectiveUserId == null) {
                effectiveUserId = headerUserId;
            }

            if (effectiveUserId != null && !effectiveUserId.isBlank()) {
                notificationService.markAllAsRead(effectiveUserId);
            }

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
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", n.getId());
        map.put("userId", n.getUserId() != null ? n.getUserId() : "");
        map.put("title", n.getTitle() != null ? n.getTitle() : "");
        map.put("body", n.getBody() != null ? n.getBody() : "");
        map.put("type", n.getType() != null ? n.getType() : "");
        map.put("referenceType", n.getReferenceType() != null ? n.getReferenceType() : "");
        map.put("referenceId", n.getReferenceId() != null ? n.getReferenceId() : 0);
        map.put("orderId", n.getOrderId() != null ? n.getOrderId() : 0);
        map.put("data", n.getData() != null ? n.getData() : "{}");
        map.put("isRead", Boolean.TRUE.equals(n.getIsRead()));
        map.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : "");
        map.put("readAt", n.getReadAt() != null ? n.getReadAt().toString() : "");
        return map;
    }
}
