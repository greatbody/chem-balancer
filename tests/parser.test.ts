import { describe, it, expect } from 'vitest';
import { parseFormula, parseEquation } from '../src/parser';

const m = (obj: Record<string, number>) => new Map(Object.entries(obj));

describe('parseFormula', () => {
  it('simple molecule', () => {
    expect(parseFormula('H2O')).toEqual(m({ H: 2, O: 1 }));
    expect(parseFormula('CO2')).toEqual(m({ C: 1, O: 2 }));
  });
  it('multi-letter elements', () => {
    expect(parseFormula('NaCl')).toEqual(m({ Na: 1, Cl: 1 }));
    expect(parseFormula('Fe2O3')).toEqual(m({ Fe: 2, O: 3 }));
  });
  it('parentheses', () => {
    expect(parseFormula('Ca(OH)2')).toEqual(m({ Ca: 1, O: 2, H: 2 }));
    expect(parseFormula('Fe2(SO4)3')).toEqual(m({ Fe: 2, S: 3, O: 12 }));
    expect(parseFormula('Al2(SO4)3')).toEqual(m({ Al: 2, S: 3, O: 12 }));
  });
  it('nested brackets', () => {
    expect(parseFormula('K3[Fe(CN)6]')).toEqual(m({ K: 3, Fe: 1, C: 6, N: 6 }));
  });
  it('hydrate dot', () => {
    expect(parseFormula('CuSO4·5H2O')).toEqual(m({ Cu: 1, S: 1, O: 9, H: 10 }));
  });
  it('large coefficients', () => {
    expect(parseFormula('C12H22O11')).toEqual(m({ C: 12, H: 22, O: 11 }));
  });
  it('whitespace tolerated', () => {
    expect(parseFormula('  H2O  ')).toEqual(m({ H: 2, O: 1 }));
  });
  it('throws on empty', () => {
    expect(() => parseFormula('')).toThrow();
    expect(() => parseFormula('   ')).toThrow();
  });
  it('throws on unmatched bracket', () => {
    expect(() => parseFormula('Ca(OH')).toThrow();
    expect(() => parseFormula('OH)2')).toThrow();
  });
  it('throws on invalid character', () => {
    expect(() => parseFormula('H2@O')).toThrow();
    expect(() => parseFormula('2H2O')).toThrow(); // leading digit
  });
  it('throws on lowercase-only element', () => {
    expect(() => parseFormula('h2o')).toThrow();
  });
});

describe('parseEquation', () => {
  it('basic with ->', () => {
    expect(parseEquation('H2 + O2 -> H2O')).toEqual({
      reactants: ['H2', 'O2'],
      products: ['H2O'],
    });
  });
  it('basic with =', () => {
    expect(parseEquation('H2 + O2 = H2O')).toEqual({
      reactants: ['H2', 'O2'],
      products: ['H2O'],
    });
  });
  it('basic with arrow unicode', () => {
    expect(parseEquation('H2 + O2 → H2O')).toEqual({
      reactants: ['H2', 'O2'],
      products: ['H2O'],
    });
  });
  it('multiple species each side', () => {
    expect(parseEquation('Ca(OH)2 + HCl -> CaCl2 + H2O')).toEqual({
      reactants: ['Ca(OH)2', 'HCl'],
      products: ['CaCl2', 'H2O'],
    });
  });
  it('throws on missing arrow', () => {
    expect(() => parseEquation('H2 + O2 H2O')).toThrow();
  });
  it('throws on multiple arrows', () => {
    expect(() => parseEquation('A -> B -> C')).toThrow();
  });
  it('throws on empty side', () => {
    expect(() => parseEquation('-> H2O')).toThrow();
    expect(() => parseEquation('H2 ->')).toThrow();
  });
});
