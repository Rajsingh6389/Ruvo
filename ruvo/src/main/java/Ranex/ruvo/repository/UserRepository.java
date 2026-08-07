package Ranex.ruvo.repository;
import Ranex.ruvo.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email);
  boolean existsByEmail(String email);
  List<User> findByStatus(AccountStatus status);
  long countByRole(Role role);
}
