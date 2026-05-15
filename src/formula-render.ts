// Render chemistry strings as DOM with proper subscripts (numbers in formulas)
// and superscripts (ionic charges like SO4^2- or Fe^3+).
//
// Token model:
//   - 'element'      e.g. "H", "Na", "Fe"  -> normal text
//   - 'subscript'    digits inside a formula -> <sub>
//   - 'superscript'  charge like "2-", "3+", "+", "-" -> <sup>
//   - 'bracket'      ( ) [ ]               -> normal text
//   - 'dot'          · in hydrates         -> normal text
//
// We accept ASCII "^2-" / "^+" syntax as well as the plain "Fe2+" style for the
// trailing charge of a species.

export type Token =
  | { kind: 'text'; value: string }
  | { kind: 'sub'; value: string }
  | { kind: 'sup'; value: string };

/**
 * Tokenize a single chemical species (one formula, no '+' separators).
 * Examples:
 *   "H2O"           -> [H, sub:2, O]
 *   "Ca(OH)2"       -> [Ca, (, O, H, ), sub:2]
 *   "SO4^2-"        -> [S, O, sub:4, sup:2-]
 *   "Fe^3+"         -> [Fe, sup:3+]
 *   "CuSO4·5H2O"    -> [Cu, S, O, sub:4, ·, sub:5, H, sub:2, O]
 */
export function tokenizeFormula(formula: string): Token[] {
  const out: Token[] = [];
  const s = formula.trim();
  let i = 0;

  const pushText = (v: string): void => {
    const last = out[out.length - 1];
    if (last && last.kind === 'text') last.value += v;
    else out.push({ kind: 'text', value: v });
  };

  while (i < s.length) {
    const c = s[i];

    if (c === '^') {
      // Explicit superscript marker: ^2-, ^+, ^3+
      i++;
      let buf = '';
      while (i < s.length && /[0-9+\-]/.test(s[i])) {
        buf += s[i];
        i++;
      }
      if (buf) out.push({ kind: 'sup', value: buf });
      continue;
    }

    if (/[A-Z]/.test(c)) {
      let sym = c;
      i++;
      while (i < s.length && /[a-z]/.test(s[i])) {
        sym += s[i];
        i++;
      }
      pushText(sym);
      continue;
    }

    if (/[0-9]/.test(c)) {
      let buf = '';
      while (i < s.length && /[0-9]/.test(s[i])) {
        buf += s[i];
        i++;
      }
      // If immediately followed by + or - (and we're at end of token or next is
      // a non-element char), treat the whole thing as a charge superscript.
      // Heuristic: trailing charge on a species — only when at end of string.
      if (i < s.length && (s[i] === '+' || s[i] === '-') && isTrailingCharge(s, i)) {
        buf += s[i];
        i++;
        out.push({ kind: 'sup', value: buf });
      } else {
        out.push({ kind: 'sub', value: buf });
      }
      continue;
    }

    if (c === '+' || c === '-') {
      // Bare leading/trailing charge sign like "Na+" or "Cl-"
      if (isTrailingCharge(s, i)) {
        out.push({ kind: 'sup', value: c });
        i++;
        continue;
      }
    }

    if (c === '(' || c === ')' || c === '[' || c === ']' || c === '·' || c === '*' || c === '.') {
      pushText(c === '*' || c === '.' ? '·' : c);
      i++;
      continue;
    }

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Fallback: keep character as text
    pushText(c);
    i++;
  }
  return out;
}

function isTrailingCharge(s: string, i: number): boolean {
  // True if from position i to end we only see digits/+/-, meaning this is the
  // charge tail of the species.
  for (let j = i; j < s.length; j++) {
    if (!/[0-9+\-]/.test(s[j])) return false;
  }
  return true;
}

/**
 * Render tokens into a parent element. Pure DOM, no innerHTML, so safe.
 */
export function renderTokens(parent: HTMLElement | DocumentFragment, tokens: Token[]): void {
  for (const t of tokens) {
    if (t.kind === 'text') {
      parent.appendChild(document.createTextNode(t.value));
    } else if (t.kind === 'sub') {
      const el = document.createElement('sub');
      el.textContent = t.value;
      parent.appendChild(el);
    } else if (t.kind === 'sup') {
      const el = document.createElement('sup');
      el.textContent = t.value;
      parent.appendChild(el);
    }
  }
}

/**
 * Per-element oxidation labels for one species. Map: element symbol -> label
 * string like "+3" or "+8/3". Element occurrence is matched by its position in
 * tokenization order (so K1Mn1O4 labels Mn but not K/O if those aren't in the
 * map).
 */
export type ValenceLabels = Map<string, string>;

/**
 * Render one species with an optional integer coefficient as a <span>.
 * Coefficient 1 is omitted, like in textbooks. Optional state marker ('↑' or
 * '↓') is appended after the formula. Optional valenceLabels map adds a small
 * "+N" badge above each matching element.
 */
export function renderSpecies(
  parent: HTMLElement | DocumentFragment,
  coefficient: number,
  formula: string,
  marker: string = '',
  valenceLabels: ValenceLabels = new Map(),
): void {
  const span = document.createElement('span');
  span.className = 'species';
  if (coefficient !== 1) {
    const c = document.createElement('span');
    c.className = 'coef';
    c.textContent = String(coefficient);
    span.appendChild(c);
  }

  const tokens = tokenizeFormula(formula);
  // Render with per-element wrapping so we can attach valence badge.
  for (const t of tokens) {
    if (t.kind === 'text') {
      // Could contain multiple consecutive symbols stitched together (e.g.
      // "CuSO" from CuSO4). Split back into element symbols.
      const elements = splitElementSymbols(t.value);
      for (const el of elements) {
        if (/^[A-Z][a-z]?$/.test(el) && valenceLabels.has(el)) {
          const wrap = document.createElement('span');
          wrap.className = 'el-with-valence';
          const badge = document.createElement('span');
          badge.className = 'valence';
          badge.textContent = valenceLabels.get(el)!;
          wrap.appendChild(badge);
          const sym = document.createElement('span');
          sym.className = 'el';
          sym.textContent = el;
          wrap.appendChild(sym);
          span.appendChild(wrap);
        } else {
          span.appendChild(document.createTextNode(el));
        }
      }
    } else if (t.kind === 'sub') {
      const el = document.createElement('sub');
      el.textContent = t.value;
      span.appendChild(el);
    } else if (t.kind === 'sup') {
      const el = document.createElement('sup');
      el.textContent = t.value;
      span.appendChild(el);
    }
  }

  if (marker) {
    const m = document.createElement('span');
    m.className = `state-marker ${marker === '↑' ? 'gas' : 'precipitate'}`;
    m.textContent = marker;
    span.appendChild(m);
  }
  parent.appendChild(span);
}

/** Split "CuSO" -> ["Cu", "S", "O"], "Fe" -> ["Fe"], "(" -> ["("]. */
function splitElementSymbols(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[A-Z]/.test(c)) {
      let sym = c;
      i++;
      while (i < s.length && /[a-z]/.test(s[i])) {
        sym += s[i];
        i++;
      }
      out.push(sym);
    } else {
      out.push(c);
      i++;
    }
  }
  return out;
}

export interface EquationRenderOptions {
  arrow?: string;
  productMarkers?: string[];
  /** Same length as reactants+products, each entry is valence labels map. */
  valences?: ValenceLabels[];
  /** Top text of the arrow (e.g. "点燃"). */
  arrowTop?: string;
  /** Bottom text of the arrow (e.g. "催化剂"). */
  arrowBottom?: string;
}

/**
 * Render a full balanced equation with optional arrow text and per-species
 * valence overlays. The element-bridge over/under-lines are drawn separately
 * by the caller (SVG overlay) since they need actual layout positions.
 */
export function renderEquation(
  parent: HTMLElement,
  coefficients: number[],
  reactants: string[],
  products: string[],
  options: EquationRenderOptions = {},
): void {
  const {
    arrow = '⟶',
    productMarkers = [],
    valences = [],
    arrowTop = '',
    arrowBottom = '',
  } = options;

  parent.classList.add('equation');

  reactants.forEach((f, idx) => {
    if (idx > 0) {
      const plus = document.createElement('span');
      plus.className = 'op';
      plus.textContent = '+';
      parent.appendChild(plus);
    }
    renderSpecies(parent, coefficients[idx], f, '', valences[idx]);
  });

  const ar = document.createElement('span');
  ar.className = arrowTop || arrowBottom ? 'arrow arrow-double' : 'arrow';
  if (arrowTop || arrowBottom) {
    const top = document.createElement('span');
    top.className = 'arrow-top';
    top.textContent = arrowTop;
    const mid = document.createElement('span');
    mid.className = 'arrow-mid';
    mid.textContent = '═══';
    const bot = document.createElement('span');
    bot.className = 'arrow-bot';
    bot.textContent = arrowBottom;
    ar.appendChild(top);
    ar.appendChild(mid);
    ar.appendChild(bot);
  } else {
    ar.textContent = arrow;
  }
  parent.appendChild(ar);

  products.forEach((f, idx) => {
    if (idx > 0) {
      const plus = document.createElement('span');
      plus.className = 'op';
      plus.textContent = '+';
      parent.appendChild(plus);
    }
    const absIdx = reactants.length + idx;
    renderSpecies(
      parent,
      coefficients[absIdx],
      f,
      productMarkers[idx] ?? '',
      valences[absIdx],
    );
  });
}
