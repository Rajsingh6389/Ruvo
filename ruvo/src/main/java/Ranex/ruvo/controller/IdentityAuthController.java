package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.dto.AuthDtos.AuthToken;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import Ranex.ruvo.security.JwtService;
import Ranex.ruvo.service.IdentityRoleProvisioningService;
import Ranex.ruvo.service.SmsService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Central mobile/OTP identity flow used by all three mobile applications. */
@RestController
@RequestMapping("/api/auth")
public class IdentityAuthController {
    private final AuthIdentityRepository identities;
    private final AuthIdentityRoleRepository roles;
    private final OtpVerificationRepository otps;
    private final JwtService jwt;
    private final SmsService sms;
    private final IdentityRoleProvisioningService provisioning;
    private final PartnerProfileRepository partnerProfiles;

    public IdentityAuthController(AuthIdentityRepository identities, AuthIdentityRoleRepository roles,
                                  OtpVerificationRepository otps, JwtService jwt, SmsService sms,
                                  IdentityRoleProvisioningService provisioning, PartnerProfileRepository partnerProfiles) {
        this.identities = identities; this.roles = roles; this.otps = otps; this.jwt = jwt; this.sms = sms; this.provisioning = provisioning;
        this.partnerProfiles = partnerProfiles;
    }

    @PostMapping("/otp/send")
    public ResponseEntity<ApiResponse<Map<String, Object>>> send(@RequestBody Map<String, String> request) {
        String mobile = mobile(request.get("mobileNumber"));
        if (mobile == null) return ResponseEntity.badRequest().body(ApiResponse.ok("A valid Indian mobile number is required", null));
        Instant now = Instant.now();
        OtpVerification otp = otps.findByMobileNumber(mobile).orElseGet(OtpVerification::new);
        if (otp.getResendCooldown() != null && otp.getResendCooldown().isAfter(now)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.ok("Please wait before requesting another OTP", null));
        }
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        otp.setMobileNumber(mobile); otp.setOtpCode(code); otp.setExpiryTime(now.plus(5, ChronoUnit.MINUTES));
        otp.setAttempts(0); otp.setVerified(false); otp.setResendCooldown(now.plus(60, ChronoUnit.SECONDS));
        otp.setResendCount(otp.getResendCount() + 1); otps.save(otp); sms.sendOtpSms(mobile, code);
        return ResponseEntity.ok(ApiResponse.ok("OTP sent", Map.of("cooldownSeconds", 60)));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<ApiResponse<AuthToken>> verify(@RequestBody Map<String, String> request) {
        String mobile = mobile(request.get("mobileNumber")); String code = request.get("otpCode"); Role role;
        try { role = Role.valueOf(request.getOrDefault("role", "USER")); } catch (Exception e) { return ResponseEntity.badRequest().body(ApiResponse.ok("Invalid application role", null)); }
        if (role == Role.ADMIN || mobile == null || code == null) return ResponseEntity.badRequest().body(ApiResponse.ok("Mobile number, OTP and an app role are required", null));
        OtpVerification otp = otps.findByMobileNumber(mobile).orElse(null);
        if (otp == null || otp.getExpiryTime().isBefore(Instant.now())) return ResponseEntity.status(HttpStatus.GONE).body(ApiResponse.ok("OTP expired. Request a new OTP", null));
        if (otp.isVerified() || !code.equals(otp.getOtpCode())) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Invalid OTP", null));
        otp.setVerified(true); otps.save(otp);
        AuthIdentity identity = identities.findByMobileNumber(mobile).orElseGet(() -> identities.save(AuthIdentity.builder().mobileNumber(mobile).build()));
        if (identity.getStatus() == AccountStatus.BLOCKED) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.ok("Account is suspended", null));
        if (roles.findByIdentityAndRole(identity, role).isEmpty()) roles.save(AuthIdentityRole.builder().identity(identity).role(role).build());
        identity.setLastLogin(Instant.now()); identities.save(identity);
        if (role == Role.DELIVERY_PARTNER) {
            provisioning.provisionDeliveryPartner(identity);
            // Look up the actual verification status after provisioning
            String status = partnerProfiles.findByAuthIdentityId(identity.getId())
                    .map(p -> p.getVerificationStatus().name())
                    .orElse("NEW");
            return ResponseEntity.ok(ApiResponse.ok("Authenticated", new AuthToken(jwt.create(identity, role), "Bearer", identity.getId(), role.name(), status)));
        }
        return ResponseEntity.ok(ApiResponse.ok("Authenticated", new AuthToken(jwt.create(identity, role), "Bearer", identity.getId(), role.name(), null)));
    }

    private String mobile(String value) { if (value == null) return null; String digits = value.replaceAll("[^0-9]", ""); return digits.length() == 10 ? "+91" + digits : digits.matches("91[0-9]{10}") ? "+" + digits : null; }
}
