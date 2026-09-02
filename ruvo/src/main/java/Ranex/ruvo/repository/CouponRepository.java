package Ranex.ruvo.repository;

import Ranex.ruvo.model.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByCodeIgnoreCaseAndActiveTrue(String code);

    java.util.List<Coupon> findByActiveTrue();
}
