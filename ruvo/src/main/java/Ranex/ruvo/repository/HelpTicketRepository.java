package Ranex.ruvo.repository;

import Ranex.ruvo.model.HelpTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HelpTicketRepository extends JpaRepository<HelpTicket, Long> {
    List<HelpTicket> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<HelpTicket> findByStatusOrderByCreatedAtDesc(String status);
    List<HelpTicket> findByCategoryOrderByCreatedAtDesc(String category);
    long countByStatus(String status);
}
