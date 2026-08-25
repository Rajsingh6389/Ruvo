package Ranex.ruvo.service;

import Ranex.ruvo.model.*;
import Ranex.ruvo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RefundService {

    private final RefundRepository refundRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final CashfreeService cashfreeService;

    public RefundService(RefundRepository refundRepository, 
                        OrderRepository orderRepository,
                        PaymentRepository paymentRepository,
                        CashfreeService cashfreeService) {
        this.refundRepository = refundRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.cashfreeService = cashfreeService;
    }

    /**
     * Initiate refund for a failed/cancelled order.
     * For COD orders: just mark as refunded (no actual money transfer)
     * For online payments: attempt refund via Cashfree
     */
    @Transactional
    public Refund initiateRefund(Long orderId, RefundReason reason, String initiatedBy, String description) {
        // Check if refund already exists
        if (refundRepository.existsByOrderId(orderId)) {
            throw new IllegalStateException("Refund already exists for order " + orderId);
        }

        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        // Only refund paid orders
        if ("COD".equalsIgnoreCase(order.getPaymentMethod())) {
            // For COD, just create a record (no actual refund needed)
            Refund refund = Refund.builder()
                .orderId(orderId)
                .userId(Long.parseLong(order.getUserId()))
                .amount(order.getTotalAmount())
                .currency("INR")
                .status(RefundStatus.COMPLETED)
                .reason(reason)
                .description(description)
                .initiatedBy(initiatedBy)
                .processedAt(Instant.now())
                .build();
            return refundRepository.save(refund);
        }

        // For online payments, find the payment
        Payment payment = paymentRepository.findByOrderId(orderId)
            .orElseThrow(() -> new IllegalStateException("No payment found for order " + orderId));

        // Only refund successful payments
        if (!"SUCCESS".equalsIgnoreCase(payment.getPaymentStatus())) {
            throw new IllegalStateException("Cannot refund payment with status: " + payment.getPaymentStatus());
        }

        // Create refund record
        Refund refund = Refund.builder()
            .orderId(orderId)
            .userId(Long.parseLong(order.getUserId()))
            .paymentId(payment.getId())
            .amount(payment.getAmount())
            .currency(payment.getCurrency())
            .status(RefundStatus.PENDING)
            .reason(reason)
            .description(description)
            .initiatedBy(initiatedBy)
            .build();

        refund = refundRepository.save(refund);

        // Attempt refund via Cashfree (if applicable)
        try {
            processRefund(refund.getId());
        } catch (Exception e) {
            // Mark as failed but don't throw - let admin handle manually
            refund.setStatus(RefundStatus.FAILED);
            refund.setDescription(description + " | Auto-refund failed: " + e.getMessage());
            refundRepository.save(refund);
        }

        return refund;
    }

    /**
     * Process a pending refund via Cashfree API
     */
    @Transactional
    public Refund processRefund(Long refundId) {
        Refund refund = refundRepository.findById(refundId)
            .orElseThrow(() -> new IllegalArgumentException("Refund not found: " + refundId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new IllegalStateException("Refund is not in PENDING status: " + refund.getStatus());
        }

        // For COD orders, just mark as completed
        Order order = orderRepository.findById(refund.getOrderId())
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if ("COD".equalsIgnoreCase(order.getPaymentMethod())) {
            refund.setStatus(RefundStatus.COMPLETED);
            refund.setProcessedAt(Instant.now());
            return refundRepository.save(refund);
        }

        // For online payments, attempt Cashfree refund
        try {
            String refundRef = "REFUND-" + refund.getId() + "-" + System.currentTimeMillis();

            // Fetch the payment record for this order
            Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new IllegalStateException("No payment found for order " + order.getId()));

            Map<String, Object> cfResult = cashfreeService.processRefund(
                payment.getCashfreeOrderId(),
                refund.getAmount(),
                refundRef,
                "RuVo refund for order #" + refund.getOrderId() + " | Reason: " + refund.getReason()
            );

            String cfRefundStatus = cfResult != null ? (String) cfResult.get("refund_status") : null;

            if ("SUCCESS".equalsIgnoreCase(cfRefundStatus)) {
                refund.setStatus(RefundStatus.COMPLETED);
            } else if ("FAILED".equalsIgnoreCase(cfRefundStatus)) {
                refund.setStatus(RefundStatus.FAILED);
            } else {
                // PENDING or PROCESSING — Cashfree will confirm via webhook or polling
                refund.setStatus(RefundStatus.PROCESSING);
            }

            refund.setRefundReference(refundRef);
            refund.setUpdatedAt(Instant.now());

            if (refund.getStatus() == RefundStatus.COMPLETED) {
                refund.setProcessedAt(Instant.now());
            }

        } catch (Exception e) {
            // Mark as failed but don't throw - let admin handle manually
            refund.setStatus(RefundStatus.FAILED);
            refund.setDescription(
                (refund.getDescription() != null ? refund.getDescription() : "") +
                " | Cashfree refund error: " + e.getMessage()
            );
        }

        return refundRepository.save(refund);
    }

    /**
     * Auto-refund based on order status (called by scheduled tasks or event handlers)
     */
    @Transactional
    public Optional<Refund> autoRefundIfEligible(Order order) {
        String status = order.getOrderStatus().toUpperCase();
        
        // Eligible statuses for auto-refund
        if (status.equals("SHOP_TIMEOUT") || 
            status.equals("CANCELLED_NO_PARTNER_FOUND") ||
            status.equals("SHOP_REJECTED") ||
            status.equals("CANCELLED_BY_SHOP")) {
            
            // Don't auto-refund COD orders
            if ("COD".equalsIgnoreCase(order.getPaymentMethod())) {
                return Optional.empty();
            }

            RefundReason reason = mapStatusToReason(status);
            try {
                Refund refund = initiateRefund(order.getId(), reason, "SYSTEM", 
                    "Auto-refund for order status: " + status);
                return Optional.of(refund);
            } catch (Exception e) {
                // Log error but don't throw
                return Optional.empty();
            }
        }

        return Optional.empty();
    }

    private RefundReason mapStatusToReason(String orderStatus) {
        return switch (orderStatus.toUpperCase()) {
            case "SHOP_TIMEOUT" -> RefundReason.SHOP_TIMEOUT;
            case "CANCELLED_NO_PARTNER_FOUND" -> RefundReason.NO_PARTNER_FOUND;
            case "SHOP_REJECTED" -> RefundReason.SHOP_REJECTED;
            case "CANCELLED_BY_SHOP" -> RefundReason.SHOP_REJECTED;
            default -> RefundReason.SYSTEM_ERROR;
        };
    }

    public List<Refund> getUserRefunds(Long userId) {
        return refundRepository.findByUserId(userId);
    }

    public List<Refund> getPendingRefunds() {
        return refundRepository.findByStatus(RefundStatus.PENDING);
    }

    public Optional<Refund> getRefundByOrderId(Long orderId) {
        return refundRepository.findByOrderId(orderId).stream().findFirst();
    }
}
