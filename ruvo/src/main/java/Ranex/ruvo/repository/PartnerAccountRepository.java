package Ranex.ruvo.repository;

import Ranex.ruvo.model.PartnerAccount;
import Ranex.ruvo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PartnerAccountRepository extends JpaRepository<PartnerAccount, Long> {
    Optional<PartnerAccount> findByMobileNumber(String mobileNumber);
    Optional<PartnerAccount> findByAuthIdentityId(Long authIdentityId);
    Optional<PartnerAccount> findBySecurityUser(User securityUser);
}
