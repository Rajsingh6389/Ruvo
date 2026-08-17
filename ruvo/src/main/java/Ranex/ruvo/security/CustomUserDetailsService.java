package Ranex.ruvo.security;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    public CustomUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) {

        Ranex.ruvo.model.User u = users.findByEmail(identifier)
                .or(() -> users.findByMobileNumber(identifier))
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        String username = u.getMobileNumber() != null ? u.getMobileNumber() : u.getEmail();
        String pwd = u.getPassword() != null ? u.getPassword() : "";

        return org.springframework.security.core.userdetails.User
                .withUsername(username)
                .password(pwd)
                .authorities(
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ROLE_" + u.getRole().name()
                                )
                        )
                )
                .build();
    }
}
