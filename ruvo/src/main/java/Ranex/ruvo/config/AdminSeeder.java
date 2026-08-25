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
            String adminMobile = "9125474036";
            users.findByMobileNumberFlexible(adminMobile).or(() -> users.findByMobileNumberFlexible("+916389550338")).ifPresentOrElse(
                user -> {
                    user.setStatus(AccountStatus.APPROVED);
                    user.setRole(Role.ADMIN);
                    user.setPassword(encoder.encode("Raj@9125"));
                    users.save(user);
                },
                () -> {
                    users.save(User.builder()
                        .name("RuVo Admin")
                        .mobileNumber("+919125474036")
                        .password(encoder.encode("Raj@9125"))
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
