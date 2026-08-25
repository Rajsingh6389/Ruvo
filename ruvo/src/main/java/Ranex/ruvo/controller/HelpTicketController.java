package Ranex.ruvo.controller;

import Ranex.ruvo.model.HelpTicket;
import Ranex.ruvo.service.HelpTicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/help")
@CrossOrigin(origins = "*")
public class HelpTicketController {

    private final HelpTicketService ticketService;

    public HelpTicketController(HelpTicketService ticketService) {
        this.ticketService = ticketService;
    }

    /**
     * Create a new help ticket
     */
    @PostMapping
    public ResponseEntity<?> createTicket(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.parseLong(request.get("userId").toString());
            String userType = (String) request.getOrDefault("userType", "USER");
            String category = (String) request.get("category");
            String subject = (String) request.get("subject");
            String description = (String) request.get("description");
            String priority = (String) request.getOrDefault("priority", "MEDIUM");

            if (category == null || category.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Category is required"
                ));
            }

            if (subject == null || subject.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Subject is required"
                ));
            }

            if (description == null || description.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Description is required"
                ));
            }

            HelpTicket ticket = ticketService.createTicket(userId, userType, category, subject, description, priority);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Help ticket created successfully",
                "ticketId", ticket.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to create ticket: " + e.getMessage()
            ));
        }
    }

    /**
     * Get user's tickets
     */
    @GetMapping("/my-tickets")
    public ResponseEntity<?> getUserTickets(@RequestParam Long userId) {
        try {
            List<HelpTicket> tickets = ticketService.getUserTickets(userId);
            List<Map<String, Object>> ticketList = tickets.stream()
                .map(this::mapTicket)
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "tickets", ticketList
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch tickets: " + e.getMessage()
            ));
        }
    }

    /**
     * Get ticket details
     */
    @GetMapping("/{ticketId}")
    public ResponseEntity<?> getTicket(@PathVariable Long ticketId) {
        try {
            HelpTicket ticket = ticketService.getTicket(ticketId);
            if (ticket == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "ticket", mapTicket(ticket)
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch ticket: " + e.getMessage()
            ));
        }
    }

    /**
     * Admin: Get all open tickets
     */
    @GetMapping("/open")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getOpenTickets() {
        try {
            List<HelpTicket> tickets = ticketService.getOpenTickets();
            List<Map<String, Object>> ticketList = tickets.stream()
                .map(this::mapTicket)
                .toList();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "tickets", ticketList,
                "count", ticketList.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Failed to fetch open tickets: " + e.getMessage()
            ));
        }
    }

    /**
     * Admin: Respond to a ticket
     */
    @PostMapping("/{ticketId}/respond")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> respondToTicket(@PathVariable Long ticketId, @RequestBody Map<String, String> request) {
        try {
            String response = request.get("response");
            String status = request.getOrDefault("status", "IN_PROGRESS");

            if (response == null || response.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Response is required"
                ));
            }

            HelpTicket ticket = ticketService.respondToTicket(ticketId, response, status);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Response sent successfully",
                "ticket", mapTicket(ticket)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Failed to respond to ticket: " + e.getMessage()
            ));
        }
    }

    private Map<String, Object> mapTicket(HelpTicket ticket) {
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", ticket.getId());
        map.put("userId", ticket.getUserId());
        map.put("userType", ticket.getUserType());
        map.put("category", ticket.getCategory());
        map.put("subject", ticket.getSubject());
        map.put("description", ticket.getDescription());
        map.put("priority", ticket.getPriority());
        map.put("status", ticket.getStatus());
        map.put("adminResponse", ticket.getAdminResponse() != null ? ticket.getAdminResponse() : "");
        map.put("createdAt", ticket.getCreatedAt().toString());
        map.put("resolvedAt", ticket.getResolvedAt() != null ? ticket.getResolvedAt().toString() : "");
        return map;
    }
}
