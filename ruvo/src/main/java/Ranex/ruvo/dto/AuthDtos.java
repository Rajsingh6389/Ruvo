package Ranex.ruvo.dto;
import jakarta.validation.constraints.*;
public final class AuthDtos {
 private AuthDtos() {}
 public record RegisterRequest(@NotBlank String name, @Email @NotBlank String email, @Size(min=8) String password, @Pattern(regexp="^[0-9+ -]{8,20}$") String mobileNumber) {}
 public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
 public record AuthToken(String accessToken, String tokenType, Long userId, String role) {}
}
