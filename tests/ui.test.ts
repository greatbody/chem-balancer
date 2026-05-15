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

  it('renders ok result as structured equation with subscripts', () => {
    renderResult(container, tryBalance('H2 + O2 -> H2O'));
    const ok = container.querySelector('.result.ok')!;
    const eq = ok.querySelector('.equation')!;
    expect(eq).not.toBeNull();
    // 2H2 + O2 ⟶ 2H2O => 3 species, 1 op, 1 arrow
    expect(eq.querySelectorAll('.species').length).toBe(3);
    expect(eq.querySelectorAll('.arrow').length).toBe(1);
    expect(eq.querySelectorAll('.op').length).toBe(1);
    expect(eq.querySelectorAll('.coef').length).toBe(2);
    expect(eq.querySelectorAll('sub').length).toBe(3);
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

  it('wires up demo buttons that fill the input', () => {
    bootstrap();
    const demoBtn = document.querySelector<HTMLButtonElement>('#demo-box button')!;
    demoBtn.click();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    expect(input.value).toBe(demoBtn.dataset.equation);
  });

  it('clicking balance button shows structured result', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'H2 + O2 -> H2O';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const ok = document.querySelector('.result.ok')!;
    expect(ok.querySelectorAll('.species').length).toBe(3);
    expect(ok.querySelectorAll('sub').length).toBe(3);
  });

  it('pressing Enter in the input triggers balance', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'CH4 + O2 -> CO2 + H2O';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const ok = document.querySelector('.result.ok')!;
    expect(ok.querySelectorAll('.species').length).toBe(4);
    // CH4, 2O2, CO2, 2H2O — coefficient 2 appears twice
    expect(ok.querySelectorAll('.coef').length).toBe(2);
  });

  it('empty input shows error', () => {
    bootstrap();
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    expect(document.querySelector('.result.error')?.textContent).toContain('请输入');
  });

  it('CaCO3 + HCl reaction shows ↑ on CO2 product', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'CaCO3 + HCl -> CaCl2 + H2O + CO2';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const markers = document.querySelectorAll('.state-marker');
    expect(markers.length).toBe(1);
    expect(markers[0].textContent).toBe('↑');
  });

  it('Na2CO3 + CaCl2 reaction shows ↓ on CaCO3 product', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'Na2CO3 + CaCl2 -> CaCO3 + NaCl';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    const markers = document.querySelectorAll('.state-marker');
    expect(markers.length).toBe(1);
    expect(markers[0].textContent).toBe('↓');
    expect(markers[0].classList.contains('precipitate')).toBe(true);
  });

  it('combustion of methane shows no markers (O2 reactant is gas)', () => {
    bootstrap();
    const input = document.querySelector<HTMLInputElement>('#equation-input')!;
    input.value = 'CH4 + O2 -> CO2 + H2O';
    document.querySelector<HTMLButtonElement>('#balance-btn')!.click();
    expect(document.querySelectorAll('.state-marker').length).toBe(0);
  });

  it('does nothing if root is missing required elements', () => {
    document.body.innerHTML = '';
    expect(() => bootstrap()).not.toThrow();
  });
});
