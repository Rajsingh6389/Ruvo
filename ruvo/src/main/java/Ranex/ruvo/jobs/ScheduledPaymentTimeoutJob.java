package Ranex.ruvo.jobs;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderItem;
import Ranex.ruvo.repository.OrderItemRepository;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.repository.PaymentRepository;
import Ranex.ruvo.repository.ProductRepository;
import Ranex.ruvo.service.WalletService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class ScheduledPaymentTimeoutJob {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final WalletService walletService;

    public ScheduledPaymentTimeoutJob(OrderRepository orderRepository,
                                      ProductRepository productRepository,
                                      OrderItemRepository orderItemRepository,
                                      PaymentRepository paymentRepository,
                                      WalletService walletService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
        this.walletService = walletService;
    }

    @Scheduled(fixedRate = 300000) // Runs every 5 minutes
    @Transactional
    public void cleanupAbandonedPayments() {
        // Find orders in PAYMENT_PENDING status older than 15 minutes
        Instant cutoff = Instant.now().minus(15, ChronoUnit.MINUTES);
        
        List<Order> abandonedOrders = orderRepository.findAll().stream()
            .filter(o -> "PAYMENT_PENDING".equals(o.getOrderStatus()))
            .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isBefore(cutoff))
            .toList();

        for (Order order : abandonedOrders) {
            // Restore reserved stock
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            for (OrderItem item : items) {
                productRepository.findById(item.getProductId()).ifPresent(product -> {
                    product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                    productRepository.save(product);
                });
            }

            // Refund wallet if used
            if (order.getWalletAmountUsed() != null && order.getWalletAmountUsed().compareTo(BigDecimal.ZERO) > 0) {
                walletService.credit(order.getUserId(), order.getWalletAmountUsed(), 
                                     "ORDER-FAILED-" + order.getId(), 
                                     "Refund wallet debit after payment timeout");
            }

            // Delete associated records to keep database clean
            paymentRepository.findByOrderId(order.getId()).ifPresent(paymentRepository::delete);
            orderItemRepository.deleteAll(items);
            orderRepository.delete(order);
        }
    }
}
