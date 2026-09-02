package Ranex.ruvo.controller;

import Ranex.ruvo.dto.ApiResponse;
import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import Ranex.ruvo.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/partner")
@Transactional
public class PartnerVerificationController {

    private final UserRepository users;
    private final PartnerProfileRepository profiles;
    private final PartnerVehicleRepository vehicles;
    private final PartnerVerificationRepository verifications;
    private final PartnerAccountRepository partnerAccounts;
    private final DeliveryPartnerRepository deliveryPartners;
    private final JwtService jwt;
    private final AuthIdentityRepository identities;

    public PartnerVerificationController(UserRepository u, PartnerProfileRepository p, PartnerVehicleRepository v,
                                         PartnerVerificationRepository vr, PartnerAccountRepository pa,
                                         DeliveryPartnerRepository dp, JwtService j, AuthIdentityRepository id) {
        this.users = u;
        this.profiles = p;
        this.vehicles = v;
        this.verifications = vr;
        this.partnerAccounts = pa;
        this.deliveryPartners = dp;
        this.jwt = j;
        this.identities = id;
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile(@RequestHeader("Authorization") String authHeader) {
        User user = getUserFromHeader(authHeader);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Unauthorized", null));
        }

        PartnerProfile profile = profiles.findByUser(user)
                .orElseGet(() -> profiles.save(PartnerProfile.builder().user(user).verificationStatus(VerificationStatus.NEW).build()));

        Optional<PartnerVehicle> vehicle = vehicles.findByPartnerProfile(profile);
        Optional<PartnerVerification> verification = verifications.findByPartnerProfile(profile);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("userId", user.getId());
        responseData.put("name", user.getName());
        responseData.put("mobileNumber", partnerAccounts.findBySecurityUser(user)
                .map(PartnerAccount::getMobileNumber).orElse(user.getMobileNumber()));
        responseData.put("verificationStatus", profile.getVerificationStatus().name());
        responseData.put("adminReason", profile.getAdminReason());

        if (vehicle.isPresent()) {
            Map<String, Object> vMap = new HashMap<>();
            vMap.put("vehicleType", vehicle.get().getVehicleType());
            vMap.put("vehicleNumber", vehicle.get().getVehicleNumber());
            vMap.put("vehicleModel", vehicle.get().getVehicleModel());
            vMap.put("vehicleCapacity", vehicle.get().getVehicleCapacity());
            vMap.put("fuelType", vehicle.get().getFuelType());
            vMap.put("status", vehicle.get().getStatus().name());
            responseData.put("vehicle", vMap);
        } else {
            responseData.put("vehicle", null);
        }

        if (verification.isPresent()) {
            Map<String, Object> kMap = new HashMap<>();
            kMap.put("fullName", verification.get().getFullName());
            kMap.put("mobileNumber", verification.get().getMobileNumber());
            kMap.put("dateOfBirth", verification.get().getDateOfBirth());
            kMap.put("address", verification.get().getAddress());
            kMap.put("city", verification.get().getCity());
            kMap.put("state", verification.get().getState());
            kMap.put("pincode", verification.get().getPincode());
            kMap.put("identityDocumentType", verification.get().getIdentityDocumentType());
            kMap.put("identityDocumentNumber", verification.get().getIdentityDocumentNumber());
            kMap.put("status", verification.get().getStatus().name());
            responseData.put("kyc", kMap);
        } else {
            responseData.put("kyc", null);
        }

        return ResponseEntity.ok(ApiResponse.ok("Partner profile retrieved", responseData));
    }

    @PostMapping("/verification")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitVerification(@RequestHeader("Authorization") String authHeader,
                                                                               @RequestBody Map<String, String> request) {
        User user = getUserFromHeader(authHeader);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Unauthorized", null));
        }

        String fullName = request.get("fullName");
        String dobStr = request.get("dateOfBirth");
        String address = request.get("address");
        String city = request.get("city");
        String state = request.get("state");
        String pincode = request.get("pincode");
        String docType = request.getOrDefault("identityDocumentType", "NOT_PROVIDED");
        String docNum = request.getOrDefault("identityDocumentNumber", "NOT_PROVIDED");

        if (fullName == null || address == null || city == null || state == null || pincode == null) {
            return ResponseEntity.badRequest().body(ApiResponse.ok("All required fields must be filled", null));
        }

        PartnerProfile profile = profiles.findByUser(user)
                .orElseGet(() -> profiles.save(PartnerProfile.builder().user(user).verificationStatus(VerificationStatus.NEW).build()));

        Optional<PartnerVerification> optVer = verifications.findByPartnerProfile(profile);
        PartnerVerification verification;

        LocalDate dob = null;
        if (dobStr != null && !dobStr.isBlank()) {
            try {
                dob = LocalDate.parse(dobStr);
            } catch (Exception e) {
                // Ignore parse exception, keep dob null
            }
        }

        if (optVer.isPresent()) {
            verification = optVer.get();
            verification.setFullName(fullName);
            verification.setDateOfBirth(dob);
            verification.setAddress(address);
            verification.setCity(city);
            verification.setState(state);
            verification.setPincode(pincode);
            verification.setIdentityDocumentType(docType);
            verification.setIdentityDocumentNumber(docNum);
            verification.setStatus(VerificationStatus.KYC_SUBMITTED);
        } else {
            verification = PartnerVerification.builder()
                    .partnerProfile(profile)
                    .fullName(fullName)
                    .mobileNumber(partnerAccounts.findBySecurityUser(user)
                            .map(PartnerAccount::getMobileNumber).orElse(user.getMobileNumber()))
                    .dateOfBirth(dob)
                    .address(address)
                    .city(city)
                    .state(state)
                    .pincode(pincode)
                    .identityDocumentType(docType)
                    .identityDocumentNumber(docNum)
                    .status(VerificationStatus.KYC_SUBMITTED)
                    .build();
        }
        verifications.save(verification);

        // Update core User details
        user.setName(fullName);
        user.setAddress(address);
        user.setCity(city);
        user.setState(state);
        user.setPincode(pincode);
        if (dob != null) user.setDateOfBirth(dob);
        users.save(user);

        // Sync name to DeliveryPartner entity so dispatch requests show actual name instead of "New Partner"
        final String syncedName = fullName;
        final String userMobile = user.getMobileNumber();
        deliveryPartners.findByUserId(userMobile)
                .or(() -> userMobile != null ? deliveryPartners.findByPhone(userMobile) : Optional.empty())
                .ifPresent(dp -> {
                    dp.setName(syncedName);
                    if (userMobile != null) dp.setPhone(userMobile);
                    deliveryPartners.save(dp);
                });

        // Check if both vehicle and KYC are submitted
        Optional<PartnerVehicle> vehicle = vehicles.findByPartnerProfile(profile);
        if (vehicle.isPresent()) {
            profile.setVerificationStatus(VerificationStatus.UNDER_REVIEW);
            profiles.save(profile);
        }

        Map<String, Object> resData = new HashMap<>();
        resData.put("verificationStatus", profile.getVerificationStatus().name());
        return ResponseEntity.ok(ApiResponse.ok("KYC verification details submitted successfully", resData));
    }

    @PostMapping("/vehicle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitVehicle(@RequestHeader("Authorization") String authHeader,
                                                                          @RequestBody Map<String, String> request) {
        User user = getUserFromHeader(authHeader);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Unauthorized", null));
        }

        String type = request.getOrDefault("vehicleType", "Bike");
        String num = request.getOrDefault("vehicleNumber", "NOT_REQUIRED");
        if (num.isBlank()) num = "NOT_REQUIRED";
        String model = request.getOrDefault("vehicleModel", "Standard");
        if (model.isBlank()) model = "Standard";
        String capacity = request.getOrDefault("vehicleCapacity", "50");
        if (capacity.isBlank()) capacity = "50";
        String fuel = request.getOrDefault("fuelType", "Petrol");
        if (fuel.isBlank()) fuel = "Petrol";

        PartnerProfile profile = profiles.findByUser(user)
                .orElseGet(() -> profiles.save(PartnerProfile.builder().user(user).verificationStatus(VerificationStatus.NEW).build()));

        Optional<PartnerVehicle> optVeh = vehicles.findByPartnerProfile(profile);
        PartnerVehicle vehicle;

        if (optVeh.isPresent()) {
            vehicle = optVeh.get();
            vehicle.setVehicleType(type);
            vehicle.setVehicleNumber(num);
            vehicle.setVehicleModel(model);
            vehicle.setVehicleCapacity(capacity);
            vehicle.setFuelType(fuel);
            vehicle.setStatus(VerificationStatus.PENDING);
        } else {
            vehicle = PartnerVehicle.builder()
                    .partnerProfile(profile)
                    .vehicleType(type)
                    .vehicleNumber(num)
                    .vehicleModel(model)
                    .vehicleCapacity(capacity)
                    .fuelType(fuel)
                    .status(VerificationStatus.PENDING)
                    .build();
        }
        vehicles.save(vehicle);

        // Check if both vehicle and KYC are submitted
        Optional<PartnerVerification> verification = verifications.findByPartnerProfile(profile);
        if (verification.isPresent()) {
            profile.setVerificationStatus(VerificationStatus.UNDER_REVIEW);
            profiles.save(profile);
        }

        Map<String, Object> resData = new HashMap<>();
        resData.put("verificationStatus", profile.getVerificationStatus().name());
        return ResponseEntity.ok(ApiResponse.ok("Vehicle details saved successfully", resData));
    }

    @GetMapping("/verification/status")
    public ResponseEntity<ApiResponse<Map<String, String>>> getVerificationStatus(@RequestHeader("Authorization") String authHeader) {
        User user = getUserFromHeader(authHeader);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.ok("Unauthorized", null));
        }

        PartnerProfile profile = profiles.findByUser(user)
                .orElseGet(() -> profiles.save(PartnerProfile.builder().user(user).verificationStatus(VerificationStatus.NEW).build()));

        Optional<PartnerVehicle> vehicle = vehicles.findByPartnerProfile(profile);
        Optional<PartnerVerification> verification = verifications.findByPartnerProfile(profile);

        Map<String, String> statusMap = new HashMap<>();
        statusMap.put("profileStatus", profile.getVerificationStatus().name());
        statusMap.put("adminReason", profile.getAdminReason());
        statusMap.put("vehicleStatus", vehicle.map(v -> v.getStatus().name()).orElse("MISSING"));
        statusMap.put("kycStatus", verification.map(k -> k.getStatus().name()).orElse("MISSING"));

        return ResponseEntity.ok(ApiResponse.ok("Verification status retrieved", statusMap));
    }

    private User getUserFromHeader(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwt.valid(token)) {
                Long identityId = jwt.getIdentityId(token);
                if (identityId != null) {
                    User user = partnerAccounts.findByAuthIdentityId(identityId)
                            .map(PartnerAccount::getSecurityUser)
                            .orElse(null);
                    if (user != null) return user;
                    Optional<AuthIdentity> ident = identities.findById(identityId);
                    if (ident.isPresent() && ident.get().getMobileNumber() != null) {
                        return users.findByMobileNumberFlexible(ident.get().getMobileNumber()).orElse(null);
                    }
                }
                String subject = jwt.subject(token);
                return users.findByMobileNumberFlexible(subject).orElse(null);
            }
        }
        return null;
    }
}
