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
 * Render one species with an optional integer coefficient as a <span>.
 * Coefficient 1 is omitted, like in textbooks.
 */
export function renderSpecies(
  parent: HTMLElement | DocumentFragment,
  coefficient: number,
  formula: string,
): void {
  const span = document.createElement('span');
  span.className = 'species';
  if (coefficient !== 1) {
    const c = document.createElement('span');
    c.className = 'coef';
    c.textContent = String(coefficient);
    span.appendChild(c);
  }
  renderTokens(span, tokenizeFormula(formula));
  parent.appendChild(span);
}

/**
 * Render a full balanced equation:  c1·F1 + c2·F2 = c3·F3 + ...
 */
export function renderEquation(
  parent: HTMLElement,
  coefficients: number[],
  reactants: string[],
  products: string[],
  arrow: string = '=',
): void {
  parent.classList.add('equation');
  const renderSide = (formulas: string[], offset: number): void => {
    formulas.forEach((f, idx) => {
      if (idx > 0) {
        const plus = document.createElement('span');
        plus.className = 'op';
        plus.textContent = '+';
        parent.appendChild(plus);
      }
      renderSpecies(parent, coefficients[offset + idx], f);
    });
  };
  renderSide(reactants, 0);
  const ar = document.createElement('span');
  ar.className = 'arrow';
  ar.textContent = arrow;
  parent.appendChild(ar);
  renderSide(products, reactants.length);
}
