package Ranex.ruvo.service.bank;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class NameVerificationService {

    private static final Logger log = LoggerFactory.getLogger(NameVerificationService.class);

    private static final Set<String> HONORIFICS = Set.of(
            "MR", "MRS", "MS", "MISS", "DR", "PROF", "SHRI", "SHRIMATI",
            "SMT", "M/S", "MESSRS", "MD", "MOHD", "LATE", "KUMAR", "KUMARI"
    );

    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^A-Z0-9\\s]");
    private static final Pattern MULTIPLE_SPACES = Pattern.compile("\\s+");

    public record NameMatchResult(
            boolean isMatch,
            double similarityScore,
            String normalizedSubmitted,
            String normalizedBank,
            String reason
    ) {}

    /**
     * Compares the submitted holder name with the name returned by the banking verification provider.
     */
    public NameMatchResult verifyNameMatch(String submittedName, String bankHolderName) {
        String normSubmitted = normalizeName(submittedName);
        String normBank = normalizeName(bankHolderName);

        if (normSubmitted.isBlank() || normBank.isBlank()) {
            return new NameMatchResult(false, 0.0, normSubmitted, normBank, "One or both names are empty");
        }

        // 1. Exact match
        if (normSubmitted.equals(normBank)) {
            return new NameMatchResult(true, 1.0, normSubmitted, normBank, "Exact name match");
        }

        // 2. Token-level set match (order-independent)
        Set<String> subTokens = tokenize(normSubmitted);
        Set<String> bankTokens = tokenize(normBank);

        if (subTokens.equals(bankTokens)) {
            return new NameMatchResult(true, 1.0, normSubmitted, normBank, "Exact token match (different word order)");
        }

        // Subset match (e.g. "Raj Singh" in "Raj Kumar Singh" or vice versa)
        if (!subTokens.isEmpty() && !bankTokens.isEmpty()) {
            if (bankTokens.containsAll(subTokens) || subTokens.containsAll(bankTokens)) {
                double tokenOverlap = (double) intersectionSize(subTokens, bankTokens) / Math.max(subTokens.size(), bankTokens.size());
                if (tokenOverlap >= 0.6) {
                    return new NameMatchResult(true, Math.max(0.85, tokenOverlap), normSubmitted, normBank, "Token subset match");
                }
            }
        }

        // 3. Fuzzy similarity (Levenshtein distance)
        double levenshteinSim = calculateLevenshteinSimilarity(normSubmitted, normBank);

        // Also check sorted tokens string similarity
        String sortedSub = subTokens.stream().sorted().collect(Collectors.joining(" "));
        String sortedBank = bankTokens.stream().sorted().collect(Collectors.joining(" "));
        double sortedSim = calculateLevenshteinSimilarity(sortedSub, sortedBank);
        double maxScore = Math.max(levenshteinSim, sortedSim);

        boolean isMatch = maxScore >= 0.70; // 70% threshold for minor typos / transliteration variations
        String reason = isMatch ? String.format("Fuzzy match passed with similarity %.2f", maxScore)
                                : String.format("Name similarity too low (%.2f < 0.70)", maxScore);

        return new NameMatchResult(isMatch, Math.round(maxScore * 100.0) / 100.0, normSubmitted, normBank, reason);
    }

    public String normalizeName(String rawName) {
        if (rawName == null) return "";
        String upper = rawName.toUpperCase(Locale.ROOT).trim();
        // Remove common punctuation (.,/, etc.)
        String cleaned = NON_ALPHANUMERIC.matcher(upper).replaceAll(" ");
        String singleSpaced = MULTIPLE_SPACES.matcher(cleaned).replaceAll(" ").trim();

        // Strip known honorific prefixes and suffixes
        List<String> tokens = Arrays.stream(singleSpaced.split(" "))
                .filter(t -> !t.isBlank() && !HONORIFICS.contains(t))
                .toList();

        return String.join(" ", tokens);
    }

    private Set<String> tokenize(String name) {
        if (name == null || name.isBlank()) return Collections.emptySet();
        return Arrays.stream(name.split(" "))
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
    }

    private int intersectionSize(Set<String> set1, Set<String> set2) {
        Set<String> copy = new HashSet<>(set1);
        copy.retainAll(set2);
        return copy.size();
    }

    public static double calculateLevenshteinSimilarity(String s1, String s2) {
        if (s1.equals(s2)) return 1.0;
        int len1 = s1.length();
        int len2 = s2.length();
        if (len1 == 0 || len2 == 0) return 0.0;

        int[][] dp = new int[len1 + 1][len2 + 1];
        for (int i = 0; i <= len1; i++) dp[i][0] = i;
        for (int j = 0; j <= len2; j++) dp[0][j] = j;

        for (int i = 1; i <= len1; i++) {
            for (int j = 1; j <= len2; j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }

        int distance = dp[len1][len2];
        int maxLen = Math.max(len1, len2);
        return 1.0 - ((double) distance / maxLen);
    }
}
