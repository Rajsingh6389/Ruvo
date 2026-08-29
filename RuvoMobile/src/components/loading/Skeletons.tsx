import React from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';

const pct = (n: number): DimensionValue => `${n}%` as DimensionValue;

export const SkeletonGroup = ({
  label = 'Loading content',
  style,
  children,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) => (
  <View
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel={label}
    style={style}
  >
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  </View>
);

const times = (n: number, build: (index: number) => React.ReactNode) =>
  Array.from({ length: Math.max(0, n) }, (_, index) => build(index));

export const ProductSkeleton = ({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();

  return (
    <SkeletonGroup
      label="Loading product"
      style={[
        styles.productCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Skeleton height={112} borderRadius={14} />
      <Skeleton height={14} width="84%" style={styles.gap10} />
      <Skeleton height={11} width="58%" style={styles.gap7} />
      <View style={styles.productBottom}>
        <Skeleton height={17} width="38%" />
        <Skeleton height={28} width={52} borderRadius={9} />
      </View>
    </SkeletonGroup>
  );
};

export const ProductGridSkeleton = ({ count }: { count?: number }) => {
  const { isCompact, isTablet } = useResponsive();

  const columns = isTablet ? 3 : 2;
  const total = Math.max(1, count ?? columns * 3);

  return (
    <SkeletonGroup label="Loading products" style={styles.grid}>
      <View style={styles.gridInner}>
        {times(total, i => (
          <View
            key={`product-skeleton-${i}`}
            style={[
              styles.gridCell,
              { width: pct(100 / columns) },
              isCompact && styles.gridCellTight,
            ]}
          >
            <ProductSkeleton />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
};

export const ShopSkeleton = ({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();

  return (
    <SkeletonGroup
      label="Loading shop"
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.rowInner}>
        <Skeleton width={66} height={66} borderRadius={16} />

        <View style={styles.rowBody}>
          <View style={styles.shopTitleRow}>
            <Skeleton height={15} width="62%" />
            <Skeleton height={20} width={46} borderRadius={10} />
          </View>

          <Skeleton height={11} width="88%" style={styles.gap9} />
          <View style={styles.shopMetaRow}>
            <Skeleton height={10} width="38%" />
            <Skeleton height={10} width="26%" />
          </View>
        </View>
      </View>
    </SkeletonGroup>
  );
};

export const ShopListSkeleton = ({ count = 5 }: { count?: number }) => (
  <SkeletonGroup label="Loading shops">
    {times(count, i => (
      <ShopSkeleton key={`shop-skeleton-${i}`} />
    ))}
  </SkeletonGroup>
);

export const OrderSkeleton = ({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();

  return (
    <SkeletonGroup
      label="Loading order"
      style={[
        styles.orderCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.orderHead}>
        <View style={styles.orderIdBlock}>
          <Skeleton height={14} width={112} />
          <Skeleton height={10} width={76} style={styles.gap7} />
        </View>

        <Skeleton height={24} width={84} borderRadius={12} />
      </View>

      <View style={styles.orderLine}>
        <Skeleton height={11} width="64%" />
        <Skeleton height={11} width={54} />
      </View>

      <View style={styles.orderLine}>
        <Skeleton height={11} width="43%" />
        <Skeleton height={11} width={70} />
      </View>

      <View
        style={[
          styles.orderFoot,
          { borderTopColor: colors.divider },
        ]}
      >
        <View>
          <Skeleton height={10} width={48} />
          <Skeleton height={17} width={78} style={styles.gap6} />
        </View>

        <Skeleton height={36} width={108} borderRadius={11} />
      </View>
    </SkeletonGroup>
  );
};

export const OrderListSkeleton = ({ count = 4 }: { count?: number }) => (
  <SkeletonGroup label="Loading orders">
    {times(count, i => (
      <OrderSkeleton key={`order-skeleton-${i}`} />
    ))}
  </SkeletonGroup>
);

export const DashboardSkeleton = ({ tiles = 4 }: { tiles?: number }) => {
  const { colors } = useTheme();
  const { isCompact } = useResponsive();

  const tileWidth: DimensionValue = isCompact ? '100%' : '50%';

  return (
    <SkeletonGroup label="Loading dashboard">
      <View style={styles.gridInner}>
        {times(tiles, i => (
          <View
            key={`dashboard-tile-${i}`}
            style={[styles.gridCell, { width: tileWidth }]}
          >
            <View
              style={[
                styles.tile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.tileTop}>
                <Skeleton width={34} height={34} borderRadius={10} />
                <Skeleton height={10} width="30%" />
              </View>

              <Skeleton height={24} width="68%" style={styles.gap12} />
              <Skeleton height={9} width="46%" style={styles.gap7} />
            </View>
          </View>
        ))}
      </View>

      <Skeleton
        height={14}
        width={140}
        style={styles.sectionHeading}
      />

      {times(3, i => (
        <OrderSkeleton key={`dashboard-order-${i}`} />
      ))}
    </SkeletonGroup>
  );
};

export const TableSkeleton = ({
  rows = 6,
  showHeader = true,
}: {
  rows?: number;
  showHeader?: boolean;
}) => {
  const { colors } = useTheme();

  return (
    <SkeletonGroup label="Loading table">
      {showHeader && (
        <View
          style={[
            styles.tableHead,
            { borderBottomColor: colors.border },
          ]}
        >
          <Skeleton height={12} width="30%" />
          <Skeleton height={12} width={64} />
        </View>
      )}

      {times(rows, i => (
        <View
          key={`table-row-${i}`}
          style={[
            styles.tableRow,
            { borderBottomColor: colors.divider },
          ]}
        >
          <View style={styles.tableRowMain}>
            <Skeleton height={13} width="65%" />
            <Skeleton height={10} width="40%" style={styles.gap8} />
          </View>

          <Skeleton height={22} width={72} borderRadius={11} />
        </View>
      ))}
    </SkeletonGroup>
  );
};

export const ProfileSkeleton = ({ rows = 6 }: { rows?: number }) => {
  const { colors } = useTheme();

  return (
    <SkeletonGroup label="Loading profile">
      <View
        style={[
          styles.profileHead,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Skeleton width={80} height={80} variant="circle" />

        <Skeleton
          height={17}
          width={155}
          style={styles.gap14}
        />

        <Skeleton
          height={12}
          width={112}
          style={styles.gap8}
        />
      </View>

      {times(rows, i => (
        <View
          key={`profile-row-${i}`}
          style={[
            styles.profileRow,
            { borderBottomColor: colors.divider },
          ]}
        >
          <Skeleton width={24} height={24} borderRadius={7} />
          <Skeleton
            height={13}
            width={55 + (i % 3) * 8}
            style={styles.profileRowLabel}
          />
          <Skeleton
            height={18}
            width={18}
            borderRadius={9}
          />
        </View>
      ))}
    </SkeletonGroup>
  );
};

/**
 * First-load placeholder for the Home screen.
 *
 * Mirrors Home's real running order — hero, category rail, shop rail — at the
 * real sizes, which is the whole point of a skeleton over a spinner: when the
 * data lands, nothing on screen jumps.
 */
export const HomeSkeleton = () => {
  const { colors } = useTheme();
  const { isCompact, isTablet } = useResponsive();

  const heroHeight = isTablet ? 200 : isCompact ? 158 : 178;
  const tileWidth = isTablet ? 132 : 106;

  return (
    <SkeletonGroup label="Loading home" style={styles.screenPad}>
      <Skeleton height={heroHeight} borderRadius={24} />

      <Skeleton height={14} width={150} style={styles.sectionHeading} />
      <View style={styles.rail}>
        {times(4, i => (
          <View key={`home-cat-${i}`} style={{ width: tileWidth }}>
            <Skeleton height={tileWidth * 0.86} borderRadius={14} />
            <Skeleton height={10} width="72%" style={styles.gap8} />
          </View>
        ))}
      </View>

      <Skeleton height={14} width={186} style={styles.sectionHeading} />
      <View style={styles.rail}>
        {times(3, i => (
          <View
            key={`home-shop-${i}`}
            style={[
              styles.railCard,
              { width: isTablet ? 240 : 210, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Skeleton height={88} borderRadius={10} />
            <Skeleton height={13} width="70%" style={styles.gap10} />
            <Skeleton height={10} width="46%" style={styles.gap7} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
};

/**
 * Placeholder for a Cart row plus the price-details panel.
 *
 * Cart only shows this while the delivery quote is still resolving — the items
 * themselves come from local state and are already on screen.
 */
export const CartSkeleton = ({ rows = 2 }: { rows?: number }) => {
  const { colors } = useTheme();

  return (
    <SkeletonGroup label="Loading cart" style={styles.screenPad}>
      {times(rows, i => (
        <View
          key={`cart-row-${i}`}
          style={[
            styles.cartRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Skeleton width={64} height={64} borderRadius={10} />

          <View style={styles.rowBody}>
            <Skeleton height={13} width="76%" />
            <Skeleton height={10} width="34%" style={styles.gap7} />
            <Skeleton height={15} width="42%" style={styles.gap10} />
          </View>

          <Skeleton width={92} height={34} borderRadius={10} />
        </View>
      ))}

      <View
        style={[
          styles.summary,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Skeleton height={13} width={116} />
        {times(3, i => (
          <View key={`cart-price-${i}`} style={styles.summaryLine}>
            <Skeleton height={11} width="42%" />
            <Skeleton height={11} width={58} />
          </View>
        ))}
        <View style={[styles.summaryTotal, { borderTopColor: colors.divider }]}>
          <Skeleton height={15} width="34%" />
          <Skeleton height={19} width={82} />
        </View>
      </View>
    </SkeletonGroup>
  );
};

/**
 * Placeholder for the Shop Details screen — banner, info card, chips, product
 * grid. Sized to the loaded layout so the hero does not resize under the user.
 */
export const ShopDetailsSkeleton = () => {
  const { colors } = useTheme();
  const { isCompact } = useResponsive();

  return (
    <SkeletonGroup label="Loading shop">
      <Skeleton height={isCompact ? 160 : 190} borderRadius={0} />

      <View style={styles.screenPad}>
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.shopTitleRow}>
            <Skeleton height={18} width="58%" />
            <Skeleton height={22} width={78} borderRadius={11} />
          </View>
          <Skeleton height={11} width="34%" style={styles.gap9} />

          <View style={styles.rail}>
            {times(3, i => (
              <Skeleton key={`shop-badge-${i}`} height={26} width={78} borderRadius={8} />
            ))}
          </View>

          <Skeleton height={11} width="86%" style={styles.gap12} />
        </View>

        <Skeleton height={44} borderRadius={12} style={styles.gap14} />

        <View style={styles.rail}>
          {times(4, i => (
            <Skeleton key={`shop-chip-${i}`} height={34} width={84} borderRadius={999} />
          ))}
        </View>

        <ProductGridSkeleton count={4} />
      </View>
    </SkeletonGroup>
  );
};

const styles = StyleSheet.create({
  gap6: {
    marginTop: 6,
  },
  gap7: {
    marginTop: 7,
  },

  gap8: {
    marginTop: 8,
  },

  gap9: {
    marginTop: 9,
  },

  gap10: {
    marginTop: 10,
  },

  gap12: {
    marginTop: 12,
  },

  gap14: {
    marginTop: 14,
  },

  productCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    overflow: 'hidden',
  },

  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  grid: {
    width: '100%',
  },

  gridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },

  gridCell: {
    paddingHorizontal: 5,
    paddingBottom: 12,
  },

  gridCellTight: {
    paddingBottom: 8,
  },

  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },

  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },

  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    width: '76%',
  },

  orderCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },

  orderHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  orderIdBlock: {
    flex: 1,
    minWidth: 0,
  },

  orderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    gap: 12,
  },

  orderFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 13,
  },

  tile: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 108,
    overflow: 'hidden',
  },

  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  sectionHeading: {
    marginTop: 18,
    marginBottom: 12,
  },

  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 11,
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: 14,
    gap: 12,
  },

  tableRowMain: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  profileHead: {
    alignItems: 'center',
    paddingVertical: 22,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 16,
    gap: 12,
  },

  profileRowLabel: {
    flex: 1,
    minWidth: 0,
  },

  // ── Screen-shaped skeletons (Home / Cart / ShopDetails) ─────────────────

  screenPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  rail: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    // The rail is a preview of a horizontally scrolling row, so anything past
    // the viewport is simply clipped rather than wrapped onto a second line.
    overflow: 'hidden',
  },

  railCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
  },

  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },

  summary: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    overflow: 'hidden',
  },

  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },

  summaryTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
    gap: 12,
  },

  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
  },
});