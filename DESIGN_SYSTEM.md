# RuVo Unified Design System

A modern, accessible design system used across **RuvoPartner** and **RuvoShop** applications.

## 🎨 Color Palette

### Primary Colors
- **Primary**: `#3B82F6` (Vibrant Blue) - Main brand color
- **Primary Light**: `#60A5FA` (Lighter blue)
- **Primary Soft**: `#EFF6FF` (Very light blue background)
- **Secondary**: `#8B5CF6` (Purple) - Accent for secondary actions
- **Accent**: `#EC4899` (Pink) - Highlights and CTAs

### Semantic Colors
- **Success**: `#10B981` (Green)
- **Error**: `#EF4444` (Red)
- **Warning**: `#F59E0B` (Amber)
- **Info**: `#0EA5E9` (Cyan)

### Light Theme
- **Background**: `#F9FAFB` (Light gray)
- **Surface**: `#FFFFFF` (White)
- **Card**: `#FFFFFF` (White)
- **Border**: `#E5E7EB` (Light border)
- **Text Primary**: `#111827` (Dark gray)
- **Text Secondary**: `#6B7280` (Medium gray)
- **Text Hint**: `#9CA3AF` (Light gray)

### Dark Theme
- **Background**: `#0F172A` (Dark blue-gray)
- **Surface**: `#1E293B` (Darker blue-gray)
- **Card**: `#1E293B` (Darker blue-gray)
- **Border**: `#334155` (Medium border)
- **Text Primary**: `#F8FAFC` (Light)
- **Text Secondary**: `#CBD5E1` (Medium light)
- **Text Hint**: `#94A3B8` (Light gray)

## 📐 Spacing System

Standard spacing unit: `4px` increments

- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px
- `2xl`: 24px
- `3xl`: 32px

## 🔵 Border Radius

- `xs`: 2px (minimal rounding)
- `sm`: 4px (small components)
- `md`: 8px (standard components)
- `lg`: 12px (large cards)
- `card`: 12px (card containers)
- `input`: 8px (input fields)
- `button`: 8px (buttons)
- `pill`: 999px (fully rounded pills)

## 🎯 Typography

### Headings
- **Heading XL**: 28px, bold (max 2 lines)
- **Heading L**: 24px, bold (section headers)
- **Heading M**: 20px, bold (card titles)
- **Heading S**: 16px, bold (subsection headers)

### Body Text
- **Body**: 16px, regular (main content)
- **Body Strong**: 16px, bold (emphasized text)
- **Label**: 14px, bold (field labels, badges)
- **Caption**: 12px, regular (helper text, hints)

## 🧩 Shared Components

### Button Component
```typescript
<Button
  label="Action"
  onPress={() => {}}
  variant="primary" // primary | secondary | outline | ghost
  size="md" // sm | md | lg
  icon="arrow-forward"
  colors={colors}
  typography={typography}
/>
```

**Variants:**
- **Primary**: Vibrant blue background (main CTAs)
- **Secondary**: Light blue background (secondary actions)
- **Outline**: Transparent with blue border (tertiary actions)
- **Ghost**: No background (links/minimal actions)

### Input Component
```typescript
<Input
  label="Name"
  icon="person-outline"
  placeholder="Enter name"
  error={error}
  helper="Helper text"
  required
  colors={colors}
  typography={typography}
/>
```

### Card Component
```typescript
<Card
  colors={colors}
  shadow="md" // sm | md | lg
>
  {/* Content */}
</Card>
```

### Alert Component
```typescript
<Alert
  type="success" // success | error | warning | info
  title="Success!"
  message="Your action completed"
  action={{ label: "Undo", onPress: () => {} }}
  colors={colors}
  typography={typography}
/>
```

### Badge Component
```typescript
<Badge
  label="Approved"
  variant="success" // default | success | error | warning | info
  size="md" // sm | md
  icon="checkmark-circle"
  colors={colors}
  typography={typography}
/>
```

### Empty State Component
```typescript
<EmptyState
  icon="inbox-outline"
  title="No items"
  subtitle="Get started by creating something"
  action={{ label: "Create", onPress: () => {} }}
  colors={colors}
  typography={typography}
/>
```

### Header Component
```typescript
<Header
  title="Screen Title"
  subtitle="Subtitle"
  onBack={() => navigation.goBack()}
  rightAction={{ icon: "settings", onPress: () => {} }}
  colors={colors}
  typography={typography}
/>
```

## 🎯 Onboarding Screens

Both apps share a similar onboarding design system:

**RuvoPartner** (7 steps):
1. Basic Details (OTP + name)
2. Vehicle Type Selection
3. Aadhaar Verification
4. Onboarding Fee (₹0)
5. Bank Account Verification
6. Shop Selection (Multi-select)
7. Success Screen

**RuvoShop** (4 steps):
1. Shop Details
2. Aadhaar Verification
3. Bank Account Verification
4. Success Screen

### Step Progress Bar
Shows visual progress across all onboarding steps with:
- Circular indicators (28px diameter)
- Step labels below
- Progress line connecting steps
- Filled circles for completed steps
- Active state highlighting

## 🌙 Light/Dark Mode

Both themes maintain:
- High contrast ratios (WCAG AA compliant)
- Semantic color relationships
- Consistent spacing and typography
- Platform-appropriate shadows/elevations

## ✅ Accessibility Features

- Minimum 44x44px touch targets
- Clear visual hierarchy
- Color-independent status indicators
- Semantic HTML/accessibility labels
- Sufficient color contrast ratios
- Readable font sizes (minimum 16px for body)

## 🚀 Usage Guidelines

### For Developers

1. **Always use theme colors** from `useTheme()` hook
2. **Use shared components** for consistency
3. **Follow spacing system** for consistency
4. **Respect typography scale** for readability
5. **Test in both light/dark modes**

### For Designers

1. **Use only the specified color palette**
2. **Maintain consistent spacing** (4px grid)
3. **Follow typography scale** strictly
4. **Design for both light and dark modes**
5. **Test accessibility** with tools

## 📦 File Structure

```
RuvoPartner/
├── src/
│   ├── design/
│   │   └── DesignSystem.tsx (shared components)
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── radius.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── shadows.ts
│   └── screens/
│       └── onboarding/
│           ├── OnboardingShared.tsx
│           ├── Step1_*.tsx
│           └── ...

RuvoShop/
├── src/
│   ├── design/
│   │   └── DesignSystem.tsx (shared components)
│   ├── theme/
│   │   └── (same as RuvoPartner)
│   └── screens/
│       └── onboarding/
│           └── (same structure)
```

## 🔄 Migration Notes

**Removed:**
- Dark green (#173F35) - replaced with vibrant blue (#3B82F6)
- Warm cream palette - replaced with clean modern grays
- Legacy button styles - now using variant system

**Added:**
- Unified design system components
- Purple secondary accent (#8B5CF6)
- Pink accent color (#EC4899)
- Better light/dark contrast
- Comprehensive component library

## 📞 Support

For design system questions, refer to:
- `RuvoPartner/src/design/DesignSystem.tsx`
- `RuvoPartner/src/screens/onboarding/OnboardingShared.tsx`
- `RuvoShop/src/design/DesignSystem.tsx`
- `RuvoShop/src/screens/onboarding/OnboardingShared.tsx`
