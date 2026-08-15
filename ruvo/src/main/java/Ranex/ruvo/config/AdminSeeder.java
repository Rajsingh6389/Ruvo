package Ranex.ruvo.config;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.PricingConfigRepository;
import Ranex.ruvo.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;

@Configuration
class AdminSeeder {
    @Bean
    CommandLineRunner admin(UserRepository users, PasswordEncoder encoder, PricingConfigRepository pricingRepo) {
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

            // Seed pricing if empty
            if (pricingRepo.count() == 0) {
                pricingRepo.saveAll(List.of(
                    PricingConfig.builder().fromKm(0.0).toKm(2.0).deliveryFee(10.0).platformFee(5.0).isActive(true).build(),
                    PricingConfig.builder().fromKm(2.0).toKm(3.0).deliveryFee(15.0).platformFee(5.0).isActive(true).build(),
                    PricingConfig.builder().fromKm(3.0).toKm(5.0).deliveryFee(20.0).platformFee(5.0).isActive(true).build()
                ));
            }
        };
    }
}
