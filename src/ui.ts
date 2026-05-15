import { balance, type BalanceResult } from './balancer.js';
import { renderEquation, renderTokens, tokenizeFormula } from './formula-render.js';
import { annotateReaction, markerSymbol } from './state-marker.js';

export interface DemoExample {
  label: string;
  equation: string;
}

export const DEMO_EXAMPLES: DemoExample[] = [
  { label: '燃烧甲烷', equation: 'CH4 + O2 -> CO2 + H2O' },
  { label: '光合作用', equation: 'CO2 + H2O -> C6H12O6 + O2' },
  { label: '铁与氧气', equation: 'Fe + O2 -> Fe2O3' },
  { label: '中和反应', equation: 'Ca(OH)2 + HCl -> CaCl2 + H2O' },
  { label: '硫酸铝复分解', equation: 'Al + Fe2(SO4)3 -> Al2(SO4)3 + Fe' },
  { label: '高锰酸钾分解', equation: 'KMnO4 -> K2MnO4 + MnO2 + O2' },
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

/**
 * Render demo buttons. The button label is the Chinese name; under it we show
 * the formatted equation with subscripts so users see what a valid input looks
 * like.
 */
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

/**
 * Render a possibly-unbalanced equation string with subscripts. Falls back to
 * plain text if parsing fails.
 */
function renderEquationPreview(parent: HTMLElement, eq: string): void {
  // Split on the arrow first.
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

export function renderResult(container: HTMLElement, outcome: TryBalanceOutcome): void {
  container.innerHTML = '';
  if (outcome.ok && outcome.result) {
    const eq = document.createElement('div');
    eq.className = 'result ok';
    const ann = annotateReaction(
      outcome.result.reactants,
      outcome.result.products,
    );
    const markerStrings = ann.productMarkers.map(markerSymbol);
    renderEquation(
      eq,
      outcome.result.coefficients,
      outcome.result.reactants,
      outcome.result.products,
      '⟶',
      markerStrings,
    );
    container.appendChild(eq);

    const meta = document.createElement('div');
    meta.className = 'result-meta';
    meta.textContent = `系数: [${outcome.result.coefficients.join(', ')}]`;
    container.appendChild(meta);
  } else {
    const err = document.createElement('div');
    err.className = 'result error';
    err.textContent = `❌ ${outcome.error}`;
    container.appendChild(err);
  }
}

export function bootstrap(root: ParentNode = document): void {
  const input = root.querySelector<HTMLInputElement>('#equation-input');
  const submit = root.querySelector<HTMLButtonElement>('#balance-btn');
  const demoBox = root.querySelector<HTMLElement>('#demo-box');
  const resultBox = root.querySelector<HTMLElement>('#result-box');
  if (!input || !submit || !demoBox || !resultBox) return;

  renderDemoButtons(demoBox, DEMO_EXAMPLES, (eq) => {
    input.value = eq;
    input.focus();
  });

  const run = (): void => {
    const v = input.value.trim();
    if (!v) {
      renderResult(resultBox, { ok: false, error: '请输入一个化学方程式' });
      return;
    }
    renderResult(resultBox, tryBalance(v));
  };

  submit.addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') run();
  });
}
