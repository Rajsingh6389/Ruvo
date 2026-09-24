package Ranex.ruvo.service;

import Ranex.ruvo.model.Order;
import Ranex.ruvo.model.OrderStatus;
import Ranex.ruvo.repository.OrderRepository;
import Ranex.ruvo.model.Payment;
import Ranex.ruvo.repository.PaymentRepository;
import Ranex.ruvo.repository.ProductRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

@Service
public class OrderMaintenanceService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final RefundService refundService;
    private final NotificationService notificationService;
    private final RazorpayRouteService razorpayRouteService;

    public OrderMaintenanceService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            PaymentRepository paymentRepository,
            RefundService refundService,
            NotificationService notificationService,
            RazorpayRouteService razorpayRouteService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
        this.refundService = refundService;
        this.notificationService = notificationService;
        this.razorpayRouteService = razorpayRouteService;
    }

    // Runs every minute
    @Scheduled(fixedRate = 60000)
    public void processOrderTimeoutsAndRefunds() {
        // 1. Process Order Timeouts
        List<Order> pendingOrders = orderRepository.findAll(); // Optimization: use findByOrderStatusIn in production
        for (Order order : pendingOrders) {
            checkAndTimeoutOrder(order);
        }
        
        // 2. Retry failed refunds (fallback logic)
        List<String> cancelledStatuses = Arrays.asList(
            OrderStatus.SHOP_TIMEOUT, 
            "CANCELLED_NO_PARTNER_FOUND", 
            "CANCELLED_BY_SHOP", 
            "CANCELLED_BY_USER", 
            OrderStatus.SHOP_REJECTED
        );

        for (Order order : pendingOrders) {
            if (cancelledStatuses.contains(order.getOrderStatus().toUpperCase())) {
                boolean isOnline = "ONLINE".equalsIgnoreCase(order.getPaymentMethod()) || "RAZORPAY".equalsIgnoreCase(order.getPaymentMethod());
                boolean isPaid = "SUCCESS".equalsIgnoreCase(order.getPaymentStatus());
                
                // If it is a cancelled online order and STILL marked as SUCCESS (meaning it hasn't been moved to REFUNDED/REFUND_INITIATED)
                if (isOnline && isPaid) {
                    
                    // Safety migration for old orders: if a refund entry already exists, just update the status and stop polling!
                    if (refundService.getRefundByOrderId(order.getId()).isPresent()) {
                        order.setPaymentStatus("REFUND_INITIATED");
                        orderRepository.save(order);
                        paymentRepository.findByOrderId(order.getId()).ifPresent(p -> {
                            p.setPaymentStatus("REFUND_INITIATED");
                            paymentRepository.save(p);
                        });
                        continue;
                    }

                    try {
                        System.out.println("[OrderMaintenanceService] Retrying refund for cancelled order: " + order.getId());
                        refundService.autoRefundIfEligible(order);
                    } catch (Exception e) {
                        System.err.println("[OrderMaintenanceService] Refund retry failed for order " + order.getId() + ": " + e.getMessage());
                    }
                }
            } else if ("DELIVERED".equalsIgnoreCase(order.getOrderStatus())) {
                // 3. Retry failed escrow payouts (fallback logic)
                boolean isOnline = "ONLINE".equalsIgnoreCase(order.getPaymentMethod()) || "RAZORPAY".equalsIgnoreCase(order.getPaymentMethod());
                boolean isPaid = "SUCCESS".equalsIgnoreCase(order.getPaymentStatus());
                
                if (isOnline && isPaid) {
                    paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
                        if (payment.getRazorpayPaymentId() != null && !payment.getRazorpayPaymentId().isBlank() && !"SUCCESS".equals(payment.getEscrowTransferStatus())) {
                            try {
                                System.out.println("[OrderMaintenanceService] Retrying escrow split payout for order: " + order.getId());
                                boolean success = razorpayRouteService.createTransferOnDelivery(order, payment.getRazorpayPaymentId());
                                if (success) {
                                    payment.setEscrowTransferStatus("SUCCESS");
                                    paymentRepository.save(payment);
                                }
                            } catch (Exception e) {
                                System.err.println("[OrderMaintenanceService] Escrow split payout retry failed for order " + order.getId() + ": " + e.getMessage());
                            }
                        }
                    });
                }
            }
        }
    }

    private void checkAndTimeoutOrder(Order order) {
        if (order == null || order.getOrderStatus() == null) return;

        // 1. Shopkeeper response timeout (10 minutes)
        if (OrderStatus.SHOP_PENDING.equalsIgnoreCase(order.getOrderStatus())) {
            Instant deadline = order.getShopResponseDeadline();
            Instant refTime = order.getCreatedAt() != null ? order.getCreatedAt() : Instant.now();
            boolean timedOut = (deadline != null && Instant.now().isAfter(deadline)) ||
                               Instant.now().isAfter(refTime.plus(10, ChronoUnit.MINUTES));
            if (timedOut) {
                order.setOrderStatus(OrderStatus.SHOP_TIMEOUT);
                // Restore product stock
                if (order.getProductId() != null && order.getQuantity() != null) {
                    productRepository.findById(order.getProductId()).ifPresent(p -> {
                        p.setStockQuantity(p.getStockQuantity() + order.getQuantity());
                        productRepository.save(p);
                    });
                }
                orderRepository.save(order);

                try {
                    refundService.autoRefundIfEligible(order);
                } catch (Exception e) {
                    System.err.println("Failed to process refund for order " + order.getId() + ": " + e.getMessage());
                }

                notificationService.notifyCustomer(order, "Order Cancelled",
                    "The shop did not accept your order in time. Your order has been cancelled.", OrderStatus.SHOP_TIMEOUT);
                return;
            }
        }

        // 2. Delivery Partner Assignment Timeout
        if (order.getDeliveryPartnerId() == null &&
            (OrderStatus.DELIVERY_ASSIGNMENT.equalsIgnoreCase(order.getOrderStatus()) ||
             OrderStatus.SHOP_ACCEPTED.equalsIgnoreCase(order.getOrderStatus()))) {
            Instant refTime = order.getUpdatedAt() != null ? order.getUpdatedAt() : order.getCreatedAt();
            if (refTime != null && Instant.now().isAfter(refTime.plus(10, ChronoUnit.MINUTES))) {
                order.setOrderStatus("CANCELLED_NO_PARTNER_FOUND");
                // Restore product stock
                if (order.getProductId() != null && order.getQuantity() != null) {
                    productRepository.findById(order.getProductId()).ifPresent(p -> {
                        p.setStockQuantity(p.getStockQuantity() + order.getQuantity());
                        productRepository.save(p);
                    });
                }
                orderRepository.save(order);

                try {
                    refundService.autoRefundIfEligible(order);
                } catch (Exception e) {
                    System.err.println("Failed to process refund for order " + order.getId() + ": " + e.getMessage());
                }

                notificationService.notifyCustomer(order, "Order Cancelled",
                    "No delivery partner could be assigned within 10 minutes.", "CANCELLED_NO_PARTNER_FOUND");
            }
        }
    }
}
