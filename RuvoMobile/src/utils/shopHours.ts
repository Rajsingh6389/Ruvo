/**
 * Shop opening-hours helpers.
 *
 * `Shop.openingTime` / `closingTime` arrive as `"HH:mm"` or `"HH:mm:ss"` strings.
 * ShopDetails already formatted them for display; this adds the open/closed
 * derivation the shop cards need, and keeps both in one place.
 *
 * Everything here returns `null` when the data is missing or unparseable, so the
 * UI omits the badge entirely rather than guessing at a status. Nothing is
 * invented: if the backend does not say when a shop opens, no card claims to know.
 */

/** Minutes since midnight, or null if the string is not a usable time. */
const toMinutes = (time?: string | null): number | null => {
  if (!time) return null;

  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
};

/** `"09:30"` → `"9:30 AM"`. Null when there is nothing to format. */
export const formatShopTime = (time?: string | null): string | null => {
  const total = toMinutes(time);
  if (total == null) return null;

  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12) + 1;

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

export type ShopOpenState = {
  isOpen: boolean;
  /** Short status for a badge — "Open now" / "Closed". */
  label: string;
  /** The useful detail: when it closes if open, when it opens if closed. */
  detail: string | null;
};

/**
 * Derives whether a shop is currently open from its own opening hours.
 *
 * Handles shops whose closing time is past midnight (`22:00`–`02:00`), which a
 * naive `now >= open && now <= close` comparison reports as permanently closed.
 */
export const getShopOpenState = (
  openingTime?: string | null,
  closingTime?: string | null,
  now: Date = new Date(),
): ShopOpenState | null => {
  const open = toMinutes(openingTime);
  const close = toMinutes(closingTime);

  if (open == null || close == null) return null;

  const current = now.getHours() * 60 + now.getMinutes();
  const overnight = close <= open;

  const isOpen = overnight
    ? current >= open || current < close
    : current >= open && current < close;

  const closesAt = formatShopTime(closingTime);
  const opensAt = formatShopTime(openingTime);

  return {
    isOpen,
    label: isOpen ? 'Open now' : 'Closed',
    detail: isOpen
      ? closesAt
        ? `Closes ${closesAt}`
        : null
      : opensAt
        ? `Opens ${opensAt}`
        : null,
  };
};
