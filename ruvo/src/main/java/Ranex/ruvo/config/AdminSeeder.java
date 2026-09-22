package Ranex.ruvo.config;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.AuthIdentityRepository;
import Ranex.ruvo.repository.AuthIdentityRoleRepository;
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
    CommandLineRunner admin(
            UserRepository users,
            PasswordEncoder encoder,
            PricingConfigRepository pricingRepo,
            AuthIdentityRepository authIdentityRepo,
            AuthIdentityRoleRepository authIdentityRoleRepo) {
        return a -> {
            List<String> adminMobiles = List.of(
                "8630820486",
                "9125474036",
                "6389550338"
            );

            for (String rawMobile : adminMobiles) {
                String clean10 = rawMobile.replaceAll("[^0-9]", "");
                if (clean10.length() == 12 && clean10.startsWith("91")) clean10 = clean10.substring(2);
                String fullPhone = "+91" + clean10;

                // 1. Seed or Upgrade in User table
                users.findByMobileNumberFlexible(clean10).ifPresentOrElse(
                    user -> {
                        user.setStatus(AccountStatus.APPROVED);
                        user.setRole(Role.ADMIN);
                        users.save(user);
                    },
                    () -> {
                        users.save(User.builder()
                            .name("RuVo Admin")
                            .mobileNumber(fullPhone)
                            .password(encoder.encode("Raj@9125"))
                            .role(Role.ADMIN)
                            .status(AccountStatus.APPROVED)
                            .build());
                    }
                );

                // 2. Seed or Upgrade in AuthIdentity & AuthIdentityRole
                try {
                    AuthIdentity identity = authIdentityRepo.findByMobileNumberFlexible(clean10).orElseGet(() ->
                        authIdentityRepo.save(AuthIdentity.builder()
                            .mobileNumber(fullPhone)
                            .status(AccountStatus.APPROVED)
                            .build())
                    );
                    if (authIdentityRoleRepo.findByIdentityAndRole(identity, Role.ADMIN).isEmpty()) {
                        authIdentityRoleRepo.save(AuthIdentityRole.builder()
                            .identity(identity)
                            .role(Role.ADMIN)
                            .build());
                    }
                } catch (Exception ignored) {}
            }

            // Seed pricing if empty
            if (pricingRepo.count() == 0) {
                pricingRepo.saveAll(List.of(
                    PricingConfig.builder().fromKm(0.0).toKm(1.0).deliveryFee(10.0).platformFee(5.0).isActive(true).build(),
                    PricingConfig.builder().fromKm(1.0).toKm(2.0).deliveryFee(15.0).platformFee(5.0).isActive(true).build(),
                    PricingConfig.builder().fromKm(2.0).toKm(3.0).deliveryFee(20.0).platformFee(5.0).isActive(true).build(),
                    PricingConfig.builder().fromKm(3.0).toKm(5.0).deliveryFee(25.0).platformFee(5.0).isActive(true).build()
                ));
            }
        };
    }
}
