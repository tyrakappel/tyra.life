"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api-client";
import {
  POINT_INTERVAL_YEARS,
  VALUE_MIN,
  VALUE_MAX,
  ageToIndex,
  indexToAge,
  ensureValuesLength,
  clampValue,
  currentAge,
  type LifeCurveData,
} from "@/lib/life-curve";
import { useBoardPan } from "./use-board-pan";

type Props = {
  boardId: string;
};

const SAVE_DEBOUNCE_MS = 500;

/**
 * Hur många år som syns på en gång — beroende på skärmbredd.
 * Resterande år nås via horisontell scroll / drag-pan.
 */
function getVisibleYears(width: number): number {
  if (width >= 1280) return 10;
  if (width >= 1024) return 5;
  return 3;
}

/**
 * Längden på ett fas-block beroende på vilken ålder vi är på.
 * Yngre = kortare faser (snabba utvecklingssteg).
 */
function phaseSizeForAge(age: number): number {
  if (age < 30) return 3;
  if (age < 50) return 5;
  return 10;
}

/**
 * Generera fas-block 0..currentAge med adaptiv blocksize.
 * Returnerar [{start, end}] där end är exklusiv.
 */
function generatePhases(
  currentAge: number
): { start: number; end: number }[] {
  if (currentAge <= 0) return [];
  const phases: { start: number; end: number }[] = [];
  let s = 0;
  while (s < currentAge) {
    const size = phaseSizeForAge(s);
    const e = Math.min(s + size, currentAge);
    phases.push({ start: s, end: e });
    s = e;
  }
  return phases;
}

export function LifeCurveView({ boardId }: Props) {
  const [data, setData] = useState<LifeCurveData>({
    birthYear: null,
    values: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const pendingSaveRef = useRef<LifeCurveData | null>(null);

  useEffect(() => {
    api
      .getLifeCurve(boardId)
      .then((r) => {
        setData(r.lifeCurve);
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [boardId]);

  const scheduleSave = (next: LifeCurveData) => {
    pendingSaveRef.current = next;
    if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const payload = pendingSaveRef.current;
      if (!payload) return;
      setSaving(true);
      try {
        await api.putLifeCurve(boardId, {
          birthYear: payload.birthYear,
          values: payload.values,
        });
      } catch (err) {
        console.error("Save failed", err);
      } finally {
        setSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);
  };

  const setBirthYear = (year: number) => {
    const ensured = ensureValuesLength([], year);
    const next = { birthYear: year, values: ensured };
    setData(next);
    scheduleSave(next);
  };

  const setValue = (index: number, value: number) => {
    setData((prev) => {
      const ensured = ensureValuesLength(prev.values, prev.birthYear);
      const next = [...ensured];
      next[index] = clampValue(value);
      const result = { ...prev, values: next };
      scheduleSave(result);
      return result;
    });
  };

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-muted">
        Laddar livskurvan...
      </div>
    );
  }

  if (data.birthYear == null) {
    return <BirthYearSetup onSet={setBirthYear} />;
  }

  return (
    <Chart
      birthYear={data.birthYear}
      values={data.values}
      onChange={setValue}
      onChangeBirthYear={setBirthYear}
      saving={saving}
    />
  );
}

function BirthYearSetup({ onSet }: { onSet: (year: number) => void }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 30);
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-accent/15 mb-4">
          <Sparkles className="size-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Sätt upp din livskurva</h2>
        <p className="text-fg-muted text-sm mb-6">
          Skriv in vilket år du föddes så lägger vi ut en punkt för varje halvår
          fram till idag. Sedan kan du dra dem upp och ner för att visa upp- och
          nedgångar genom livet.
        </p>
        <div className="flex items-center gap-2 mb-4 max-w-xs mx-auto">
          <Calendar className="size-4 text-fg-muted shrink-0" />
          <input
            type="number"
            min={1900}
            max={currentYear}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
            className="flex-1 bg-muted/60 border border-border rounded-lg px-3 py-2 text-center text-lg font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <button
          onClick={() => onSet(year)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-fg font-bold py-3 px-5 rounded-full shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transition-all duration-150 ease-snap"
        >
          Skapa livskurva
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Chart
// ============================================================

type ChartProps = {
  birthYear: number;
  values: number[];
  onChange: (index: number, value: number) => void;
  onChangeBirthYear: (year: number) => void;
  saving: boolean;
};

const PADDING = { top: 48, right: 32, bottom: 56, left: 64 };
const MIN_SVG_HEIGHT = 360;

function Chart({
  birthYear,
  values,
  onChange,
  onChangeBirthYear,
  saving,
}: ChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 1024, height: 480 });

  useBoardPan(scrollRef);

  // Mät container för responsiv bredd + höjd
  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setSize({
          width: Math.max(400, rect.width),
          height: Math.max(MIN_SVG_HEIGHT, rect.height),
        });
      }
    });
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  const ensuredValues = useMemo(
    () => ensureValuesLength(values, birthYear),
    [values, birthYear]
  );

  const age = currentAge(birthYear);

  // Px per år bestäms av hur många år som ska få plats på skärmen.
  // Total chart-bredd = age × pxPerYear. Mindre än containerbredden om
  // användaren är yngre än visibleYears, större och scrollbar om äldre.
  const visibleYears = getVisibleYears(size.width);
  const innerContainerWidth = size.width - PADDING.left - PADDING.right;
  const pxPerYear = innerContainerWidth / visibleYears;
  const totalChartWidth = Math.max(age, 1) * pxPerYear;
  const svgWidth = Math.max(
    size.width,
    totalChartWidth + PADDING.left + PADDING.right
  );
  const chartW = svgWidth - PADDING.left - PADDING.right;

  // Höjd: fyll containern, men minst MIN_SVG_HEIGHT
  const svgHeight = size.height;
  const chartH = svgHeight - PADDING.top - PADDING.bottom;

  const xForAge = (a: number) => PADDING.left + (a / Math.max(age, 1)) * chartW;
  const yForValue = (v: number) =>
    PADDING.top + chartH / 2 - (v / VALUE_MAX) * (chartH / 2);
  // Snappa till hela heltal (-10..10) under drag — magnetisk känsla
  const valueForY = (y: number) => {
    const raw = ((PADDING.top + chartH / 2 - y) / (chartH / 2)) * VALUE_MAX;
    return clampValue(Math.round(raw));
  };

  const points = ensuredValues.map((v, i) => ({
    index: i,
    age: indexToAge(i),
    value: v,
    x: xForAge(indexToAge(i)),
    y: yForValue(v),
  }));

  const curvePath = useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    const tension = 1;
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || points[i + 1];
      const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
      const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
      const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
      const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(
        2
      )} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    const centerY = PADDING.top + chartH / 2;
    return `${curvePath} L ${points[points.length - 1].x} ${centerY} L ${
      points[0].x
    } ${centerY} Z`;
  }, [curvePath, points, chartH]);

  // Drag på enskild punkt
  const startDrag = (e: React.PointerEvent<SVGCircleElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const circle = e.currentTarget;
    circle.setPointerCapture(e.pointerId);
    setActiveIndex(index);
    const svgEl = svgRef.current!;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return;
    const onMove = (ev: PointerEvent) => {
      const pt = svgEl.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const local = pt.matrixTransform(ctm.inverse());
      onChange(index, valueForY(local.y));
    };
    const onUp = (ev: PointerEvent) => {
      circle.releasePointerCapture(ev.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setActiveIndex(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // X-axis: varje år
  const yearMarks = useMemo(() => {
    const marks: { age: number; year: number }[] = [];
    for (let a = 0; a <= age; a += 1) {
      marks.push({ age: a, year: birthYear + a });
    }
    return marks;
  }, [age, birthYear]);

  // Fas-block (livsfaser)
  const phases = useMemo(() => generatePhases(age), [age]);

  // Y-axis tick-värden
  const yTicks = [10, 5, 0, -5, -10];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border/60">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="size-4 text-fg-muted" />
          <span className="text-fg-muted">Född</span>
          <input
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            value={birthYear}
            onChange={(e) => {
              const y = parseInt(e.target.value);
              if (!isNaN(y) && y >= 1900 && y <= new Date().getFullYear()) {
                onChangeBirthYear(y);
              }
            }}
            className="w-20 bg-muted/40 border border-border rounded-md px-2 py-1 text-center font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-fg-muted">
            · {age} år · {ensuredValues.length} punkter
          </span>
        </div>
        <div className="ml-auto text-xs text-fg-muted">
          {saving ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              Sparar...
            </span>
          ) : (
            "Auto-sparas"
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin cursor-grab"
      >
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          className="block touch-none select-none"
        >
          <defs>
            <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
              <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Fas-block: zebra-bakgrund + skarpa skiljelinjer + etikett */}
          {phases.map((phase, i) => {
            const x = xForAge(phase.start);
            const w = xForAge(phase.end) - x;
            const isEven = i % 2 === 0;
            const blockSize = phase.end - phase.start;
            const label =
              blockSize === 1
                ? `${phase.start} år`
                : `${phase.start}–${phase.end - 1} år`;
            return (
              <g key={`phase-${i}`}>
                {/* Alternerande bakgrund */}
                <rect
                  x={x}
                  y={PADDING.top}
                  width={w}
                  height={chartH}
                  fill="var(--color-fg)"
                  fillOpacity={isEven ? 0.025 : 0}
                />
                {/* Skarp skiljelinje (inte före första) */}
                {i > 0 && (
                  <line
                    x1={x}
                    x2={x}
                    y1={PADDING.top}
                    y2={PADDING.top + chartH}
                    stroke="currentColor"
                    strokeOpacity={0.22}
                    className="text-fg-muted"
                  />
                )}
                {/* Etikett ovanför chart */}
                <text
                  x={x + w / 2}
                  y={PADDING.top - 16}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  className="fill-fg-muted tabular-nums uppercase tracking-wider"
                  fillOpacity={0.7}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Y-axis labels + grid */}
          {yTicks.map((v) => {
            const y = yForValue(v);
            const isCenter = v === 0;
            return (
              <g key={v}>
                <line
                  x1={PADDING.left}
                  x2={PADDING.left + chartW}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={isCenter ? 0.25 : 0.08}
                  strokeDasharray={isCenter ? "" : "2 4"}
                  className="text-fg-muted"
                />
                <text
                  x={PADDING.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  className="fill-fg-muted tabular-nums"
                  fillOpacity={isCenter ? 1 : 0.7}
                >
                  {v > 0 ? "+" : ""}
                  {v}
                </text>
              </g>
            );
          })}

          {/* X-axis: ett vertikalstreck + label per år */}
          {yearMarks.map((m) => {
            const x = xForAge(m.age);
            const isMajor = m.age % 5 === 0;
            return (
              <g key={m.age}>
                <line
                  x1={x}
                  x2={x}
                  y1={PADDING.top}
                  y2={PADDING.top + chartH}
                  stroke="currentColor"
                  strokeOpacity={isMajor ? 0.1 : 0.04}
                  className="text-fg-muted"
                />
                <text
                  x={x}
                  y={PADDING.top + chartH + 18}
                  textAnchor="middle"
                  fontSize={isMajor ? 11 : 10}
                  fontWeight={isMajor ? 600 : 400}
                  className="fill-fg-muted tabular-nums"
                  fillOpacity={isMajor ? 0.9 : 0.55}
                >
                  {m.year}
                </text>
                <text
                  x={x}
                  y={PADDING.top + chartH + 32}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-fg-muted/60 tabular-nums"
                >
                  {m.age} år
                </text>
              </g>
            );
          })}

          {/* Filled area */}
          {areaPath && <path d={areaPath} fill="url(#lc-area)" />}

          {/* Smooth curve */}
          {curvePath && (
            <motion.path
              d={curvePath}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ d: curvePath }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          )}

          {/* Points */}
          {points.map((p) => {
            const isActive = activeIndex === p.index;
            const isHovered = hoveredIndex === p.index || isActive;
            const r = isActive ? 11 : isHovered ? 9 : 7;
            return (
              <g key={p.index}>
                {/* Hover-area (större för bättre touch & hover-detection) */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={16}
                  fill="transparent"
                  data-pan-skip
                  onPointerDown={(e) => startDrag(e, p.index)}
                  onPointerEnter={() => setHoveredIndex(p.index)}
                  onPointerLeave={() =>
                    setHoveredIndex((cur) => (cur === p.index ? null : cur))
                  }
                  className="cursor-grab active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                />
                {/* Glow på hover/active */}
                {isHovered && (
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={r + 6}
                    fill="var(--color-accent)"
                    opacity={0.15}
                    initial={false}
                    animate={{ cx: p.x, cy: p.y, r: r + 6 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {/* Visual point */}
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill="var(--color-accent)"
                  stroke="var(--color-surface)"
                  strokeWidth={2.5}
                  initial={false}
                  animate={{ cx: p.x, cy: p.y, r }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  style={{ pointerEvents: "none" }}
                />
                {/* Tooltip vid hover eller drag */}
                {isHovered && (() => {
                  const year = birthYear + Math.floor(p.age);
                  const ageLabel = p.age.toLocaleString("sv-SE");
                  const rounded = Math.round(p.value * 10) / 10;
                  const valueLabel =
                    rounded === 0
                      ? "0,0"
                      : (rounded > 0 ? "+" : "") +
                        rounded.toLocaleString("sv-SE", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        });
                  return (
                    <g style={{ pointerEvents: "none" }}>
                      <rect
                        x={p.x - 60}
                        y={p.y - 56}
                        width={120}
                        height={42}
                        rx={10}
                        fill="var(--color-fg)"
                        opacity={0.78}
                      />
                      <text
                        x={p.x}
                        y={p.y - 38}
                        textAnchor="middle"
                        fontSize={14}
                        fontWeight={700}
                        className="fill-bg tabular-nums"
                      >
                        {valueLabel}
                      </text>
                      <text
                        x={p.x}
                        y={p.y - 22}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={500}
                        className="fill-bg tabular-nums"
                        fillOpacity={0.7}
                      >
                        {year} · {ageLabel} år
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex-shrink-0 px-6 py-2 text-xs text-fg-muted border-t border-border/60 flex items-center justify-between">
        <span>
          Dra punkterna upp för bra perioder, ner för sämre. Skala −10 till +10.
          Håll och dra bakgrunden för att panorera.
        </span>
        <span className="text-fg-muted/60">
          Punkt var {POINT_INTERVAL_YEARS * 12} mån
        </span>
      </div>
    </div>
  );
}
