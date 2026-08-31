package Ranex.ruvo.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    @Autowired
    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String uploadImage(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "auto"
                    )
            );

            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl != null) {
                return secureUrl.toString();
            }

            Object url = uploadResult.get("url");
            if (url != null) {
                return url.toString();
            }
        } catch (Exception e) {
            System.err.println("Cloudinary upload failed (" + e.getMessage() + "). Falling back to local disk storage.");
        }

        return saveLocally(file, folder);
    }

    private String saveLocally(MultipartFile file, String folder) {
        try {
            String sanitizedFolder = (folder == null ? "general" : folder.replace("ruvo/", "")).replaceAll("[^a-zA-Z0-9_/]", "");
            java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", sanitizedFolder);
            if (!java.nio.file.Files.exists(uploadDir)) {
                java.nio.file.Files.createDirectories(uploadDir);
            }
            String originalName = file.getOriginalFilename();
            String ext = ".jpg";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            String fileName = java.util.UUID.randomUUID().toString() + ext;
            java.nio.file.Path filePath = uploadDir.resolve(fileName);
            java.nio.file.Files.copy(file.getInputStream(), filePath);

            return "uploads/" + sanitizedFolder + "/" + fileName;
        } catch (Exception ex) {
            System.err.println("Local file save fallback failed: " + ex.getMessage());
            return null;
        }
    }
}
