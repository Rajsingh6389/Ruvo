package Ranex.ruvo.service;

import Ranex.ruvo.repository.DeviceTokenRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class ExpoPushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushNotificationService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final DeviceTokenRepository deviceTokenRepository;

    @Value("${expo.push.access-token:}")
    private String expoAccessToken;

    public ExpoPushNotificationService(RestTemplate restTemplate,
                                       ObjectMapper objectMapper,
                                       DeviceTokenRepository deviceTokenRepository) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.deviceTokenRepository = deviceTokenRepository;
    }

    public record PushMessage(
            String to,
            String title,
            String body,
            Map<String, Object> data,
            String sound,
            String priority,     // "default" | "normal" | "high"
            String channelId,    // Android channel
            Integer badge
    ) {}

    /**
     * Send push notification to a single Expo token
     */
    public boolean sendPushNotification(String token, String title, String body,
                                        Map<String, Object> data, String channelId, String priority) {
        if (token == null || token.isBlank()) {
            return false;
        }

        if (!isValidExpoPushToken(token)) {
            log.warn("Invalid Expo Push Token format: {}", token);
            return false;
        }

        PushMessage message = new PushMessage(
                token,
                title,
                body,
                data != null ? data : Collections.emptyMap(),
                "default",
                priority != null ? priority : "high",
                channelId,
                1
        );

        return sendBatchPushNotifications(List.of(message));
    }

    /**
     * Send batch push notifications to Expo Push Service
     */
    public boolean sendBatchPushNotifications(List<PushMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return false;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (expoAccessToken != null && !expoAccessToken.isBlank()) {
                headers.set("Authorization", "Bearer " + expoAccessToken.trim());
            }

            HttpEntity<List<PushMessage>> entity = new HttpEntity<>(messages, headers);
            log.info("Dispatching {} push notification(s) to Expo Push Service...", messages.size());

            ResponseEntity<String> response = restTemplate.exchange(
                    EXPO_PUSH_URL, HttpMethod.POST, entity, String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                parseExpoResponse(response.getBody(), messages);
                return true;
            } else {
                log.warn("Expo Push API returned non-2xx status: {}", response.getStatusCode());
                return false;
            }

        } catch (Exception e) {
            log.error("Failed to deliver push notifications through Expo Push API: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Parse Expo response tickets and automatically handle DeviceNotRegistered
     */
    private void parseExpoResponse(String responseBody, List<PushMessage> originalMessages) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode dataArray = root.get("data");
            if (dataArray != null && dataArray.isArray()) {
                for (int i = 0; i < dataArray.size(); i++) {
                    JsonNode ticket = dataArray.get(i);
                    String status = ticket.path("status").asText();
                    if ("error".equalsIgnoreCase(status)) {
                        String message = ticket.path("message").asText();
                        String errorType = ticket.path("details").path("error").asText();
                        log.warn("Expo ticket error for recipient {}: {} (details: {})",
                                i < originalMessages.size() ? originalMessages.get(i).to() : "unknown",
                                message, errorType);

                        if ("DeviceNotRegistered".equalsIgnoreCase(errorType) && i < originalMessages.size()) {
                            String deadToken = originalMessages.get(i).to();
                            log.info("Deactivating dead Expo Push Token: {}", deadToken);
                            deviceTokenRepository.findByToken(deadToken).ifPresent(dt -> {
                                dt.setActive(false);
                                deviceTokenRepository.save(dt);
                            });
                        }
                    } else {
                        log.info("Expo Push Ticket OK: ID={}", ticket.path("id").asText());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse Expo response tickets: {}", e.getMessage());
        }
    }

    public static boolean isValidExpoPushToken(String token) {
        if (token == null) return false;
        String trimmed = token.trim();
        return trimmed.startsWith("ExponentPushToken[") || trimmed.startsWith("ExpoPushToken[") || trimmed.startsWith("FCM_");
    }
}
