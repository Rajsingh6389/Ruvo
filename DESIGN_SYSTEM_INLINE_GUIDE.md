ys# Design System Inline Guide - Self-Contained Approach

## Overview
**ALL styling should be inline in each screen file using Tailwind/NativeWind.** No external component imports, no centralized utilities. Each app (RuvoMobile, RuvoShop, RuvoPartner) is completely independent.

## Color System (Tailwind Config)
```
Primary: ruvo-yellow (#F5B700)
Background: ruvo-bg (#FBF8F2)
Surface: white
Ink: ruvo-ink (#231C10)
Accent: ruvo-accent (#2E7D32) - green
Error: #EF4444
```

## ✅ Already Self-Contained Screens (Examples)

### 1. HomeScreen.tsx
- ✅ All UI inline with Tailwind
- ✅ No design-system imports
- ✅ Self-contained

### 2. CartScreen.tsx
- ✅ All buttons, cards inline
- ✅ No external style components
- ✅ Self-contained

### 3. CheckoutScreen.tsx
- ✅ All forms, inputs inline
- ✅ No external style components
- ✅ Self-contained

---

## Common Patterns (Copy-Paste in Screen Files)

### 1. Button (RuvoButton)
**OLD (component import):**
```jsx
import { RuvoButton } from '../../components/design-system';
<RuvoButton label="Click me" variant="primary" onPress={handlePress} />
```

**NEW (inline):**
```jsx
<Pressable
  onPress={handlePress}
  className="bg-ruvo-yellow px-4 py-2.5 rounded-xl flex-row items-center justify-center"
>
  <Text className="text-ruvo-ink font-bold text-base">Click me</Text>
</Pressable>
```

**Variants:**
- `primary`: bg-ruvo-yellow text-ruvo-ink
- `secondary`: bg-warm-100 border border-warm-300 text-ruvo-ink
- `danger`: bg-red-500 text-white
- `outline`: bg-transparent border-2 border-ruvo-yellow text-ruvo-yellow

---

### 2. Input (RuvoInput)
**OLD:**
```jsx
<RuvoInput label="Name" value={name} onChange={setName} />
```

**NEW:**
```jsx
<View>
  <Text className="text-sm font-semibold text-ruvo-ink mb-1">Name</Text>
  <TextInput
    value={name}
    onChangeText={setName}
    className="border border-gray-200 rounded-lg px-3 py-2.5 text-ruvo-ink"
    placeholderTextColor="#9CA3AF"
  />
</View>
```

---

### 3. Card (generic container)
**OLD:**
```jsx
<Card>
  <Text>Content</Text>
</Card>
```

**NEW:**
```jsx
<View className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <Text>Content</Text>
</View>
```

---

### 4. Badge/Status Badge
**OLD:**
```jsx
<Badge status="success">Delivered</Badge>
```

**NEW:**
```jsx
<View className="bg-green-100 rounded px-2 py-1">
  <Text className="text-green-700 text-xs font-semibold">Delivered</Text>
</View>
```

---

### 5. Loading State
**OLD:**
```jsx
<LoadingState title="Loading..." />
```

**NEW:**
```jsx
<View className="flex-1 justify-center items-center">
  <ActivityIndicator size="large" color="#F5B700" />
  <Text className="text-sm text-gray-600 mt-3">Loading...</Text>
</View>
```

---

### 6. Empty State
**OLD:**
```jsx
<EmptyState
  icon="cart-outline"
  title="Cart is empty"
  subtitle="Add items to continue"
/>
```

**NEW:**
```jsx
<View className="flex-1 items-center justify-center px-6">
  <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
  <Text className="text-lg font-bold text-ruvo-ink mt-4">Cart is empty</Text>
  <Text className="text-sm text-gray-600 mt-2 text-center">Add items to continue</Text>
</View>
```

---

### 7. Error State
**OLD:**
```jsx
<ErrorState title="Error" subtitle="Try again" onRetry={handleRetry} />
```

**NEW:**
```jsx
<View className="flex-1 items-center justify-center px-6">
  <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
  <Text className="text-lg font-bold text-ruvo-ink mt-4">Error</Text>
  <Text className="text-sm text-gray-600 mt-2 text-center">Try again</Text>
  <Pressable
    onPress={handleRetry}
    className="bg-ruvo-yellow px-6 py-2.5 rounded-lg mt-4"
  >
    <Text className="text-ruvo-ink font-bold">Retry</Text>
  </Pressable>
</View>
```

---

### 8. Section Header
**OLD:**
```jsx
<SectionHeader title="Popular Stores" viewAllLink="/stores" />
```

**NEW:**
```jsx
<View className="flex-row justify-between items-center mb-3">
  <Text className="text-lg font-bold text-ruvo-ink">Popular Stores</Text>
  <Pressable onPress={() => navigation.navigate('Stores')}>
    <Text className="text-ruvo-yellow font-semibold text-sm">View All</Text>
  </Pressable>
</View>
```

---

### 9. Product Card (Grid Item)
**OLD:**
```jsx
<ProductCard product={item} onAddToCart={handleAdd} />
```

**NEW:**
```jsx
<Pressable className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden m-1.5">
  <Image
    source={{ uri: item.imageUrl }}
    className="w-full h-32"
    resizeMode="cover"
  />
  <View className="p-2">
    <Text className="text-sm font-semibold text-ruvo-ink" numberOfLines={2}>
      {item.name}
    </Text>
    <Text className="text-ruvo-accent text-sm font-bold mt-1">
      ₹{item.sellingPrice}
    </Text>
    <Pressable
      onPress={() => handleAdd(item)}
      className="bg-ruvo-yellow rounded mt-2 py-1.5"
    >
      <Text className="text-ruvo-ink font-bold text-xs text-center">Add</Text>
    </Pressable>
  </View>
</Pressable>
```

---

### 10. Shop Card
**OLD:**
```jsx
<ShopCard shop={shop} onPress={handlePress} />
```

**NEW:**
```jsx
<Pressable
  onPress={handlePress}
  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
>
  <Image
    source={{ uri: shop.bannerUrl }}
    className="w-full h-28"
    resizeMode="cover"
  />
  <View className="p-3">
    <Text className="text-sm font-bold text-ruvo-ink">{shop.name}</Text>
    <View className="flex-row items-center gap-2 mt-1">
      <Ionicons name="star" size={14} color="#F5B700" />
      <Text className="text-xs text-gray-600">{shop.rating} • {shop.distance}km</Text>
    </View>
  </View>
</Pressable>
```

---

## Implementation Strategy - Self-Contained Approach

### Key Principle
**Every screen file is 100% self-contained:**
- ✅ All Tailwind classes inline in the same file
- ✅ NO imports from design-system/
- ✅ NO imports from utils/
- ✅ NO centralized component files
- ✅ Copy-paste Tailwind patterns directly

### Example: Self-Contained Screen
```tsx
// ProfileScreen.tsx - Everything inline, no external imports

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  // Business logic
  const handleLogout = () => { /* ... */ };

  // UI - All inline with Tailwind
  return (
    <View className="flex-1 bg-ruvo-bg">
      {/* Header - inline */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-lg font-bold text-ruvo-ink">Profile</Text>
      </View>

      {/* Button - inline */}
      <Pressable
        onPress={handleLogout}
        className="bg-ruvo-yellow px-4 py-2.5 rounded-xl mx-4"
      >
        <Text className="text-ruvo-ink font-bold text-center">Logout</Text>
      </Pressable>

      {/* Card - inline */}
      <View className="bg-white rounded-lg border border-gray-200 p-4 mx-4 mt-4">
        <Text className="text-ruvo-ink">Settings content...</Text>
      </View>
    </View>
  );
}
```

### Phase 1: Convert Core Screens ✅ DONE
1. HomeScreen (already done)
2. NearbyShopsScreen (already done)
3. ShopDetailsScreen (already done)
4. ProductDetailsScreen (already done)
5. CartScreen (already done)
6. CheckoutScreen (already done)

### Phase 2: Convert Remaining RuvoMobile Screens
- ProfileScreen
- OrderHistoryScreen
- GroceriesScreen
- LoginScreen
- RegisterScreen
- All others

### Phase 3: Convert RuvoShop Screens
- Similar pattern, use same Tailwind utilities

### Phase 4: Convert RuvoPartner Screens
- Similar pattern, use same Tailwind utilities

### Phase 5: Cleanup
- Delete design-system/ directory
- Delete ALL external component files (Button.tsx, Card.tsx, etc.)
- Delete utils/designSystem.ts (no centralized utilities)
- Each screen is 100% self-contained

---

## NO Utilities Reference

**Do NOT import anything from utilities.** Copy-paste Tailwind classes directly in each screen.

**❌ WRONG:**
```tsx
import { buttonVariants } from '../../utils/designSystem';
<Pressable className={buttonVariants.primary}>
```

**✅ CORRECT:**
```tsx
<Pressable className="bg-ruvo-yellow px-4 py-2.5 rounded-xl">
```

---

## Quick Inline Reference

| Component | Tailwind Pattern |
|-----------|-----------------|
| Primary Button | `bg-ruvo-yellow px-4 py-2.5 rounded-xl text-ruvo-ink font-bold` |
| Secondary Button | `bg-warm-100 border border-warm-300 px-4 py-2.5 rounded-xl text-ruvo-ink` |
| Danger Button | `bg-red-500 px-4 py-2.5 rounded-xl text-white font-bold` |
| Input Field | `border border-gray-200 rounded-lg px-3 py-2.5 text-ruvo-ink` |
| Card Container | `bg-white rounded-lg border border-gray-200 shadow-sm p-4` |
| Badge | `bg-{color}-100 text-{color}-700 px-2 py-1 rounded text-xs font-semibold` |
| Header Text | `text-lg font-bold text-ruvo-ink` |
| Subtext | `text-sm text-gray-600` |
| Success State | `bg-green-100 border border-green-200 rounded-lg p-3` |
| Error State | `bg-red-100 border border-red-200 rounded-lg p-3` |

---

## Notes
- **Each screen file is 100% self-contained**
- All components use NativeWind className syntax
- Colors reference tailwind.config.js RuVo theme
- NO external component imports
- NO centralized utilities
- Copy-paste Tailwind patterns directly into screen files
- Each app (RuvoMobile, RuvoShop, RuvoPartner) is independent
