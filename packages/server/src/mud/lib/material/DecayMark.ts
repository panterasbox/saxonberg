/**
 * DecayMark — *a part has broken down in its surroundings, and this far.*
 *
 * The closed vocabulary of decay: five MECHANISMS (corrosion · rot · mold ·
 * frost · fade), each an ordered ladder of BANDS, and what a band does to
 * the part that carries it — the condition it caps the part at, the share
 * of its metal it has cost, whether it IS failure, what clears it, and the
 * words `look` uses for it.
 *
 * A mark is a plain record (`DecayMarkRecord`) kept beside condition — on a
 * part line, or on the whole of a one-piece thing; this class is the read
 * over one. Decay is AUTHORED, or derived once at mint from a history: there
 * is no clock here, and nothing advances a mark (decomposition D2, D7).
 *
 * ⭐ The correspondence with maturation's mechanisms, recorded so a later
 * live clock finds it: corrosion ~ `chemical`, rot and mold ~ `microbial`,
 * fade ~ `photochemical`. Frost has no maturation twin (it is mechanical).
 *
 * ⚠ Mold and fade are surface mechanisms and never fail a part: a furred
 * haft does not break (decomposition D2, lens 1). Corrosion, rot and frost
 * each end in a failing band.
 */

/** How a thing breaks down in its surroundings. */
export type DecayMechanism = "corrosion" | "rot" | "mold" | "frost" | "fade";

/**
 * ⭐ The five mechanisms. Closed because each has engine arithmetic behind
 * it (a driver over an environment, a ceiling, a cure); a sixth is code,
 * never a row (see `lint:closed-vocabularies`).
 */
export const DECAY_MECHANISMS: readonly DecayMechanism[] = [
  "corrosion",
  "rot",
  "mold",
  "frost",
  "fade",
];

/** A band — how far one mechanism has gone. Words as `look` prints them. */
export type DecayBand =
  | "bloom"
  | "flaking"
  | "pitted"
  | "eaten through"
  | "soft"
  | "punky"
  | "rotted through"
  | "spotted"
  | "furred"
  | "crazed"
  | "spalled"
  | "crumbled"
  | "faded"
  | "bleached";

/** What takes a mark off: a wire brush, any brush, a dye bath. */
export type DecayCure = "scouring" | "brushing" | "dye";

/** One decay state on one part. `scoured`: its scale brushed out (pitting only). */
export interface DecayMarkRecord {
  mechanism: DecayMechanism;
  band: DecayBand;
  scoured?: boolean;
}

/** What one band means. */
interface BandSpec {
  readonly band: DecayBand;
  /** The progress a derivation reaches it at; `null` = authored only. */
  readonly from: number | null;
  /** The condition the part is capped at while the mark stands; `0` on failure. */
  readonly ceiling: number;
  /** The share of the part's metal it has cost. */
  readonly lostShare: number;
  /** The band IS the part's failure. */
  readonly failure: boolean;
  /** What removes the mark outright; `null` = nothing does. */
  readonly clearedBy: DecayCure | null;
  /** Scouring leaves the mark, marked `scoured` (the pits stay). */
  readonly scourable: boolean;
  /** `look`'s words, after the part's name. `{product}` = the material's word. */
  readonly phrase: string;
  /** The words once scoured. */
  readonly scouredPhrase?: string;
}

/**
 * ⭐ The table (decomposition D2). Grain: the numbers may be tuned; the
 * unit tests pin the outcomes.
 */
const BANDS: Readonly<Record<DecayMechanism, readonly BandSpec[]>> = {
  corrosion: [
    {
      band: "bloom",
      from: 0.1,
      ceiling: 0.9,
      lostShare: 0,
      failure: false,
      clearedBy: "scouring",
      scourable: false,
      phrase: "has a bloom of {product}",
    },
    {
      band: "flaking",
      from: 0.3,
      ceiling: 0.6,
      lostShare: 0.03,
      failure: false,
      clearedBy: "scouring",
      scourable: false,
      phrase: "is flaking with {product}",
    },
    {
      band: "pitted",
      from: 0.6,
      ceiling: 0.35,
      lostShare: 0.15,
      failure: false,
      clearedBy: null,
      scourable: true,
      phrase: "is pitted with {product}",
      scouredPhrase: "is pitted, the {product} brushed out of it",
    },
    {
      band: "eaten through",
      from: 1.0,
      ceiling: 0,
      lostShare: 0.5,
      failure: true,
      clearedBy: null,
      scourable: false,
      phrase: "eaten through with {product}",
    },
  ],
  rot: [
    {
      band: "soft",
      from: 0.15,
      ceiling: 0.5,
      lostShare: 0,
      failure: false,
      clearedBy: null,
      scourable: false,
      phrase: "has gone soft",
    },
    // The eye cannot tell punky from soft — the probe can.
    {
      band: "punky",
      from: 0.5,
      ceiling: 0.15,
      lostShare: 0,
      failure: false,
      clearedBy: null,
      scourable: false,
      phrase: "has gone soft",
    },
    {
      band: "rotted through",
      from: 1.0,
      ceiling: 0,
      lostShare: 0,
      failure: true,
      clearedBy: null,
      scourable: false,
      phrase: "rotted through",
    },
  ],
  mold: [
    {
      band: "spotted",
      from: 0.2,
      ceiling: 0.95,
      lostShare: 0,
      failure: false,
      clearedBy: "brushing",
      scourable: false,
      phrase: "is spotted with mold",
    },
    {
      band: "furred",
      from: 0.6,
      ceiling: 0.8,
      lostShare: 0,
      failure: false,
      clearedBy: "brushing",
      scourable: false,
      phrase: "is furred with mold",
    },
  ],
  frost: [
    {
      band: "crazed",
      from: null,
      ceiling: 0.7,
      lostShare: 0,
      failure: false,
      clearedBy: null,
      scourable: false,
      phrase: "is crazed by frost",
    },
    {
      band: "spalled",
      from: null,
      ceiling: 0.35,
      lostShare: 0,
      failure: false,
      clearedBy: null,
      scourable: false,
      phrase: "has spalled",
    },
    {
      band: "crumbled",
      from: null,
      ceiling: 0,
      lostShare: 0,
      failure: true,
      clearedBy: null,
      scourable: false,
      phrase: "crumbled",
    },
  ],
  // ⚠ Fade is `Dyed`'s record (D8): these bands are words an author and a
  // derivation use, and they leave no mark — the ceiling never caps.
  fade: [
    {
      band: "faded",
      from: 0.2,
      ceiling: 1,
      lostShare: 0,
      failure: false,
      clearedBy: "dye",
      scourable: false,
      phrase: "has faded",
    },
    {
      band: "bleached",
      from: 0.6,
      ceiling: 1,
      lostShare: 0,
      failure: false,
      clearedBy: "dye",
      scourable: false,
      phrase: "is bleached",
    },
  ],
};

/**
 * One mechanism's ladder of bands, in order. Constructing it for a word that
 * is not a mechanism throws — the one membership test.
 */
export class DecayScale {
  readonly mechanism: DecayMechanism;

  constructor(mechanism: string) {
    if (!(DECAY_MECHANISMS as readonly string[]).includes(mechanism)) {
      throw new RangeError(
        `'${mechanism}' is not a decay mechanism (one of: ${DECAY_MECHANISMS.join(", ")})`,
      );
    }
    this.mechanism = mechanism as DecayMechanism;
  }

  /** The bands, mildest first. */
  public bands(): readonly DecayBand[] {
    return BANDS[this.mechanism].map((b) => b.band);
  }

  /** Whether `band` is one of this mechanism's. */
  public hasBand(band: string): band is DecayBand {
    return BANDS[this.mechanism].some((b) => b.band === band);
  }

  /** Whether a history can reach any band of it (frost cannot, this build). */
  public isDerivable(): boolean {
    return BANDS[this.mechanism].some((b) => b.from !== null);
  }

  /**
   * ⭐ The band a derivation's `progress` reaches: the last whose `from` is
   * at or below it; `null` when it reaches none (or the mechanism is
   * authored only).
   */
  public bandAt(progress: number): DecayBand | null {
    if (!Number.isFinite(progress)) return null;
    let found: DecayBand | null = null;
    for (const b of BANDS[this.mechanism]) {
      if (b.from !== null && b.from <= progress) found = b.band;
    }
    return found;
  }

  /** The mark for `band`, unscoured. Throws on a band of another mechanism. */
  public mark(band: string): DecayMark {
    return new DecayMark({
      mechanism: this.mechanism,
      band: band as DecayBand,
    });
  }
}

/** The read over one {@link DecayMarkRecord}. Throws on an incoherent record. */
export class DecayMark {
  private readonly spec: BandSpec;
  private readonly rec: DecayMarkRecord;

  constructor(record: DecayMarkRecord) {
    const scale = new DecayScale(record.mechanism);
    if (!scale.hasBand(record.band)) {
      throw new RangeError(
        `'${record.band}' is not a band of ${record.mechanism} (one of: ${scale.bands().join(", ")})`,
      );
    }
    this.spec = BANDS[scale.mechanism].find((b) => b.band === record.band)!;
    this.rec = {
      mechanism: scale.mechanism,
      band: record.band,
      ...(record.scoured === true && this.spec.scourable
        ? { scoured: true }
        : {}),
    };
  }

  public mechanism(): DecayMechanism {
    return this.rec.mechanism;
  }

  public band(): DecayBand {
    return this.rec.band;
  }

  public isScoured(): boolean {
    return this.rec.scoured === true;
  }

  /** The plain record, for a part line or the whole to keep. */
  public record(): DecayMarkRecord {
    return { ...this.rec };
  }

  /** The condition the part is capped at while this mark stands (`0` = failed). */
  public ceiling(): number {
    return this.spec.ceiling;
  }

  /** The share of the part's metal this band has cost. */
  public lostShare(): number {
    return this.spec.lostShare;
  }

  /** The band is the part's failure (eaten through, rotted through, crumbled). */
  public isFailure(): boolean {
    return this.spec.failure;
  }

  /** What removes the mark outright; `null` = nothing (pitting stays for good). */
  public clearedBy(): DecayCure | null {
    return this.spec.clearedBy;
  }

  /** A wire brush takes the scale out of it but leaves the mark (pitting). */
  public isScourable(): boolean {
    return this.spec.scourable && !this.isScoured();
  }

  /**
   * `look`'s words after the part's name — *is pitted with rust*. `product`
   * is the material's own word for its corrosion (rust · verdigris ·
   * tarnish); only corrosion reads it.
   */
  public phrase(product: string): string {
    const words =
      this.isScoured() && this.spec.scouredPhrase
        ? this.spec.scouredPhrase
        : this.spec.phrase;
    return words.replace("{product}", product);
  }
}
