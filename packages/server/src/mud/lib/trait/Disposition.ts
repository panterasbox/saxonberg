/**
 * Disposition — the opposed-pair axis vocabulary traits are derived over.
 *
 * A **disposition** is one CK3-style personality axis (`generosity`,
 * `sociability`, …) with two opposed poles. A character sits *somewhere*
 * on every axis — a signed magnitude, not one of three slots — derived on
 * read from the disposition-valenced-act ledger ({@link DispositionEntry}).
 * This module owns the roster, the durable axis keys, the validation
 * array, and the pole-label lookup the self-view renders; it is the
 * `Disposition`-vocabulary analogue of advancement's `Discipline` channel
 * — a named value-object, no instances, no Stuff.
 *
 * **The roster** is CK3's *personality* core adopted wholesale (13 direct
 * keepers), three pairs reframed for this world (no battlefield / ruler /
 * faith hooks), one dropped (Chaste/Lustful — dynasty-only), and one
 * native addition (Curious/Incurious — central to a *learning* game).
 * Everything CK3 handled via its *other* trait categories is left to
 * Saxonberg's own systems (education → advancement, congenital → race,
 * health → vitals). See npc-behavior-slate § *Traits*.
 *
 * **Polarity convention:** a **positive** valence drives toward the
 * `positive` pole; a negative valence toward the `negative` pole. The
 * roster lists each pair as `positive / negative`.
 */

/** One opposed-pair axis: a durable `key` and its two pole labels. */
export interface DispositionAxis {
  /** Durable axis key (e.g. `'generosity'`) — recorded on every row. */
  key: string;
  /** The label at the positive end of the axis (positive valence). */
  positive: string;
  /** The label at the negative end of the axis (negative valence). */
  negative: string;
}

/**
 * The opposed-pair roster. 13 direct CK3 keepers + 3 reframed
 * (`boldness` ← Brave/Craven; `fairness` ← Just/Arbitrary; `worldview` ←
 * Cynical/Zealous, recast as idealistic/cynical with no faith hook) + 1
 * native addition (`curiosity`). 17 axes — "~15" in the slate was
 * approximate; all 13 direct keepers are retained deliberately.
 */
export const DISPOSITION_AXES: readonly DispositionAxis[] = [
  // ── direct keepers ──
  { key: "composure", positive: "Calm", negative: "Wrathful" },
  { key: "ambition", positive: "Content", negative: "Ambitious" },
  { key: "diligence", positive: "Diligent", negative: "Lazy" },
  { key: "generosity", positive: "Generous", negative: "Greedy" },
  { key: "sociability", positive: "Gregarious", negative: "Shy" },
  { key: "honesty", positive: "Honest", negative: "Deceitful" },
  { key: "humility", positive: "Humble", negative: "Arrogant" },
  { key: "patience", positive: "Patient", negative: "Impatient" },
  { key: "temperance", positive: "Temperate", negative: "Gluttonous" },
  { key: "trust", positive: "Trusting", negative: "Paranoid" },
  { key: "compassion", positive: "Compassionate", negative: "Callous" },
  { key: "forgiveness", positive: "Forgiving", negative: "Vengeful" },
  { key: "constancy", positive: "Fickle", negative: "Stubborn" },
  // ── reframed for this world ──
  { key: "boldness", positive: "Bold", negative: "Cautious" },
  { key: "fairness", positive: "Fair", negative: "Arbitrary" },
  { key: "worldview", positive: "Idealistic", negative: "Cynical" },
  // ── native addition (a learning game) ──
  { key: "curiosity", positive: "Curious", negative: "Incurious" },
];

/** The validation array — every recognized axis key, in roster order. */
export const DISPOSITION_KEYS: readonly string[] = DISPOSITION_AXES.map(
  (a) => a.key
);

const BY_KEY: ReadonlyMap<string, DispositionAxis> = new Map(
  DISPOSITION_AXES.map((a) => [a.key, a])
);

/**
 * The disposition roster + lookups. A static-method value-object (no
 * instances) — the axis IS its key.
 */
export class Disposition {
  /** The axis for a key, or `null` if unrecognized. */
  public static axisFor(key: string): DispositionAxis | null {
    return BY_KEY.get(key) ?? null;
  }

  /** Whether a value is a recognized axis key. */
  public static isAxis(value: unknown): value is string {
    return typeof value === "string" && BY_KEY.has(value);
  }

  /**
   * The pole label an axis presents for a signed position: the `positive`
   * pole for `sign >= 0`, the `negative` pole otherwise. Returns the bare
   * key for an unrecognized axis (defensive — should not occur).
   */
  public static poleLabel(key: string, sign: number): string {
    const axis = BY_KEY.get(key);
    if (!axis) return key;
    return sign >= 0 ? axis.positive : axis.negative;
  }

  /** The full roster (roster order). */
  public static all(): readonly DispositionAxis[] {
    return DISPOSITION_AXES;
  }
}
