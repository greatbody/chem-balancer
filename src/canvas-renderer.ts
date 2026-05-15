// Canvas-based renderer for balanced chemical equations.
//
// Design:
//   - Build a linear list of "segments" (coefficient, element-with-valence,
//     subscript, operator, arrow-with-condition, state-marker).
//   - Measure each segment to compute total width and per-segment x positions.
//   - Track per-element anchor X positions (the horizontal center of every
//     element symbol in the equation) so we can draw oxidation-reduction
//     bridges that line up exactly with the element above/below.
//   - Paint: equation row at a fixed baseline; valence labels ABOVE each
//     element with valence; bridges + electron-count text in the top/bottom
//     gutters; gas/precipitate markers inline.
//
// HiDPI: the canvas backing store is sized at devicePixelRatio × CSS pixels
// and the context is scaled so all drawing commands use CSS-pixel coords.

import { tokenizeFormula } from './formula-render.js';
import type { ElementChange } from './redox.js';

export interface ValenceMap {
  // element symbol -> label string like "+3" or "+8/3"
  get(el: string): string | undefined;
  has(el: string): boolean;
}

export interface CanvasRenderInput {
  coefficients: number[];
  reactants: string[];
  products: string[];
  /** Same length as reactants+products; each is a Map element->valence. */
  valences: ValenceMap[];
  /** Same length as products. '↑' '↓' or ''. */
  productMarkers: string[];
  arrowTop: string;
  arrowBottom: string;
  /** Subset of changes whose bridges should be drawn. */
  changes: ElementChange[];
}

interface FontConfig {
  base: string;       // main equation font (serif, textbook-style)
  coef: string;       // bigger bold coefficient
  sub: string;        // subscripts
  valence: string;    // valence badge
  condition: string;  // arrow top/bottom Chinese label
  bridgeLabel: string;
  marker: string;
}

const FONTS: FontConfig = {
  base: '22px "Times New Roman", "Songti SC", "SimSun", serif',
  coef: 'bold 22px "Times New Roman", "Songti SC", "SimSun", serif',
  sub: '14px "Times New Roman", "Songti SC", "SimSun", serif',
  valence: 'bold 11px "SF Mono", Menlo, Consolas, monospace',
  condition: '12px -apple-system, "PingFang SC", sans-serif',
  bridgeLabel: '12px -apple-system, "PingFang SC", sans-serif',
  marker: 'bold 18px "Times New Roman", serif',
};

const COLORS = {
  text: '#e6edf3',
  muted: '#8b949e',
  valence: '#d29922',
  ox: '#d29922',      // oxidation (lose electrons) — orange
  red: '#58a6ff',     // reduction (gain electrons) — blue
  gas: '#58a6ff',
  precipitate: '#d29922',
};

// Vertical layout (CSS px). Y origin = top of canvas.
const PADDING_X = 24;
const TOP_GUTTER_REDOX = 60;     // space for upper bridge + label
const TOP_GUTTER_NORMAL = 16;
const VALENCE_LIFT = 22;          // distance from baseline to valence baseline
const BASELINE_FROM_TOP_OFFSET = 28; // distance from top of equation row to baseline
const ROW_HEIGHT = 40;            // equation row height (baseline+descender room)
const BOTTOM_GUTTER_REDOX = 56;
const BOTTOM_GUTTER_NORMAL = 8;

interface ElementAnchor {
  element: string;
  /** Index into the species array (0..reactants+products-1). */
  speciesIdx: number;
  centerX: number;
  /** y of the element's baseline (top of valence is centerY - VALENCE_LIFT) */
  baselineY: number;
  /** width of the element symbol (used for nice connector spacing) */
  width: number;
}

interface Segment {
  draw: (ctx: CanvasRenderingContext2D, x: number, baselineY: number) => void;
  width: number;
  /** if this segment is an element symbol, record its element + species idx */
  anchorElement?: { element: string; speciesIdx: number };
}

interface Layout {
  segments: Segment[];
  segmentX: number[];   // left x of each segment
  totalWidth: number;
  anchors: ElementAnchor[]; // populated by paint()
  baselineY: number;
  height: number;
  hasRedox: boolean;
}

function getCtxForMeasure(): CanvasRenderingContext2D {
  // Reuse a single offscreen canvas for measurement.
  const c = (typeof document !== 'undefined'
    ? document.createElement('canvas')
    : { getContext: () => null }) as HTMLCanvasElement;
  return c.getContext('2d') as CanvasRenderingContext2D;
}

/**
 * Build the segment list and measure everything. Returns layout info needed
 * for HiDPI canvas sizing.
 */
export function layoutEquation(input: CanvasRenderInput): Layout {
  const ctx = getCtxForMeasure();
  if (!ctx) {
    return { segments: [], segmentX: [], totalWidth: 0, anchors: [], baselineY: 0, height: 0, hasRedox: false };
  }

  const segments: Segment[] = [];
  const all = [...input.reactants, ...input.products];

  for (let i = 0; i < all.length; i++) {
    const isReactant = i < input.reactants.length;
    const isFirstProduct = i === input.reactants.length;

    if (i > 0) {
      if (isFirstProduct) {
        segments.push(makeArrowSegment(ctx, input.arrowTop, input.arrowBottom));
      } else {
        segments.push(makeOperatorSegment(ctx, '+'));
      }
    }

    // Coefficient
    const coef = input.coefficients[i];
    if (coef !== 1) {
      segments.push(makeCoefSegment(ctx, coef));
    }

    // Tokenize formula and emit per-token segments
    const tokens = tokenizeFormula(all[i]);
    const valences = input.valences[i];
    for (const tok of tokens) {
      if (tok.kind === 'text') {
        const parts = splitElementSymbols(tok.value);
        for (const p of parts) {
          if (/^[A-Z][a-z]?$/.test(p)) {
            const valence = valences?.get(p);
            segments.push(makeElementSegment(ctx, p, valence, i));
          } else {
            segments.push(makeTextSegment(ctx, p));
          }
        }
      } else if (tok.kind === 'sub') {
        segments.push(makeSubSegment(ctx, tok.value));
      } else if (tok.kind === 'sup') {
        segments.push(makeSupSegment(ctx, tok.value));
      }
    }

    // Product marker
    if (!isReactant) {
      const m = input.productMarkers[i - input.reactants.length];
      if (m) segments.push(makeMarkerSegment(ctx, m));
    }
  }

  const segmentX: number[] = [];
  let x = PADDING_X;
  for (const s of segments) {
    segmentX.push(x);
    x += s.width;
  }
  const totalWidth = x + PADDING_X;

  const hasRedox = input.changes.length > 0;
  const top = hasRedox ? TOP_GUTTER_REDOX : TOP_GUTTER_NORMAL;
  const bottom = hasRedox ? BOTTOM_GUTTER_REDOX : BOTTOM_GUTTER_NORMAL;
  const baselineY = top + BASELINE_FROM_TOP_OFFSET;
  const height = top + ROW_HEIGHT + bottom;

  return {
    segments,
    segmentX,
    totalWidth,
    anchors: [],
    baselineY,
    height,
    hasRedox,
  };
}

/** Render the layout onto the given canvas. Resizes canvas to fit. */
export function paintEquation(
  canvas: HTMLCanvasElement,
  input: CanvasRenderInput,
): { width: number; height: number } {
  const layout = layoutEquation(input);
  const ctx = canvas.getContext('2d')!;
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

  const cssWidth = layout.totalWidth;
  const cssHeight = layout.height;
  canvas.width = Math.ceil(cssWidth * dpr);
  canvas.height = Math.ceil(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Paint each segment, recording element anchors.
  const anchors: ElementAnchor[] = [];
  for (let i = 0; i < layout.segments.length; i++) {
    const seg = layout.segments[i];
    const x = layout.segmentX[i];
    seg.draw(ctx, x, layout.baselineY);
    if (seg.anchorElement) {
      anchors.push({
        element: seg.anchorElement.element,
        speciesIdx: seg.anchorElement.speciesIdx,
        centerX: x + seg.width / 2,
        baselineY: layout.baselineY,
        width: seg.width,
      });
    }
  }

  // Bridges
  if (layout.hasRedox) drawBridges(ctx, anchors, input.changes, layout);

  return { width: cssWidth, height: cssHeight };
}

// ---------------- Segment factories ----------------

function makeCoefSegment(ctx: CanvasRenderingContext2D, n: number): Segment {
  ctx.font = FONTS.coef;
  const text = String(n);
  const w = ctx.measureText(text).width + 2;
  return {
    width: w,
    draw: (c, x, y) => {
      c.font = FONTS.coef;
      c.fillStyle = COLORS.text;
      c.textBaseline = 'alphabetic';
      c.fillText(text, x, y);
    },
  };
}

function makeOperatorSegment(ctx: CanvasRenderingContext2D, op: string): Segment {
  ctx.font = FONTS.base;
  const text = op;
  const w = ctx.measureText(text).width + 14;
  return {
    width: w,
    draw: (c, x, y) => {
      c.font = FONTS.base;
      c.fillStyle = COLORS.muted;
      c.textBaseline = 'alphabetic';
      c.fillText(text, x + 7, y);
    },
  };
}

function makeElementSegment(
  ctx: CanvasRenderingContext2D,
  symbol: string,
  valence: string | undefined,
  speciesIdx: number,
): Segment {
  ctx.font = FONTS.base;
  const w = ctx.measureText(symbol).width;
  return {
    width: w,
    anchorElement: { element: symbol, speciesIdx },
    draw: (c, x, y) => {
      c.font = FONTS.base;
      c.fillStyle = COLORS.text;
      c.textBaseline = 'alphabetic';
      c.fillText(symbol, x, y);
      if (valence) {
        c.font = FONTS.valence;
        c.fillStyle = COLORS.valence;
        c.textBaseline = 'alphabetic';
        c.textAlign = 'center';
        c.fillText(valence, x + w / 2, y - VALENCE_LIFT);
        c.textAlign = 'start';
      }
    },
  };
}

function makeTextSegment(ctx: CanvasRenderingContext2D, txt: string): Segment {
  ctx.font = FONTS.base;
  const w = ctx.measureText(txt).width;
  return {
    width: w,
    draw: (c, x, y) => {
      c.font = FONTS.base;
      c.fillStyle = COLORS.text;
      c.textBaseline = 'alphabetic';
      c.fillText(txt, x, y);
    },
  };
}

function makeSubSegment(ctx: CanvasRenderingContext2D, txt: string): Segment {
  ctx.font = FONTS.sub;
  const w = ctx.measureText(txt).width;
  return {
    width: w,
    draw: (c, x, y) => {
      c.font = FONTS.sub;
      c.fillStyle = COLORS.text;
      c.textBaseline = 'alphabetic';
      c.fillText(txt, x, y + 4);
    },
  };
}

function makeSupSegment(ctx: CanvasRenderingContext2D, txt: string): Segment {
  ctx.font = FONTS.sub;
  const w = ctx.measureText(txt).width;
  return {
    width: w,
    draw: (c, x, y) => {
      c.font = FONTS.sub;
      c.fillStyle = COLORS.text;
      c.textBaseline = 'alphabetic';
      c.fillText(txt, x, y - 10);
    },
  };
}

function makeMarkerSegment(ctx: CanvasRenderingContext2D, marker: string): Segment {
  ctx.font = FONTS.marker;
  const w = ctx.measureText(marker).width + 2;
  const color = marker === '↑' ? COLORS.gas : COLORS.precipitate;
  return {
    width: w,
    draw: (c, x, y) => {
      c.font = FONTS.marker;
      c.fillStyle = color;
      c.textBaseline = 'alphabetic';
      c.fillText(marker, x + 1, y);
    },
  };
}

function makeArrowSegment(
  ctx: CanvasRenderingContext2D,
  top: string,
  bottom: string,
): Segment {
  ctx.font = FONTS.condition;
  const topW = top ? ctx.measureText(top).width : 0;
  const bottomW = bottom ? ctx.measureText(bottom).width : 0;
  const labelW = Math.max(topW, bottomW);
  // Arrow line length: at least 32px, expand to fit labels with padding
  const arrowW = Math.max(36, labelW + 16);
  const totalW = arrowW + 24; // extra spacing on both sides

  return {
    width: totalW,
    draw: (c, x, y) => {
      const cx = x + totalW / 2;
      const startX = cx - arrowW / 2;
      const endX = cx + arrowW / 2;

      // Double horizontal lines centered on baseline midline (~ y - 8)
      const lineMidY = y - 8;
      c.strokeStyle = COLORS.muted;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(startX, lineMidY - 3);
      c.lineTo(endX, lineMidY - 3);
      c.moveTo(startX, lineMidY + 3);
      c.lineTo(endX, lineMidY + 3);
      c.stroke();

      // Arrowhead at end
      c.beginPath();
      c.moveTo(endX, lineMidY);
      c.lineTo(endX - 6, lineMidY - 4);
      c.moveTo(endX, lineMidY);
      c.lineTo(endX - 6, lineMidY + 4);
      c.stroke();

      // Top label
      if (top) {
        c.font = FONTS.condition;
        c.fillStyle = COLORS.muted;
        c.textBaseline = 'alphabetic';
        c.textAlign = 'center';
        c.fillText(top, cx, lineMidY - 8);
        c.textAlign = 'start';
      }
      // Bottom label
      if (bottom) {
        c.font = FONTS.condition;
        c.fillStyle = COLORS.muted;
        c.textBaseline = 'top';
        c.textAlign = 'center';
        c.fillText(bottom, cx, lineMidY + 8);
        c.textAlign = 'start';
        c.textBaseline = 'alphabetic';
      }
    },
  };
}

function splitElementSymbols(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[A-Z]/.test(c)) {
      let sym = c;
      i++;
      while (i < s.length && /[a-z]/.test(s[i])) {
        sym += s[i];
        i++;
      }
      out.push(sym);
    } else {
      out.push(c);
      i++;
    }
  }
  return out;
}

// ---------------- Bridge drawing ----------------

function drawBridges(
  ctx: CanvasRenderingContext2D,
  anchors: ElementAnchor[],
  changes: ElementChange[],
  layout: Layout,
): void {
  // Map (speciesIdx, element) -> anchor
  const anchorMap = new Map<string, ElementAnchor>();
  for (const a of anchors) anchorMap.set(`${a.speciesIdx}:${a.element}`, a);

  let alternate = 0; // 0 = above, 1 = below
  const above0Y = layout.baselineY - 32;       // line for valence sits at baselineY - VALENCE_LIFT (= -22), bridge sits a bit above that
  const above1Y = layout.baselineY - 50;       // higher row when two upper bridges
  const below0Y = layout.baselineY + 18;
  const below1Y = layout.baselineY + 38;
  let upperUsed = 0;
  let lowerUsed = 0;

  for (const c of changes) {
    const a = anchorMap.get(`${c.reactantIdx}:${c.element}`);
    const b = anchorMap.get(`${c.productIdx}:${c.element}`);
    if (!a || !b) continue;

    const above = alternate === 0;
    alternate ^= 1;

    const bracketY = above
      ? upperUsed === 0 ? above0Y : above1Y
      : lowerUsed === 0 ? below0Y : below1Y;
    if (above) upperUsed++; else lowerUsed++;

    // Vertical "drop legs" go from element top/bottom inward to bracket
    const legStartA = above ? a.baselineY - 26 : a.baselineY + 6;
    const legStartB = above ? b.baselineY - 26 : b.baselineY + 6;
    const peakY = above ? bracketY - 4 : bracketY + 4;

    const color = c.kind === 'oxidation' ? COLORS.ox : COLORS.red;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.centerX, legStartA);
    ctx.lineTo(a.centerX, peakY);
    ctx.lineTo(b.centerX, peakY);
    ctx.lineTo(b.centerX, legStartB);
    ctx.stroke();

    // Label
    ctx.font = FONTS.bridgeLabel;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = above ? 'bottom' : 'top';
    const label = `${c.kind === 'oxidation' ? '失' : '得'} ${c.electrons} e⁻`;
    const labelY = above ? peakY - 2 : peakY + 2;
    const midX = (a.centerX + b.centerX) / 2;
    ctx.fillText(label, midX, labelY);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}
