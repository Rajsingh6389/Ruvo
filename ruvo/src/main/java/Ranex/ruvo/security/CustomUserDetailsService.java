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
    public UserDetails loadUserByUsername(String email) {

        Ranex.ruvo.model.User u = users.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        return org.springframework.security.core.userdetails.User
                .withUsername(u.getEmail())
                .password(u.getPassword())
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
