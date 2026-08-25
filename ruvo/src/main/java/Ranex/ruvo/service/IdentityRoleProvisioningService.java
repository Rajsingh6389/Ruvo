package Ranex.ruvo.service;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    /**
     * Adopts whatever records a legacy partner sign-in already created for this mobile
     * number instead of inserting a second copy. Matching on authIdentityId alone missed
     * those rows, and the follow-up insert then broke the unique indexes on
     * users.mobile_number, partner_accounts.mobile_number and delivery_partners.phone.
     */
    @Transactional
    public void provisionDeliveryPartner(AuthIdentity identity) {
        String mobile = identity.getMobileNumber();

        PartnerAccount account = accounts.findByAuthIdentityId(identity.getId())
                .or(() -> accounts.findByMobileNumber(mobile))
                .orElse(null);

        if (account == null) {
            // The person may already hold a customer or legacy-partner user row, and
            // users.mobile_number is unique, so that row has to be reused rather than
            // duplicated. Its role stays untouched: partner requests authorise off the
            // identity claim in the token, not off this row.
            User principal = users.findByMobileNumberFlexible(mobile).orElseGet(() ->
                    users.save(User.builder().name("New Partner")
                            .mobileNumber(mobile)
                            .password(encoder.encode(UUID.randomUUID().toString()))
                            .role(Role.DELIVERY_PARTNER).status(AccountStatus.PENDING).isAvailable(false).build()));
            // A partner account may already be bound to that user under a different number format.
            account = accounts.findBySecurityUser(principal).orElseGet(() ->
                    accounts.save(PartnerAccount.builder().mobileNumber(mobile)
                            .authIdentityId(identity.getId()).securityUser(principal).build()));
        }
        if (account.getAuthIdentityId() == null) {
            account.setAuthIdentityId(identity.getId());
            account = accounts.save(account);
        }

        final User securityUser = account.getSecurityUser();
        PartnerProfile profile = profiles.findByAuthIdentityId(identity.getId())
                .or(() -> profiles.findByUser(securityUser))
                .orElseGet(() -> profiles.save(PartnerProfile.builder()
                        .user(securityUser).authIdentityId(identity.getId())
                        .verificationStatus(VerificationStatus.NEW).build()));
        if (profile.getAuthIdentityId() == null) { profile.setAuthIdentityId(identity.getId()); profiles.save(profile); }

        DeliveryPartner partner = partners.findByAuthIdentityId(identity.getId())
                .or(() -> partners.findByPhone(mobile))
                .or(() -> partners.findByUserId(securityUser.getMobileNumber()))
                .orElseGet(() -> partners.save(DeliveryPartner.builder()
                        .userId(securityUser.getMobileNumber()).authIdentityId(identity.getId())
                        .name(securityUser.getName()).phone(mobile)
                        .active(true).available(false).approved(true).build()));
        boolean partnerChanged = false;
        // PartnerController resolves riders by authIdentityId, so an adopted legacy row must be linked.
        if (partner.getAuthIdentityId() == null) { partner.setAuthIdentityId(identity.getId()); partnerChanged = true; }
        if (!Boolean.TRUE.equals(partner.getApproved())) { partner.setApproved(true); partnerChanged = true; }
        if (partnerChanged) partners.save(partner);
    }
}
