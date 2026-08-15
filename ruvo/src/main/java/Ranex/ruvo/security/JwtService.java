package Ranex.ruvo.security;
import Ranex.ruvo.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;

@Service
public class JwtService {
 private final SecretKey key; private final long expiration;
 public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiration-ms:86400000}") long expiration) { this.key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expiration=expiration; }
 public String create(User user) { return create(user, null); }
 public String create(User user, String sessionId) { Instant now=Instant.now(); var builder = Jwts.builder().subject(user.getEmail()).claim("role", user.getRole().name()).issuedAt(Date.from(now)).expiration(Date.from(now.plusMillis(expiration))); if (sessionId != null) { builder.claim("sessionId", sessionId); } return builder.signWith(key).compact(); }
 public String subject(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject(); }
 public String getSessionId(String token) { try { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().get("sessionId", String.class); } catch (Exception e) { return null; } }
 public boolean valid(String token) { try { subject(token); return true; } catch (JwtException | IllegalArgumentException e) { return false; } }
}
