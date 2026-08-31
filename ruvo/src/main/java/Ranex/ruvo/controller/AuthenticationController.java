package Ranex.ruvo.controller;

import Ranex.ruvo.dto.*;
import Ranex.ruvo.dto.AuthDtos.*;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.OtpVerificationRepository;
import Ranex.ruvo.repository.UserRepository;
import Ranex.ruvo.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import Ranex.ruvo.service.SmsService;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthenticationController {

    private final UserRepository users;
    private final OtpVerificationRepository otps;
    private final PasswordEncoder encoder;
    private final AuthenticationManager auth;
    private final JwtService jwt;
    private final SmsService smsService;

    public AuthenticationController(UserRepository u, OtpVerificationRepository o, PasswordEncoder e, AuthenticationManager a, JwtService j, SmsService s) {
        this.users = u;  this.otps = o;  this.encoder = e;  this.auth = a;  this.jwt = j;  this.smsService = s;
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
            // Reset resend count if OTP expired
            if (verification.getExpiryTime() != null && verification.getExpiryTime().isBefore(now)) {
                verification.setResendCount(0);
            }
            if (verification.getResendCount() >= 15) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(ApiResponse.ok("Maximum OTP request limit reached. Please try again later", null));
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

        return ResponseEntity.ok(ApiResponse.ok("OTP sent successfully via SMS", responseData));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthToken>> verifyOtp(@RequestBody Map<String, String> request) {
        String rawMobile = request.get("mobileNumber");
        String code = request.get("otpCode");
        String name = request.get("name");

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

        // Find or create User
        Optional<User> optUser = users.findByMobileNumberFlexible(mobile);
        User u;
        if (optUser.isPresent()) {
            u = optUser.get();
            if (u.getStatus() == AccountStatus.BLOCKED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.ok("Account is suspended", null));
            }
            if (name != null && !name.isBlank() && ("RuVo User".equals(u.getName()) || u.getName() == null)) {
                u.setName(name.trim());
            }
        } else {
            String userName = (name != null && !name.isBlank()) ? name.trim() : "RuVo User";
            u = User.builder()
                    .name(userName)
                    .mobileNumber(mobile)
                    .role(Role.USER)
                    .status(AccountStatus.APPROVED)
                    .build();
        }

        u.setLastLogin(Instant.now());
        u = users.save(u);

        String token = jwt.create(u);
        return ResponseEntity.ok(ApiResponse.ok("Authentication successful",
                new AuthToken(token, "Bearer", u.getId(), u.getRole().name(), null)));
    }

    @PostMapping("/register")
    ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequest r) {
        String mobile = formatMobile(r.mobileNumber());
        Optional<User> uOpt = mobile != null ? users.findByMobileNumberFlexible(mobile) : Optional.empty();
        User u;
        if (uOpt.isPresent()) {
            u = uOpt.get();
            if (r.name() != null && !r.name().isBlank()) u.setName(r.name().trim());
            if (r.password() != null && !r.password().isBlank()) u.setPassword(encoder.encode(r.password()));
            u = users.save(u);
        } else {
            u = users.save(User.builder()
                    .name(r.name())
                    .password(r.password() != null ? encoder.encode(r.password()) : null)
                    .mobileNumber(mobile)
                    .role(Role.USER)
                    .status(AccountStatus.APPROVED)
                    .build());
        }
        String token = jwt.create(u);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.ok("Registration successful",
                        new AuthToken(token, "Bearer", u.getId(), u.getRole().name(), null))
        );
    }

    @PostMapping("/login")
    ResponseEntity<ApiResponse<AuthToken>> login(@Valid @RequestBody LoginRequest r) {
        String mobile = formatMobile(r.mobileNumber());
        User u = users.findByMobileNumberFlexible(mobile)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (u.getStatus() != AccountStatus.APPROVED) { u.setStatus(AccountStatus.APPROVED); users.save(u); }
        auth.authenticate(new UsernamePasswordAuthenticationToken(u.getMobileNumber(), r.password()));
        u.setLastLogin(Instant.now());
        users.save(u);
        return ResponseEntity.ok(ApiResponse.ok("Login successful",
                new AuthToken(jwt.create(u), "Bearer", u.getId(), u.getRole().name(), null)));
    }

    @GetMapping("/me")
    ResponseEntity<ApiResponse<User>> me(@AuthenticationPrincipal org.springframework.security.core.userdetails.User p) {
        User u = users.findByMobileNumberFlexible(p.getUsername())
                .orElseThrow();
        return ResponseEntity.ok(ApiResponse.ok("Current user", u));
    }

    @PutMapping("/profile")
    ResponseEntity<ApiResponse<User>> updateProfile(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User p,
            @RequestBody Map<String, String> updates) {
        User u = users.findByMobileNumberFlexible(p.getUsername())
                .orElseThrow();
        if (updates.containsKey("name") && !updates.get("name").isBlank()) u.setName(updates.get("name"));
        if (updates.containsKey("mobileNumber")) u.setMobileNumber(formatMobile(updates.get("mobileNumber")));
        if (updates.containsKey("address"))      u.setAddress(updates.get("address"));
        if (updates.containsKey("city"))         u.setCity(updates.get("city"));
        if (updates.containsKey("state"))        u.setState(updates.get("state"));
        if (updates.containsKey("gender"))       u.setGender(updates.get("gender"));
        users.save(u);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", u));
    }

    @PostMapping("/logout")
    ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.ok("Logged out. Discard the access token on the client.", null));
    }

    private String formatMobile(String mobile) {
        if (mobile == null) return null;
        String clean = mobile.replaceAll("[^0-9]", "");
        if (clean.length() == 10) {
            return "+91" + clean;
        } else if (clean.length() == 12 && clean.startsWith("91")) {
            return "+" + clean;
        }
        return mobile;
    }
}
