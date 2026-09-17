package Ranex.ruvo.repository;

import Ranex.ruvo.model.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByShopIdAndActiveTrue(Long shopId);
    List<Offer> findByShopId(Long shopId);
    Optional<Offer> findByCodeAndShopIdAndActiveTrue(String code, Long shopId);
}
