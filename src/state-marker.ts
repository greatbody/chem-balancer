// Decide which products in a balanced reaction get a ↑ (gas evolution) or
// ↓ (precipitation) marker, following Chinese high-school chemistry rules.
//
// Rules (strict mode):
//   ↑ on a product iff:
//     - the product is a gas, AND
//     - none of the reactants are gases.
//   ↓ on a product iff:
//     - the product is an insoluble solid, AND
//     - all reactants are aqueous-soluble (so the reaction happens in solution).
//
// Unknown species (not in DB) are treated as "no info" and never marked.

import { lookup, type Phase, type Solubility } from './species-db.js';

export type Marker = 'gas' | 'precipitate' | 'none';

export interface ReactionAnnotation {
  productMarkers: Marker[];
}

/**
 * Compute markers for each product given full reactant/product formulas.
 */
export function annotateReaction(
  reactants: string[],
  products: string[],
): ReactionAnnotation {
  const reactantInfo = reactants.map(lookup);
  const productInfo = products.map(lookup);

  const anyReactantIsGas = reactantInfo.some((i) => i?.phase === 'g');
  const allReactantsSoluble = reactantInfo.every(
    (i) => i !== undefined && (i.solubility === 'soluble' || i.solubility === 'slightly'),
  );

  const markers: Marker[] = products.map((_, idx) => {
    const info = productInfo[idx];
    if (!info) return 'none';

    if (isGas(info.phase) && !anyReactantIsGas) {
      return 'gas';
    }
    if (
      isSolid(info.phase) &&
      info.solubility === 'insoluble' &&
      allReactantsSoluble &&
      reactants.length >= 2
    ) {
      return 'precipitate';
    }
    return 'none';
  });

  return { productMarkers: markers };
}

function isGas(p: Phase): boolean {
  return p === 'g';
}
function isSolid(p: Phase): boolean {
  return p === 's';
}

export function markerSymbol(m: Marker): string {
  if (m === 'gas') return '↑';
  if (m === 'precipitate') return '↓';
  return '';
}

// Re-export for tests
export type { Solubility };
