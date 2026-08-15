package Ranex.ruvo.repository;

import Ranex.ruvo.model.PartnerVehicle;
import Ranex.ruvo.model.PartnerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PartnerVehicleRepository extends JpaRepository<PartnerVehicle, Long> {
    Optional<PartnerVehicle> findByPartnerProfile(PartnerProfile profile);
    Optional<PartnerVehicle> findByPartnerProfileUserId(Long userId);
}
