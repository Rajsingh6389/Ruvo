package Ranex.ruvo.repository;

import Ranex.ruvo.model.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    List<DeviceToken> findByUserIdAndAppTypeAndActiveTrue(String userId, String appType);
    
    @Query("SELECT d FROM DeviceToken d WHERE (d.userId = :userId OR d.userId LIKE CONCAT('%', :userId, '%')) AND (d.appType = :appType OR :appType IS NULL) AND d.active = true")
    List<DeviceToken> findActiveTokensForUserFlexible(@Param("userId") String userId, @Param("appType") String appType);

    List<DeviceToken> findByAppTypeAndActiveTrue(String appType);
    Optional<DeviceToken> findByToken(String token);
    void deleteByToken(String token);
}
