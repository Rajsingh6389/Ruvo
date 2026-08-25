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

        Ranex.ruvo.model.User u = users.findByMobileNumberFlexible(identifier)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found for mobile: " + identifier));

        String username = u.getMobileNumber();
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
