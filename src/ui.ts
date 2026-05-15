import { balance, type BalanceResult } from './balancer.js';

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
    btn.textContent = ex.label;
    btn.title = ex.equation;
    btn.dataset.equation = ex.equation;
    btn.addEventListener('click', () => onPick(ex.equation));
    container.appendChild(btn);
  }
}

export function renderResult(container: HTMLElement, outcome: TryBalanceOutcome): void {
  container.innerHTML = '';
  if (outcome.ok && outcome.result) {
    const ok = document.createElement('div');
    ok.className = 'result ok';
    ok.textContent = outcome.result.formatted;
    container.appendChild(ok);

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
