# RuVo Design System — Quick Reference

## 🎨 Colors

```tsx
// Primary
RuvoQuickColors.primary         // #F5B700 (RuVo Yellow)
RuvoQuickColors.primarySoft     // #FEF3C7

// Backgrounds
RuvoQuickColors.bgPrimary       // #F8F9FB (Warm Ivory)
RuvoQuickColors.surfaceWhite    // #FFFFFF

// Semantic
RuvoQuickColors.success         // #22C55E
RuvoQuickColors.error           // #EF4444
```

## 📏 Spacing

```tsx
RuvoSemanticSpacing.screenPaddingX    // 16px (screen sides)
RuvoSemanticSpacing.contentGap        // 16px (between elements)
RuvoSemanticSpacing.sectionSpacing    // 24px (between sections)
```

## 🔘 Border Radius

```tsx
RuvoSemanticRadius.button       // 12px
RuvoSemanticRadius.card         // 16px
RuvoSemanticRadius.modal        // 24px
RuvoSemanticRadius.bottomNav    // 28px
```

## 🌟 Shadows

```tsx
RuvoSemanticShadows.card        // Card elevation
RuvoSemanticShadows.modal       // Modal depth
RuvoSemanticShadows.floatingNav // Bottom nav shadow
```

## 🎭 Components Cheat Sheet

### Button
```tsx
<RuvoButton
  variant="primary|secondary|outline|ghost"
  size="small|medium|large"
  onPress={handler}
  loading={bool}
  disabled={bool}
  icon="ionicon-name"
  fullWidth={bool}
>
  Label
</RuvoButton>
```

### Input
```tsx
<RuvoInput
  label="Email"
  value={value}
  onChangeText={setText}
  placeholder="Enter..."
  iconLeft="mail"
  iconRight="eye"
  error="Error message"
  success={bool}
  disabled={bool}
  multiline={bool}
  showCounter={bool}
  maxLength={100}
/>
```

### Card
```tsx
<RuvoCard
  variant="elevated|outlined|filled"
  size="small|medium|large"
  onPress={handler}
  noPadding={bool}
  fullWidth={bool}
>
  Content
</RuvoCard>
```

### Header
```tsx
<RuvoHeader
  title="Page Title"
  subtitle="Optional"
  showBack={bool}
  onBackPress={handler}
  rightIcon="cart"
  onRightPress={handler}
  showBorder={bool}
  showShadow={bool}
  large={bool}
/>
```

### Bottom Navigation
```tsx
<RuvoBottomNav
  items={[
    { key: 'home', label: 'Home', icon: 'home', badge: 5 },
    { key: 'orders', label: 'Orders', icon: 'receipt' }
  ]}
  activeKey={active}
  onItemPress={setActive}
/>
```

### Image Card
```tsx
<RuvoImageCard
  imageUri={url}
  aspectRatio="1:1|4:3|16:9|3:2"
  title="Product Name"
  subtitle="Shop Name"
  price="₹299"
  originalPrice="₹399"
  badge="20% OFF"
  badgeVariant="primary|success|error|warning"
  showFavorite={bool}
  isFavorite={bool}
  onFavoritePress={handler}
  onPress={handler}
  showShadow={bool}
/>
```

### Search Bar
```tsx
<RuvoSearchBar
  value={query}
  onChangeText={setQuery}
  placeholder="Search..."
  showFilter={bool}
  onFilterPress={handler}
  showVoice={bool}
  onVoicePress={handler}
  showShadow={bool}
/>
```

### Badge
```tsx
<RuvoBadge
  variant="primary|success|error|warning|info|neutral"
  size="small|medium|large"
  icon="ionicon-name"
  outlined={bool}
  pill={bool}
>
  Label
</RuvoBadge>
```

### Chip
```tsx
<RuvoChip
  variant="filled|outlined|tonal"
  size="small|medium|large"
  selected={bool}
  disabled={bool}
  icon="ionicon-name"
  onRemove={handler}
  onPress={handler}
>
  Label
</RuvoChip>
```

### Avatar
```tsx
<RuvoAvatar
  source={imageUrl}
  name="John Doe"
  size="xs|sm|md|lg|xl|2xl"
  customSize={60}
  shape="circle|square|rounded"
  icon="person"
  online={bool}
  showShadow={bool}
/>
```

### Status Badge
```tsx
<RuvoStatusBadge
  status="pending|processing|confirmed|shipped|delivered|cancelled"
  showIcon={bool}
  size="small|medium|large"
/>

<RuvoOrderStatusBadge
  status="PENDING|CONFIRMED|PREPARING|READY|PICKED_UP|DELIVERED|CANCELLED"
/>
```

### Empty State
```tsx
<RuvoEmptyState
  image={url}
  icon="cart-outline"
  iconSize={80}
  title="Empty Title"
  description="Description text"
  actionLabel="Action"
  onAction={handler}
  secondaryActionLabel="Cancel"
  onSecondaryAction={handler}
/>

// Pre-built variants
<RuvoEmptyCart onBrowse={handler} />
<RuvoEmptyOrders onBrowse={handler} />
<RuvoEmptySearch query="text" onClear={handler} />
<RuvoNoConnection onRetry={handler} />
<RuvoError onRetry={handler} />
```

### Skeleton
```tsx
<RuvoSkeleton width={200} height={20} radius={8} circle={bool} />
<RuvoSkeletonText lines={3} lineHeight={16} />
<RuvoSkeletonAvatar size={40} />
<RuvoSkeletonCard height={200} />
<RuvoSkeletonListItem showAvatar={bool} lines={2} />
<RuvoSkeletonButton width={120} height={48} />
```

### Toast
```tsx
<RuvoToast
  message="Success message"
  variant="success|error|warning|info|neutral"
  position="top|bottom"
  duration={3000}
  showClose={bool}
  onClose={handler}
  actionLabel="Undo"
  onAction={handler}
/>
```

### Modal
```tsx
<RuvoModal
  visible={bool}
  onClose={handler}
  title="Modal Title"
  size="small|medium|large|full"
  showCloseButton={bool}
  closeOnBackdrop={bool}
>
  Content
</RuvoModal>

<RuvoConfirmModal
  visible={bool}
  onClose={handler}
  title="Confirm"
  message="Are you sure?"
  confirmLabel="Yes"
  cancelLabel="No"
  onConfirm={handler}
  variant="default|danger"
/>
```

### Bottom Sheet
```tsx
<RuvoBottomSheet
  visible={bool}
  onClose={handler}
  title="Sheet Title"
  snapPoints={[0.5, 0.9]}
  initialSnapIndex={0}
  showHandle={bool}
  closeOnBackdrop={bool}
  disableDrag={bool}
>
  Content
</RuvoBottomSheet>
```

### Metric Card
```tsx
<RuvoMetricCard
  label="Total Orders"
  value="1,234"
  icon="cart"
  iconBg="#FEF3C7"
  iconColor="#F5B700"
  change={15.5}
  changeLabel="vs last month"
  onPress={handler}
/>

<RuvoCompactMetric
  label="items"
  value={5}
  icon="cart"
/>
```

## 🎬 Animations

```tsx
// Spring configs
RuvoSpringConfig.smooth    // damping: 20, stiffness: 150
RuvoSpringConfig.snappy    // damping: 15, stiffness: 200
RuvoSpringConfig.stiff     // damping: 10, stiffness: 300

// Usage
Animated.spring(animValue, {
  toValue: 1,
  ...RuvoSpringConfig.snappy,
}).start();
```

## 📦 Cloudinary Assets

```tsx
import { CloudinaryAssets } from '@ruvo/shared-design-system';

// Banners
CloudinaryAssets.banners.home
CloudinaryAssets.banners.marketplace
CloudinaryAssets.banners.grocery
CloudinaryAssets.banners.localJobs

// Dynamic assets
CloudinaryAssets.shops.getShopLogo(shopId)
CloudinaryAssets.products.getProductImage(productId)
CloudinaryAssets.categories.getCategoryImage(categoryId)

// Illustrations
CloudinaryAssets.illustrations.emptyCart
CloudinaryAssets.illustrations.noOrders
CloudinaryAssets.illustrations.error
```

## 🎯 Typography

```tsx
RuvoTypography.h1          // 36px, bold
RuvoTypography.h2          // 28px, bold
RuvoTypography.h3          // 24px, semibold
RuvoTypography.h4          // 20px, semibold
RuvoTypography.h5          // 18px, semibold
RuvoTypography.h6          // 16px, semibold

RuvoTypography.body        // 15px, regular
RuvoTypography.bodyMedium  // 15px, medium
RuvoTypography.bodySemiBold // 15px, semibold

RuvoTypography.caption     // 13px, regular
RuvoTypography.captionSmall // 12px, regular

RuvoTypography.labelSmall  // 13px, medium
RuvoTypography.overline    // 11px, semibold, uppercase
```

---

**Pro Tip**: Import everything you need in one line:

```tsx
import {
  RuvoQuickColors,
  RuvoTypography,
  RuvoSemanticSpacing,
  RuvoButton,
  RuvoCard,
  RuvoHeader,
  CloudinaryAssets,
} from '@ruvo/shared-design-system';
```
