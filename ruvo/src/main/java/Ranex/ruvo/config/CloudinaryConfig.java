package Ranex.ruvo.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:qbm45y5k}")
    private String cloudName;

    @Value("${CLOUDNARY_API_KEY:${CLOUDINARY_API_KEY:}}")
    private String apiKey;

    @Value("${CLOUDINARY_SECRET:}")
    private String apiSecret;

    @Value("${CLOUDINARY_URL:}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinary() {
        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank() && !cloudinaryUrl.contains("${")) {
            return new Cloudinary(cloudinaryUrl);
        }

        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", cloudName);
        if (apiKey != null && !apiKey.isBlank() && !apiKey.contains("${")) {
            config.put("api_key", apiKey);
        }
        if (apiSecret != null && !apiSecret.isBlank() && !apiSecret.contains("${")) {
            config.put("api_secret", apiSecret);
        }
        config.put("secure", "true");
        return new Cloudinary(config);
    }
}
