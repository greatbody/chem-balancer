// Infer the textbook-style reaction condition label that sits above the
// double-line arrow (点燃 / 高温 / △ / 催化剂 / 通电 / 光照 ...).
//
// Heuristic rules — match textbook common cases. When uncertain, returns ''.

import { lookup } from './species-db.js';

export interface ConditionGuess {
  /** Top label (e.g. "点燃"). */
  top: string;
  /** Bottom label (e.g. "催化剂"), often empty. */
  bottom: string;
}

export function inferCondition(
  reactants: string[],
  products: string[],
): ConditionGuess {
  const rSet = new Set(reactants);
  const pSet = new Set(products);

  // Electrolysis of water
  if (rSet.has('H2O') && pSet.has('H2') && pSet.has('O2') && reactants.length === 1) {
    return { top: '通电', bottom: '' };
  }

  // Photosynthesis-like (CO2 + H2O -> glucose-ish + O2)
  if (rSet.has('CO2') && rSet.has('H2O') && pSet.has('O2')) {
    return { top: '光照', bottom: '叶绿体' };
  }

  // Haber process (N2 + H2 -> NH3) typically labels 高温高压催化剂
  if (rSet.has('N2') && rSet.has('H2') && pSet.has('NH3')) {
    return { top: '高温高压', bottom: '催化剂' };
  }

  // SO2 + O2 -> SO3 with catalyst
  if (rSet.has('SO2') && rSet.has('O2') && pSet.has('SO3')) {
    return { top: '催化剂', bottom: '△' };
  }

  // Combustion: O2 reactant + organic/element burning => 点燃
  const isCombustion =
    rSet.has('O2') &&
    reactants.some((r) => isCombustible(r)) &&
    products.some((p) => p === 'CO2' || p === 'H2O' || isMetalOxide(p));
  if (isCombustion) {
    return { top: '点燃', bottom: '' };
  }

  // Thermite & high-temperature reduction:
  //   - Metal oxide + reducing metal (Al, C, CO, H2) producing metal
  //   - or carbonate decomposition producing CO2 + metal oxide
  const isHighTemp =
    // Thermite
    (reactants.some(isMetalOxide) && (rSet.has('Al') || rSet.has('C') || rSet.has('CO') || rSet.has('H2'))) ||
    // Carbonate decomposition: e.g. CaCO3 -> CaO + CO2
    (reactants.length === 1 && /CO3/.test(reactants[0]) && pSet.has('CO2'));
  if (isHighTemp) {
    return { top: '高温', bottom: '' };
  }

  // KMnO4, KClO3 type decomposition — heated (△). Single reactant + multiple products.
  if (reactants.length === 1 && products.length >= 2) {
    if (rSet.has('KMnO4') || rSet.has('KClO3') || rSet.has('NaHCO3') || rSet.has('NH4HCO3')) {
      // KClO3 often listed with MnO2 catalyst; without it just △.
      if (rSet.has('KClO3')) return { top: 'MnO2', bottom: '△' };
      return { top: '△', bottom: '' };
    }
  }

  // No identifiable condition.
  return { top: '', bottom: '' };
}

function isCombustible(formula: string): boolean {
  // Hydrocarbon / common fuel / non-oxide metal
  if (/^C\d*H\d+/.test(formula)) return true;
  if (formula === 'H2' || formula === 'S' || formula === 'P' || formula === 'C') return true;
  if (formula === 'Fe' || formula === 'Mg' || formula === 'Al' || formula === 'Cu' || formula === 'Na') return true;
  const info = lookup(formula);
  if (info?.phase === 's' && formula.length <= 3) return true; // a metal symbol typically
  return false;
}

function isMetalOxide(formula: string): boolean {
  // Heuristic: contains O, contains a metal-like element, not a non-metal oxide
  if (!/O\d*$/.test(formula) && !/O\d*\)/.test(formula)) return false;
  return /^(Fe|Cu|Al|Zn|Mg|Ca|Na|K|Mn|Pb|Ag|Cr|Ni|Co|Sn)/.test(formula);
}
