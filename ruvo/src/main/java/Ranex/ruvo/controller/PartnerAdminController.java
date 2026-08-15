package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/partners")
@PreAuthorize("hasRole('ADMIN')")
public class PartnerAdminController {

    private final PartnerProfileRepository profiles;
    private final PartnerVehicleRepository vehicles;
    private final PartnerVerificationRepository verifications;
    private final UserRepository users;

    public PartnerAdminController(PartnerProfileRepository p, PartnerVehicleRepository v,
                                  PartnerVerificationRepository vr, UserRepository u) {
        this.profiles = p;
        this.vehicles = v;
        this.verifications = vr;
        this.users = u;
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingPartners() {
        List<PartnerProfile> underReviewProfiles = profiles.findByVerificationStatus(VerificationStatus.UNDER_REVIEW);
        List<Map<String, Object>> responseList = new ArrayList<>();

        for (PartnerProfile p : underReviewProfiles) {
            User user = p.getUser();
            Optional<PartnerVehicle> vehicle = vehicles.findByPartnerProfile(p);
            Optional<PartnerVerification> verification = verifications.findByPartnerProfile(p);

            Map<String, Object> item = new HashMap<>();
            item.put("partnerId", p.getId());
            item.put("userId", user.getId());
            item.put("name", user.getName());
            item.put("mobileNumber", user.getMobileNumber());
            item.put("email", user.getEmail());
            item.put("status", p.getVerificationStatus().name());

            if (vehicle.isPresent()) {
                Map<String, Object> vMap = new HashMap<>();
                vMap.put("vehicleType", vehicle.get().getVehicleType());
                vMap.put("vehicleNumber", vehicle.get().getVehicleNumber());
                vMap.put("vehicleModel", vehicle.get().getVehicleModel());
                vMap.put("vehicleCapacity", vehicle.get().getVehicleCapacity());
                vMap.put("fuelType", vehicle.get().getFuelType());
                item.put("vehicle", vMap);
            }

            if (verification.isPresent()) {
                Map<String, Object> kMap = new HashMap<>();
                kMap.put("fullName", verification.get().getFullName());
                kMap.put("dateOfBirth", verification.get().getDateOfBirth());
                kMap.put("address", verification.get().getAddress());
                kMap.put("city", verification.get().getCity());
                kMap.put("state", verification.get().getState());
                kMap.put("pincode", verification.get().getPincode());
                kMap.put("identityDocumentType", verification.get().getIdentityDocumentType());
                kMap.put("identityDocumentNumber", verification.get().getIdentityDocumentNumber());
                item.put("kyc", kMap);
            }

            responseList.add(item);
        }

        return ResponseEntity.ok(ApiResponse.ok("Pending partner reviews retrieved", responseList));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approvePartner(@PathVariable Long id) {
        Optional<PartnerProfile> optProf = profiles.findById(id);
        if (optProf.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner profile not found", null));
        }

        PartnerProfile profile = optProf.get();
        profile.setVerificationStatus(VerificationStatus.APPROVED);
        profile.setAdminReason(null);
        profiles.save(profile);

        User user = profile.getUser();
        user.setStatus(AccountStatus.APPROVED);
        users.save(user);

        vehicles.findByPartnerProfile(profile).ifPresent(v -> {
            v.setStatus(VerificationStatus.APPROVED);
            vehicles.save(v);
        });

        verifications.findByPartnerProfile(profile).ifPresent(k -> {
            k.setStatus(VerificationStatus.APPROVED);
            verifications.save(k);
        });

        return ResponseEntity.ok(ApiResponse.ok("Partner profile successfully approved", null));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectPartner(@PathVariable Long id, @RequestBody Map<String, String> request) {
        Optional<PartnerProfile> optProf = profiles.findById(id);
        if (optProf.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner profile not found", null));
        }

        String reason = request.get("reason");
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("Rejection reason is required", null));
        }

        PartnerProfile profile = optProf.get();
        profile.setVerificationStatus(VerificationStatus.REJECTED);
        profile.setAdminReason(reason);
        profiles.save(profile);

        User user = profile.getUser();
        user.setStatus(AccountStatus.REJECTED);
        users.save(user);

        vehicles.findByPartnerProfile(profile).ifPresent(v -> {
            v.setStatus(VerificationStatus.REJECTED);
            vehicles.save(v);
        });

        verifications.findByPartnerProfile(profile).ifPresent(k -> {
            k.setStatus(VerificationStatus.REJECTED);
            verifications.save(k);
        });

        return ResponseEntity.ok(ApiResponse.ok("Partner profile rejected with specified reason", null));
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendPartner(@PathVariable Long id) {
        Optional<PartnerProfile> optProf = profiles.findById(id);
        if (optProf.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.ok("Partner profile not found", null));
        }

        PartnerProfile profile = optProf.get();
        profile.setVerificationStatus(VerificationStatus.SUSPENDED);
        profiles.save(profile);

        User user = profile.getUser();
        user.setStatus(AccountStatus.BLOCKED);
        users.save(user);

        return ResponseEntity.ok(ApiResponse.ok("Partner profile suspended successfully", null));
    }
}
