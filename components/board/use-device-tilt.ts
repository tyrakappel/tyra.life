"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tilt på mobil: telefonens lutning skrivs som --mx/--my (-1.2..1.2) på
 * elementet, samma variabler som muspekaren styr på datorn. Lagren i rymden
 * glider då mot varandra när man lutar telefonen.
 *
 * iOS kräver att användaren godkänner rörelsesensorn efter ett tryck, därav
 * status "needs-permission" och request(). Android startar direkt. Kräver
 * HTTPS, så det syns inte på localhost i telefonen.
 */

type TiltStatus = "unsupported" | "needs-permission" | "on" | "denied";

type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** Grader lutning som ger fullt utslag */
const RANGE = 16;
/**
 * Max utslag. Muspekaren går till ±0.5; tilt får drygt dubbla, eftersom en
 * telefon är liten och rörelsen annars knappt märks.
 */
const MAX = 1.2;

const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));

export function useDeviceTilt(target: React.RefObject<HTMLElement | null>) {
  const [status, setStatus] = useState<TiltStatus>("unsupported");
  const listening = useRef(false);

  const start = useCallback(() => {
    if (listening.current) return;
    listening.current = true;
    setStatus("on");

    // Nollpunkten är hur man håller telefonen när det börjar, och glider
    // långsamt efter så att man inte behöver hålla den exakt still.
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    let frame = 0;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const angle = screen.orientation?.angle ?? 0;
      // I liggande läge byter axlarna plats.
      const side = angle === 90 ? e.beta : angle === 270 || angle === -90 ? -e.beta : e.gamma;
      const tilt = angle === 90 ? -e.gamma : angle === 270 || angle === -90 ? e.gamma : e.beta;

      baseGamma ??= side;
      baseBeta ??= tilt;
      baseGamma += (side - baseGamma) * 0.01;
      baseBeta += (tilt - baseBeta) * 0.01;

      const mx = clamp((side - baseGamma) / RANGE);
      const my = clamp((tilt - baseBeta) / RANGE);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        target.current?.style.setProperty("--mx", String(mx));
        target.current?.style.setProperty("--my", String(my));
      });
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      cancelAnimationFrame(frame);
      listening.current = false;
    };
  }, [target]);

  const stopRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (!touch || typeof DeviceOrientationEvent === "undefined") return;
    const DOE = DeviceOrientationEvent as OrientationWithPermission;
    if (typeof DOE.requestPermission === "function") setStatus("needs-permission");
    else stopRef.current = start();
    return () => stopRef.current?.();
  }, [start]);

  /** Anropas från ett tryck, krävs på iOS. */
  const request = useCallback(async () => {
    const DOE = DeviceOrientationEvent as OrientationWithPermission;
    try {
      const res = await DOE.requestPermission?.();
      if (res === "granted") stopRef.current = start();
      else setStatus("denied");
    } catch {
      setStatus("denied");
    }
  }, [start]);

  return { status, request };
}
