/**
 * Plattformens genvägstangent: ⌘ på Mac (och iPad med tangentbord),
 * Ctrl på Windows och Linux. Används för ⌘/Ctrl + 1..9 i board-väljarna.
 */
export const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/i.test(
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? navigator.userAgent
  );

export const MOD_KEY_LABEL = isMac ? "⌘" : "Ctrl+";

/** Sant när bara plattformens genvägstangent är nedtryckt. */
export function isModOnly(e: KeyboardEvent) {
  const mod = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  return mod && !e.shiftKey && !e.altKey;
}
