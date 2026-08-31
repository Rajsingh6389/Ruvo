package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import Ranex.ruvo.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/partner/auth")
@Transactional
public class PartnerAuthController {

    private final UserRepository users;
    private final OtpVerificationRepository otps;
    private final PartnerProfileRepository profiles;
    private final PartnerAccountRepository partnerAccounts;
    private final DeliveryPartnerRepository deliveryPartners;
    private final PartnerDeviceSessionRepository sessions;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final PartnerVerificationRepository verifications;
    private final JwtService jwt;
    private final Ranex.ruvo.service.SmsService smsService;

    public PartnerAuthController(UserRepository u, OtpVerificationRepository o, PartnerProfileRepository pr,
                                 PartnerVerificationRepository vr,
                                 PartnerAccountRepository pa, DeliveryPartnerRepository dp,
                                 PartnerDeviceSessionRepository s, RefreshTokenRepository r,
                                 PasswordEncoder e, JwtService j, Ranex.ruvo.service.SmsService sms) {
        this.users = u;
        this.otps = o;
        this.profiles = pr;
        this.verifications = vr;
        this.partnerAccounts = pa;
        this.deliveryPartners = dp;
        this.sessions = s;
        this.refreshTokens = r;
        this.encoder = e;
        this.jwt = j;
        this.smsService = sms;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendOtp(@RequestBody Map<String, String> request) {
        String rawMobile = request.get("mobileNumber");
        if (rawMobile == null || rawMobile.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Mobile number is required", null));
        }

        String mobile = formatMobile(rawMobile);
        if (!mobile.matches("^\\+91[0-9]{10}$")) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Invalid Indian mobile number format. Use 10 digits or prefix with +91", null));
        }

        Optional<OtpVerification> optOtp = otps.findByMobileNumber(mobile);
        OtpVerification verification;
        Instant now = Instant.now();
        String generatedOtp = String.valueOf(100000 + new Random().nextInt(900000));

        if (optOtp.isPresent()) {
            verification = optOtp.get();
            if (verification.getResendCooldown() != null && verification.getResendCooldown().isAfter(now)) {
                long secondsLeft = ChronoUnit.SECONDS.between(now, verification.getResendCooldown());
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(ApiResponse.ok("Please wait " + secondsLeft + " seconds before requesting another OTP", null));
            }
            // Reset resend count if OTP expired or 10 minutes elapsed since last request
            if (verification.getExpiryTime() != null && verification.getExpiryTime().isBefore(now)) {
                verification.setResendCount(0);
            }
            if (verification.getResendCount() >= 15) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(ApiResponse.ok("Maximum OTP request limit reached for this session. Please try again after 15 minutes", null));
            }
            verification.setOtpCode(generatedOtp);
            verification.setExpiryTime(now.plus(5, ChronoUnit.MINUTES));
            verification.setAttempts(0);
            verification.setResendCooldown(now.plus(60, ChronoUnit.SECONDS));
            verification.setResendCount(verification.getResendCount() + 1);
            verification.setVerified(false);
        } else {
            verification = OtpVerification.builder()
                    .mobileNumber(mobile)
                    .otpCode(generatedOtp)
                    .expiryTime(now.plus(5, ChronoUnit.MINUTES))
                    .attempts(0)
                    .resendCooldown(now.plus(60, ChronoUnit.SECONDS))
                    .resendCount(1)
                    .verified(false)
                    .build();
        }

        otps.save(verification);
        smsService.sendOtpSms(mobile, generatedOtp);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("cooldownSeconds", 60);
        responseData.put("remainingResends", Math.max(0, 15 - verification.getResendCount()));

        return ResponseEntity.ok(ApiResponse.ok("OTP sent successfully via SMS", responseData));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyOtp(@RequestBody Map<String, String> request) {
        String rawMobile = request.get("mobileNumber");
        String code = request.get("otpCode");
        String deviceId = request.get("deviceId");
        String deviceName = request.get("deviceName");
        String platform = request.get("platform");

        if (rawMobile == null || code == null || rawMobile.isBlank() || code.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Mobile number and OTP code are required", null));
        }

        String mobile = formatMobile(rawMobile);
        Optional<OtpVerification> optOtp = otps.findByMobileNumber(mobile);
        if (optOtp.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("No OTP request found for this mobile number", null));
        }

        OtpVerification verification = optOtp.get();
        Instant now = Instant.now();

        if (verification.isVerified()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("This OTP has already been verified", null));
        }
        if (verification.getExpiryTime().isBefore(now)) {
            return ResponseEntity.status(HttpStatus.GONE).body(ApiResponse.ok("OTP has expired. Please request a new one", null));
        }
        if (verification.getAttempts() >= 3) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.ok("Too many failed attempts. Please request a new OTP", null));
        }

        if (!verification.getOtpCode().equals(code)) {
            verification.setAttempts(verification.getAttempts() + 1);
            otps.save(verification);
            int attemptsLeft = 3 - verification.getAttempts();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.ok("Incorrect OTP. " + attemptsLeft + " attempts remaining", null));
        }

        // Successfully verified
        verification.setVerified(true);
        otps.save(verification);

        // Partner identities are deliberately isolated from customer users. A customer
        // can therefore use the same mobile number in the Customer and Partner apps.
        Optional<PartnerAccount> optAccount = partnerAccounts.findByMobileNumberFlexible(mobile);
        User user;
        PartnerAccount partnerAccount;
        boolean isNew = false;
        if (optAccount.isPresent()) {
            partnerAccount = optAccount.get();
            user = partnerAccount.getSecurityUser();
            if (user.getStatus() == AccountStatus.BLOCKED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.ok("Your account has been suspended. Contact support", null));
            }
        } else {
            isNew = true;
            Optional<User> existingUserOpt = users.findByMobileNumberFlexible(mobile);
            if (existingUserOpt.isPresent()) {
                user = existingUserOpt.get();
            } else {
                user = User.builder()
                        .name("New Partner")
                        .mobileNumber(mobile)
                        .password(encoder.encode(UUID.randomUUID().toString()))
                        .role(Role.DELIVERY_PARTNER)
                        .status(AccountStatus.PENDING)
                        .isAvailable(false)
                        .build();
                user = users.save(user);
            }
            final User secUser = user;
            partnerAccount = partnerAccounts.findBySecurityUser(secUser).orElseGet(() ->
                    partnerAccounts.save(PartnerAccount.builder()
                            .mobileNumber(mobile)
                            .securityUser(secUser)
                            .build()));
        }

        // Keep the existing assignment engine in sync with partner authentication.
        final User partnerUser = user;
        DeliveryPartner dpRecord = deliveryPartners.findByPhoneFlexible(mobile)
                .or(() -> deliveryPartners.findByUserIdFlexible(partnerUser.getMobileNumber()))
                .orElseGet(() ->
                        deliveryPartners.save(DeliveryPartner.builder()
                                .userId(partnerUser.getMobileNumber())
                                .name(partnerUser.getName())
                                .phone(mobile)
                                .active(true).available(false).approved(true)
                                .build()));

        // If DeliveryPartner's name is still "New Partner", check if user has a real name or KYC fullName
        if ("New Partner".equalsIgnoreCase(dpRecord.getName())) {
            Optional<PartnerProfile> pOpt = profiles.findByUser(partnerUser);
            String realName = partnerUser.getName();
            if (pOpt.isPresent()) {
                Optional<PartnerVerification> verOpt = verifications.findByPartnerProfile(pOpt.get());
                if (verOpt.isPresent() && verOpt.get().getFullName() != null && !verOpt.get().getFullName().isBlank()) {
                    realName = verOpt.get().getFullName();
                }
            }
            if (realName != null && !"New Partner".equalsIgnoreCase(realName)) {
                dpRecord.setName(realName);
                deliveryPartners.save(dpRecord);
            }
        }

        // Setup/Get Partner Profile
        Optional<PartnerProfile> optProfile = profiles.findByUser(user);
        PartnerProfile profile;
        if (optProfile.isPresent()) {
            profile = optProfile.get();
        } else {
            profile = PartnerProfile.builder()
                    .user(user)
                    .verificationStatus(VerificationStatus.NEW)
                    .build();
            profile = profiles.save(profile);
        }

        // Create Device Session
        String sessionId = UUID.randomUUID().toString();
        PartnerDeviceSession session = PartnerDeviceSession.builder()
                .user(user)
                .sessionId(sessionId)
                .deviceId(deviceId != null ? deviceId : "UNKNOWN_DEVICE")
                .deviceName(deviceName != null ? deviceName : "Android Device")
                .platform(platform != null ? platform : "Android")
                .createdAt(now)
                .lastActiveAt(now)
                .expiresAt(now.plus(30, ChronoUnit.DAYS))
                .revoked(false)
                .build();
        sessions.save(session);

        // Create Refresh Token
        String rTokenStr = UUID.randomUUID().toString();
        RefreshToken rToken = RefreshToken.builder()
                .token(rTokenStr)
                .user(user)
                .expiryDate(now.plus(30, ChronoUnit.DAYS))
                .revoked(false)
                .build();
        refreshTokens.save(rToken);

        // Access Token
        String accessToken = jwt.create(user, sessionId);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("accessToken", accessToken);
        responseData.put("refreshToken", rTokenStr);
        responseData.put("userId", user.getId());
        responseData.put("role", user.getRole().name());
        responseData.put("verificationStatus", profile.getVerificationStatus().name());
        responseData.put("isNew", isNew);

        return ResponseEntity.ok(ApiResponse.ok("Authentication successful", responseData));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refreshToken(@RequestBody Map<String, String> request) {
        String tokenStr = request.get("refreshToken");
        if (tokenStr == null || tokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Refresh token is required", null));
        }

        Optional<RefreshToken> optToken = refreshTokens.findByToken(tokenStr);
        if (optToken.isEmpty() || optToken.get().isRevoked() || optToken.get().getExpiryDate().isBefore(Instant.now())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Invalid or expired refresh token", null));
        }

        RefreshToken oldToken = optToken.get();
        User user = oldToken.getUser();

        // Check if user is blocked
        if (user.getStatus() == AccountStatus.BLOCKED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.ok("Account is suspended", null));
        }

        // Rotate refresh token
        oldToken.setRevoked(true);
        refreshTokens.save(oldToken);

        Instant now = Instant.now();
        String newRTokenStr = UUID.randomUUID().toString();
        RefreshToken newToken = RefreshToken.builder()
                .token(newRTokenStr)
                .user(user)
                .expiryDate(now.plus(30, ChronoUnit.DAYS))
                .revoked(false)
                .build();
        refreshTokens.save(newToken);

        // Access Token with a new session or mapping
        String sessionId = UUID.randomUUID().toString();
        // Register new temporary session
        PartnerDeviceSession session = PartnerDeviceSession.builder()
                .user(user)
                .sessionId(sessionId)
                .deviceId("ROTATED_SESSION")
                .deviceName("Rotated Session")
                .platform("Web/Android")
                .createdAt(now)
                .lastActiveAt(now)
                .expiresAt(now.plus(30, ChronoUnit.DAYS))
                .revoked(false)
                .build();
        sessions.save(session);

        String accessToken = jwt.create(user, sessionId);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("accessToken", accessToken);
        responseData.put("refreshToken", newRTokenStr);

        return ResponseEntity.ok(ApiResponse.ok("Tokens refreshed successfully", responseData));
    }

    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwt.valid(token)) {
                String sessionId = jwt.getSessionId(token);
                if (sessionId != null) {
                    Optional<PartnerDeviceSession> sessOpt = sessions.findBySessionId(sessionId);
                    sessOpt.ifPresent(sess -> {
                        sess.setRevoked(true);
                        sessions.save(sess);
                    });
                }
                // Revoke latest refresh token of this user
                String subject = jwt.subject(token);
                users.findByMobileNumber(subject).ifPresent(user -> {
                    List<RefreshToken> tokens = refreshTokens.findByUser(user);
                    for (RefreshToken rt : tokens) {
                        rt.setRevoked(true);
                        refreshTokens.save(rt);
                    }
                });
            }
        }
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }

    @PostMapping("/logout-all")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> logoutAll(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwt.valid(token)) {
                String subject = jwt.subject(token);
                users.findByMobileNumber(subject).ifPresent(user -> {
                    // Revoke all sessions
                    List<PartnerDeviceSession> activeSess = sessions.findByUser(user);
                    for (PartnerDeviceSession s : activeSess) {
                        s.setRevoked(true);
                        sessions.save(s);
                    }
                    // Revoke all refresh tokens
                    List<RefreshToken> tokens = refreshTokens.findByUser(user);
                    for (RefreshToken rt : tokens) {
                        rt.setRevoked(true);
                        refreshTokens.save(rt);
                    }
                });
            }
        }
        return ResponseEntity.ok(ApiResponse.ok("Logged out from all devices successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getMe(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwt.valid(token)) {
                String subject = jwt.subject(token);
                Optional<User> optUser = users.findByMobileNumber(subject);
                if (optUser.isPresent()) {
                    return ResponseEntity.ok(ApiResponse.ok("Profile retrieved", optUser.get()));
                }
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Unauthorized", null));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSessions(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwt.valid(token)) {
                String subject = jwt.subject(token);
                Optional<User> optUser = users.findByMobileNumber(subject);
                if (optUser.isPresent()) {
                    List<PartnerDeviceSession> activeSessions = sessions.findByUserAndRevokedFalse(optUser.get());
                    String currentSessionId = jwt.getSessionId(token);

                    List<Map<String, Object>> responseList = new ArrayList<>();
                    for (PartnerDeviceSession s : activeSessions) {
                        Map<String, Object> item = new HashMap<>();
                        item.put("sessionId", s.getSessionId());
                        item.put("deviceId", s.getDeviceId());
                        item.put("deviceName", s.getDeviceName());
                        item.put("platform", s.getPlatform());
                        item.put("lastActiveAt", s.getLastActiveAt());
                        item.put("isCurrent", s.getSessionId().equals(currentSessionId));
                        responseList.add(item);
                    }
                    return ResponseEntity.ok(ApiResponse.ok("Active sessions retrieved", responseList));
                }
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Unauthorized", null));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> revokeSession(@RequestHeader("Authorization") String authHeader,
                                                           @PathVariable String sessionId) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwt.valid(token)) {
                String subject = jwt.subject(token);
                Optional<User> optUser = users.findByMobileNumber(subject);
                Optional<PartnerDeviceSession> sessOpt = sessions.findBySessionId(sessionId);
                if (optUser.isPresent() && sessOpt.isPresent() && sessOpt.get().getUser().getId().equals(optUser.get().getId())) {
                    PartnerDeviceSession s = sessOpt.get();
                    s.setRevoked(true);
                    sessions.save(s);
                    return ResponseEntity.ok(ApiResponse.ok("Session revoked successfully", null));
                }
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Unauthorized", null));
    }

    private String formatMobile(String mobile) {
        String clean = mobile.replaceAll("[^0-9]", "");
        if (clean.length() == 10) {
            return "+91" + clean;
        } else if (clean.length() == 12 && clean.startsWith("91")) {
            return "+" + clean;
        }
        return mobile;
    }
}
