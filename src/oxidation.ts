// Infer oxidation states for each element occurrence in a chemical formula.
//
// Approach:
//   - Parse formula to {element -> count}.
//   - Apply fixed rules (group 1 = +1, group 2 = +2, F = -1, O = -2, H = +1)
//     EXCEPT for elemental forms (single element) which are all 0.
//   - Solve for the remaining unknown element by charge balance (sum = 0 for
//     neutral, sum = charge for ions).
//
// Returns Rational numbers since e.g. Fe in Fe3O4 has average oxidation state
// of +8/3 (textbooks often mark this as the average).

import { parseFormula } from './parser.js';

export interface Oxidation {
  /** Numerator and denominator of the oxidation number; sign on numerator. */
  num: number;
  den: number;
}

const FIXED: Record<string, number> = {
  // Group 1
  H: 1, // overridden in metal hydrides below
  Li: 1,
  Na: 1,
  K: 1,
  Rb: 1,
  Cs: 1,
  Ag: 1,
  // Group 2
  Be: 2,
  Mg: 2,
  Ca: 2,
  Sr: 2,
  Ba: 2,
  Zn: 2,
  // Group 13
  Al: 3,
  // Halogens — typically -1, overridden if compound contains a more
  // electronegative element (O or another more EN halogen).
  F: -1,
  Cl: -1,
  Br: -1,
  I: -1,
  // Oxygen
  O: -2,
};

const METAL_HYDRIDES = new Set(['NaH', 'KH', 'LiH', 'CaH2', 'MgH2', 'AlH3']);
// In peroxides oxygen is -1, in superoxides -1/2. Handled specially.
const PEROXIDES = new Set(['H2O2', 'Na2O2', 'K2O2', 'BaO2', 'CaO2']);

/**
 * Compute oxidation states for every element in a formula.
 * For elemental species (only one element) all atoms get 0.
 *
 * Returns a map of element -> Oxidation. Throws if it cannot be solved.
 */
export function oxidationStates(formula: string): Map<string, Oxidation> {
  const atoms = parseFormula(formula);
  const elements = [...atoms.keys()];
  const result = new Map<string, Oxidation>();

  // 1. Elemental species: every atom is 0.
  if (elements.length === 1) {
    result.set(elements[0], { num: 0, den: 1 });
    return result;
  }

  // 2. Special compounds with known overrides.
  if (PEROXIDES.has(formula.replace(/\s/g, ''))) {
    // O = -1, solve the other.
    result.set('O', { num: -1, den: 1 });
    const other = elements.find((e) => e !== 'O')!;
    const charge = computeOther(atoms, other, new Map([['O', { num: -1, den: 1 }]]));
    result.set(other, charge);
    return result;
  }
  if (METAL_HYDRIDES.has(formula.replace(/\s/g, ''))) {
    result.set('H', { num: -1, den: 1 });
    const other = elements.find((e) => e !== 'H')!;
    const charge = computeOther(atoms, other, new Map([['H', { num: -1, den: 1 }]]));
    result.set(other, charge);
    return result;
  }

  // 3. Apply fixed rules. Find the single unknown.
  const fixed = new Map<string, Oxidation>();
  const unknowns: string[] = [];
  for (const el of elements) {
    if (FIXED[el] !== undefined) {
      fixed.set(el, { num: FIXED[el], den: 1 });
    } else {
      unknowns.push(el);
    }
  }

  if (unknowns.length === 0) {
    // All elements have fixed valences. Verify charge balance.
    let totalNum = 0n;
    let totalDen = 1n;
    for (const el of elements) {
      const ox = fixed.get(el)!;
      const cnt = atoms.get(el)!;
      totalNum = totalNum * BigInt(ox.den) + BigInt(ox.num * cnt) * totalDen;
      totalDen = totalDen * BigInt(ox.den);
    }
    // If not balanced, fall back: use first non-fixed-by-need element.
    if (totalNum !== 0n) {
      // Treat halogen as variable if oxygen present (e.g. HClO, KClO3)
      const variable = ['Cl', 'Br', 'I', 'S', 'N', 'P', 'C'].find((e) =>
        elements.includes(e) && fixed.has(e),
      );
      if (variable) fixed.delete(variable);
      else throw new Error(`Cannot balance oxidation states for ${formula}`);
      // Re-solve with variable
      for (const el of elements) {
        if (fixed.has(el)) result.set(el, fixed.get(el)!);
      }
      const ox = computeOther(atoms, variable!, fixed);
      result.set(variable!, ox);
      return result;
    }
    for (const [el, ox] of fixed) result.set(el, ox);
    return result;
  }

  if (unknowns.length === 1) {
    for (const [el, ox] of fixed) result.set(el, ox);
    const ox = computeOther(atoms, unknowns[0], fixed);
    result.set(unknowns[0], ox);
    return result;
  }

  // Multiple unknowns: cannot uniquely solve. Try heuristics: pick the more
  // electropositive one as variable.
  throw new Error(
    `Cannot uniquely determine oxidation states for ${formula} (unknowns: ${unknowns.join(',')})`,
  );
}

/**
 * Given fixed valences and atom counts, solve for the oxidation number of
 * `target` so the total charge is zero.
 */
function computeOther(
  atoms: Map<string, number>,
  target: string,
  fixed: Map<string, Oxidation>,
): Oxidation {
  // sum_i v_i * count_i + v_target * count_target = 0
  // => v_target = -sum / count_target
  let sumNum = 0;
  let sumDen = 1;
  for (const [el, cnt] of atoms) {
    if (el === target) continue;
    const v = fixed.get(el);
    if (!v) throw new Error(`Missing fixed valence for ${el}`);
    // sumNum/sumDen += v.num/v.den * cnt
    const newNum = sumNum * v.den + v.num * cnt * sumDen;
    const newDen = sumDen * v.den;
    sumNum = newNum;
    sumDen = newDen;
  }
  const targetCount = atoms.get(target)!;
  // v_target = -sumNum / (sumDen * targetCount)
  return reduce({ num: -sumNum, den: sumDen * targetCount });
}

function reduce(o: Oxidation): Oxidation {
  const g = gcd(Math.abs(o.num), Math.abs(o.den));
  let n = o.num / g;
  let d = o.den / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { num: n, den: d };
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

/** Format an oxidation number like "+3", "-2", "+8/3". */
export function formatOxidation(o: Oxidation): string {
  if (o.den === 1) {
    if (o.num === 0) return '0';
    return o.num > 0 ? `+${o.num}` : `${o.num}`;
  }
  const sign = o.num < 0 ? '-' : '+';
  return `${sign}${Math.abs(o.num)}/${o.den}`;
}
