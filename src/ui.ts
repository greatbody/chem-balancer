import { balance, type BalanceResult } from './balancer.js';
import {
  renderTokens,
  tokenizeFormula,
  type ValenceLabels,
} from './formula-render.js';
import { annotateReaction, markerSymbol } from './state-marker.js';
import { analyzeRedox } from './redox.js';
import { oxidationStates, formatOxidation } from './oxidation.js';
import { inferCondition } from './conditions.js';
import { paintEquation } from './canvas-renderer.js';

export interface DemoExample {
  label: string;
  equation: string;
}

export const DEMO_EXAMPLES: DemoExample[] = [
  { label: '铝热反应 (氧化还原)', equation: 'Al + Fe3O4 -> Fe + Al2O3' },
  { label: '高锰酸钾分解', equation: 'KMnO4 -> K2MnO4 + MnO2 + O2' },
  { label: '燃烧甲烷', equation: 'CH4 + O2 -> CO2 + H2O' },
  { label: '光合作用', equation: 'CO2 + H2O -> C6H12O6 + O2' },
  { label: '铁与氧气', equation: 'Fe + O2 -> Fe2O3' },
  { label: '中和反应', equation: 'Ca(OH)2 + HCl -> CaCl2 + H2O' },
  { label: '辛烷燃烧', equation: 'C8H18 + O2 -> CO2 + H2O' },
  { label: '碳酸钙沉淀', equation: 'Na2CO3 + CaCl2 -> CaCO3 + NaCl' },
  { label: '盐酸大理石', equation: 'CaCO3 + HCl -> CaCl2 + H2O + CO2' },
  { label: '硫酸钡沉淀', equation: 'BaCl2 + H2SO4 -> BaSO4 + HCl' },
];

export interface TryBalanceOutcome {
  ok: boolean;
  result?: BalanceResult;
  error?: string;
}

export function tryBalance(input: string): TryBalanceOutcome {
  try {
    const result = balance(input);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function renderDemoButtons(
  container: HTMLElement,
  examples: DemoExample[],
  onPick: (eq: string) => void,
): void {
  container.innerHTML = '';
  for (const ex of examples) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'demo-btn';
    btn.dataset.equation = ex.equation;

    const label = document.createElement('span');
    label.className = 'demo-label';
    label.textContent = ex.label;
    btn.appendChild(label);

    const preview = document.createElement('span');
    preview.className = 'demo-preview equation';
    renderEquationPreview(preview, ex.equation);
    btn.appendChild(preview);

    btn.addEventListener('click', () => onPick(ex.equation));
    container.appendChild(btn);
  }
}

function renderEquationPreview(parent: HTMLElement, eq: string): void {
  const arrowMatch = eq.match(/->|=>|=|→/);
  if (!arrowMatch) {
    parent.textContent = eq;
    return;
  }
  const idx = arrowMatch.index!;
  const left = eq.slice(0, idx);
  const right = eq.slice(idx + arrowMatch[0].length);

  const renderSide = (side: string): void => {
    const parts = side
      .split('+')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    parts.forEach((p, i) => {
      if (i > 0) {
        const plus = document.createElement('span');
        plus.className = 'op';
        plus.textContent = '+';
        parent.appendChild(plus);
      }
      const sp = document.createElement('span');
      sp.className = 'species';
      renderTokens(sp, tokenizeFormula(p));
      parent.appendChild(sp);
    });
  };

  renderSide(left);
  const ar = document.createElement('span');
  ar.className = 'arrow';
  ar.textContent = '⟶';
  parent.appendChild(ar);
  renderSide(right);
}

/**
 * Compute valence-label maps for each species, ONLY for elements that change
 * oxidation state in this reaction. Non-redox reactions get empty maps.
 */
export function computeValenceOverlay(
  reactants: string[],
  products: string[],
  changedElements: Set<string>,
): ValenceLabels[] {
  const all = [...reactants, ...products];
  return all.map((f) => {
    const labels: ValenceLabels = new Map();
    if (changedElements.size === 0) return labels;
    let ox: Map<string, { num: number; den: number }>;
    try {
      ox = oxidationStates(f);
    } catch {
      return labels;
    }
    for (const el of changedElements) {
      const v = ox.get(el);
      if (v) labels.set(el, formatOxidation(v));
    }
    return labels;
  });
}

export function renderResult(container: HTMLElement, outcome: TryBalanceOutcome): void {
  container.innerHTML = '';
  if (!outcome.ok || !outcome.result) {
    const err = document.createElement('div');
    err.className = 'result error';
    err.textContent = `❌ ${outcome.error}`;
    container.appendChild(err);
    return;
  }

  const { coefficients, reactants, products } = outcome.result;

  const annotation = annotateReaction(reactants, products);
  const markers = annotation.productMarkers.map(markerSymbol);

  const redox = analyzeRedox(coefficients, reactants, products);
  const changedElements = new Set(redox.changes.map((c) => c.element));
  const valences = computeValenceOverlay(reactants, products, changedElements);

  const condition = inferCondition(reactants, products);

  // Canvas-rendered equation (precise positioning of valence labels and
  // electron-transfer bridges).
  const wrap = document.createElement('div');
  wrap.className = 'result ok canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'equation-canvas';
  // Mark structural data on the wrapper so tests can assert without
  // depending on the canvas pixel buffer.
  wrap.dataset.species = String(reactants.length + products.length);
  wrap.dataset.coefficients = coefficients.join(',');
  wrap.dataset.markers = markers.join(',');
  wrap.dataset.changes = String(redox.changes.length);
  wrap.dataset.arrowTop = condition.top;
  wrap.dataset.arrowBottom = condition.bottom;
  wrap.appendChild(canvas);
  container.appendChild(wrap);

  paintEquation(canvas, {
    coefficients,
    reactants,
    products,
    valences,
    productMarkers: markers,
    arrowTop: condition.top,
    arrowBottom: condition.bottom,
    changes: redox.changes,
  });

  const meta = document.createElement('div');
  meta.className = 'result-meta';
  meta.textContent = `系数: [${coefficients.join(', ')}]`;
  if (redox.isRedox) {
    const r = redox.changes
      .map(
        (c) =>
          `${c.element}: ${formatOxidation(c.from)} → ${formatOxidation(c.to)} (${c.kind === 'oxidation' ? '失' : '得'} ${c.electrons}e⁻)`,
      )
      .join('；');
    meta.textContent += `  ${r}`;
  }
  container.appendChild(meta);
}

export function bootstrap(root: ParentNode = document): void {
  const input = root.querySelector<HTMLInputElement>('#equation-input');
  const submit = root.querySelector<HTMLButtonElement>('#balance-btn');
  const demoBox = root.querySelector<HTMLElement>('#demo-box');
  const resultBox = root.querySelector<HTMLElement>('#result-box');
  if (!input || !submit || !demoBox || !resultBox) return;

  const run = (): void => {
    const v = input.value.trim();
    if (!v) {
      renderResult(resultBox, { ok: false, error: '请输入一个化学方程式' });
      return;
    }
    renderResult(resultBox, tryBalance(v));
  };

  renderDemoButtons(demoBox, DEMO_EXAMPLES, (eq) => {
    input.value = eq;
    run();
    if (typeof resultBox.scrollIntoView === 'function') {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  submit.addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') run();
  });
}
