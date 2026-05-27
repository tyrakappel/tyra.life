/**
 * Fractional indexing — beräknar nytt order-värde när man flyttar
 * ett item mellan två andra. Undviker att skriva om hela listan.
 *
 * - Tomt: STEP
 * - Först: prev.order / 2
 * - Sist: next.order + STEP
 * - Mitt: (prev.order + next.order) / 2
 *
 * Om mellanrummet blir för litet ( < EPSILON ) bör en bakgrundsjobb
 * eller en explicit normalisering normalisera alla orders till heltal *
 * STEP. Här exponerar vi normalizeOrders för det.
 */

export const ORDER_STEP = 1024;
const EPSILON = 0.0001;

export function computeOrder(
  prevOrder: number | null,
  nextOrder: number | null
): number {
  if (prevOrder == null && nextOrder == null) return ORDER_STEP;
  if (prevOrder == null) return (nextOrder as number) / 2;
  if (nextOrder == null) return prevOrder + ORDER_STEP;
  const mid = (prevOrder + nextOrder) / 2;
  return mid;
}

export function needsNormalization(
  prevOrder: number | null,
  nextOrder: number | null
): boolean {
  if (prevOrder == null || nextOrder == null) return false;
  return Math.abs(nextOrder - prevOrder) < EPSILON;
}

/**
 * Normaliserar en lista — returnerar nya order-värden indexerade på id.
 */
export function normalizeOrders<T extends { id: string }>(
  items: T[]
): { id: string; order: number }[] {
  return items.map((item, idx) => ({
    id: item.id,
    order: (idx + 1) * ORDER_STEP,
  }));
}
