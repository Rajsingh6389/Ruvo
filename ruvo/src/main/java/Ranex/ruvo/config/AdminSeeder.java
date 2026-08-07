package Ranex.ruvo.config;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
class AdminSeeder {
    @Bean
    CommandLineRunner admin(UserRepository users, PasswordEncoder encoder) {
        return a -> {
            users.findByEmail("rajs1ngh@gmail.com").ifPresentOrElse(
                user -> {
                    user.setStatus(AccountStatus.APPROVED);
                    user.setRole(Role.ADMIN);
                    users.save(user);
                },
                () -> {
                    users.save(User.builder()
                        .name("RuVo Admin")
                        .email("rajs1ngh@gmail.com")
                        .password(encoder.encode("Raj@123"))
                        .role(Role.ADMIN)
                        .status(AccountStatus.APPROVED)
                        .build());
                }
            );
        };
    }
}
