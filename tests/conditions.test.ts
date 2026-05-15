import { describe, it, expect } from 'vitest';
import { inferCondition } from '../src/conditions';

describe('inferCondition', () => {
  it('methane combustion -> 点燃', () => {
    expect(inferCondition(['CH4', 'O2'], ['CO2', 'H2O']).top).toBe('点燃');
  });
  it('hydrogen burning -> 点燃', () => {
    expect(inferCondition(['H2', 'O2'], ['H2O']).top).toBe('点燃');
  });
  it('iron + oxygen -> 点燃', () => {
    expect(inferCondition(['Fe', 'O2'], ['Fe2O3']).top).toBe('点燃');
  });
  it('thermite -> 高温', () => {
    expect(inferCondition(['Al', 'Fe3O4'], ['Fe', 'Al2O3']).top).toBe('高温');
  });
  it('CaCO3 decomposition -> 高温', () => {
    expect(inferCondition(['CaCO3'], ['CaO', 'CO2']).top).toBe('高温');
  });
  it('KMnO4 decomposition -> △', () => {
    expect(inferCondition(['KMnO4'], ['K2MnO4', 'MnO2', 'O2']).top).toBe('△');
  });
  it('KClO3 decomposition -> MnO2 / △', () => {
    const c = inferCondition(['KClO3'], ['KCl', 'O2']);
    expect(c.top).toBe('MnO2');
    expect(c.bottom).toBe('△');
  });
  it('electrolysis of water -> 通电', () => {
    expect(inferCondition(['H2O'], ['H2', 'O2']).top).toBe('通电');
  });
  it('photosynthesis -> 光照', () => {
    expect(inferCondition(['CO2', 'H2O'], ['C6H12O6', 'O2']).top).toBe('光照');
  });
  it('Haber -> 高温高压 / 催化剂', () => {
    const c = inferCondition(['N2', 'H2'], ['NH3']);
    expect(c.top).toBe('高温高压');
    expect(c.bottom).toBe('催化剂');
  });
  it('neutralization -> no condition', () => {
    expect(inferCondition(['Ca(OH)2', 'HCl'], ['CaCl2', 'H2O']).top).toBe('');
  });
});
