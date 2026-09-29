/**
 * Layout för Mood Board: var i rymden varje objekt hamnar.
 *
 * Positioner sparas inte. De räknas fram ur ordningen (äldst först) varje
 * gång, så rymden alltid är tätt packad: tar man bort ett objekt glider de
 * efterföljande in och fyller luckan, och med få objekt ligger de samlade
 * i mitten.
 *
 * Regelverket:
 * - Ett förskjutet rutnät (varannan kolumn en halv rad ned, som bikupa) med
 *   tätare avstånd än objektens storlek, så grannar alltid överlappar lite
 *   och läggs i lager.
 * - Cellerna fylls i ordning efter avstånd från mitten, där höjd väger
 *   tyngre än bredd. Rymden växer alltså utåt från centrum, mest åt vänster
 *   och höger, växelvis åt båda håll.
 * - Stora objekt sprids jämnt: för varje cell väljs, bland de närmaste
 *   objekten i tur, det som krockar minst med storleken på redan placerade
 *   grannar. Så hamnar inte två stora bredvid varandra, och ordningen
 *   rubbas bara lokalt.
 * - Varje objekt får en förskjutning härledd ur sitt id. Den är stabil
 *   mellan renderingar och gör att rutnätet inte syns.
 * - Till sist en avspänning i två regler, knuffar mest i sidled:
 *   1. Två objekt får inte överlappa mer än MAX_OVERLAP av det minstas yta.
 *   2. Summan av allt som ligger framför ett objekt får inte täcka mer än
 *      MAX_COVER av det. Då flyttas det bakre objektet undan.
 *   Så hamnar inget bakom förgrunden, men lagren finns kvar.
 */

export type LaidOut = { x: number; y: number };

export type LayoutInput = {
  id: string;
  width: number;
  height: number;
  depth: number;
};

/** Kolumnavstånd i världsenheter (px vid zoom 1) */
const COL = 300;
/** Radavstånd */
const ROW = 235;
/** Jämna kolumner: fem rader. Udda: fyra, förskjutna en halv rad. */
const EVEN_ROWS = [-2, -1, 0, 1, 2];
const ODD_ROWS = [-1.5, -0.5, 0.5, 1.5];
/**
 * Höjd straffas lite mer än bredd, så rymden blir en liggande oval ungefär
 * i skärmens proportioner i stället för ett platt band.
 */
const Y_WEIGHT = 1.45;
/** Hur långt ut i höjd mittpunkter får hamna */
const MAX_Y = ROW * 2.3;
/** Knuffar går mest i sidled, men höjden får ta en del. */
const PUSH_Y = 0.85;
const JITTER_X = 85;
const JITTER_Y = 60;
/** Så stor del av det minsta objektet får täckas av en granne */
const MAX_OVERLAP = 0.12;
/** Så stor del av ett objekt som får täckas sammanlagt av det framför */
const MAX_COVER = 0.15;
const RELAX_ITERATIONS = 160;
/** Hur många objekt framåt i kön som får tävla om en cell */
const LOOKAHEAD = 4;
/** Inom detta avstånd räknas två celler som grannar vid storleksspridningen */
const NEIGHBOR_RADIUS = COL * 1.7;

/** Rymdens halva höjd (mittpunkter). Kameran använder den för att passa in. */
export const WORLD_HALF_HEIGHT = MAX_Y;

export function hashSeed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

export function seededRandom(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function cells(count: number) {
  // Tillräckligt många kolumner åt båda håll för att rymma alla objekt.
  const reach = Math.ceil(count / 8) + 2;
  const out: { x: number; y: number; score: number }[] = [];
  for (let c = -reach; c <= reach; c++) {
    const rows = Math.abs(c) % 2 === 0 ? EVEN_ROWS : ODD_ROWS;
    for (const r of rows) {
      const x = c * COL;
      const y = r * ROW;
      // Liten dragning åt höger bryter oavgjort, så växlingen vänster/höger
      // blir förutsägbar.
      const score = Math.hypot(x, y * Y_WEIGHT) - (x > 0 ? 0.5 : 0);
      out.push({ x, y, score });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}

/**
 * Storleken följer djupet längs en kurva: de avlägsna behåller minsta
 * storleken (0.8), medan mellan och nära växer tydligt (upp till 1.9).
 * Skillnaden mellan lagren är det som ger rymden djup.
 */
export function depthScale(depth: number) {
  const t = Math.min(1, Math.max(0, (depth - 0.25) / 0.75));
  return 0.8 + Math.pow(t, 1.7) * 1.1;
}

/** Rutans storlek i världsenheter. Liggande beskärs 4:3, stående 4:5. */
export function tileSize(item: LayoutInput) {
  const landscape = item.width >= item.height;
  const w = (landscape ? 300 : 210) * depthScale(item.depth);
  return { w, h: landscape ? (w * 3) / 4 : (w * 5) / 4 };
}

/** 0 för de minsta, 1 för de största. */
function bigness(depth: number) {
  return Math.pow(Math.min(1, Math.max(0, (depth - 0.25) / 0.75)), 1.7);
}

/** Tilldelar celler så att stora objekt inte hamnar intill varandra. */
function assignSlots(items: LayoutInput[], slots: { x: number; y: number }[]) {
  const queue = [...items];
  const placed: { item: LayoutInput; slot: { x: number; y: number } }[] = [];
  for (const slot of slots) {
    if (!queue.length) break;
    const neighbors = placed.filter(
      (p) => Math.hypot(p.slot.x - slot.x, p.slot.y - slot.y) < NEIGHBOR_RADIUS
    );
    let best = 0;
    let bestScore = Infinity;
    for (let k = 0; k < Math.min(LOOKAHEAD, queue.length); k++) {
      const b = bigness(queue[k].depth);
      const clash = neighbors.reduce((sum, n) => sum + b * bigness(n.item.depth), 0);
      // Liten straff för att hoppa fram i kön, så ordningen mest behålls.
      const score = clash + k * 0.08;
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    placed.push({ item: queue.splice(best, 1)[0], slot });
  }
  return placed;
}

export function layoutMood(items: LayoutInput[]): Map<string, LaidOut> {
  const slots = cells(items.length);
  const nodes = assignSlots(items, slots).map(({ item, slot }) => {
    const rand = seededRandom(hashSeed(item.id));
    const { w, h } = tileSize(item);
    return {
      id: item.id,
      x: slot.x + (rand() * 2 - 1) * JITTER_X,
      y: slot.y + (rand() * 2 - 1) * JITTER_Y,
      w,
      h,
      depth: item.depth,
      // Riktning att knuffa åt om två objekt ligger exakt på varandra.
      nudge: rand() * Math.PI * 2,
    };
  });

  const overlap = (a: (typeof nodes)[number], b: (typeof nodes)[number]) => {
    const ox = (a.w + b.w) / 2 - Math.abs(b.x - a.x);
    const oy = (a.h + b.h) / 2 - Math.abs(b.y - a.y);
    return ox > 0 && oy > 0 ? { ox, oy, area: ox * oy } : null;
  };

  // Enhetsvektor från a till b, med höjden nedtonad så knuffar går i sidled.
  const direction = (a: (typeof nodes)[number], b: (typeof nodes)[number]) => {
    let nx = b.x - a.x;
    let ny = (b.y - a.y) * PUSH_Y;
    const len = Math.hypot(nx, ny);
    if (len < 1) return { nx: Math.cos(a.nudge), ny: Math.sin(a.nudge) * PUSH_Y };
    nx /= len;
    ny /= len;
    return { nx, ny };
  };

  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const o = overlap(a, b);
        if (!o) continue;
        const allowed = MAX_OVERLAP * Math.min(a.w * a.h, b.w * b.h);
        const excess = o.area - allowed;
        if (excess <= 0) continue;
        const { nx, ny } = direction(a, b);
        const step = Math.min(24, (excess / Math.max(o.ox, o.oy)) * 0.25);
        a.x -= nx * step;
        a.y -= ny * step;
        b.x += nx * step;
        b.y += ny * step;
        moved = true;
      }
    }

    // Regel 2: flytta bort objekt som är för täckta av det som ligger framför.
    for (const back of nodes) {
      let covered = 0;
      let px = 0;
      let py = 0;
      for (const front of nodes) {
        if (front === back || front.depth <= back.depth) continue;
        const o = overlap(back, front);
        if (!o) continue;
        covered += o.area;
        const { nx, ny } = direction(front, back);
        px += nx * o.area;
        py += ny * o.area;
      }
      const area = back.w * back.h;
      const excess = covered - MAX_COVER * area;
      if (excess <= 0) continue;
      const len = Math.hypot(px, py) || 1;
      const step = Math.min(30, (excess / area) * 60);
      back.x += (px / len) * step;
      back.y += (py / len) * step;
      moved = true;
    }

    for (const n of nodes) n.y = Math.min(MAX_Y, Math.max(-MAX_Y, n.y));
    if (!moved) break;
  }

  return new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
}
