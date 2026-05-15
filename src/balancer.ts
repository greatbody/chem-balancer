import { Rational, lcm, abs } from './rational.js';
import { parseEquation, parseFormula, type ElementMap } from './parser.js';

export interface BalanceResult {
  coefficients: number[]; // length = reactants.length + products.length
  reactants: string[];
  products: string[];
  formatted: string;
}

/**
 * Balance a chemical equation. Returns smallest positive integer coefficients.
 *
 * Strategy:
 *   - Build matrix A where rows = elements, cols = species.
 *     Reactants contribute +count, products contribute -count.
 *   - Find a non-trivial nullspace vector (Ax = 0).
 *   - Scale to smallest positive integers.
 */
export function balance(equation: string): BalanceResult {
  const { reactants, products } = parseEquation(equation);
  const species = [...reactants, ...products];
  const parsed: ElementMap[] = species.map(parseFormula);

  // Collect unique element names in stable order.
  const elements: string[] = [];
  const seen = new Set<string>();
  for (const m of parsed) {
    for (const el of m.keys()) {
      if (!seen.has(el)) {
        seen.add(el);
        elements.push(el);
      }
    }
  }

  // Build matrix: rows = elements, cols = species
  const rows = elements.length;
  const cols = species.length;
  const A: Rational[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Rational[] = [];
    const el = elements[r];
    for (let c = 0; c < cols; c++) {
      const cnt = parsed[c].get(el) ?? 0;
      const signed = c < reactants.length ? cnt : -cnt;
      row.push(new Rational(BigInt(signed)));
    }
    A.push(row);
  }

  const nullVec = nullspaceVector(A, cols);
  if (!nullVec) {
    throw new Error('Equation cannot be balanced (no non-trivial solution)');
  }

  // Scale to integer coefficients: multiply by LCM of denominators, divide by GCD.
  let denomLcm = 1n;
  for (const v of nullVec) denomLcm = lcm(denomLcm, v.d);
  const ints = nullVec.map((v) => (v.n * denomLcm) / v.d);

  // Ensure all positive (flip sign if needed).
  const firstNonZero = ints.find((x) => x !== 0n);
  if (firstNonZero === undefined) {
    throw new Error('Trivial zero solution');
  }
  const signFlip = firstNonZero < 0n ? -1n : 1n;
  let signed = ints.map((x) => x * signFlip);

  // Verify all positive; if any non-positive, the equation is unbalanceable.
  if (signed.some((x) => x <= 0n)) {
    // Try flipping the other way as a fallback for ambiguous nullspace bases.
    signed = ints.map((x) => -x * signFlip);
    if (signed.some((x) => x <= 0n)) {
      throw new Error('Equation cannot be balanced with positive coefficients');
    }
  }

  // Reduce by GCD.
  let g = signed[0];
  for (let i = 1; i < signed.length; i++) g = gcdBig(g, signed[i]);
  if (g === 0n) g = 1n;
  const coeffs = signed.map((x) => Number(x / g));

  return {
    coefficients: coeffs,
    reactants,
    products,
    formatted: formatBalanced(coeffs, reactants, products),
  };
}

function gcdBig(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}

/**
 * Compute a single nullspace basis vector of A using rational Gaussian
 * elimination. Returns null if the nullspace is trivial.
 */
export function nullspaceVector(A: Rational[][], cols: number): Rational[] | null {
  const rows = A.length;
  // Deep copy.
  const M: Rational[][] = A.map((r) => r.slice());

  // Reduced row echelon form.
  const pivotCols: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    // Find pivot row.
    let pivot = -1;
    for (let i = r; i < rows; i++) {
      if (!M[i][c].isZero()) {
        pivot = i;
        break;
      }
    }
    if (pivot === -1) continue;
    if (pivot !== r) [M[r], M[pivot]] = [M[pivot], M[r]];

    // Normalize pivot row.
    const pv = M[r][c];
    for (let j = 0; j < cols; j++) M[r][j] = M[r][j].div(pv);

    // Eliminate other rows.
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const factor = M[i][c];
      if (factor.isZero()) continue;
      for (let j = 0; j < cols; j++) {
        M[i][j] = M[i][j].sub(factor.mul(M[r][j]));
      }
    }
    pivotCols.push(c);
    r++;
  }

  // Find free columns.
  const pivotSet = new Set(pivotCols);
  const freeCols: number[] = [];
  for (let c = 0; c < cols; c++) if (!pivotSet.has(c)) freeCols.push(c);

  if (freeCols.length === 0) return null;

  // Pick the first free column as the parameter set to 1, others 0.
  const freeCol = freeCols[0];
  const x: Rational[] = new Array(cols).fill(null).map(() => Rational.zero());
  x[freeCol] = Rational.one();
  for (const otherFree of freeCols) {
    if (otherFree !== freeCol) x[otherFree] = Rational.zero();
  }
  // Back-substitute: for each pivot row, pivot var = -sum(free vars in that row).
  for (let i = 0; i < pivotCols.length; i++) {
    const pc = pivotCols[i];
    let sum = Rational.zero();
    for (const fc of freeCols) {
      sum = sum.add(M[i][fc].mul(x[fc]));
    }
    x[pc] = sum.neg();
  }
  return x;
}

export function formatBalanced(
  coeffs: number[],
  reactants: string[],
  products: string[],
): string {
  const fmt = (coef: number, formula: string) =>
    coef === 1 ? formula : `${coef}${formula}`;
  const left = reactants.map((f, i) => fmt(coeffs[i], f)).join(' + ');
  const right = products
    .map((f, i) => fmt(coeffs[reactants.length + i], f))
    .join(' + ');
  return `${left} = ${right}`;
}
