package Ranex.ruvo.repository;

import Ranex.ruvo.model.PartnerVerification;
import Ranex.ruvo.model.PartnerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PartnerVerificationRepository extends JpaRepository<PartnerVerification, Long> {
    Optional<PartnerVerification> findByPartnerProfile(PartnerProfile profile);
    Optional<PartnerVerification> findByPartnerProfileUserId(Long userId);
}
