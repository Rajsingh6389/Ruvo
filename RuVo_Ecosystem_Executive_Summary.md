# RUVO ECOSYSTEM — COMPLETE ARCHITECTURE & BRAND SYSTEM SUMMARY

**Document Version**: 2.0  
**Date**: September 2026  
**Ecosystem Root**: `D:\Ruvo`  
**Brand Motto**: *Local. Connected. Moving.*

---

## 1. Executive Summary

**RuVo** is a comprehensive, hyperlocal on-demand commerce and logistics ecosystem engineered to connect local merchants, customers, and delivery partners under a unified, premium brand.

The ecosystem comprises five interconnected platforms:
1. **RuVo Mobile** (`RuvoMobile`): The customer-facing marketplace application for local discovery and ordering.
2. **RuVo Partner** (`RuvoPartner`): The real-time logistics and delivery partner application for fulfillment.
3. **RuVo Shop** (`RuvoShop`): The merchant business suite for catalog, inventory, and order lifecycle management.
4. **RuVo Admin Web** (`RuvoAdminWeb`): The centralized operations and governance portal.
5. **RuVo Backend** (`ruvo`): High-concurrency Spring Boot REST and WebSocket engine backed by MySQL.

---

## 2. Brand Identity & Design System

### 2.1 Color Palette
| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **RuVo Gold** | `#F4B400` | Primary brand color, primary action buttons, key highlights |
| **Soft Gold** | `#FFF2C2` | Active icon highlights, badge backgrounds |
| **Dark Ink** | `#171A1F` | Deep hero headers, primary typography, brand monogram |
| **Deep Navy** | `#202A3A` | Secondary dark surfaces, status cards |
| **RuVo Cream** | `#FAF7F0` | Primary app canvas and warm background |
| **White Surface** | `#FFFFFF` | Elevated cards, metric panels, modals |
| **Border Tone** | `#E7E0D5` | Card borders, dividers |
| **Success** | `#18A957` | Online status, completed orders, live delivery pin |
| **Warning** | `#E99A16` | In-progress orders, pending actions |
| **Error** | `#D94A4A` | Alerts, cancellations |
| **Info** | `#3478C8` | Wallet metrics, informational dialogs |

---

## 3. Universal Brand Launch Animation System

The RuVo ecosystem features a custom, hardware-accelerated **Brand Launch Animation** running synchronously across all mobile apps and the web portal.

### 3.1 Animation Timeline (Total: ~2.45 seconds)
1. **Phase 1 — Dot Origin (0.00s – 0.25s)**: A luminous RuVo Gold (`#F4B400`) dot appears at the center on a `#FAF7F0` cream canvas with a soft radial halo.
2. **Phase 2 — The RuVo Flow (0.25s – 0.80s)**: The dot moves along a dynamic arc trajectory, tracing a sleek geometric ribbon representing *Discover → Connect → Move*.
3. **Phase 3 — Monogram Reveal (0.80s – 1.40s)**: The flow sweeps into the dynamic **RuVo 'R' Emblem** (Left vertical Dark Ink pillar + RuVo Gold top loop + RuVo Gold kinetic leg + Emerald connection node).
4. **Phase 4 — Elastic Settle (1.40s – 1.65s)**: The symbol decelerates smoothly into position with natural spring dampening.
5. **Phase 5 — Wordmark (1.60s – 1.95s)**: The bold **`R U V O`** wordmark expands and fades in.
6. **Phase 6 — Motto Tagline (1.85s – 2.15s)**: `LOCAL • CONNECTED • MOVING` drifts upward.
7. **Phase 7 — Branded Hold (2.15s – 2.35s)**: Complete brand lockup displayed crisply for 200ms.
8. **Phase 8 — Seamless Transition (2.35s – 2.55s)**: Launch overlay executes a 320ms cubic-bezier fade-out directly into the destination screen.

---

## 4. Platform Specifications & Feature Breakdown

### 4.1 RuVo Mobile (Customer Application)
- **Role**: Hyperlocal Commerce Marketplace (`DISCOVER`)
- **Key Modules**:
  - **Dynamic Home**: Location-aware shop discovery, promotional banners, category browser.
  - **Shop & Product Details**: Image galleries, pricing tiers, stock status.
  - **Cart & Checkout**: Multi-item cart, delivery address picker, payment selection.
  - **Live Tracking**: Real-time order progress from acceptance to delivery.
  - **Order History & Reviews**: Order history records with ratings feedback.

### 4.2 RuVo Partner (Delivery Application)
- **Role**: Real-time Logistics & Fulfillment (`MOVE`)
- **Key Modules**:
  - **Dark Hero Header**: Partner name, vehicle badge, reload icon, and glowing online toggle.
  - **Prominent Status CTA**: Dual-state `GO OFFLINE` (white pill with emerald border) / `GO ONLINE` (gold pill).
  - **Live GPS Card**: Reverse-geocoded location address with refresh action.
  - **Active Delivery Run**: Live order banner with `IN PROGRESS` indicator.
  - **Earnings & Balance Grid**: 3-column metric cards for Today (`#FFFBEB`), Wallet (`#EFF6FF`), and All Time (`#ECFDF5`).
  - **Quick Actions**: Direct navigation to Available Runs, History, Earnings, and Profile.

### 4.3 RuVo Shop (Merchant Application)
- **Role**: Store & Business Management Suite (`GROW`)
- **Key Modules**:
  - **Merchant Dashboard**: Daily revenue, pending orders counter, active fulfillment runs.
  - **Product Catalog**: Add/edit items, multi-image upload, discount calculations.
  - **Order Management**: Accept/reject orders, order timeline stages (Pending → Accepted → Preparing → Ready).
  - **Rider Assignment**: Manual or automated delivery partner assignment modal.
  - **Commission Settlement**: RuVo COD platform commission tracker with 2-day auto grace period.

### 4.4 RuVo Admin Web (Operations Portal)
- **Role**: Network Oversight & Governance (`CONNECT`)
- **Key Modules**:
  - **Executive Dashboard**: System-wide GMV, order volume, live delivery partner map.
  - **Merchant & Partner Approvals**: Aadhaar, KYC, and document verification pipeline.
  - **User & Order Management**: Comprehensive search, refund authorization, and audit logs.
  - **Helpdesk & Support**: Real-time ticket management.

---

## 5. Technical Infrastructure & Port Matrix

| Service | Technology | Port | Access URL |
| :--- | :--- | :--- | :--- |
| **RuVo Mobile** | React Native / Expo SDK 54 | `8081` | `exp://192.168.31.21:8081` |
| **RuVo Partner** | React Native / Expo SDK 54 | `8082` | `exp://192.168.31.21:8082` |
| **RuVo Shop** | React Native / Expo SDK 54 | `8083` | `exp://192.168.31.21:8083` |
| **RuVo Admin Web** | React 19 / Vite / Tailwind | `5173` | `http://localhost:5173` |
| **RuVo Backend** | Spring Boot 3 / Java 17 | `8080` | `http://192.168.31.21:8080` |
| **Database** | MySQL 8.x | `3306` | `jdbc:mysql://localhost:3306/ruvo_db` |
