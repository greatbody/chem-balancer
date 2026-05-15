import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEMO_EXAMPLES,
  tryBalance,
  renderDemoButtons,
  renderResult,
  bootstrap,
} from '../src/ui';

describe('DEMO_EXAMPLES', () => {
  it('has at least 3 examples', () => {
    expect(DEMO_EXAMPLES.length).toBeGreaterThanOrEqual(3);
  });
  it('every demo example is balanceable', () => {
    for (const d of DEMO_EXAMPLES) {
      const out = tryBalance(d.equation);
      expect(out.ok, `Demo "${d.label}" (${d.equation}) failed: ${out.error}`).toBe(
        true,
      );
    }
  });
});

describe('tryBalance', () => {
  it('returns ok for valid', () => {
    const out = tryBalance('H2 + O2 -> H2O');
    expect(out.ok).toBe(true);
    expect(out.result?.coefficients).toEqual([2, 1, 2]);
  });
  it('returns error for invalid', () => {
    const out = tryBalance('not valid');
    expect(out.ok).toBe(false);
    expect(out.error).toBeTruthy();
  });
});

describe('renderDemoButtons', () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders one button per example', () => {
    renderDemoButtons(container, DEMO_EXAMPLES, () => {});
    expect(container.querySelectorAll('button').length).toBe(DEMO_EXAMPLES.length);
  });

  it('button click invokes callback with equation', () => {
    let picked = '';
    renderDemoButtons(
      container,
      [{ label: 'X', equation: 'H2 + O2 -> H2O' }],
      (eq) => {
        picked = eq;
      },
    );
    container.querySelector<HTMLButtonElement>('button')!.click();
    expect(picked).toBe('H2 + O2 -> H2O');
  });

  it('clears previous content on re-render', () => {
    renderDemoButtons(container, DEMO_EXAMPLES, () => {});
    renderDemoButtons(container, [{ label: 'X', equation: 'H2' }], () => {});
    expect(container.querySelectorAll('button').length).toBe(1);
  });

  it('button text contains the demo label and dataset has equation', () => {
    renderDemoButtons(container, [{ label: 'foo', equation: 'A -> A' }], () => {});
    const btn = container.querySelector<HTMLButtonElement>('button')!;
    expect(btn.textContent).toContain('foo');
    expect(btn.dataset.equation).toBe('A -> A');
    expect(btn.querySelector('.demo-label')!.textContent).toBe('foo');
    expect(btn.querySelector('.demo-preview')).not.toBeNull();
  });
});

describe('renderResult', () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders ok result as a canvas wrapper carrying structural dataset', () => {
    renderResult(container, tryBalance('H2 + O2 -> H2O'));
    const ok = container.querySelector<HTMLElement>('.result.ok')!;
    expect(ok.classList.contains('canvas-wrap')).toBe(true);
    const canvas = ok.querySelector('canvas.equation-canvas');
    expect(canvas).not.toBeNull();
    expect(ok.dataset.species).toBe('3');
    expect(ok.dataset.coefficients).toBe('2,1,2');
    expect(ok.dataset.changes).toBe('2'); // H and O both change oxidation state
    expect(container.querySelector('.result-meta')?.textContent).toContain('2, 1, 2');
  });

  it('renders error', () => {
    renderResult(container, tryBalance('garbage'));
    const err = container.querySelector('.result.error')!;
    expect(err.textContent).toContain('❌');
  });
});

describe('bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="equation-input" />
      <button id="balance-btn"></button>
      <div id="demo-box"></div>
      <div id="result-box"></div>
    `;
  });

  it('clicking a demo button fills the input AND auto-balances', () => {
    bootstrap();
    const demoBtn = document.querySelector<HTMLButtonElement>('#demo-box button')!;
    demoBtn.click();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    expect(input.value).toBe(demoBtn.dataset.equation);
    expect(document.querySelector('#result-box .result.ok canvas')).not.toBeNull();
  });

  it('clicking balance button shows canvas result', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'H2 + O2 -> H2O';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const ok = document.querySelector<HTMLElement>('.result.ok')!;
    expect(ok.querySelector('canvas')).not.toBeNull();
    expect(ok.dataset.coefficients).toBe('2,1,2');
  });

  it('pressing Enter in the input triggers balance', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'CH4 + O2 -> CO2 + H2O';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const ok = document.querySelector<HTMLElement>('.result.ok')!;
    expect(ok.dataset.coefficients).toBe('1,2,1,2');
  });

  it('empty input shows error', () => {
    bootstrap();
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    expect(document.querySelector('.result.error')?.textContent).toContain('请输入');
  });

  it('CaCO3 + HCl reaction marks CO2 product as gas in dataset', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'CaCO3 + HCl -> CaCl2 + H2O + CO2';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const ok = document.querySelector<HTMLElement>('.result.ok')!;
    expect(ok.dataset.markers).toBe(',,↑');
  });

  it('Na2CO3 + CaCl2 reaction marks CaCO3 product as precipitate', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'Na2CO3 + CaCl2 -> CaCO3 + NaCl';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const ok = document.querySelector<HTMLElement>('.result.ok')!;
    expect(ok.dataset.markers).toBe('↓,');
  });

  it('combustion of methane has no markers and includes condition 点燃', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'CH4 + O2 -> CO2 + H2O';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const ok = document.querySelector<HTMLElement>('.result.ok')!;
    expect(ok.dataset.markers).toBe(',');
    expect(ok.dataset.arrowTop).toBe('点燃');
  });

  it('thermite has redox changes recorded in dataset', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'Al + Fe3O4 -> Fe + Al2O3';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const ok = document.querySelector<HTMLElement>('.result.ok')!;
    expect(Number(ok.dataset.changes)).toBeGreaterThanOrEqual(2);
    expect(ok.dataset.arrowTop).toBe('高温');
  });

  it('does nothing if root is missing required elements', () => {
    document.body.innerHTML = '';
    expect(() => bootstrap()).not.toThrow();
  });
});
