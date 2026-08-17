package Ranex.ruvo.config;

import Ranex.ruvo.security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    public SecurityFilterChain chain(
            HttpSecurity http,
            JwtAuthenticationFilter jwt) throws Exception {

        http
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .csrf(c -> c.disable())
            .sessionManagement(s ->
                    s.sessionCreationPolicy(
                            SessionCreationPolicy.STATELESS
                    )
            )
            .authorizeHttpRequests(a -> a
                    .requestMatchers(
                            "/auth/**",
                            "/actuator/health",
                            "/uploads/**",
                            "/api/partner/register",
                            "/api/partner/auth/send-otp",
                            "/api/partner/auth/verify-otp",
                            "/api/partner/auth/refresh",
                            "/api/auth/otp/send",
                            "/api/auth/otp/verify"
                    ).permitAll()

                    .requestMatchers(
                            "/api/partner/**"
                    ).hasRole("DELIVERY_PARTNER")

                    .requestMatchers(
                            "/api/shop/**"
                    ).hasRole("SHOP_OWNER")

                    .requestMatchers(
                            "/api/shops/**"
                    ).permitAll()

                    .requestMatchers(
                            "/api/products/shop/**"
                    ).permitAll()

                    .requestMatchers(
                            "/api/payments/cashfree/return"
                    ).permitAll()

                    .requestMatchers(
                            "/api/orders/**",
                            "/api/payments/**",
                            "/api/delivery/**",
                            "/api/settlements/**",
                            "/api/financial/**",
                            "/api/notifications/**"
                    ).authenticated()

                    .anyRequest().authenticated()
            )
            .addFilterBefore(
                    jwt,
                    UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
