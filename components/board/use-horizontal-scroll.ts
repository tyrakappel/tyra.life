"use client";

import { useEffect, useRef } from "react";

/**
 * Konverterar vertikalt mushjul till horisontell scroll på elementet.
 * Touch + tangentbordsscroll fungerar redan via browserns native overflow-x.
 * - Shift+wheel → standard horisontell (browser-native)
 * - Wheel utan modifier → vi mappar deltaY → horisontell scroll
 * - trackpad horisontellt (deltaX) lämnar vi i fred
 */
export function useHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Om det redan finns horisontell delta (trackpad), gör inget
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      // Annars konvertera vertikal wheel till horisontell
      if (e.deltaY === 0) return;
      // Tillåt vertikal scroll inom inre kolumner: kolla om target är inom en
      // overflow-y:auto-förälder som faktiskt har innehåll att scrolla.
      const path = e.composedPath();
      for (const node of path) {
        if (node === el) break;
        if (!(node instanceof HTMLElement)) continue;
        const style = getComputedStyle(node);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight
        ) {
          // Låt inre kolumnen scrolla vertikalt
          return;
        }
      }
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
}
