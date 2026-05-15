import { describe, it, expect } from 'vitest';
import {
  tokenizeFormula,
  renderTokens,
  renderSpecies,
  renderEquation,
  type Token,
} from '../src/formula-render';

describe('tokenizeFormula', () => {
  it('simple H2O', () => {
    expect(tokenizeFormula('H2O')).toEqual<Token[]>([
      { kind: 'text', value: 'H' },
      { kind: 'sub', value: '2' },
      { kind: 'text', value: 'O' },
    ]);
  });
  it('multi-letter element', () => {
    expect(tokenizeFormula('NaCl')).toEqual<Token[]>([
      { kind: 'text', value: 'NaCl' },
    ]);
  });
  it('with parentheses keeps brackets as text', () => {
    expect(tokenizeFormula('Ca(OH)2')).toEqual<Token[]>([
      { kind: 'text', value: 'Ca(OH)' },
      { kind: 'sub', value: '2' },
    ]);
  });
  it('nested bracket', () => {
    const toks = tokenizeFormula('K3[Fe(CN)6]');
    // Just sanity check the subscripts come through.
    const subs = toks.filter((t) => t.kind === 'sub').map((t) => t.value);
    expect(subs).toEqual(['3', '6']);
  });
  it('explicit caret charge SO4^2-', () => {
    expect(tokenizeFormula('SO4^2-')).toEqual<Token[]>([
      { kind: 'text', value: 'SO' },
      { kind: 'sub', value: '4' },
      { kind: 'sup', value: '2-' },
    ]);
  });
  it('explicit caret charge Fe^3+', () => {
    expect(tokenizeFormula('Fe^3+')).toEqual<Token[]>([
      { kind: 'text', value: 'Fe' },
      { kind: 'sup', value: '3+' },
    ]);
  });
  it('trailing charge "Na+"', () => {
    expect(tokenizeFormula('Na+')).toEqual<Token[]>([
      { kind: 'text', value: 'Na' },
      { kind: 'sup', value: '+' },
    ]);
  });
  it('trailing charge "Cl-"', () => {
    expect(tokenizeFormula('Cl-')).toEqual<Token[]>([
      { kind: 'text', value: 'Cl' },
      { kind: 'sup', value: '-' },
    ]);
  });
  it('digit followed by + at end becomes superscript (Fe2+ style)', () => {
    expect(tokenizeFormula('Fe2+')).toEqual<Token[]>([
      { kind: 'text', value: 'Fe' },
      { kind: 'sup', value: '2+' },
    ]);
  });
  it('middle digit stays subscript even if formula ends with + ambiguity', () => {
    // C6H12O6 has no trailing sign — all digits are subscripts.
    const toks = tokenizeFormula('C6H12O6');
    expect(toks.filter((t) => t.kind === 'sub').map((t) => t.value)).toEqual([
      '6',
      '12',
      '6',
    ]);
    expect(toks.filter((t) => t.kind === 'sup')).toEqual([]);
  });
  it('hydrate dot CuSO4·5H2O', () => {
    const toks = tokenizeFormula('CuSO4·5H2O');
    // First text "CuSO", sub 4, text "·", sub 5, text "H", sub 2, text "O"
    expect(toks.map((t) => `${t.kind}:${t.value}`)).toEqual([
      'text:CuSO',
      'sub:4',
      'text:·',
      'sub:5',
      'text:H',
      'sub:2',
      'text:O',
    ]);
  });
  it('asterisk normalized to dot', () => {
    const toks = tokenizeFormula('CuSO4*5H2O');
    expect(toks.some((t) => t.kind === 'text' && t.value.includes('·'))).toBe(true);
  });
  it('whitespace tolerated', () => {
    expect(tokenizeFormula('  H2O  ')).toEqual(tokenizeFormula('H2O'));
  });
});

describe('renderTokens', () => {
  it('renders sub and sup as <sub>/<sup>', () => {
    const div = document.createElement('div');
    renderTokens(div, [
      { kind: 'text', value: 'H' },
      { kind: 'sub', value: '2' },
      { kind: 'text', value: 'O' },
    ]);
    expect(div.querySelectorAll('sub').length).toBe(1);
    expect(div.querySelector('sub')!.textContent).toBe('2');
    expect(div.textContent).toBe('H2O');
  });

  it('renders sup', () => {
    const div = document.createElement('div');
    renderTokens(div, [
      { kind: 'text', value: 'Fe' },
      { kind: 'sup', value: '3+' },
    ]);
    expect(div.querySelector('sup')!.textContent).toBe('3+');
  });
});

describe('renderSpecies', () => {
  it('omits coefficient 1', () => {
    const div = document.createElement('div');
    renderSpecies(div, 1, 'H2O');
    expect(div.querySelector('.coef')).toBeNull();
    expect(div.querySelector('.species')!.textContent).toBe('H2O');
  });

  it('shows coefficient >1 with .coef class', () => {
    const div = document.createElement('div');
    renderSpecies(div, 2, 'H2O');
    const coef = div.querySelector('.coef')!;
    expect(coef.textContent).toBe('2');
    expect(div.querySelector('.species')!.textContent).toBe('2H2O');
    expect(div.querySelector('sub')!.textContent).toBe('2');
  });
});

describe('renderEquation', () => {
  it('renders full equation with arrow and operators', () => {
    const div = document.createElement('div');
    renderEquation(div, [2, 1, 2], ['H2', 'O2'], ['H2O'], { arrow: '⟶' });
    // Three species
    expect(div.querySelectorAll('.species').length).toBe(3);
    // 1 '+' on left, 0 on right => 1 op
    expect(div.querySelectorAll('.arrow').length).toBe(1);
    expect(div.querySelectorAll('.op').length).toBe(1);
    expect(div.querySelector('.arrow')!.textContent).toBe('⟶');
    // Subscripts present on H2, O2, H2O => 3 sub elements
    expect(div.querySelectorAll('sub').length).toBe(3);
  });

  it('adds the .equation class to the host element', () => {
    const div = document.createElement('div');
    renderEquation(div, [1, 1], ['H2O'], ['H2O']);
    expect(div.classList.contains('equation')).toBe(true);
  });

  it('renders product markers ↑ and ↓ on the right products only', () => {
    const div = document.createElement('div');
    renderEquation(
      div,
      [1, 2, 1, 1, 1],
      ['CaCO3', 'HCl'],
      ['CaCl2', 'H2O', 'CO2'],
      { arrow: '⟶', productMarkers: ['', '', '↑'] },
    );
    const markers = div.querySelectorAll('.state-marker');
    expect(markers.length).toBe(1);
    expect(markers[0].textContent).toBe('↑');
    expect(markers[0].classList.contains('gas')).toBe(true);
  });

  it('precipitate marker gets .precipitate class', () => {
    const div = document.createElement('div');
    renderEquation(
      div,
      [1, 1, 1, 2],
      ['Na2CO3', 'CaCl2'],
      ['CaCO3', 'NaCl'],
      { arrow: '⟶', productMarkers: ['↓', ''] },
    );
    const m = div.querySelector('.state-marker')!;
    expect(m.textContent).toBe('↓');
    expect(m.classList.contains('precipitate')).toBe(true);
  });

  it('renderSpecies appends marker after subscripts', () => {
    const div = document.createElement('div');
    renderSpecies(div, 2, 'H2O', '↑');
    const species = div.querySelector('.species')!;
    const lastChild = species.lastChild as HTMLElement;
    expect(lastChild.tagName.toLowerCase()).toBe('span');
    expect(lastChild.textContent).toBe('↑');
  });

  it('renders arrow with top and bottom condition labels (double arrow)', () => {
    const div = document.createElement('div');
    renderEquation(div, [1, 2, 1, 2], ['CH4', 'O2'], ['CO2', 'H2O'], {
      arrowTop: '点燃',
      arrowBottom: '',
    });
    const ar = div.querySelector('.arrow')!;
    expect(ar.classList.contains('arrow-double')).toBe(true);
    expect(ar.querySelector('.arrow-top')!.textContent).toBe('点燃');
  });

  it('renders valence badges over named elements', () => {
    const div = document.createElement('div');
    const v = new Map<string, string>([['Fe', '+3']]);
    renderEquation(div, [1], ['Fe2O3'], ['Fe2O3'], {
      valences: [v, new Map()],
    });
    const badges = div.querySelectorAll('.valence');
    // First species "Fe2O3" should have Fe wrapped with a valence badge.
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(badges[0].textContent).toBe('+3');
  });
});
