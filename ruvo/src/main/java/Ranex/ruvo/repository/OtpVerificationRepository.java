package Ranex.ruvo.repository;

import Ranex.ruvo.model.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findByMobileNumber(String mobileNumber);
}
