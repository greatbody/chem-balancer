import { describe, it, expect } from 'vitest';
import { oxidationStates, formatOxidation } from '../src/oxidation';

const ox = (formula: string, el: string) => {
  const m = oxidationStates(formula);
  const v = m.get(el);
  if (!v) throw new Error(`No ${el} in ${formula}`);
  return formatOxidation(v);
};

describe('oxidationStates — elemental species', () => {
  it('Fe = 0', () => expect(ox('Fe', 'Fe')).toBe('0'));
  it('O2 = 0', () => expect(ox('O2', 'O')).toBe('0'));
  it('H2 = 0', () => expect(ox('H2', 'H')).toBe('0'));
  it('Cl2 = 0', () => expect(ox('Cl2', 'Cl')).toBe('0'));
  it('S8 = 0', () => expect(ox('S8', 'S')).toBe('0'));
});

describe('oxidationStates — common binary compounds', () => {
  it('H2O: H=+1, O=-2', () => {
    expect(ox('H2O', 'H')).toBe('+1');
    expect(ox('H2O', 'O')).toBe('-2');
  });
  it('CO2: C=+4, O=-2', () => {
    expect(ox('CO2', 'C')).toBe('+4');
    expect(ox('CO2', 'O')).toBe('-2');
  });
  it('NaCl: Na=+1, Cl=-1', () => {
    expect(ox('NaCl', 'Na')).toBe('+1');
    expect(ox('NaCl', 'Cl')).toBe('-1');
  });
  it('NH3: N=-3, H=+1', () => {
    expect(ox('NH3', 'N')).toBe('-3');
    expect(ox('NH3', 'H')).toBe('+1');
  });
  it('Fe2O3: Fe=+3', () => {
    expect(ox('Fe2O3', 'Fe')).toBe('+3');
  });
  it('Al2O3: Al=+3', () => {
    expect(ox('Al2O3', 'Al')).toBe('+3');
  });
});

describe('oxidationStates — fractional & mixed valence', () => {
  it('Fe3O4: Fe = +8/3', () => {
    expect(ox('Fe3O4', 'Fe')).toBe('+8/3');
  });
});

describe('oxidationStates — polyatomic compounds', () => {
  it('H2SO4: S=+6', () => {
    expect(ox('H2SO4', 'S')).toBe('+6');
  });
  it('HNO3: N=+5', () => {
    expect(ox('HNO3', 'N')).toBe('+5');
  });
  it('KMnO4: Mn=+7', () => {
    expect(ox('KMnO4', 'Mn')).toBe('+7');
  });
  it('K2MnO4: Mn=+6', () => {
    expect(ox('K2MnO4', 'Mn')).toBe('+6');
  });
  it('MnO2: Mn=+4', () => {
    expect(ox('MnO2', 'Mn')).toBe('+4');
  });
  it('KClO3: Cl=+5', () => {
    expect(ox('KClO3', 'Cl')).toBe('+5');
  });
  it('Ca(OH)2: Ca=+2, O=-2, H=+1', () => {
    expect(ox('Ca(OH)2', 'Ca')).toBe('+2');
    expect(ox('Ca(OH)2', 'O')).toBe('-2');
    expect(ox('Ca(OH)2', 'H')).toBe('+1');
  });
});

describe('oxidationStates — peroxides & hydrides', () => {
  it('H2O2: O=-1', () => {
    expect(ox('H2O2', 'O')).toBe('-1');
    expect(ox('H2O2', 'H')).toBe('+1');
  });
  it('Na2O2: O=-1', () => {
    expect(ox('Na2O2', 'O')).toBe('-1');
    expect(ox('Na2O2', 'Na')).toBe('+1');
  });
  it('NaH: H=-1', () => {
    expect(ox('NaH', 'H')).toBe('-1');
    expect(ox('NaH', 'Na')).toBe('+1');
  });
});

describe('formatOxidation', () => {
  it('formats integers with sign', () => {
    expect(formatOxidation({ num: 3, den: 1 })).toBe('+3');
    expect(formatOxidation({ num: -2, den: 1 })).toBe('-2');
    expect(formatOxidation({ num: 0, den: 1 })).toBe('0');
  });
  it('formats fractions with sign', () => {
    expect(formatOxidation({ num: 8, den: 3 })).toBe('+8/3');
    expect(formatOxidation({ num: -1, den: 2 })).toBe('-1/2');
  });
});
