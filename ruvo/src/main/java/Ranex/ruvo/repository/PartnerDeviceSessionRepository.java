package Ranex.ruvo.repository;

import Ranex.ruvo.model.PartnerDeviceSession;
import Ranex.ruvo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PartnerDeviceSessionRepository extends JpaRepository<PartnerDeviceSession, Long> {
    Optional<PartnerDeviceSession> findBySessionId(String sessionId);
    List<PartnerDeviceSession> findByUser(User user);
    List<PartnerDeviceSession> findByUserAndRevokedFalse(User user);
}
