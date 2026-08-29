# RuVo Shared Design System

Premium design system for the RuVo ecosystem (RuVoMobile, RuVoShop, RuVoPartner).

## 📦 What's Included

### Design Tokens
- **Colors**: Primary (RuVo Yellow #F5B700), warm ivory backgrounds, semantic colors
- **Typography**: System fonts, 10-36px scale, mobile-optimized
- **Spacing**: 4px-based system with semantic tokens
- **Radius**: 4-32px scale with semantic tokens (button, card, modal, etc.)
- **Shadows**: Premium elevation system (card, modal, floating nav, etc.)
- **Motion**: Spring animations with React Native Animated API

### Components (15 Core)

#### Layout & Navigation
- `RuvoHeader` — Premium page headers
- `RuvoBottomNav` — Floating bottom navigation with animations
- `RuvoCard` — Elevated/outlined/filled cards

#### Inputs
- `RuvoButton` — Primary/secondary/outline/ghost buttons
- `RuvoInput` — Text inputs with validation states
- `RuvoSearchBar` — Animated search with filters

#### Display
- `RuvoImageCard` — Product/shop cards with favorites
- `RuvoMetricCard` — Analytics & stats cards
- `RuvoAvatar` — User avatars with online status
- `RuvoBadge` — Status badges
- `RuvoChip` — Selectable tags/filters
- `RuvoStatusBadge` — Order/job status indicators

#### Feedback
- `RuvoSkeleton` — Loading states
- `RuvoEmptyState` — Empty/error states
- `RuvoToast` — Toast notifications

#### Overlays
- `RuvoModal` — Bottom sheet modals
- `RuvoBottomSheet` — Draggable sheets

### Cloudinary Assets
Centralized asset management with optimized delivery:
- Banners
- Shop logos
- Product images
- Category images
- Partner assets
- Illustrations
- Icons

## 🚀 Installation

Since this is a local package, link it in your apps:

```bash
# In RuvoMobile, RuvoShop, or RuvoPartner
cd RuvoMobile
npm link ../shared-design-system
```

Or add to package.json:
```json
{
  "dependencies": {
    "@ruvo/shared-design-system": "file:../shared-design-system"
  }
}
```

## 📖 Usage

### Import Tokens
```tsx
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoSemanticRadius,
  RuvoSemanticShadows,
  RuvoSpringConfig,
} from '@ruvo/shared-design-system';
```

### Import Components
```tsx
import {
  RuvoButton,
  RuvoCard,
  RuvoHeader,
  RuvoBottomNav,
  RuvoInput,
  RuvoImageCard,
} from '@ruvo/shared-design-system';
```

### Import Assets
```tsx
import { CloudinaryAssets } from '@ruvo/shared-design-system';

// Use in components
<Image source={{ uri: CloudinaryAssets.banners.grocery }} />
<Image source={{ uri: CloudinaryAssets.shops.getShopLogo('shop-id') }} />
```

## 🎨 Examples

### Button
```tsx
<RuvoButton
  variant="primary"
  size="large"
  onPress={handleSubmit}
  loading={isLoading}
  icon="cart"
>
  Add to Cart
</RuvoButton>
```

### Card
```tsx
<RuvoCard variant="elevated" size="medium">
  <Text>Card Content</Text>
</RuvoCard>
```

### Header
```tsx
<RuvoHeader
  title="Marketplace"
  showBack
  onBackPress={navigation.goBack}
  rightIcon="cart"
  onRightPress={goToCart}
/>
```

### Bottom Navigation
```tsx
<RuvoBottomNav
  items={[
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'marketplace', label: 'Market', icon: 'storefront' },
    { key: 'orders', label: 'Orders', icon: 'receipt' },
    { key: 'profile', label: 'Profile', icon: 'person' },
  ]}
  activeKey={activeTab}
  onItemPress={setActiveTab}
/>
```

### Input
```tsx
<RuvoInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  iconLeft="mail"
  error={emailError}
  autoCapitalize="none"
  keyboardType="email-address"
/>
```

### Image Card
```tsx
<RuvoImageCard
  imageUri={product.image}
  title={product.name}
  subtitle={product.shop}
  price={`₹${product.price}`}
  badge="20% OFF"
  showFavorite
  isFavorite={isFav}
  onFavoritePress={toggleFavorite}
  onPress={goToProduct}
/>
```

### Status Badge
```tsx
<RuvoStatusBadge status="delivered" />
<RuvoOrderStatusBadge status="CONFIRMED" />
```

### Empty State
```tsx
<RuvoEmptyState
  icon="cart-outline"
  title="Your cart is empty"
  description="Browse products and add items to get started"
  actionLabel="Browse Products"
  onAction={goToMarketplace}
/>
```

### Toast
```tsx
<RuvoToast
  variant="success"
  message="Item added to cart"
  duration={3000}
  onClose={hideToast}
/>
```

### Modal
```tsx
<RuvoModal
  visible={showModal}
  onClose={closeModal}
  title="Filter Products"
  size="large"
>
  <FilterContent />
</RuvoModal>
```

## 🎯 Design Principles

1. **Consistency**: Unified visual language across all RuVo apps
2. **Premium Feel**: Warm colors, soft shadows, smooth animations
3. **Mobile-First**: Optimized for touch interactions
4. **Accessibility**: Proper contrast, touch targets, screen reader support
5. **Performance**: Lightweight, optimized animations with native driver

## 🎨 Color System

```tsx
// Primary Brand
RuvoQuickColors.primary         // #F5B700 (RuVo Yellow)
RuvoQuickColors.primarySoft     // #FEF3C7 (Soft Yellow)

// Backgrounds
RuvoQuickColors.bgPrimary       // #F8F9FB (Warm Ivory)
RuvoQuickColors.bgSecondary     // #F3F4F6 (Light Gray)
RuvoQuickColors.surfaceWhite    // #FFFFFF

// Semantic
RuvoQuickColors.success         // #22C55E
RuvoQuickColors.error           // #EF4444
RuvoQuickColors.info            // #3B82F6

// Text
RuvoQuickColors.textPrimary     // #1F2937
RuvoQuickColors.textSecondary   // #6B7280
RuvoQuickColors.textTertiary    // #9CA3AF
```

## 📐 Spacing System

```tsx
RuvoSpacing.xs    // 4px
RuvoSpacing.sm    // 8px
RuvoSpacing.md    // 12px
RuvoSpacing.lg    // 16px
RuvoSpacing.xl    // 20px
RuvoSpacing['2xl'] // 24px
RuvoSpacing['3xl'] // 32px
RuvoSpacing['4xl'] // 48px

// Semantic
RuvoSemanticSpacing.screenPaddingX    // 16px
RuvoSemanticSpacing.screenPaddingY    // 16px
RuvoSemanticSpacing.headerHeight      // 60px
RuvoSemanticSpacing.contentGap        // 16px
RuvoSemanticSpacing.sectionSpacing    // 24px
```

## 🔄 Animation System

```tsx
// Spring Configs
RuvoSpringConfig.smooth   // Smooth, gentle animations
RuvoSpringConfig.snappy   // Quick, responsive animations
RuvoSpringConfig.stiff    // Tight, precise animations

// Animation Durations
RuvoAnimations.quickPress         // 150ms
RuvoAnimations.fadeInOut          // 200ms
RuvoAnimations.slideInOut         // 300ms
RuvoAnimations.modalTransition    // 350ms
```

## 🏗️ File Structure

```
shared-design-system/
├── tokens/
│   ├── colors.ts              # Color palette
│   ├── typography.ts          # Font scales & styles
│   ├── spacing.ts             # Spacing system
│   ├── radius.ts              # Border radius
│   ├── shadows.ts             # Elevation system
│   ├── motion.ts              # Animation configs
│   └── index.ts
├── assets/
│   ├── index.ts               # Main exports
│   ├── banners.ts             # Banner images
│   ├── shops.ts               # Shop logos
│   ├── products.ts            # Product images
│   ├── categories.ts          # Category icons
│   ├── partner.ts             # Partner assets
│   ├── illustrations.ts       # Empty states
│   └── icons.ts               # App icons
├── components/
│   ├── RuvoButton.tsx
│   ├── RuvoInput.tsx
│   ├── RuvoCard.tsx
│   ├── RuvoHeader.tsx
│   ├── RuvoBottomNav.tsx
│   ├── RuvoBadge.tsx
│   ├── RuvoChip.tsx
│   ├── RuvoAvatar.tsx
│   ├── RuvoSkeleton.tsx
│   ├── RuvoEmptyState.tsx
│   ├── RuvoModal.tsx
│   ├── RuvoBottomSheet.tsx
│   ├── RuvoToast.tsx
│   ├── RuvoSearchBar.tsx
│   ├── RuvoImageCard.tsx
│   ├── RuvoMetricCard.tsx
│   ├── RuvoStatusBadge.tsx
│   └── index.ts
├── index.ts                   # Main entry
├── package.json
└── README.md
```

## 🔮 Next Steps

Once screen redesigns begin:
1. Import design system in each app
2. Replace old components with new RuVo components
3. Apply consistent spacing/colors/shadows
4. Add spring animations to interactions
5. Test across all three apps

## 📝 License

MIT © RuVo Team
