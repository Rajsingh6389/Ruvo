import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The React Native equivalent of `@media (prefers-reduced-motion: reduce)`.
 *
 * Returns true when the user has asked the OS to limit animation (iOS: Settings
 * › Accessibility › Motion › Reduce Motion; Android: Settings › Accessibility ›
 * Remove animations). Non-essential transitions, loops and parallax must be
 * skipped outright when this is true -- not merely shortened.
 */
export const useReducedMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {
        // Treat an unreadable setting as "animate normally" rather than
        // stripping motion from every screen on a platform quirk.
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => setReduceMotion(enabled),
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};
