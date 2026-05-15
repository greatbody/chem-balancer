import { describe, it, expect } from 'vitest';
import { balance, formatBalanced } from '../src/balancer';

function expectCoeffs(eq: string, expected: number[]): void {
  const r = balance(eq);
  expect(r.coefficients).toEqual(expected);
}

describe('balance — classic equations', () => {
  it('water synthesis: H2 + O2 -> H2O', () => {
    expectCoeffs('H2 + O2 -> H2O', [2, 1, 2]);
  });
  it('methane combustion', () => {
    expectCoeffs('CH4 + O2 -> CO2 + H2O', [1, 2, 1, 2]);
  });
  it('photosynthesis', () => {
    expectCoeffs('CO2 + H2O -> C6H12O6 + O2', [6, 6, 1, 6]);
  });
  it('iron + oxygen', () => {
    expectCoeffs('Fe + O2 -> Fe2O3', [4, 3, 2]);
  });
  it('aluminum + ferric sulfate', () => {
    expectCoeffs('Al + Fe2(SO4)3 -> Al2(SO4)3 + Fe', [2, 1, 1, 2]);
  });
  it('neutralization Ca(OH)2 + HCl', () => {
    expectCoeffs('Ca(OH)2 + HCl -> CaCl2 + H2O', [1, 2, 1, 2]);
  });
  it('thermite Fe2O3 + Al', () => {
    expectCoeffs('Fe2O3 + Al -> Fe + Al2O3', [1, 2, 2, 1]);
  });
  it('propane combustion', () => {
    expectCoeffs('C3H8 + O2 -> CO2 + H2O', [1, 5, 3, 4]);
  });
  it('octane combustion', () => {
    expectCoeffs('C8H18 + O2 -> CO2 + H2O', [2, 25, 16, 18]);
  });
  it('ammonia synthesis', () => {
    expectCoeffs('N2 + H2 -> NH3', [1, 3, 2]);
  });
  it('decomposition of KClO3', () => {
    expectCoeffs('KClO3 -> KCl + O2', [2, 2, 3]);
  });
  it('decomposition of KMnO4', () => {
    expectCoeffs('KMnO4 -> K2MnO4 + MnO2 + O2', [2, 1, 1, 1]);
  });
});

describe('balance — already balanced input', () => {
  it('returns smallest integer form even if input has coefficient style', () => {
    // Input formulas have no coefficients; balancer reduces.
    expectCoeffs('H2O -> H2O', [1, 1]);
  });
});

describe('balance — formatting', () => {
  it('formats with implicit 1 omitted', () => {
    const r = balance('CH4 + O2 -> CO2 + H2O');
    expect(r.formatted).toBe('CH4 + 2O2 = CO2 + 2H2O');
  });
  it('formats octane', () => {
    const r = balance('C8H18 + O2 -> CO2 + H2O');
    expect(r.formatted).toBe('2C8H18 + 25O2 = 16CO2 + 18H2O');
  });
  it('formatBalanced helper', () => {
    expect(formatBalanced([2, 1, 2], ['H2', 'O2'], ['H2O'])).toBe(
      '2H2 + O2 = 2H2O',
    );
  });
});

describe('balance — error cases', () => {
  it('throws when atoms cannot balance (mass not conserved)', () => {
    // Na on left only, no Na on right
    expect(() => balance('Na + H2O -> H2')).toThrow();
  });
  it('throws on malformed input', () => {
    expect(() => balance('not an equation')).toThrow();
  });
  it('throws on missing side', () => {
    expect(() => balance('H2 + O2 ->')).toThrow();
  });
  it('throws on element only on one side', () => {
    expect(() => balance('H2 -> O2')).toThrow();
  });
});

describe('balance — robustness', () => {
  it('handles whitespace generously', () => {
    expectCoeffs('   CH4  +   O2  ->  CO2 +  H2O ', [1, 2, 1, 2]);
  });
  it('accepts = arrow', () => {
    expectCoeffs('H2 + O2 = H2O', [2, 1, 2]);
  });
  it('accepts unicode arrow', () => {
    expectCoeffs('H2 + O2 → H2O', [2, 1, 2]);
  });
  it('verifies mass conservation post-balance', () => {
    const r = balance('C8H18 + O2 -> CO2 + H2O');
    // Manual atom check
    const c = r.coefficients;
    // C: 8*c[0] = 1*c[2]
    expect(8 * c[0]).toBe(c[2]);
    // H: 18*c[0] = 2*c[3]
    expect(18 * c[0]).toBe(2 * c[3]);
    // O: 2*c[1] = 2*c[2] + c[3]
    expect(2 * c[1]).toBe(2 * c[2] + c[3]);
  });
});
