/**
 * Pastellpalett för auto-tilldelad sektionsfärg.
 * Används primärt i "spectrum"-temat där varje kolumn får egen kulör.
 * Andra teman använder färgen som en subtil accent-stripe.
 */

export const SECTION_PALETTE = [
  "#fca5a5", // coral
  "#fcd34d", // sun
  "#86efac", // mint
  "#93c5fd", // sky
  "#f0abfc", // pink
  "#fb923c", // tangerine
  "#a78bfa", // violet
  "#5eead4", // teal
  "#fde68a", // butter
  "#fdba74", // peach
] as const;

export function getAutoColor(index: number): string {
  return SECTION_PALETTE[index % SECTION_PALETTE.length];
}

export function resolveSectionColor(
  storedColor: string | null | undefined,
  fallbackIndex: number
): string {
  return storedColor || getAutoColor(fallbackIndex);
}
