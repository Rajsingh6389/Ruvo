package Ranex.ruvo.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSchemaFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaFixer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("=================================================");
            System.out.println(" [SCHEMA FIXER] Aligning database schema for production settlement system...");

            // 1. Users table fixes
            dropColumnIfExists("users", "email");
            dropColumnIfExists("users", "country");
            dropColumnIfExists("users", "bio");
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN','USER','SHOP_OWNER','DELIVERY_PARTNER') NOT NULL");

            // 2. Delivery partners unique index
            Integer duplicatePhones = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM (SELECT phone FROM delivery_partners GROUP BY phone HAVING COUNT(*) > 1) duplicates", Integer.class);
            if (duplicatePhones != null && duplicatePhones == 0) {
                Integer indexCount = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'delivery_partners' AND index_name = 'uq_delivery_partners_phone'", Integer.class);
                if (indexCount != null && indexCount == 0) {
                    jdbcTemplate.execute("ALTER TABLE delivery_partners ADD CONSTRAINT uq_delivery_partners_phone UNIQUE (phone)");
                }
            }

            // 3. Shops cod_blocked column
            addColumnIfNotExists("shops", "cod_blocked", "TINYINT(1) NOT NULL DEFAULT 0");

            // 4. Modify settlements columns to DECIMAL(12,2)
            modifyColumnIfExists("settlements", "cod_collected", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("settlements", "delivery_charge", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("settlements", "ruvo_commission", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("settlements", "net_cash_to_shop", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("settlements", "partner_gross_earning", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("settlements", "partner_net_earning", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("settlements", "amount", "DECIMAL(12,2) DEFAULT 0.00");

            // 5. Modify orders columns to DECIMAL(12,2) and add coupon/wallet fields
            modifyColumnIfExists("orders", "total_amount", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("orders", "subtotal", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("orders", "delivery_fee", "DECIMAL(12,2) DEFAULT 0.00");
            modifyColumnIfExists("orders", "platform_fee", "DECIMAL(12,2) DEFAULT 0.00");
            addColumnIfNotExists("orders", "coupon_code", "VARCHAR(50) NULL");
            addColumnIfNotExists("orders", "coupon_discount", "DECIMAL(12,2) DEFAULT 0.00");
            addColumnIfNotExists("orders", "wallet_amount_used", "DECIMAL(12,2) DEFAULT 0.00");

            System.out.println(" [SCHEMA FIXER] Schema updated successfully!");
            System.out.println("=================================================");
        } catch (Exception e) {
            System.err.println("[SCHEMA FIXER WARNING] Could not align schema: " + e.getMessage());
        }
    }

    private void addColumnIfNotExists(String tableName, String columnName, String columnSpec) {
        try {
            Integer colCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                    Integer.class, tableName, columnName);
            if (colCount == null || colCount == 0) {
                jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnSpec);
                System.out.println(" [SCHEMA FIXER] Added column: " + tableName + "." + columnName);
            }
        } catch (Exception e) {
            System.err.println("[SCHEMA FIXER WARNING] Could not add column " + tableName + "." + columnName + ": " + e.getMessage());
        }
    }

    private void modifyColumnIfExists(String tableName, String columnName, String columnSpec) {
        try {
            Integer colCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                    Integer.class, tableName, columnName);
            if (colCount != null && colCount > 0) {
                jdbcTemplate.execute("ALTER TABLE " + tableName + " MODIFY COLUMN " + columnName + " " + columnSpec);
            }
        } catch (Exception e) {
            System.err.println("[SCHEMA FIXER WARNING] Could not modify column " + tableName + "." + columnName + ": " + e.getMessage());
        }
    }

    private void dropColumnIfExists(String tableName, String columnName) {
        try {
            Integer colCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                    Integer.class, tableName, columnName);
            if (colCount != null && colCount > 0) {
                jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP COLUMN " + columnName);
                System.out.println(" [SCHEMA FIXER] Successfully dropped column: " + tableName + "." + columnName);
            }
        } catch (Exception e) {
            System.err.println("[SCHEMA FIXER WARNING] Could not drop column " + tableName + "." + columnName + ": " + e.getMessage());
        }
    }
}
