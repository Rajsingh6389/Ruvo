package Ranex.ruvo.service;

import Ranex.ruvo.model.HelpTicket;
import Ranex.ruvo.repository.HelpTicketRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class HelpTicketService {

    private final HelpTicketRepository ticketRepository;

    public HelpTicketService(HelpTicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    /**
     * Create a new help ticket
     */
    public HelpTicket createTicket(Long userId, String userType, String category, String subject, 
                                  String description, String priority) {
        HelpTicket ticket = HelpTicket.builder()
            .userId(userId)
            .userType(userType)
            .category(category)
            .subject(subject)
            .description(description)
            .priority(priority != null ? priority : "MEDIUM")
            .status("OPEN")
            .build();

        return ticketRepository.save(ticket);
    }

    /**
     * Get user's tickets
     */
    public List<HelpTicket> getUserTickets(Long userId) {
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get all open tickets (admin)
     */
    public List<HelpTicket> getOpenTickets() {
        return ticketRepository.findByStatusOrderByCreatedAtDesc("OPEN");
    }

    /**
     * Get ticket by ID
     */
    public HelpTicket getTicket(Long ticketId) {
        return ticketRepository.findById(ticketId).orElse(null);
    }

    /**
     * Respond to a ticket (admin)
     */
    public HelpTicket respondToTicket(Long ticketId, String response, String status) {
        HelpTicket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));

        ticket.setAdminResponse(response);
        ticket.setStatus(status != null ? status : "IN_PROGRESS");
        ticket.setUpdatedAt(Instant.now());

        if ("RESOLVED".equals(status) || "CLOSED".equals(status)) {
            ticket.setResolvedAt(Instant.now());
        }

        return ticketRepository.save(ticket);
    }

    /**
     * Get ticket statistics
     */
    public long getOpenTicketCount() {
        return ticketRepository.countByStatus("OPEN");
    }
}
