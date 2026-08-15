package Ranex.ruvo.repository;

import Ranex.ruvo.model.PartnerProfile;
import Ranex.ruvo.model.User;
import Ranex.ruvo.model.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PartnerProfileRepository extends JpaRepository<PartnerProfile, Long> {
    Optional<PartnerProfile> findByUser(User user);
    Optional<PartnerProfile> findByUserId(Long userId);
    List<PartnerProfile> findByVerificationStatus(VerificationStatus status);
}
