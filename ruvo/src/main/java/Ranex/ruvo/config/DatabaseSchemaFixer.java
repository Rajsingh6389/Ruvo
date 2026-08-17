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
            System.out.println(" [SCHEMA FIXER] Altering users table email & password columns to NULL...");
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");
            System.out.println(" [SCHEMA FIXER] Schema updated successfully!");
            System.out.println("=================================================");
        } catch (Exception e) {
            System.err.println("[SCHEMA FIXER WARNING] Could not modify users columns: " + e.getMessage());
        }
    }
}
