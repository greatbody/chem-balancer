// Minimal canvas 2D context mock for jsdom — supports the methods used by
// canvas-renderer.ts. measureText returns width based on character count so
// layout math is deterministic in tests.

interface MinimalCtx {
  font: string;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  measureText(text: string): { width: number };
  fillText(text: string, x: number, y: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fill(): void;
}

function makeCtx(): MinimalCtx {
  return {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    measureText(text: string) {
      return { width: text.length * 8 };
    },
    fillText() {},
    clearRect() {},
    setTransform() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
  };
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, type: string) {
    if (type === '2d') return makeCtx() as unknown as CanvasRenderingContext2D;
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;
}
