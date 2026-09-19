package Ranex.ruvo.repository;

import Ranex.ruvo.model.RazorpayStakeholder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RazorpayStakeholderRepository extends JpaRepository<RazorpayStakeholder, Long> {

    List<RazorpayStakeholder> findByLinkedAccountId(Long linkedAccountId);

    Optional<RazorpayStakeholder> findByRazorpayStakeholderId(String razorpayStakeholderId);

    Optional<RazorpayStakeholder> findFirstByLinkedAccountIdOrderByCreatedAtAsc(Long linkedAccountId);
}
