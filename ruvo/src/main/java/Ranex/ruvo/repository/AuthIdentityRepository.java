package Ranex.ruvo.repository;

import Ranex.ruvo.model.AuthIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentity, Long> {
    Optional<AuthIdentity> findByMobileNumber(String mobileNumber);

    default Optional<AuthIdentity> findByMobileNumberFlexible(String mobileNumber) {
        if (mobileNumber == null || mobileNumber.isBlank()) return Optional.empty();

        Optional<AuthIdentity> opt = findByMobileNumber(mobileNumber);
        if (opt.isPresent()) return opt;

        String cleanDigits = mobileNumber.replaceAll("[^0-9]", "");

        if (cleanDigits.length() == 10) {
            opt = findByMobileNumber("+91" + cleanDigits);
            if (opt.isPresent()) return opt;

            opt = findByMobileNumber(cleanDigits);
            if (opt.isPresent()) return opt;
        }

        if (cleanDigits.length() == 12 && cleanDigits.startsWith("91")) {
            String bare10 = cleanDigits.substring(2);
            opt = findByMobileNumber(bare10);
            if (opt.isPresent()) return opt;

            opt = findByMobileNumber("+" + cleanDigits);
            if (opt.isPresent()) return opt;

            opt = findByMobileNumber(cleanDigits);
            if (opt.isPresent()) return opt;
        }

        if (mobileNumber.startsWith("+91")) {
            String rawWithoutPlus = mobileNumber.substring(3);
            opt = findByMobileNumber(rawWithoutPlus);
            if (opt.isPresent()) return opt;
        }

        return Optional.empty();
    }
}

