// Identify redox reactions and compute electron-transfer "bridges" — the
// element-pairs that connect a reactant atom to a product atom whose oxidation
// state changed, plus the total electrons transferred (used for the
// number labelled above/below the bridge in textbook style).

import { oxidationStates, type Oxidation } from './oxidation.js';
import { parseFormula } from './parser.js';

export interface ElementChange {
  element: string;
  /** Oxidation state on reactant side. */
  from: Oxidation;
  /** Oxidation state on product side. */
  to: Oxidation;
  /** Total electrons transferred for this element across the whole reaction. */
  electrons: number;
  /** 'oxidation' (loses e-, state increases) or 'reduction'. */
  kind: 'oxidation' | 'reduction';
  /** Reactant species index containing this element (first match). */
  reactantIdx: number;
  /** Product species index containing this element (first match). */
  productIdx: number;
}

export interface RedoxAnalysis {
  isRedox: boolean;
  changes: ElementChange[];
}

/**
 * Analyze a balanced equation. For each element that appears on both sides,
 * compare oxidation states; if they differ, record the change.
 *
 * Heuristic: we take the FIRST occurrence on each side. This matches textbook
 * style for the canonical examples (Fe3O4 + Al, KMnO4 decomp, etc.).
 */
export function analyzeRedox(
  coefficients: number[],
  reactants: string[],
  products: string[],
): RedoxAnalysis {
  // Compute oxidation map for each species: element -> oxidation state.
  // If a species can't be solved, skip it.
  const reactantOx: Array<Map<string, Oxidation> | null> = reactants.map((f) =>
    safeOx(f),
  );
  const productOx: Array<Map<string, Oxidation> | null> = products.map((f) =>
    safeOx(f),
  );

  // Collect element -> (reactant occurrences, product occurrences).
  // Occurrences include species index, oxidation, and atom count per molecule.
  type Occ = { idx: number; ox: Oxidation; perMolecule: number };
  const reactantOcc = new Map<string, Occ[]>();
  const productOcc = new Map<string, Occ[]>();

  reactants.forEach((f, i) => {
    const map = reactantOx[i];
    if (!map) return;
    const atoms = parseFormula(f);
    for (const [el, ox] of map) {
      if (!reactantOcc.has(el)) reactantOcc.set(el, []);
      reactantOcc.get(el)!.push({ idx: i, ox, perMolecule: atoms.get(el) ?? 0 });
    }
  });
  products.forEach((f, i) => {
    const map = productOx[i];
    if (!map) return;
    const atoms = parseFormula(f);
    for (const [el, ox] of map) {
      if (!productOcc.has(el)) productOcc.set(el, []);
      productOcc.get(el)!.push({ idx: i, ox, perMolecule: atoms.get(el) ?? 0 });
    }
  });

  const changes: ElementChange[] = [];

  for (const [el, rOccs] of reactantOcc) {
    const pOccs = productOcc.get(el);
    if (!pOccs) continue;

    // For redox we want a *changed* pair. Find a reactant occ and product
    // occ with different oxidation states.
    for (const r of rOccs) {
      for (const p of pOccs) {
        if (oxidationDiffers(r.ox, p.ox)) {
          // Compute total electrons:
          // for each "atom of element on reactant side that ends up in this
          // product occ", electron count = |Δ| per atom * count.
          // For the textbook bridge label we report total e- transferred for
          // this element, summed over the species occurrence:
          //   atoms = coefficient(reactantIdx) * perMolecule(reactant side)
          // (matches reactant side since charge is balanced overall).
          const atoms = coefficients[r.idx] * r.perMolecule;
          const deltaPerAtom = oxDiff(p.ox, r.ox); // p - r
          const electrons = atoms * Math.abs(deltaPerAtom);
          changes.push({
            element: el,
            from: r.ox,
            to: p.ox,
            electrons,
            kind: deltaPerAtom > 0 ? 'oxidation' : 'reduction',
            reactantIdx: r.idx,
            productIdx: products.length + 0 + p.idx, // offset added later
          });
          break;
        }
      }
    }
  }

  // Fix up productIdx: caller convention — productIdx is the absolute index
  // in [reactants..products]. We stored species index in `p.idx`; turn into
  // absolute index by adding reactants.length.
  for (const c of changes) {
    c.productIdx = (c.productIdx % products.length) + reactants.length;
  }

  return { isRedox: changes.length > 0, changes };
}

function safeOx(f: string): Map<string, Oxidation> | null {
  try {
    return oxidationStates(f);
  } catch {
    return null;
  }
}

function oxidationDiffers(a: Oxidation, b: Oxidation): boolean {
  return a.num * b.den !== b.num * a.den;
}

/** Approximate numeric difference of oxidation states (b - a). */
function oxDiff(a: Oxidation, b: Oxidation): number {
  return a.num / a.den - b.num / b.den;
}
