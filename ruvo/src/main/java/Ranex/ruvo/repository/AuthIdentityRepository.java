package Ranex.ruvo.repository;

import Ranex.ruvo.model.AuthIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentity, Long> {
    Optional<AuthIdentity> findByMobileNumber(String mobileNumber);
}
