package Ranex.ruvo.repository;

import Ranex.ruvo.model.PushNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface PushNotificationRepository extends JpaRepository<PushNotification, Long> {
    List<PushNotification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<PushNotification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(String userId);
    long countByUserIdAndIsReadFalse(String userId);

    @Query("SELECT p FROM PushNotification p WHERE (p.userId = :userId OR p.userId LIKE CONCAT('%', :userId, '%')) ORDER BY p.createdAt DESC")
    List<PushNotification> findByUserIdFlexible(@Param("userId") String userId);

    @Query("SELECT COUNT(p) FROM PushNotification p WHERE (p.userId = :userId OR p.userId LIKE CONCAT('%', :userId, '%')) AND p.isRead = false")
    long countUnreadByUserIdFlexible(@Param("userId") String userId);
}
