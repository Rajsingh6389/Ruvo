/**
 * The shared UI system. Screens should import from here rather than reaching into
 * individual files, so the surface stays swappable.
 *
 * Grouping mirrors §26 of the brief: animation / loading / states / mobile /
 * drawer / sheet, plus the flat primitives that predate it.
 */

// Primitives
export { Button } from './Button';
export { Card } from './Card';
export { TextInput } from './TextInput';
export { Layout } from './Layout';
export { StatusBadge } from './StatusBadge';
export { SmartImage } from './SmartImage';
export { Skeleton } from './Skeleton';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';

// Interaction + composition primitives.
// Each of these replaced two or more hand-rolled copies living inside screens;
// see the header comment on each file for what it superseded.
export { PressableScale } from './PressableScale';
export { ScreenHeader } from './ScreenHeader';
export { SectionHeader } from './SectionHeader';
export { QuantityStepper } from './QuantityStepper';
export { PriceTag, formatRupees, resolveDiscount } from './PriceTag';
export { FilterChipRow } from './FilterChipRow';
export { SearchField } from './SearchField';
export { FavoriteButton } from './FavoriteButton';
export { StickyActionBar } from './StickyActionBar';

// Domain cards
export { ProductCard } from './ProductCard';
export { ShopCard } from './ShopCard';
export type { ShopMeta } from './ShopCard';
export { HeroCarousel } from './HeroCarousel';
export type { HeroSlide } from './HeroCarousel';

// Animation (§7)
export { FadeIn, SlideUp, ScaleIn, PageTransition, Stagger, DURATION } from './animation/Transitions';

// Loading (§8)
export {
  SkeletonGroup,
  ProductSkeleton,
  ProductGridSkeleton,
  ShopSkeleton,
  ShopListSkeleton,
  OrderSkeleton,
  OrderListSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  HomeSkeleton,
  CartSkeleton,
  ShopDetailsSkeleton,
} from './loading/Skeletons';
export { PageLoader, FullScreenLoader } from './loading/Loaders';

// API states (§10, §22)
export { ScreenState } from './states/ScreenState';
export { OfflineState, OfflineBanner, StaleDataBanner } from './states/OfflineState';

// Mobile interaction (§11, §13, §14)
export { PullToRefresh, usePullToRefresh } from './mobile/PullToRefresh';
export { BottomSheet } from './sheet/BottomSheet';
export { MobileDrawer } from './drawer/MobileDrawer';
