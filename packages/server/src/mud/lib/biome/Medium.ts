/**
 * Medium — ⭐⭐ **what a body or a thing is IN**, and everything the
 * physics needs to know about it.
 *
 * One record per medium tag (`air`, `water`, `vacuum`, the smoke and the
 * mine gases). Every seam that used to ask *"is this place water?"* in its
 * own way — combustion, speech, sound, sight, heat, drag, breathing —
 * reads a column of this record by tag, so the medium is answered once
 * and every consequence derives from it (underwater-plan D2).
 *
 * The four per-tag tables that lived in `BiomeLogic` (density,
 * conductivity, breathable, contaminant) are columns here now; the
 * `BiomeApi` reads keep their signatures.
 *
 * ⚠ **A kernel vocabulary, not a row kind.** The plan first made the
 * medium a `Medium` row + a self-warming catalogue. Every reader of it is
 * SYNCHRONOUS on a hot path (a breath, a fire tick, a heat slice) and in
 * unit suites that have no content store — a catalogue reads null cold,
 * the reference-Idea-inert trap. The medium is physics, like the
 * materials `Channel` vocabulary, so it is declared here; a new medium is
 * one entry in {@link MEDIA}.
 *
 * ## The columns
 *
 * | column | read by |
 * |---|---|
 * | `densityKgM3` | buoyancy, the altimeter, the suction ceiling, sinking |
 * | `thermalConductivity` | object cooling, body immersion |
 * | `breathable` | respiration's medium trigger |
 * | `contaminant` | the inhaled toxin a breather takes up |
 * | `supportsCombustion` | fire: no flame where there is no air |
 * | `carriesVoice` | speech: a voice needs the medium it was made for |
 * | `soundHopTau` | how much of a sound reaches the next room |
 * | `soundCarriesDirection` | whether a hearer can tell where it came from |
 * | `lightTransmittancePerM` | sight: the fraction of each colour left after a metre |
 * | `drag` | combat: a swung weapon is slowed by a thick medium |
 */

/** One medium's physics, read by tag. */
export interface MediumProps {
  readonly tag: string;
  /** kg/m³ at standard conditions (1 atm, 295 K). */
  readonly densityKgM3: number;
  /** W/(m·K) — the surrounding medium's term in a heat exchange. */
  readonly thermalConductivity: number;
  /** Whether a default air-breather exchanges gas in it. */
  readonly breathable: boolean;
  /** The inhaled toxin it carries (`carbonMonoxide`), or null. */
  readonly contaminant: string | null;
  /** Whether a flame can burn in it. */
  readonly supportsCombustion: boolean;
  /** Whether an air voice (lungs + larynx) is heard in it. */
  readonly carriesVoice: boolean;
  /**
   * The share of a sound's power that reaches the next room. Air's is
   * the shipped per-hop figure (−20 dB); water carries sound further.
   */
  readonly soundHopTau: number;
  /**
   * Whether a hearer can tell which way a sound came from. In water
   * sound arrives too fast for two ears to place it.
   */
  readonly soundCarriesDirection: boolean;
  /**
   * The fraction of each colour that survives one metre of the medium.
   * `1` for clear air; water takes red first, so blood reads black at
   * depth. A water's own clarity scales this (`clarityM`).
   */
  readonly lightTransmittancePerM: { readonly r: number; readonly g: number; readonly b: number };
  /**
   * Dimensionless drag on a moving weapon or limb: 0 in a gas, ~1 in
   * water. A swung form is slowed by `1/(1 + 4·drag)`.
   */
  readonly drag: number;
}

const CLEAR = { r: 1, g: 1, b: 1 } as const;

/** Air-like defaults the gases share; each entry overrides what differs. */
const GAS = {
  breathable: false,
  contaminant: null,
  supportsCombustion: false,
  carriesVoice: true,
  soundHopTau: 0.01,
  soundCarriesDirection: true,
  lightTransmittancePerM: CLEAR,
  drag: 0,
} as const;

/**
 * ⭐ The medium vocabulary. A new medium is one entry; every reader
 * picks it up. `lint:closed-vocabularies` reads the keys.
 */
export const MEDIA: Readonly<Record<string, MediumProps>> = {
  air: {
    ...GAS,
    tag: 'air',
    densityKgM3: 1.225,
    thermalConductivity: 0.026,
    breathable: true,
    supportsCombustion: true,
  },
  // ⭐ Water conducts ~25× faster than air (the cold-water-immersion
  // danger), carries sound ~4.3× faster and further but without
  // direction, takes red light first, and is dense enough to slow a
  // swung blade to a quarter.
  water: {
    tag: 'water',
    densityKgM3: 1000,
    thermalConductivity: 0.6,
    breathable: false,
    contaminant: null,
    supportsCombustion: false,
    carriesVoice: false,
    soundHopTau: 0.3,
    soundCarriesDirection: false,
    lightTransmittancePerM: { r: 0.65, g: 0.93, b: 0.96 },
    drag: 1,
  },
  // A deliberately tiny non-zero conductivity so an insulated vessel
  // cools *slowly*, not *never* (radiation + neck-leak lumped in).
  vacuum: {
    ...GAS,
    tag: 'vacuum',
    densityKgM3: 0,
    thermalConductivity: 1e-4,
    carriesVoice: false,
    soundHopTau: 0,
  },
  // Smoke — combustion products (the fire driver's incomplete-burn
  // output). Displaces breathable air and carries carbon monoxide: an
  // enclosed fire poisons as well as smothers.
  smoke: {
    ...GAS,
    tag: 'smoke',
    densityKgM3: 1.1,
    thermalConductivity: 0.03,
    contaminant: 'carbonMonoxide',
    supportsCombustion: true,
    lightTransmittancePerM: { r: 0.8, g: 0.8, b: 0.8 },
  },
  // ⭐⭐ The two mine gases, and the pair is the whole point: one of them
  // announces itself and the other does not. BLACKDAMP is air with the
  // oxygen breathed or rusted out of it — denser than air, so it lies in
  // the bottom of a dead end, and odourless, so the only free reading of
  // it is a bird that stops singing. STINKDAMP is hydrogen sulfide: also
  // heavier, and it STINKS.
  blackdamp: {
    ...GAS,
    tag: 'blackdamp',
    densityKgM3: 1.29,
    thermalConductivity: 0.025,
  },
  stinkdamp: {
    ...GAS,
    tag: 'stinkdamp',
    densityKgM3: 1.36,
    thermalConductivity: 0.014,
    contaminant: 'hydrogenSulfide',
    // Hydrogen sulfide burns; blackdamp and CO₂ put a lamp out — the
    // miner's other test of the air.
    supportsCombustion: true,
  },
  // Carbon dioxide — a working ferment's output (the cellar hazard).
  // Denser than air: it pools where it is made. Asphyxia, not poison.
  'carbon-dioxide': {
    ...GAS,
    tag: 'carbon-dioxide',
    densityKgM3: 1.98,
    thermalConductivity: 0.0166,
  },
};

/** Every medium tag, for validation and listings. */
export const MEDIUM_TAGS: readonly string[] = Object.keys(MEDIA);
