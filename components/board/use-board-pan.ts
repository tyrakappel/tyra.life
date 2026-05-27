"use client";

import { useEffect, type RefObject } from "react";

/**
 * Click-drag panning på board-scroll-containern (Miro/Figma-style).
 *
 * Aktiveras endast om mousedown sker på en "tom" bakgrundszon — alltså
 * INTE på en knapp, länk, input, textarea, contenteditable eller .card
 * (sektion-kolumner och subkategori-kort räknas som .card).
 *
 * Detta gör att man kan dra sig fram över boarden men inline-edit,
 * checkbox-klick och kolumn-DnD via griphandle fortfarande fungerar.
 *
 * Vertikal scroll inom kolumner låter vi vara — pan här är bara horisontell.
 */
/**
 * Element som ALDRIG triggar pan. .card är medvetet inte med eftersom
 * användaren vill kunna pana även genom att hålla på en kolumn (subkategorier
 * inom är .card-element men det är OK — knappar/inputs filtreras separat).
 */
const NO_PAN_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  '[contenteditable="true"]',
  '[role="button"]',
  "[data-pan-skip]",
].join(",");

const PAN_THRESHOLD_PX = 5;

export function useBoardPan<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let panning = false;
    let armed = false;
    let pointerId = 0;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(NO_PAN_SELECTOR)) return;

      armed = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;
    };

    const onMove = (e: PointerEvent) => {
      if (!armed && !panning) return;
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!panning) {
        // Aktivera pan endast om horisontell rörelse dominerar — annars
        // får native vertikal scroll inom kolumner ta över.
        if (Math.abs(dx) < PAN_THRESHOLD_PX) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          armed = false;
          return;
        }
        panning = true;
        el.style.cursor = "grabbing";
        el.style.userSelect = "none";
        try {
          el.setPointerCapture(pointerId);
        } catch {
          // ignore
        }
      }

      e.preventDefault();
      el.scrollLeft = startScrollLeft - dx;
    };

    const end = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (panning) {
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          // ignore
        }
        el.style.cursor = "";
        el.style.userSelect = "";
      }
      panning = false;
      armed = false;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", end);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.removeEventListener("pointerleave", end);
    };
  }, [ref]);
}
