package Ranex.ruvo.controller;

// Make sure you have the necessary imports
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api") // Best practice: include the leading slash, though "api" also works
public class HealthController {

    @GetMapping("/health")
    public String getHealth(){
        return "Ruvo App is running....."; // <-- Added the missing semicolon here
    }
}
