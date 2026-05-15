import { describe, it, expect } from 'vitest';
import { layoutEquation, paintEquation } from '../src/canvas-renderer';
import type { CanvasRenderInput } from '../src/canvas-renderer';

const baseInput: CanvasRenderInput = {
  coefficients: [2, 1, 2],
  reactants: ['H2', 'O2'],
  products: ['H2O'],
  valences: [new Map(), new Map(), new Map()],
  productMarkers: [''],
  arrowTop: '',
  arrowBottom: '',
  changes: [],
};

describe('layoutEquation', () => {
  it('produces a positive total width and at least one segment per species', () => {
    const layout = layoutEquation(baseInput);
    expect(layout.totalWidth).toBeGreaterThan(0);
    expect(layout.segments.length).toBeGreaterThan(0);
    expect(layout.segmentX.length).toBe(layout.segments.length);
  });

  it('segment X coordinates are monotonically increasing', () => {
    const layout = layoutEquation(baseInput);
    for (let i = 1; i < layout.segmentX.length; i++) {
      expect(layout.segmentX[i]).toBeGreaterThanOrEqual(layout.segmentX[i - 1]);
    }
  });

  it('records anchor element data only on element segments', () => {
    const layout = layoutEquation(baseInput);
    const elementSegments = layout.segments.filter((s) => s.anchorElement);
    // 2H2 + O2 => H2O has elements: H, O, H, O => 4 element occurrences
    expect(elementSegments.length).toBe(4);
    expect(elementSegments[0].anchorElement?.element).toBe('H');
    expect(elementSegments[1].anchorElement?.element).toBe('O');
    expect(elementSegments[2].anchorElement?.element).toBe('H');
    expect(elementSegments[3].anchorElement?.element).toBe('O');
  });

  it('expands height when redox bridges are needed', () => {
    const noRedox = layoutEquation(baseInput);
    const redox = layoutEquation({
      ...baseInput,
      changes: [
        {
          element: 'H',
          from: { num: 0, den: 1 },
          to: { num: 1, den: 1 },
          electrons: 4,
          kind: 'oxidation',
          reactantIdx: 0,
          productIdx: 2,
        },
      ],
    });
    expect(redox.height).toBeGreaterThan(noRedox.height);
    expect(redox.hasRedox).toBe(true);
    expect(noRedox.hasRedox).toBe(false);
  });

  it('arrow segment width grows with longer condition labels', () => {
    const short = layoutEquation({ ...baseInput, arrowTop: '△' });
    const long = layoutEquation({ ...baseInput, arrowTop: '高温高压' });
    expect(long.totalWidth).toBeGreaterThan(short.totalWidth);
  });
});

describe('paintEquation', () => {
  it('sizes the canvas to the layout total dimensions and applies HiDPI scale', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
    });
    const { width, height } = paintEquation(canvas, baseInput);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    // Backing store is dpr × CSS size
    expect(canvas.width).toBe(Math.ceil(width * 2));
    expect(canvas.height).toBe(Math.ceil(height * 2));
    // CSS size matches layout
    expect(canvas.style.width).toBe(`${width}px`);
    expect(canvas.style.height).toBe(`${height}px`);
  });

  it('paints a thermite-like equation with valence and bridges without throwing', () => {
    const canvas = document.createElement('canvas');
    expect(() =>
      paintEquation(canvas, {
        coefficients: [8, 3, 9, 4],
        reactants: ['Al', 'Fe3O4'],
        products: ['Fe', 'Al2O3'],
        valences: [
          new Map([['Al', '0']]),
          new Map([['Fe', '+8/3']]),
          new Map([['Fe', '0']]),
          new Map([['Al', '+3']]),
        ],
        productMarkers: ['', ''],
        arrowTop: '高温',
        arrowBottom: '',
        changes: [
          {
            element: 'Al',
            from: { num: 0, den: 1 },
            to: { num: 3, den: 1 },
            electrons: 24,
            kind: 'oxidation',
            reactantIdx: 0,
            productIdx: 3,
          },
          {
            element: 'Fe',
            from: { num: 8, den: 3 },
            to: { num: 0, den: 1 },
            electrons: 24,
            kind: 'reduction',
            reactantIdx: 1,
            productIdx: 2,
          },
        ],
      }),
    ).not.toThrow();
  });
});
