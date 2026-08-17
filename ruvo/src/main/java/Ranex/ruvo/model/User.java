package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "mobileNumber")
})
public class User {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(nullable = false) private String name;
  @Column(nullable = true) private String email;
  @Column(nullable = true) private String password;
  @Enumerated(EnumType.STRING) @Column(nullable = false, columnDefinition = "ENUM('ADMIN','USER','SHOP_OWNER','DELIVERY_PARTNER')") private Role role;
  @Enumerated(EnumType.STRING) @Column(nullable = false) private AccountStatus status;
  @Column(unique = true) private String mobileNumber;
  private String profilePicture, address, city, state, country, pincode, gender, bio, gstNumber, panNumber;
  private LocalDate dateOfBirth;
  @Column(nullable = false, updatable = false) private Instant createdAt;
  private Instant lastLogin;
  @Builder.Default private BigDecimal walletBalance = BigDecimal.ZERO;
  private Boolean isAvailable;
  @PrePersist void created() { if (createdAt == null) createdAt = Instant.now(); if (status == null) status = AccountStatus.PENDING; if (role == null) role = Role.USER; if (isAvailable == null) isAvailable = false; }
}
