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

@Component public class JwtAuthenticationFilter extends OncePerRequestFilter {
 private final JwtService jwt; private final UserDetailsService details;
 private final PartnerDeviceSessionRepository sessions;
 public JwtAuthenticationFilter(JwtService jwt, UserDetailsService details, PartnerDeviceSessionRepository sessions){this.jwt=jwt;this.details=details;this.sessions=sessions;}
 protected void doFilterInternal(HttpServletRequest r,HttpServletResponse s,FilterChain c)throws ServletException,IOException {
     String h=r.getHeader("Authorization"); 
     if(h!=null&&h.startsWith("Bearer ")){
         String t=h.substring(7);
         if(jwt.valid(t)&&SecurityContextHolder.getContext().getAuthentication()==null){
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
