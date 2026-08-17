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
            System.out.println(" [SCHEMA FIXER] Aligning users table with current account enums...");
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");
            // MySQL/Hibernate does not expand an existing ENUM during ddl-auto=update.
            // Without this migration, new delivery-partner identities fail with
            // 'Data truncated for column role' when writing DELIVERY_PARTNER.
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN','USER','SHOP_OWNER','DELIVERY_PARTNER') NOT NULL");
            Integer duplicatePhones = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM (SELECT phone FROM delivery_partners GROUP BY phone HAVING COUNT(*) > 1) duplicates", Integer.class);
            if (duplicatePhones != null && duplicatePhones == 0) {
                Integer indexCount = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'delivery_partners' AND index_name = 'uq_delivery_partners_phone'", Integer.class);
                if (indexCount != null && indexCount == 0) {
                    jdbcTemplate.execute("ALTER TABLE delivery_partners ADD CONSTRAINT uq_delivery_partners_phone UNIQUE (phone)");
                }
            } else {
                System.err.println("[SCHEMA FIXER WARNING] delivery_partners.phone contains duplicates; unique index was not created.");
            }
            System.out.println(" [SCHEMA FIXER] Schema updated successfully!");
            System.out.println("=================================================");
        } catch (Exception e) {
            System.err.println("[SCHEMA FIXER WARNING] Could not modify users columns: " + e.getMessage());
        }
    }
}
