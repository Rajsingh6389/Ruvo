package Ranex.ruvo.service;

import Ranex.ruvo.model.WalletLedger;
import Ranex.ruvo.repository.WalletLedgerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Service
public class WalletService {

    private final WalletLedgerRepository walletLedgerRepository;

    public WalletService(WalletLedgerRepository walletLedgerRepository) {
        this.walletLedgerRepository = walletLedgerRepository;
    }

    public BigDecimal getBalance(String userId) {
        if (userId == null || userId.isBlank()) {
            return BigDecimal.ZERO;
        }
        Optional<WalletLedger> lastTx = walletLedgerRepository.findFirstByUserIdOrderByIdDesc(userId);
        return lastTx.map(WalletLedger::getBalanceAfter).orElse(BigDecimal.ZERO);
    }

    @Transactional
    public WalletLedger credit(String userId, BigDecimal amount, String referenceId, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit amount must be positive.");
        }
        BigDecimal currentBalance = getBalance(userId);
        BigDecimal newBalance = currentBalance.add(amount).setScale(2, RoundingMode.HALF_UP);

        WalletLedger ledger = WalletLedger.builder()
                .userId(userId)
                .transactionType("CREDIT")
                .amount(amount.setScale(2, RoundingMode.HALF_UP))
                .balanceAfter(newBalance)
                .referenceId(referenceId)
                .description(description != null ? description : "Wallet Credit")
                .build();

        return walletLedgerRepository.save(ledger);
    }

    @Transactional
    public WalletLedger debit(String userId, BigDecimal amount, String referenceId, String description) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Debit amount must be positive.");
        }
        BigDecimal currentBalance = getBalance(userId);
        if (currentBalance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient wallet balance.");
        }
        BigDecimal newBalance = currentBalance.subtract(amount).setScale(2, RoundingMode.HALF_UP);

        WalletLedger ledger = WalletLedger.builder()
                .userId(userId)
                .transactionType("DEBIT")
                .amount(amount.setScale(2, RoundingMode.HALF_UP))
                .balanceAfter(newBalance)
                .referenceId(referenceId)
                .description(description != null ? description : "Wallet Debit for Order #" + referenceId)
                .build();

        return walletLedgerRepository.save(ledger);
    }
}
