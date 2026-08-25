package Ranex.ruvo.repository;

import Ranex.ruvo.model.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    List<DeviceToken> findByUserIdAndUserTypeAndActiveTrue(Long userId, String userType);
    List<DeviceToken> findByUserTypeAndActiveTrue(String userType);
    Optional<DeviceToken> findByToken(String token);
    void deleteByToken(String token);
}
