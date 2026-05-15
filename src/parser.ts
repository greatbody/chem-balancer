// Parse a chemical formula like "Ca(OH)2", "Fe2(SO4)3", "H2O" into a map of
// element -> count. Throws on malformed input.

export type ElementMap = Map<string, number>;

export function parseFormula(formula: string): ElementMap {
  const trimmed = formula.trim();
  if (!trimmed) throw new Error('Empty formula');

  const result: ElementMap = new Map();
  const stack: ElementMap[] = [new Map()];
  let i = 0;

  while (i < trimmed.length) {
    const c = trimmed[i];

    if (c === '(' || c === '[') {
      stack.push(new Map());
      i++;
    } else if (c === ')' || c === ']') {
      i++;
      const mult = readNumber(trimmed, i);
      i = mult.next;
      const top = stack.pop();
      if (!top || stack.length === 0) {
        throw new Error(`Unmatched closing bracket in "${formula}"`);
      }
      const parent = stack[stack.length - 1];
      for (const [el, cnt] of top) {
        parent.set(el, (parent.get(el) ?? 0) + cnt * mult.value);
      }
    } else if (/[A-Z]/.test(c)) {
      let sym = c;
      i++;
      while (i < trimmed.length && /[a-z]/.test(trimmed[i])) {
        sym += trimmed[i];
        i++;
      }
      const mult = readNumber(trimmed, i);
      i = mult.next;
      const top = stack[stack.length - 1];
      top.set(sym, (top.get(sym) ?? 0) + mult.value);
    } else if (c === '·' || c === '*' || c === '.') {
      // Handle hydrate dot, e.g. "CuSO4·5H2O"
      i++;
      const mult = readNumber(trimmed, i);
      i = mult.next;
      // Parse the remainder as a sub-formula and multiply
      const rest = trimmed.slice(i);
      const sub = parseFormula(rest);
      const top = stack[stack.length - 1];
      for (const [el, cnt] of sub) {
        top.set(el, (top.get(el) ?? 0) + cnt * mult.value);
      }
      i = trimmed.length;
    } else if (/\s/.test(c)) {
      i++;
    } else {
      throw new Error(`Unexpected character "${c}" in formula "${formula}"`);
    }
  }

  if (stack.length !== 1) {
    throw new Error(`Unmatched opening bracket in "${formula}"`);
  }
  for (const [el, cnt] of stack[0]) {
    result.set(el, (result.get(el) ?? 0) + cnt);
  }
  return result;
}

function readNumber(s: string, i: number): { value: number; next: number } {
  let j = i;
  while (j < s.length && /[0-9]/.test(s[j])) j++;
  if (j === i) return { value: 1, next: i };
  return { value: parseInt(s.slice(i, j), 10), next: j };
}

export interface ParsedEquation {
  reactants: string[];
  products: string[];
}

export function parseEquation(eq: string): ParsedEquation {
  // Accept "=", "->", "=>", "→" as the arrow.
  const arrowRegex = /->|=>|=|→/;
  const parts = eq.split(arrowRegex);
  if (parts.length !== 2) {
    throw new Error('Equation must contain exactly one "=", "->" or "→"');
  }
  const split = (side: string): string[] =>
    side
      .split('+')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const reactants = split(parts[0]);
  const products = split(parts[1]);
  if (reactants.length === 0) throw new Error('No reactants');
  if (products.length === 0) throw new Error('No products');
  return { reactants, products };
}
