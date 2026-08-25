package Ranex.ruvo.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public final class AuthDtos {
    private AuthDtos() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RegisterRequest(String name, String password, String mobileNumber) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LoginRequest(String mobileNumber, String password) {}

    public record AuthToken(String accessToken, String tokenType, Long userId, String role, String verificationStatus) {}
}
