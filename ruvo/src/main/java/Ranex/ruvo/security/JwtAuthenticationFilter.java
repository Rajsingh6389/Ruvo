package Ranex.ruvo.security;
import jakarta.servlet.*; import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import Ranex.ruvo.repository.PartnerDeviceSessionRepository;
import Ranex.ruvo.model.PartnerDeviceSession;
import java.util.Optional;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Component public class JwtAuthenticationFilter extends OncePerRequestFilter {
 private final JwtService jwt; private final UserDetailsService details;
 private final PartnerDeviceSessionRepository sessions;
 public JwtAuthenticationFilter(JwtService jwt, UserDetailsService details, PartnerDeviceSessionRepository sessions){this.jwt=jwt;this.details=details;this.sessions=sessions;}
 protected void doFilterInternal(HttpServletRequest r,HttpServletResponse s,FilterChain c)throws ServletException,IOException {
     String h=r.getHeader("Authorization"); 
     if(h!=null&&h.startsWith("Bearer ")){
         String t=h.substring(7);
         if(jwt.valid(t)&&SecurityContextHolder.getContext().getAuthentication()==null){
             Long identityId = jwt.getIdentityId(t);
            if (identityId != null) {
                String role = jwt.getRole(t);
                String cleanRole = (role != null ? role : "DELIVERY_PARTNER").replace("ROLE_", "");
                List<SimpleGrantedAuthority> authorities = java.util.Arrays.asList(
                    new SimpleGrantedAuthority("ROLE_" + cleanRole),
                    new SimpleGrantedAuthority(cleanRole),
                    new SimpleGrantedAuthority("ROLE_DELIVERY_PARTNER"),
                    new SimpleGrantedAuthority("ROLE_PARTNER")
                );
                var d = org.springframework.security.core.userdetails.User.withUsername("identity:" + identityId).password("")
                        .authorities(authorities).build();
                var a = new UsernamePasswordAuthenticationToken(d, null, d.getAuthorities());
                a.setDetails(new WebAuthenticationDetailsSource().buildDetails(r));
                SecurityContextHolder.getContext().setAuthentication(a);
                c.doFilter(r, s);
                return;
            }
             String sessionId = jwt.getSessionId(t);
             boolean sessionValid = true;
             if (sessionId != null) {
                 Optional<PartnerDeviceSession> sessOpt = sessions.findBySessionId(sessionId);
                 if (sessOpt.isEmpty() || sessOpt.get().isRevoked() || sessOpt.get().getExpiresAt().isBefore(java.time.Instant.now())) {
                     sessionValid = false;
                 } else {
                     PartnerDeviceSession sess = sessOpt.get();
                     sess.setLastActiveAt(java.time.Instant.now());
                     sessions.save(sess);
                 }
             }
             if (sessionValid) {
                 var d=details.loadUserByUsername(jwt.subject(t));
                 var a=new UsernamePasswordAuthenticationToken(d,null,d.getAuthorities());
                 a.setDetails(new WebAuthenticationDetailsSource().buildDetails(r));
                 SecurityContextHolder.getContext().setAuthentication(a);
             } else {
                 s.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Session has been revoked or is invalid");
                 return;
             }
         }
     } 
     c.doFilter(r,s);
 }
}
