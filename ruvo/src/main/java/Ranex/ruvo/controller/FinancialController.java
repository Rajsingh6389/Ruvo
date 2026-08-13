package Ranex.ruvo.controller;

import Ranex.ruvo.model.Settlement;
import Ranex.ruvo.repository.SettlementRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Financial summary APIs for Shopkeeper, Delivery Partner, and Admin dashboards.
 */
@RestController
@RequestMapping("/api/financial")
@CrossOrigin(origins = "*")
public class FinancialController {

    private final SettlementRepository settlementRepository;

    public FinancialController(SettlementRepository settlementRepository) {
        this.settlementRepository = settlementRepository;
    }

    // ───── DELIVERY PARTNER ─────

    /** Partner sees COD they still owe to shops, grouped by shop. */
    @GetMapping("/partner/{partnerId}/cod-dues")
    public ResponseEntity<?> partnerCodDues(@PathVariable Long partnerId) {
        List<Settlement> cols = settlementRepository
                .findByDeliveryPartnerIdAndSettlementTypeAndStatusIn(
                        partnerId, "COD_COLLECTION", List.of("PENDING", "OVERDUE"));
        
        Map<Long, Double> byShop = cols.stream()
                .collect(Collectors.groupingBy(Settlement::getShopId,
                        Collectors.summingDouble(Settlement::getAmount)));
        
        return ResponseEntity.ok(Map.of(
                "shopWiseCodDue", byShop,
                "totalCodHeld", byShop.values().stream().mapToDouble(Double::doubleValue).sum()
        ));
    }

    /** Partner's completed delivery earnings (PARTNER_EARNING lines). */
    @GetMapping("/partner/{partnerId}/earnings")
    public ResponseEntity<?> partnerEarnings(@PathVariable Long partnerId) {
        List<Settlement> earns = settlementRepository
                .findByDeliveryPartnerIdAndSettlementTypeAndStatusIn(
                        partnerId, "PARTNER_EARNING", List.of("PENDING", "PAID"));
        
        double paid   = earns.stream().filter(s -> "PAID".equals(s.getStatus()))
                             .mapToDouble(Settlement::getAmount).sum();
        double pending = earns.stream().filter(s -> "PENDING".equals(s.getStatus()))
                              .mapToDouble(Settlement::getAmount).sum();
        
        return ResponseEntity.ok(Map.of("paidEarnings", paid, "pendingEarnings", pending));
    }

    // ───── SHOPKEEPER ─────

    /** Shop financial summary: COD received, partner dues, RuVo fee due. */
    @GetMapping("/shop/{shopId}/summary")
    public ResponseEntity<?> shopFinancialSummary(@PathVariable Long shopId) {
        List<Settlement> all = settlementRepository.findByShopIdAndStatusIn(
                shopId, List.of("PENDING", "PAID", "OVERDUE"));

        double codReceived = all.stream()
                .filter(s -> "COD_COLLECTION".equals(s.getSettlementType()) && "PAID".equals(s.getStatus()))
                .mapToDouble(Settlement::getAmount).sum();

        Map<Long, Double> partnerDues = all.stream()
                .filter(s -> "PARTNER_EARNING".equals(s.getSettlementType())
                        && !("PAID".equals(s.getStatus())))
                .collect(Collectors.groupingBy(Settlement::getDeliveryPartnerId,
                        Collectors.summingDouble(Settlement::getAmount)));

        double ruvoDue = all.stream()
                .filter(s -> "RUVO_PLATFORM_FEE".equals(s.getSettlementType())
                        && !("PAID".equals(s.getStatus())))
                .mapToDouble(Settlement::getAmount).sum();

        return ResponseEntity.ok(Map.of(
                "codReceived", codReceived,
                "partnerDues", partnerDues,
                "ruvoDue", ruvoDue,
                "totalOutstanding", partnerDues.values().stream().mapToDouble(Double::doubleValue).sum() + ruvoDue
        ));
    }

    /** Per-shop, per-partner breakdown so shopkeeper can see each partner's dues. */
    @GetMapping("/shop/{shopId}/partner-dues")
    public ResponseEntity<?> shopPartnerDues(@PathVariable Long shopId) {
        List<Settlement> dues = settlementRepository.findByShopIdAndStatusIn(
                shopId, List.of("PENDING", "OVERDUE"))
                .stream()
                .filter(s -> "PARTNER_EARNING".equals(s.getSettlementType()))
                .toList();

        Map<Long, Double> byPartner = dues.stream()
                .collect(Collectors.groupingBy(Settlement::getDeliveryPartnerId,
                        Collectors.summingDouble(Settlement::getAmount)));

        return ResponseEntity.ok(byPartner);
    }
}
