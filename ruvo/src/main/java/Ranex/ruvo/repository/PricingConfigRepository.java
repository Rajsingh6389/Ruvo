package Ranex.ruvo.repository;

import Ranex.ruvo.model.PricingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PricingConfigRepository extends JpaRepository<PricingConfig, Long> {
    List<PricingConfig> findByIsActiveTrue();
}
