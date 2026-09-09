# RuVo Motion & Visual Design System

## 1. Brand Essence
- **Brand Name**: RUVO
- **Core Motto**: *Local. Connected. Moving.*
- **Ecosystem Pillars**:
  - **RuVo Mobile**: Customer Marketplace (`DISCOVER`)
  - **RuVo Partner**: Delivery & Logistics (`MOVE`)
  - **RuVo Shop**: Merchant & Store Management (`GROW`)
  - **RuVo Admin**: Network & Operations (`CONNECT`)

---

## 2. Color Palette
```typescript
export const RUVO_COLORS = {
  primary: '#F4B400',       // RuVo Gold
  primarySoft: '#FFF2C2',   // Soft Gold Accent
  ink: '#171A1F',           // Dark Ink (Typography & Monogram)
  deepNavy: '#202A3A',      // Secondary Charcoal
  background: '#FAF7F0',    // RuVo Cream
  surface: '#FFFFFF',       // Pure White
  border: '#E7E0D5',        // Subtle Outline
  success: '#18A957',       // Live / Active
  warning: '#E99A16',       // Pending
  error: '#D94A4A',         // Alert
  info: '#3478C8',          // Informational
};
```

---

## 3. Motion Signature: The RuVo Flow
The **RuVo Flow** represents the journey of discovery, connection, and movement across local neighborhoods.

### Animation Timeline (Total: 2.45s)
| Phase | Time Range | Component | Visual Behavior |
| :--- | :--- | :--- | :--- |
| **Phase 1** | 0.00s – 0.25s | RuVo Dot | Originates at center, scales up with soft glow |
| **Phase 2** | 0.25s – 0.80s | RuVo Flow | Dot moves along trajectory; golden path traces |
| **Phase 3** | 0.80s – 1.35s | Symbol Reveal | Path sweeps into the dynamic 'R' monogram |
| **Phase 4** | 1.35s – 1.65s | Elastic Settle | Monogram scales to 1.0 with subtle natural deceleration |
| **Phase 5** | 1.60s – 1.95s | Wordmark | "RUVO" spreads and fades in beneath the symbol |
| **Phase 6** | 1.85s – 2.15s | Tagline | "Local. Connected. Moving." drifts upward |
| **Phase 7** | 2.15s – 2.35s | Branded Hold | Complete brand lockup displayed crisply |
| **Phase 8** | 2.35s – 2.55s | Transition | Seamless fade-out into the target application |

---

## 4. Native Splash Synchronization
To eliminate any white flash, black flash, or double splash:
1. `expo-splash-screen` holds the native splash until the React Native root is mounted.
2. `SplashScreen.hideAsync()` is invoked immediately as `RuvoLaunchScreen` activates.
3. `RuvoLaunchScreen` runs the animation sequence and seamlessly passes control to the app navigation.
