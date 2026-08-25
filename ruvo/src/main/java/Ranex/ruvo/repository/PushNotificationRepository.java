package Ranex.ruvo.repository;

import Ranex.ruvo.model.PushNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PushNotificationRepository extends JpaRepository<PushNotification, Long> {
    List<PushNotification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<PushNotification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);
}
