"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Images,
  Loader2,
  Play,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type MoodBoardSummary, type MoodItem } from "@/lib/api-client";
import {
  hashSeed,
  layoutMood,
  seededRandom,
  tileSize,
  WORLD_HALF_HEIGHT,
  type LaidOut,
} from "@/lib/mood-layout";
import { MoodUploadModal } from "./mood-upload-modal";
import { useDeviceTilt } from "./use-device-tilt";

/**
 * Mood Board: bilder och videor som svävar i en mörk rymd.
 *
 * Rymden är en värld i px (vid zoom 1) med origo i mitten. Den har fast höjd
 * men växer i sidled när objekt tillkommer. Man rör sig med en kamera:
 * scrollhjul eller nyp zoomar runt pekaren, dra panorerar, horisontell
 * scroll på styrplatta panorerar i sidled.
 *
 * Varje objekt har ett djup (0 = långt bort, 1 = nära). Djupet styr storlek,
 * skärpa, ljushet, stapelordning och parallax, så lagren glider mot varandra
 * när man rör sig och ytan läses som tredimensionell.
 *
 * Kameran skrivs direkt till DOM:en via ref, inte via state, så panorering
 * och zoom inte re-renderar alla objekt per frame.
 */

type Tile = MoodItem & {
  fullUrl: string;
  floatDuration: number;
  floatDelay: number;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const DRAG_THRESHOLD = 6;
/** Hur långt in i videon hover-förhandsvisningen loopar */
const PREVIEW_SECONDS = 5;

// Stabil svävning per objekt, härledd ur id:t.
function floatFor(id: string) {
  const r = seededRandom(hashSeed(id + ":float"));
  return { floatDuration: 16 + r() * 12, floatDelay: -r() * 20 };
}

function toTile(item: MoodItem): Tile {
  return { ...item, fullUrl: item.url, ...floatFor(item.id) };
}

/** Exempelbilder tills användaren laddat upp egna. */
function placeholderTiles(): Tile[] {
  const rand = seededRandom(42);
  const aspects = [3 / 2, 2 / 3, 4 / 5, 16 / 10, 3 / 4, 5 / 4];
  const placed: Tile[] = [];
  for (let i = 0; i < 22; i++) {
    const aspect = aspects[(i * 7) % aspects.length];
    const w = aspect >= 1 ? 800 : Math.round(800 * aspect);
    const h = aspect >= 1 ? Math.round(800 / aspect) : 800;
    const seed = `levalife-mood-${i}`;
    placed.push({
      id: seed,
      kind: "image",
      url: `https://picsum.photos/seed/${seed}/${w}/${h}`,
      fullUrl: `https://picsum.photos/seed/${seed}/${w * 2}/${h * 2}`,
      posterUrl: null,
      width: w,
      height: h,
      depth: 0.25 + rand() * 0.75,
      ...floatFor(seed),
    });
  }
  return placed;
}

/** Rutorna i rymden beskärs alltid: liggande 4:3, stående 4:5. Modalen
 * visar originalets proportioner. */
function tileAspect(t: MoodItem) {
  return t.width >= t.height ? "4 / 3" : "4 / 5";
}

function tileWidth(t: MoodItem) {
  return tileSize(t).w;
}

export function MoodBoardView({ moodBoardId }: { moodBoardId: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tilt = useDeviceTilt(viewportRef);
  const cam = useRef({ x: 0, y: 0, z: 1 });
  const dragged = useRef(false);
  const cameraReady = useRef(false);

  useEffect(() => {
    const showPlaceholders = () => {
      setTiles(placeholderTiles());
      setIsPlaceholder(true);
    };
    api
      .listMoodItems(moodBoardId)
      .then(({ items }) =>
        items.length ? setTiles(items.map(toTile)) : showPlaceholders()
      )
      .catch(showPlaceholders);
  }, [moodBoardId]);

  // ============ Kamera ============
  const apply = useCallback(() => {
    const vp = viewportRef.current;
    const world = worldRef.current;
    if (!vp || !world) return;
    const { x, y, z } = cam.current;
    world.style.transform = `translate3d(${vp.clientWidth / 2 + x}px, ${vp.clientHeight / 2 + y}px, 0) scale(${z})`;
    vp.style.setProperty("--cx", String(x / z));
    vp.style.setProperty("--cy", String(y / z));
  }, []);

  const layout = useMemo(
    () => layoutMood(tiles ?? []),
    [tiles]
  );
  const tilesRef = useRef<Tile[]>([]);
  const layoutRef = useRef(layout);
  tilesRef.current = tiles ?? [];
  layoutRef.current = layout;

  // Håll kameran inom rymden, med lite luft runt kanterna.
  const clampPan = useCallback(() => {
    const vp = viewportRef.current;
    const ts = tilesRef.current;
    if (!vp || !ts.length) return;
    const { z } = cam.current;
    const extentX = Math.max(
      ...ts.map((t) => Math.abs(layoutRef.current.get(t.id)?.x ?? 0) + tileWidth(t))
    );
    const maxX = Math.max(0, extentX * z - vp.clientWidth / 2 + 80);
    const maxY = Math.max(0, (WORLD_HALF_HEIGHT + 320) * z - vp.clientHeight / 2);
    cam.current.x = Math.min(maxX, Math.max(-maxX, cam.current.x));
    cam.current.y = Math.min(maxY, Math.max(-maxY, cam.current.y));
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      const sx = clientX - r.left - r.width / 2;
      const sy = clientY - r.top - r.height / 2;
      const c = cam.current;
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.z * factor));
      // Håll världspunkten under pekaren still.
      c.x = sx - ((sx - c.x) / c.z) * z;
      c.y = sy - ((sy - c.y) / c.z) * z;
      c.z = z;
      clampPan();
      apply();
    },
    [apply, clampPan]
  );

  // Startzoom: rymdens höjd ryms i viewporten. Bara första gången, så
  // kameran inte hoppar när nya objekt laddas upp.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !tiles || cameraReady.current) return;
    cameraReady.current = true;
    // Passa in det som faktiskt finns, med luft runt. Få objekt ska inte
    // se ut som prickar i en tom rymd.
    let minX = -200, maxX = 200, minY = -150, maxY = 150;
    for (const t of tiles) {
      const p = layoutRef.current.get(t.id);
      if (!p) continue;
      const { w, h } = tileSize(t);
      minX = Math.min(minX, p.x - w / 2);
      maxX = Math.max(maxX, p.x + w / 2);
      minY = Math.min(minY, p.y - h / 2);
      maxY = Math.max(maxY, p.y + h / 2);
    }
    const fitW = (vp.clientWidth - 120) / (maxX - minX);
    const fitH = (vp.clientHeight - 160) / (maxY - minY);
    // Stående skärm (mobil): passa in höjden och låt rymden gå utanför i
    // sidled, annars blir allt pyttesmått. Man sveper för att se resten.
    const portrait = vp.clientHeight > vp.clientWidth;
    const fit = portrait ? Math.min(fitH, fitW * 2.6) : Math.min(fitW, fitH);
    const z = Math.min(1.1, Math.max(MIN_ZOOM, fit));
    cam.current = { x: -((minX + maxX) / 2) * z, y: -((minY + maxY) / 2) * z, z };
    apply();
  }, [tiles, apply]);

  useEffect(() => {
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [apply]);

  // Wheel måste vara non-passive för att kunna stoppa sidscroll/browserzoom.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Nyp på styrplatta kommer som wheel med ctrlKey.
      if (e.ctrlKey) return zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        cam.current.x -= e.deltaX;
        clampPan();
        return apply();
      }
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomAt, apply, clampPan]);

  // ============ Dra och nyp ============
  // Lyssnar på window under en gest i stället för pointer capture, annars
  // hamnar click på viewporten och objekten går inte att öppna.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef<{ x: number; y: number } | null>(null);

  const onWindowMove = useCallback(
    (e: PointerEvent) => {
      const ps = pointers.current;
      const prev = ps.get(e.pointerId);
      if (!prev || !gestureStart.current) return;

      if (ps.size >= 2) {
        const [a, b] = [...ps.values()];
        const before = Math.hypot(a.x - b.x, a.y - b.y);
        const beforeMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a2, b2] = [...ps.values()];
        const after = Math.hypot(a2.x - b2.x, a2.y - b2.y);
        const mid = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
        dragged.current = true;
        cam.current.x += mid.x - beforeMid.x;
        cam.current.y += mid.y - beforeMid.y;
        if (before > 0) zoomAt(mid.x, mid.y, after / before);
        else apply();
        return;
      }

      ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const moved = Math.hypot(
        e.clientX - gestureStart.current.x,
        e.clientY - gestureStart.current.y
      );
      if (moved > DRAG_THRESHOLD) dragged.current = true;
      if (!dragged.current) return;
      cam.current.x += e.clientX - prev.x;
      cam.current.y += e.clientY - prev.y;
      clampPan();
      apply();
    },
    [apply, clampPan, zoomAt]
  );

  const onWindowUp = useCallback(
    (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size > 0) return;
      gestureStart.current = null;
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
    },
    [onWindowMove]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragged.current = false;
      gestureStart.current = { x: e.clientX, y: e.clientY };
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", onWindowUp);
      window.addEventListener("pointercancel", onWindowUp);
    }
  };

  // Musens position ger en svag extra parallax även när man står still.
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.buttons) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    vp.style.setProperty("--mx", String((e.clientX - r.left) / r.width - 0.5));
    vp.style.setProperty("--my", String((e.clientY - r.top) / r.height - 0.5));
  };

  const openTile = tiles?.find((t) => t.id === openId) ?? null;

  // Bläddringsordning i förstoringen: som man ser rymden, vänster till
  // höger. Objekt i nästan samma kolumn tas uppifrån och ned.
  const readingOrder = useMemo(() => {
    const ids = (tiles ?? []).map((t) => t.id);
    const col = (id: string) => Math.round((layout.get(id)?.x ?? 0) / 120);
    return ids.sort(
      (a, b) =>
        col(a) - col(b) || (layout.get(a)?.y ?? 0) - (layout.get(b)?.y ?? 0)
    );
  }, [tiles, layout]);

  const stepOpen = useCallback(
    (dir: -1 | 1) => {
      setOpenId((cur) => {
        const i = cur ? readingOrder.indexOf(cur) : -1;
        if (i < 0) return cur;
        const n = readingOrder.length;
        return readingOrder[(i + dir + n) % n];
      });
    },
    [readingOrder]
  );

  // Boards att flytta till hämtas när modalen öppnas, så nyss skapade boards
  // också finns med.
  const [moveTargets, setMoveTargets] = useState<MoodBoardSummary[]>([]);
  useEffect(() => {
    if (!openId || isPlaceholder) return;
    api
      .listMoodBoards()
      .then(({ boards }) => setMoveTargets(boards.filter((b) => b.id !== moodBoardId)))
      .catch(console.error);
  }, [openId, isPlaceholder, moodBoardId]);

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className="relative isolate flex-1 overflow-hidden bg-bg touch-none select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 40%, rgb(255 255 255 / 0.035), transparent 70%)",
      }}
    >
      <div
        ref={worldRef}
        className="absolute left-0 top-0 origin-top-left will-change-transform"
      >
        {tiles?.map((t) => (
          <MoodTile
            key={t.id}
            tile={t}
            pos={layout.get(t.id) ?? { x: 0, y: 0 }}
            onOpen={() => {
              if (!dragged.current) setOpenId(t.id);
            }}
          />
        ))}
      </div>

      {/* Medan listan hämtas. Själva bilderna har sedan egna skelett. */}
      {!tiles && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="size-6 animate-spin text-fg-muted/60" />
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2.5">
        {isPlaceholder && (
          <span className="text-xs text-fg-muted/80 pointer-events-none select-none">
            Exempelbilder, lägg till egna
          </span>
        )}
        {tilt.status === "needs-permission" && (
          <button
            type="button"
            onClick={tilt.request}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface/70 border border-border text-xs font-medium text-fg-muted backdrop-blur-md active:scale-[0.97] transition-all"
          >
            <Smartphone className="size-3.5" />
            Aktivera rörelse
          </button>
        )}
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 h-11 pl-5 pr-4 rounded-full bg-surface/85 border border-border text-sm font-semibold text-fg shadow-2xl shadow-black/60 backdrop-blur-md hover:bg-surface-hover hover:border-fg-muted/40 active:scale-[0.97] transition-all duration-150 ease-snap"
        >
          Lägg till media
          <Plus className="size-4" strokeWidth={2.4} />
        </button>
      </div>

      <MediaLightbox
        tile={openTile}
        onStep={readingOrder.length > 1 ? stepOpen : undefined}
        onClose={() => setOpenId(null)}
        // Exempelbilderna finns inte i databasen och går inte att radera.
        onDelete={
          isPlaceholder
            ? undefined
            : async (id) => {
                await api.deleteMoodItem(id);
                setOpenId(null);
                setTiles((ts) => (ts ?? []).filter((t) => t.id !== id));
              }
        }
        moveTargets={moveTargets}
        onMove={
          isPlaceholder
            ? undefined
            : async (id, targetId) => {
                await api.moveMoodItem(id, targetId);
                setOpenId(null);
                setTiles((ts) => (ts ?? []).filter((t) => t.id !== id));
              }
        }
      />
      <MoodUploadModal
        moodBoardId={moodBoardId}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(item) => {
          setTiles((ts) => [...(isPlaceholder ? [] : (ts ?? [])), toTile(item)]);
          setIsPlaceholder(false);
        }}
      />
    </div>
  );
}

function MoodTile({
  tile,
  pos,
  onOpen,
}: {
  tile: Tile;
  pos: LaidOut;
  onOpen: () => void;
}) {
  const { depth } = tile;
  const isVideo = tile.kind === "video";
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Skelett tills bilden är laddad, sedan mjuk intoning. Cachade bilder kan
  // vara klara redan innan onLoad hinner kopplas, så kolla complete direkt.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  // Nära objekt glider mer än avlägsna när kameran rör sig.
  const panParallax = (depth - 0.6) * 0.5;
  const mouseShift = 15 + depth * 35;

  const startPreview = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };
  const stopPreview = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <div
      className="absolute"
      style={{
        left: pos.x,
        top: pos.y,
        width: tileWidth(tile),
        zIndex: Math.round(depth * 100),
        transform: `translate(-50%, -50%) translate3d(calc(var(--cx, 0) * ${panParallax}px + var(--mx, 0) * ${-mouseShift}px), calc(var(--cy, 0) * ${panParallax}px + var(--my, 0) * ${-mouseShift}px), 0)`,
        // left/top glider när layouten räknas om, t.ex. efter en radering.
        transition:
          "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), left 0.9s cubic-bezier(0.22, 1, 0.36, 1), top 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        className="mood-float"
        style={{
          animationDuration: `${tile.floatDuration}s`,
          animationDelay: `${tile.floatDelay}s`,
        }}
      >
        <button
          type="button"
          onClick={onOpen}
          onPointerEnter={(e) => e.pointerType === "mouse" && isVideo && startPreview()}
          onPointerLeave={() => isVideo && stopPreview()}
          aria-label={isVideo ? "Spela video" : "Visa bild"}
          className="group relative block w-full overflow-hidden cursor-zoom-in transition-[filter,transform] duration-500 ease-snap hover:filter-none! hover:scale-[1.03]"
          style={{
            aspectRatio: tileAspect(tile),
            filter: `brightness(${0.42 + depth * 0.58}) blur(${(1 - depth) * 2.2}px)`,
            boxShadow: `0 ${10 + depth * 30}px ${30 + depth * 60}px rgb(0 0 0 / ${0.35 + depth * 0.3})`,
          }}
        >
          {!loaded && <span aria-hidden className="mood-skeleton absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={isVideo ? (tile.posterUrl ?? "") : tile.url}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={cn(
              "size-full object-cover select-none pointer-events-none transition-[opacity,transform,filter] duration-700 ease-snap",
              loaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[1.04] blur-sm"
            )}
          />
          {isVideo && (
            <>
              {/* Förhandsvisning: första sekunderna i loop, bara vid hover */}
              <video
                ref={videoRef}
                src={tile.url}
                muted
                playsInline
                preload="none"
                onTimeUpdate={(e) => {
                  if (e.currentTarget.currentTime >= PREVIEW_SECONDS)
                    e.currentTarget.currentTime = 0;
                }}
                onEnded={(e) => {
                  e.currentTarget.currentTime = 0;
                  e.currentTarget.play().catch(() => {});
                }}
                className="absolute inset-0 size-full object-cover pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <span className={cn("pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center size-14 rounded-full bg-black/45 text-white/95 ring-1 ring-white/20 backdrop-blur-sm group-hover:opacity-0 transition-opacity duration-300", !loaded && "opacity-0")}>
                <Play className="size-6 translate-x-0.5" fill="currentColor" />
              </span>
            </>
          )}
          {/* Glans som sveper över objektet vid hover */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-snap group-hover:translate-x-full"
          />
        </button>
      </div>
    </div>
  );
}

type LightboxAction = "delete" | "move" | null;

function MediaLightbox({
  tile,
  onClose,
  onStep,
  onDelete,
  moveTargets,
  onMove,
}: {
  tile: Tile | null;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  /** Övriga mood boards som objektet kan flyttas till */
  moveTargets?: MoodBoardSummary[];
  onMove?: (id: string, targetId: string) => Promise<void>;
  /** Bläddra till föregående (-1) eller nästa (1). Saknas om bara ett objekt. */
  onStep?: (dir: -1 | 1) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [action, setAction] = useState<LightboxAction>(null);
  const [busy, setBusy] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  // Nytt objekt i modalen: börja alltid utan öppen åtgärd.
  useEffect(() => {
    setAction(null);
    setBusy(false);
    setTargetId(null);
    setSelectOpen(false);
  }, [tile?.id]);

  const run = async (fn: () => Promise<void>, failMsg: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error && err.message.startsWith("409")
          ? "Den finns redan på det mood boardet."
          : failMsg
      );
      setBusy(false);
    }
  };

  const handleDelete = () =>
    tile && onDelete && run(() => onDelete(tile.id), "Kunde inte ta bort.");
  const handleMove = () =>
    tile &&
    onMove &&
    targetId &&
    run(() => onMove(tile.id, targetId), "Kunde inte flytta.");

  useEffect(() => {
    if (!tile) return;
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      // Pilar bläddrar, men inte medan en åtgärd är öppen.
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !action && onStep) {
        e.preventDefault();
        onStep(e.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (e.key !== "Escape") return;
      // Esc stänger först listan, sedan åtgärden, sist modalen.
      if (selectOpen) setSelectOpen(false);
      else if (action) setAction(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tile, onClose, onStep, action, busy, selectOpen]);

  // Svep i sidled på mobil. Kort, tydligt horisontellt svep räknas, allt
  // annat (tryck, scroll i videokontroller) lämnas i fred.
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  // Klicket som följer på ett svep ska inte stänga modalen.
  const justSwiped = useRef(false);
  const onSwipeStart = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onSwipeEnd = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || !onStep || action) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - s.t < 600) {
      justSwiped.current = true;
      setTimeout(() => (justSwiped.current = false), 400);
      onStep(dx > 0 ? -1 : 1);
    }
  };

  if (!mounted) return null;

  const mediaProps = {
    initial: { scale: 0.96, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.96, opacity: 0 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    className: "max-w-[90vw] max-h-[85vh] object-contain shadow-2xl",
    style: tile ? { aspectRatio: `${tile.width} / ${tile.height}` } : undefined,
  };

  const noun = tile?.kind === "video" ? "videon" : "bilden";
  const target = moveTargets?.find((b) => b.id === targetId) ?? null;

  // Portal till body: skalet har transform från sin intro-animation, och då
  // blir position: fixed relativt skalet i stället för viewporten.
  return createPortal(
    <AnimatePresence>
      {tile && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => !justSwiped.current && onClose()}
          onPointerDown={onSwipeStart}
          onPointerUp={onSwipeEnd}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-8"
        >
          {onStep && (
            <>
              <StepButton dir={-1} onStep={onStep} />
              <StepButton dir={1} onStep={onStep} />
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="absolute top-5 right-5 z-10 inline-flex items-center justify-center size-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-6" />
          </button>
          {tile.kind === "video" ? (
            // Klicket som öppnade modalen räknas som användargest, så
            // autoplay med ljud tillåts.
            <motion.video
              key={tile.id}
              {...mediaProps}
              src={tile.fullUrl}
              poster={tile.posterUrl ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <motion.img key={tile.id} {...mediaProps} src={tile.fullUrl} alt="" />
          )}

          {(onDelete || onMove) && (
            <div
              className="absolute bottom-5 right-5 z-10 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {action === "delete" && (
                  <ActionPill key="delete">
                    <span className="text-sm text-white/90 mr-2">Ta bort {noun}?</span>
                    <PillButton onClick={() => setAction(null)} disabled={busy}>
                      Avbryt
                    </PillButton>
                    <PillButton primary danger onClick={handleDelete} disabled={busy}>
                      {busy && <Loader2 className="size-3.5 animate-spin" />}
                      Ta bort
                    </PillButton>
                  </ActionPill>
                )}

                {action === "move" && (
                  <ActionPill key="move">
                    {moveTargets?.length ? (
                      <>
                        <span className="text-sm text-white/90 mr-1">Flytta till</span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSelectOpen((v) => !v)}
                            disabled={busy}
                            className={cn(
                              "inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-full text-sm font-medium text-white transition-colors disabled:opacity-40",
                              selectOpen ? "bg-white/15" : "bg-white/5 hover:bg-white/10"
                            )}
                          >
                            {target ? (
                              <>
                                <BoardGlyph emoji={target.emoji} />
                                <span className="max-w-[12rem] truncate">{target.name}</span>
                              </>
                            ) : (
                              <span className="text-white/60">Välj mood board</span>
                            )}
                            <ChevronDown
                              className={cn(
                                "size-3.5 text-white/60 transition-transform duration-150",
                                selectOpen && "rotate-180"
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {selectOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute right-0 bottom-full mb-2 min-w-[16rem] p-1.5 rounded-xl bg-neutral-900/95 ring-1 ring-white/10 shadow-2xl backdrop-blur-md"
                              >
                                <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                                  Dina mood boards
                                </div>
                                <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-0.5">
                                  {moveTargets.map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        setTargetId(b.id);
                                        setSelectOpen(false);
                                      }}
                                      className={cn(
                                        "relative flex items-center gap-2.5 w-full pl-3 pr-2.5 py-2 rounded-lg text-left text-sm transition-colors hover:bg-white/10",
                                        b.id === targetId ? "text-white font-semibold" : "text-white/85"
                                      )}
                                    >
                                      {b.id === targetId && (
                                        <span
                                          aria-hidden
                                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent"
                                        />
                                      )}
                                      <BoardGlyph emoji={b.emoji} />
                                      <span className="flex-1 truncate">{b.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <PillButton onClick={() => setAction(null)} disabled={busy}>
                          Avbryt
                        </PillButton>
                        <PillButton primary onClick={handleMove} disabled={busy || !targetId}>
                          {busy && <Loader2 className="size-3.5 animate-spin" />}
                          Flytta
                        </PillButton>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-white/80 mr-2">
                          Skapa ett till mood board för att kunna flytta
                        </span>
                        <PillButton onClick={() => setAction(null)}>Stäng</PillButton>
                      </>
                    )}
                  </ActionPill>
                )}
              </AnimatePresence>

              {!action && (
                <>
                  {onMove && (
                    <IconAction label="Flytta till annat mood board" onClick={() => setAction("move")}>
                      <ArrowRightLeft className="size-5" />
                    </IconAction>
                  )}
                  {onDelete && (
                    <IconAction label="Ta bort" danger onClick={() => setAction("delete")}>
                      <Trash2 className="size-5" />
                    </IconAction>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function StepButton({ dir, onStep }: { dir: -1 | 1; onStep: (dir: -1 | 1) => void }) {
  const label = dir === -1 ? "Föregående" : "Nästa";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onStep(dir);
      }}
      aria-label={label}
      title={`${label} (${dir === -1 ? "←" : "→"})`}
      className={cn(
        // Dolda på touch, där man sveper i stället.
        "hidden sm:inline-flex absolute top-1/2 -translate-y-1/2 z-10 items-center justify-center size-11 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors",
        dir === -1 ? "left-4" : "right-4"
      )}
    >
      {dir === -1 ? <ChevronLeft className="size-7" /> : <ChevronRight className="size-7" />}
    </button>
  );
}

function ActionPill({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1 pl-4 pr-1 h-10 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15"
    >
      {children}
    </motion.div>
  );
}

function PillButton({
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm transition-colors disabled:opacity-40",
        primary
          ? danger
            ? "font-semibold bg-danger text-white hover:bg-danger/90"
            : "font-semibold bg-accent text-accent-fg hover:bg-accent/90"
          : "text-white/70 hover:text-white hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

function IconAction({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center size-10 rounded-full text-white/60 hover:bg-white/10 transition-colors",
        danger ? "hover:text-danger" : "hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function BoardGlyph({ emoji }: { emoji: string | null }) {
  return emoji ? (
    <span className="text-base leading-none w-5 text-center shrink-0">{emoji}</span>
  ) : (
    <span className="inline-flex items-center justify-center size-5 rounded-md bg-white/10 text-white/70 shrink-0">
      <Images className="size-3" />
    </span>
  );
}
