import { describe, it, expect } from 'vitest';
import { analyzeRedox } from '../src/redox';

describe('analyzeRedox — non-redox reactions', () => {
  it('neutralization is not redox', () => {
    const r = analyzeRedox([1, 2, 1, 2], ['Ca(OH)2', 'HCl'], ['CaCl2', 'H2O']);
    expect(r.isRedox).toBe(false);
    expect(r.changes).toEqual([]);
  });
  it('double displacement precipitate is not redox', () => {
    const r = analyzeRedox(
      [1, 1, 1, 2],
      ['Na2CO3', 'CaCl2'],
      ['CaCO3', 'NaCl'],
    );
    expect(r.isRedox).toBe(false);
  });
});

describe('analyzeRedox — redox reactions', () => {
  it('iron rusting: 4Fe + 3O2 -> 2Fe2O3, Fe 0→+3, O 0→-2', () => {
    const r = analyzeRedox([4, 3, 2], ['Fe', 'O2'], ['Fe2O3']);
    expect(r.isRedox).toBe(true);
    const fe = r.changes.find((c) => c.element === 'Fe');
    const o = r.changes.find((c) => c.element === 'O');
    expect(fe?.kind).toBe('oxidation');
    expect(o?.kind).toBe('reduction');
    // 4 Fe atoms * |Δ3| = 12 electrons; 6 O atoms * |Δ2| = 12 electrons
    expect(fe?.electrons).toBe(12);
    expect(o?.electrons).toBe(12);
  });

  it('thermite: 8Al + 3Fe3O4 -> 9Fe + 4Al2O3', () => {
    const r = analyzeRedox(
      [8, 3, 9, 4],
      ['Al', 'Fe3O4'],
      ['Fe', 'Al2O3'],
    );
    expect(r.isRedox).toBe(true);
    const al = r.changes.find((c) => c.element === 'Al')!;
    const fe = r.changes.find((c) => c.element === 'Fe')!;
    expect(al.kind).toBe('oxidation');
    expect(fe.kind).toBe('reduction');
    // 8 Al * 3 = 24 e-; 9 Fe * (8/3) = 24 e-
    expect(al.electrons).toBe(24);
    expect(fe.electrons).toBe(24);
  });

  it('methane combustion: C oxidized, O reduced', () => {
    const r = analyzeRedox([1, 2, 1, 2], ['CH4', 'O2'], ['CO2', 'H2O']);
    expect(r.isRedox).toBe(true);
    expect(r.changes.some((c) => c.element === 'C' && c.kind === 'oxidation')).toBe(
      true,
    );
    expect(r.changes.some((c) => c.element === 'O' && c.kind === 'reduction')).toBe(
      true,
    );
  });

  it('KMnO4 decomposition: oxygen oxidized, Mn reduced', () => {
    const r = analyzeRedox(
      [2, 1, 1, 1],
      ['KMnO4'],
      ['K2MnO4', 'MnO2', 'O2'],
    );
    expect(r.isRedox).toBe(true);
    expect(r.changes.some((c) => c.element === 'O' && c.kind === 'oxidation')).toBe(
      true,
    );
  });
});

describe('analyzeRedox — indices point to correct species', () => {
  it('thermite reactantIdx/productIdx are valid', () => {
    const r = analyzeRedox(
      [8, 3, 9, 4],
      ['Al', 'Fe3O4'],
      ['Fe', 'Al2O3'],
    );
    for (const c of r.changes) {
      expect(c.reactantIdx).toBeGreaterThanOrEqual(0);
      expect(c.reactantIdx).toBeLessThan(2);
      expect(c.productIdx).toBeGreaterThanOrEqual(2);
      expect(c.productIdx).toBeLessThan(4);
    }
  });
});
