// Database of common chemical species: physical phase at room temperature
// (s/l/g) and aqueous solubility. Used to decide whether a balanced equation's
// products deserve a ↑ (gas) or ↓ (precipitate) marker.
//
// Scope: junior/senior high-school chemistry in China. Not exhaustive — only
// the species that commonly appear in textbook reactions.

export type Phase = 's' | 'l' | 'g';
export type Solubility = 'soluble' | 'insoluble' | 'slightly' | 'reactive';

export interface SpeciesInfo {
  phase: Phase;
  /** Aqueous solubility. 'reactive' means it reacts with water. */
  solubility: Solubility;
}

/**
 * Canonicalize a formula for lookup: strip whitespace and trailing charge.
 * "Ca(OH)2" stays as-is; "Na+" becomes "Na"; "SO4^2-" becomes "SO4".
 */
export function canonicalize(formula: string): string {
  return formula
    .trim()
    .replace(/\s+/g, '')
    .replace(/\^[0-9]*[+\-]$/, '') // ^2-, ^+
    .replace(/[0-9]*[+\-]+$/, '');  // Fe2+, Cl-
}

/**
 * Hard-coded species table. Phases are at standard conditions (25°C, 1 atm).
 * The values reflect how Chinese high-school textbooks treat these substances.
 */
export const SPECIES_DB: Record<string, SpeciesInfo> = {
  // ---------------- Gases ----------------
  H2:   { phase: 'g', solubility: 'slightly' },
  O2:   { phase: 'g', solubility: 'slightly' },
  N2:   { phase: 'g', solubility: 'slightly' },
  Cl2:  { phase: 'g', solubility: 'reactive' },
  F2:   { phase: 'g', solubility: 'reactive' },
  CO:   { phase: 'g', solubility: 'slightly' },
  CO2:  { phase: 'g', solubility: 'soluble' },
  SO2:  { phase: 'g', solubility: 'soluble' },
  SO3:  { phase: 'g', solubility: 'reactive' },
  NO:   { phase: 'g', solubility: 'slightly' },
  NO2:  { phase: 'g', solubility: 'reactive' },
  NH3:  { phase: 'g', solubility: 'soluble' },
  // Hydrohalic acids: technically gases at STP, but in middle-school
  // equations they nearly always appear as aqueous acid. Treat as liquid
  // (aqueous) so reactions like CaCO3 + HCl correctly mark CO2 with ↑.
  HCl:  { phase: 'l', solubility: 'soluble' },
  HBr:  { phase: 'l', solubility: 'soluble' },
  HI:   { phase: 'l', solubility: 'soluble' },
  HF:   { phase: 'l', solubility: 'soluble' },
  H2S:  { phase: 'g', solubility: 'soluble' },
  CH4:  { phase: 'g', solubility: 'insoluble' },
  C2H4: { phase: 'g', solubility: 'insoluble' },
  C2H6: { phase: 'g', solubility: 'insoluble' },
  C2H2: { phase: 'g', solubility: 'insoluble' },
  C3H8: { phase: 'g', solubility: 'insoluble' },

  // ---------------- Liquids ----------------
  H2O:    { phase: 'l', solubility: 'soluble' },
  H2O2:   { phase: 'l', solubility: 'soluble' },
  H2SO4:  { phase: 'l', solubility: 'soluble' },
  HNO3:   { phase: 'l', solubility: 'soluble' },
  CH3OH:  { phase: 'l', solubility: 'soluble' },
  C2H5OH: { phase: 'l', solubility: 'soluble' },
  CH3COOH:{ phase: 'l', solubility: 'soluble' },
  Br2:    { phase: 'l', solubility: 'slightly' },

  // ---------------- Solids: metals & nonmetals ----------------
  C:    { phase: 's', solubility: 'insoluble' },
  S:    { phase: 's', solubility: 'insoluble' },
  P:    { phase: 's', solubility: 'insoluble' },
  Si:   { phase: 's', solubility: 'insoluble' },
  I2:   { phase: 's', solubility: 'slightly' },
  Na:   { phase: 's', solubility: 'reactive' },
  K:    { phase: 's', solubility: 'reactive' },
  Ca:   { phase: 's', solubility: 'reactive' },
  Mg:   { phase: 's', solubility: 'insoluble' },
  Al:   { phase: 's', solubility: 'insoluble' },
  Zn:   { phase: 's', solubility: 'insoluble' },
  Fe:   { phase: 's', solubility: 'insoluble' },
  Cu:   { phase: 's', solubility: 'insoluble' },
  Ag:   { phase: 's', solubility: 'insoluble' },
  Hg:   { phase: 'l', solubility: 'insoluble' },

  // ---------------- Solids: oxides ----------------
  Na2O:   { phase: 's', solubility: 'reactive' },
  K2O:    { phase: 's', solubility: 'reactive' },
  CaO:    { phase: 's', solubility: 'reactive' },
  MgO:    { phase: 's', solubility: 'insoluble' },
  Al2O3:  { phase: 's', solubility: 'insoluble' },
  Fe2O3:  { phase: 's', solubility: 'insoluble' },
  Fe3O4:  { phase: 's', solubility: 'insoluble' },
  FeO:    { phase: 's', solubility: 'insoluble' },
  CuO:    { phase: 's', solubility: 'insoluble' },
  Cu2O:   { phase: 's', solubility: 'insoluble' },
  ZnO:    { phase: 's', solubility: 'insoluble' },
  SiO2:   { phase: 's', solubility: 'insoluble' },
  MnO2:   { phase: 's', solubility: 'insoluble' },
  Ag2O:   { phase: 's', solubility: 'insoluble' },

  // ---------------- Solids: hydroxides ----------------
  NaOH:     { phase: 's', solubility: 'soluble' },
  KOH:      { phase: 's', solubility: 'soluble' },
  'Ba(OH)2':{ phase: 's', solubility: 'soluble' },
  'Ca(OH)2':{ phase: 's', solubility: 'slightly' }, // 微溶
  'Mg(OH)2':{ phase: 's', solubility: 'insoluble' },
  'Al(OH)3':{ phase: 's', solubility: 'insoluble' },
  'Fe(OH)2':{ phase: 's', solubility: 'insoluble' },
  'Fe(OH)3':{ phase: 's', solubility: 'insoluble' },
  'Cu(OH)2':{ phase: 's', solubility: 'insoluble' },
  'Zn(OH)2':{ phase: 's', solubility: 'insoluble' },
  'AgOH':   { phase: 's', solubility: 'insoluble' },
  NH3H2O:   { phase: 'l', solubility: 'soluble' },

  // ---------------- Solids: salts (solubility per 中学溶解性表) ----------------
  // Sodium / potassium / ammonium / nitrate / acetate — all soluble
  NaCl:     { phase: 's', solubility: 'soluble' },
  KCl:      { phase: 's', solubility: 'soluble' },
  NH4Cl:    { phase: 's', solubility: 'soluble' },
  Na2SO4:   { phase: 's', solubility: 'soluble' },
  K2SO4:    { phase: 's', solubility: 'soluble' },
  'NH4NO3': { phase: 's', solubility: 'soluble' },
  NaNO3:    { phase: 's', solubility: 'soluble' },
  KNO3:     { phase: 's', solubility: 'soluble' },
  Na2CO3:   { phase: 's', solubility: 'soluble' },
  K2CO3:    { phase: 's', solubility: 'soluble' },
  'NH4HCO3':{ phase: 's', solubility: 'soluble' },
  NaHCO3:   { phase: 's', solubility: 'soluble' },
  CH3COONa: { phase: 's', solubility: 'soluble' },
  'KMnO4':  { phase: 's', solubility: 'soluble' },
  'K2MnO4': { phase: 's', solubility: 'soluble' },
  'KClO3':  { phase: 's', solubility: 'soluble' },

  // Chlorides
  CaCl2:    { phase: 's', solubility: 'soluble' },
  MgCl2:    { phase: 's', solubility: 'soluble' },
  AlCl3:    { phase: 's', solubility: 'soluble' },
  FeCl2:    { phase: 's', solubility: 'soluble' },
  FeCl3:    { phase: 's', solubility: 'soluble' },
  CuCl2:    { phase: 's', solubility: 'soluble' },
  ZnCl2:    { phase: 's', solubility: 'soluble' },
  BaCl2:    { phase: 's', solubility: 'soluble' },
  AgCl:     { phase: 's', solubility: 'insoluble' },
  AgBr:     { phase: 's', solubility: 'insoluble' },
  AgI:      { phase: 's', solubility: 'insoluble' },
  PbCl2:    { phase: 's', solubility: 'slightly' },
  Hg2Cl2:   { phase: 's', solubility: 'insoluble' },

  // Sulfates
  CaSO4:    { phase: 's', solubility: 'slightly' },
  BaSO4:    { phase: 's', solubility: 'insoluble' },
  PbSO4:    { phase: 's', solubility: 'insoluble' },
  Ag2SO4:   { phase: 's', solubility: 'slightly' },
  'Al2(SO4)3':{ phase: 's', solubility: 'soluble' },
  'Fe2(SO4)3':{ phase: 's', solubility: 'soluble' },
  FeSO4:    { phase: 's', solubility: 'soluble' },
  CuSO4:    { phase: 's', solubility: 'soluble' },
  ZnSO4:    { phase: 's', solubility: 'soluble' },
  MgSO4:    { phase: 's', solubility: 'soluble' },

  // Carbonates
  CaCO3:    { phase: 's', solubility: 'insoluble' },
  BaCO3:    { phase: 's', solubility: 'insoluble' },
  MgCO3:    { phase: 's', solubility: 'insoluble' },
  FeCO3:    { phase: 's', solubility: 'insoluble' },
  CuCO3:    { phase: 's', solubility: 'insoluble' },
  ZnCO3:    { phase: 's', solubility: 'insoluble' },
  Ag2CO3:   { phase: 's', solubility: 'insoluble' },
  PbCO3:    { phase: 's', solubility: 'insoluble' },

  // Sulfides (insoluble except group I + ammonium)
  CuS:      { phase: 's', solubility: 'insoluble' },
  FeS:      { phase: 's', solubility: 'insoluble' },
  ZnS:      { phase: 's', solubility: 'insoluble' },
  PbS:      { phase: 's', solubility: 'insoluble' },
  Ag2S:     { phase: 's', solubility: 'insoluble' },
  HgS:      { phase: 's', solubility: 'insoluble' },
  Na2S:     { phase: 's', solubility: 'soluble' },
  K2S:      { phase: 's', solubility: 'soluble' },

  // Phosphates
  'Ca3(PO4)2':{ phase: 's', solubility: 'insoluble' },
  'Ag3PO4': { phase: 's', solubility: 'insoluble' },

  // Glucose etc.
  C6H12O6:  { phase: 's', solubility: 'soluble' },
  C12H22O11:{ phase: 's', solubility: 'soluble' },
};

export function lookup(formula: string): SpeciesInfo | undefined {
  const key = canonicalize(formula);
  return SPECIES_DB[key] ?? SPECIES_DB[formula];
}
