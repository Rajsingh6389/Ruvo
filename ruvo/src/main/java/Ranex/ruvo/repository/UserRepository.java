package Ranex.ruvo.repository;
import Ranex.ruvo.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByMobileNumber(String mobileNumber);
  boolean existsByMobileNumber(String mobileNumber);
  List<User> findByStatus(AccountStatus status);
  long countByRole(Role role);

  default Optional<User> findByMobileNumberFlexible(String mobileNumber) {
    if (mobileNumber == null || mobileNumber.isBlank()) return Optional.empty();

    Optional<User> uOpt = findByMobileNumber(mobileNumber);
    if (uOpt.isPresent()) return uOpt;

    String cleanDigits = mobileNumber.replaceAll("[^0-9]", "");

    if (cleanDigits.length() == 10) {
      uOpt = findByMobileNumber("+91" + cleanDigits);
      if (uOpt.isPresent()) return uOpt;

      uOpt = findByMobileNumber(cleanDigits);
      if (uOpt.isPresent()) return uOpt;
    }

    if (cleanDigits.length() == 12 && cleanDigits.startsWith("91")) {
      String bare10 = cleanDigits.substring(2);
      uOpt = findByMobileNumber(bare10);
      if (uOpt.isPresent()) return uOpt;

      uOpt = findByMobileNumber("+" + cleanDigits);
      if (uOpt.isPresent()) return uOpt;

      uOpt = findByMobileNumber(cleanDigits);
      if (uOpt.isPresent()) return uOpt;
    }

    if (mobileNumber.startsWith("+91")) {
      String rawWithoutPlus = mobileNumber.substring(3);
      uOpt = findByMobileNumber(rawWithoutPlus);
      if (uOpt.isPresent()) return uOpt;
    }

    return Optional.empty();
  }
}
