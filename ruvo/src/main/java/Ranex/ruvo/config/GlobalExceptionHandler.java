package Ranex.ruvo.config;

import Ranex.ruvo.dto.ApiResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

/**
 * Keeps every API failure in the ApiResponse JSON shape. Without this advice an
 * unhandled exception fell through to Spring's Whitelabel error page, and the mobile
 * apps reported the resulting HTML as a JSON parse error instead of a usable message.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Covers ResponseStatusException and its subclasses, so declared statuses survive. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Object>> status(ResponseStatusException e) {
        String reason = e.getReason();
        return body(e.getStatusCode().value(),
                reason != null && !reason.isBlank() ? reason : "The request could not be completed.");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> unauthenticated(AuthenticationException e) {
        return body(HttpStatus.UNAUTHORIZED.value(), "Your session has expired. Please sign in again.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> denied(AccessDeniedException e) {
        return body(HttpStatus.FORBIDDEN.value(), "You do not have permission to perform this action.");
    }

    /** IllegalArgumentException carries user-facing validation text across this codebase. */
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ApiResponse<Object>> invalid(RuntimeException e) {
        return body(HttpStatus.BAD_REQUEST.value(), message(e, "That request is not valid."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> malformed(HttpMessageNotReadableException e) {
        return body(HttpStatus.BAD_REQUEST.value(), "The request body was missing or malformed.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> conflict(DataIntegrityViolationException e) {
        log(e);
        String detailed = (e.getMessage() + " " + (e.getRootCause() != null ? e.getRootCause().getMessage() : "")).toLowerCase();
        String userMsg;
        
        // ONLY treat as mobile clash if it's explicitly a duplicate entry exception
        if (detailed.contains("duplicate entry") && (detailed.contains("mobile") || detailed.contains("phone"))) {
            userMsg = "This mobile number is already linked to another Ruvo record. Contact support if you cannot sign in.";
        } else {
            // For other data issues (too long, missing non-null), bubble up the root cause gently
            String causeInfo = e.getRootCause() != null ? e.getRootCause().getMessage() : e.getMessage();
            userMsg = "A data conflict occurred. Please check your details. (" + causeInfo + ")";
        }
        return body(HttpStatus.CONFLICT.value(), userMsg);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> unexpected(Exception e) {
        log(e);
        return body(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Something went wrong on Ruvo. Please try again.");
    }

    private static String message(Exception e, String fallback) {
        String m = e.getMessage();
        return m != null && !m.isBlank() ? m : fallback;
    }

    private static void log(Exception e) {
        System.err.println("[API ERROR] " + e.getClass().getSimpleName() + ": " + e.getMessage());
        e.printStackTrace();
    }

    private static ResponseEntity<ApiResponse<Object>> body(int status, String message) {
        return ResponseEntity.status(status).body(new ApiResponse<>(false, message, null, Instant.now()));
    }
}
