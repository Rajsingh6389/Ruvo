package Ranex.ruvo.controller;

import Ranex.ruvo.dto.*;
import Ranex.ruvo.dto.AuthDtos.*;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.UserRepository;
import Ranex.ruvo.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager auth;
    private final JwtService jwt;

    public AuthenticationController(UserRepository u, PasswordEncoder e, AuthenticationManager a, JwtService j) {
        this.users = u;  this.encoder = e;  this.auth = a;  this.jwt = j;
    }

    @PostMapping("/register")
    ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequest r) {
        if (users.existsByEmail(r.email().toLowerCase()))
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.ok("Email already registered", null));
        User u = users.save(User.builder()
                .name(r.name()).email(r.email().toLowerCase())
                .password(encoder.encode(r.password())).mobileNumber(r.mobileNumber())
                .role(Role.USER).status(AccountStatus.APPROVED).build());
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.ok("Registration successful", new AuthToken(jwt.create(u), "Bearer", u.getId(), u.getRole().name())));
    }

    @PostMapping("/login")
    ResponseEntity<ApiResponse<AuthToken>> login(@Valid @RequestBody LoginRequest r) {
        User u = users.findByEmail(r.email().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (u.getStatus() != AccountStatus.APPROVED) { u.setStatus(AccountStatus.APPROVED); users.save(u); }
        auth.authenticate(new UsernamePasswordAuthenticationToken(r.email().toLowerCase(), r.password()));
        u.setLastLogin(Instant.now());
        users.save(u);
        return ResponseEntity.ok(ApiResponse.ok("Login successful",
                new AuthToken(jwt.create(u), "Bearer", u.getId(), u.getRole().name())));
    }

    @GetMapping("/me")
    ResponseEntity<ApiResponse<User>> me(@AuthenticationPrincipal org.springframework.security.core.userdetails.User p) {
        return ResponseEntity.ok(ApiResponse.ok("Current user", users.findByEmail(p.getUsername()).orElseThrow()));
    }

    @PutMapping("/profile")
    ResponseEntity<ApiResponse<User>> updateProfile(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User p,
            @RequestBody Map<String, String> updates) {
        User u = users.findByEmail(p.getUsername()).orElseThrow();
        if (updates.containsKey("name") && !updates.get("name").isBlank()) u.setName(updates.get("name"));
        if (updates.containsKey("mobileNumber")) u.setMobileNumber(updates.get("mobileNumber"));
        if (updates.containsKey("address"))      u.setAddress(updates.get("address"));
        if (updates.containsKey("city"))         u.setCity(updates.get("city"));
        if (updates.containsKey("state"))        u.setState(updates.get("state"));
        if (updates.containsKey("bio"))          u.setBio(updates.get("bio"));
        if (updates.containsKey("gender"))       u.setGender(updates.get("gender"));
        users.save(u);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", u));
    }

    @PostMapping("/logout")
    ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.ok("Logged out. Discard the access token on the client.", null));
    }
}
