package Ranex.ruvo.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "partner_vehicles")
public class PartnerVehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_profile_id", nullable = false, unique = true)
    private PartnerProfile partnerProfile;

    @Column(nullable = false)
    private String vehicleType; // Bike, Scooter, Auto, Van, Mini Truck

    @Column(nullable = false)
    private String vehicleNumber;

    @Column(nullable = false)
    private String vehicleModel;

    @Column(nullable = false)
    private String vehicleCapacity;

    @Column(nullable = false)
    private String fuelType; // Petrol, Diesel, EV

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VerificationStatus status; // PENDING, APPROVED, REJECTED
}
