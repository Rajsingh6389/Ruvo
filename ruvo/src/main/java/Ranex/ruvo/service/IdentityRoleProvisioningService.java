package Ranex.ruvo.service;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.UUID;

/** Creates legacy-compatible operational records only after central role enrollment. */
@Service
public class IdentityRoleProvisioningService {
    private final PartnerAccountRepository accounts;
    private final UserRepository users;
    private final PartnerProfileRepository profiles;
    private final DeliveryPartnerRepository partners;
    private final PasswordEncoder encoder;

    public IdentityRoleProvisioningService(PartnerAccountRepository accounts, UserRepository users,
                                           PartnerProfileRepository profiles, DeliveryPartnerRepository partners,
                                           PasswordEncoder encoder) {
        this.accounts = accounts; this.users = users; this.profiles = profiles; this.partners = partners; this.encoder = encoder;
    }

    public void provisionDeliveryPartner(AuthIdentity identity) {
        PartnerAccount account = accounts.findByAuthIdentityId(identity.getId()).orElseGet(() -> {
            User securityUser = users.save(User.builder().name("New Partner")
                    .email("partner-" + UUID.randomUUID() + "@ruvo.internal")
                    .password(encoder.encode(UUID.randomUUID().toString()))
                    .role(Role.DELIVERY_PARTNER).status(AccountStatus.PENDING).isAvailable(false).build());
            return accounts.save(PartnerAccount.builder().mobileNumber(identity.getMobileNumber())
                    .authIdentityId(identity.getId()).securityUser(securityUser).build());
        });
        User securityUser = account.getSecurityUser();
        PartnerProfile profile = profiles.findByAuthIdentityId(identity.getId()).orElseGet(() ->
                profiles.findByUser(securityUser).orElseGet(() -> profiles.save(PartnerProfile.builder()
                        .user(securityUser).authIdentityId(identity.getId()).verificationStatus(VerificationStatus.NEW).build())));
        if (profile.getAuthIdentityId() == null) { profile.setAuthIdentityId(identity.getId()); profiles.save(profile); }
        DeliveryPartner partner = partners.findByAuthIdentityId(identity.getId()).orElseGet(() ->
                partners.findByPhone(identity.getMobileNumber()).orElseGet(() -> partners.save(DeliveryPartner.builder()
                        .userId(securityUser.getEmail()).authIdentityId(identity.getId()).name(securityUser.getName())
                        .phone(identity.getMobileNumber()).active(true).available(false).approved(false).build())));
        if (partner.getAuthIdentityId() == null) { partner.setAuthIdentityId(identity.getId()); partners.save(partner); }
    }
}
