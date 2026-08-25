package Ranex.ruvo.util;

public class DistanceUtils {

    private static final int EARTH_RADIUS_KM = 6371;

    /** Maximum delivery radius in km. Shops beyond this are unserviceable. */
    public static final double MAX_DELIVERY_KM = 5.0;

    /**
     * Calculate straight-line distance using Haversine formula.
     *
     * @return Distance in kilometers
     */
    public static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        lat1 = Math.toRadians(lat1);
        lat2 = Math.toRadians(lat2);

        double a = Math.pow(Math.sin(dLat / 2), 2) +
                   Math.pow(Math.sin(dLon / 2), 2) *
                   Math.cos(lat1) *
                   Math.cos(lat2);

        double c = 2 * Math.asin(Math.sqrt(a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * Delivery fee tiers:
     *   0–2 km  → ₹10
     *   2–3 km  → ₹15
     *   3–5 km  → ₹20
     *   >5 km   → unserviceable (caller should check isServiceable first)
     */
    public static double calculateDeliveryFee(double distanceKm) {
        if (distanceKm <= 2.0) {
            return 10.0;
        } else if (distanceKm <= 3.0) {
            return 15.0;
        } else if (distanceKm <= 5.0) {
            return 20.0;
        } else {
            // Beyond serviceable range — return max fee as a fallback,
            // but callers should guard with isServiceable().
            return 20.0;
        }
    }

    /** Flat platform fee charged on every order. */
    public static double calculatePlatformFee(double distanceKm) {
    if (distanceKm <= 2) {
        return 5.0;
    } else if (distanceKm <= 5) {
        return 10.0;
    } else if (distanceKm <= 10) {
        return 15.0;
    } else {
        return 20.0;
    }
}

    /** Returns false when the distance exceeds the delivery radius. */
    public static boolean isServiceable(double distanceKm) {
        return distanceKm <= MAX_DELIVERY_KM;
    }
}

