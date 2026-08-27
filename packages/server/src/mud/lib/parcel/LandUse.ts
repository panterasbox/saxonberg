/**
 * LandUse — the closed land-use vocabulary and what each use permits.
 *
 * Stewardship's governing insight: a land use is not a label, it is
 * **capability + ceiling** — *"this district is residential, at this
 * density"* is ONE act, so one table answers both halves. Every consuming
 * system asks the same table one question: *may I do this here, and at what
 * scale?*
 *
 * The vocabulary is **closed**, the same way Module Categories and the
 * Material library are closed: a Locality can no more mint a land use than
 * it can mint a new module category — inventing one is inventing a mechanic.
 * Six uses cover everything the game has.
 *
 * ## Where a use lives, and why not on the zone
 *
 * On `ParcelRecord`, in the gated `parcels` collection — **never** on
 * the editable `domain` zone template. Land use *gates behaviour* (a bed
 * refuses ground whose use forbids cultivation), which makes it access-check
 * data, and access-check data on editable content is forgeable: a content
 * author could rezone their own land. This is the same rule that retired the
 * `data.ownerGroupName` zone stamps; a title is a pack's `requires.title` claim.
 *
 * ## `wild` is the fail-closed default — for COVERED ground
 *
 * A parcel with no explicit use inherits its covering parcel's, and
 * `landUseOf` is total: ground nothing claims answers `wild`, which admits
 * nothing. That default is load-bearing, because **most parcel rows are not
 * ground at all** — `/stuff/idea/lounge`, `/studio` and the `/obj/…` roots are
 * path-branch titles over the template tree. They carry rows, declare no
 * use, and must not read as cultivable. Stewardship's own gloss agrees:
 * *"~nothing built; passage and gathering"* is gathering, not farming.
 *
 * ⚠ **But a consumer must ask whether a parcel COVERS the ground before it
 * asks what that parcel permits.** "Nobody has zoned this" is not the same
 * statement as "this is zoned against you", and conflating them turns every
 * unclaimed acre into red tape — the hermit test: *a shack and a garden in
 * an unparcelled forest must work with zero numbers.* So `landUseOf`
 * answers `wild` for uncovered ground and the GATE lets it through, while
 * covered-and-unzoned stays refused. Same principle as the acreage check
 * degrading on unmeasured land: measure nothing, police nothing. See
 * `PlantController`'s gate for the shipped shape.
 *
 * ## The area band is a LOT band
 *
 * The ceiling half, and it is checked in exactly one place:
 * `ParcelRegistry.subdivide` refuses a CHILD outside its effective use's
 * band. That is the whole of "constrained by zoning" — one check when a
 * lot is minted, not an ongoing simulation.
 *
 * **The band is GROUND area, and multi-storey does not enlarge it.** A
 * four-storey residential lot offers more floor but stands on the same
 * dirt; if a `storeys` factor lands on the record, the band must keep
 * reading `area` and not `area × storeys`, or a modest tower is refused
 * for being a large lot.
 *
 * **A district is not a lot, and is not checked against these numbers.**
 * Hinkley Hills is ~24 hectares of `residential` ground, far past the two
 * hectares a residential *lot* may be; that is not a contradiction,
 * because the district is a seeded extent that lots are subdivided out
 * OF, never a lot itself. The band's job is catching a mis-authored
 * holding — a 3 m² farm, a 40-hectare townhouse — at the moment somebody
 * mints one.
 */

/**
 * The six land uses. Closed — see the module doc. Order is presentational
 * (roughly most-built to least), not ordinal: unlike a `GradeBand` these
 * do not compare.
 */
export const LAND_USES = [
  "residential",
  "agricultural",
  "commercial",
  "industrial",
  "civic",
  "wild",
] as const;

/** One of {@link LAND_USES}. */
export type LandUse = (typeof LAND_USES)[number];

/**
 * How much cultivation a use admits — stewardship's answer space for
 * farming's question, verbatim. Ordinal: `none` < `bed` < `field`.
 */
export const CULTIVATION_SCALES = ["none", "bed", "field"] as const;

/** One of {@link CULTIVATION_SCALES}. */
export type CultivationScale = (typeof CULTIVATION_SCALES)[number];

/** What one use permits. The row shape of the vocabulary table. */
interface LandUseSpec {
  /** How much cultivation the use admits. */
  readonly cultivation: CultivationScale;
  /** Permissible LOT area in m², inclusive. `subdivide` enforces it on a
   *  subdivided child — never on a district's own extent. */
  readonly areaBand: { readonly min: number; readonly max: number };
  /** One line, player-facing — the reason a refusal names. */
  readonly summary: string;
}

/**
 * The table. Area bands are deliberately generous and round: they exist to
 * catch a mis-authored lot (a 3 m² farm, a 40-hectare townhouse), not to
 * express a planning regime. A locality's actual density policy is civics'
 * business, layered above this.
 */
const SPECS: Readonly<Record<LandUse, LandUseSpec>> = {
  residential: {
    cultivation: "bed",
    areaBand: { min: 50, max: 20_000 },
    summary: "dwelling, companions and small cultivation",
  },
  agricultural: {
    cultivation: "field",
    areaBand: { min: 1_000, max: 4_000_000 },
    summary: "cultivation at scale, livestock and orchards",
  },
  commercial: {
    cultivation: "none",
    areaBand: { min: 20, max: 200_000 },
    summary: "retail, venues and attendance",
  },
  industrial: {
    cultivation: "none",
    areaBand: { min: 100, max: 1_000_000 },
    summary: "workshops, forges and furnaces",
  },
  civic: {
    cultivation: "none",
    areaBand: { min: 10, max: 4_000_000 },
    summary: "offices, parks and the commons",
  },
  wild: {
    cultivation: "none",
    areaBand: { min: 0, max: Number.POSITIVE_INFINITY },
    summary: "unserviced ground — passage and gathering only",
  },
};

/**
 * The vocabulary's method surface. A holder class rather than loose
 * functions (the `Grade` shape): the module exports one concept.
 */
export class LandUses {
  /** The vocabulary — re-exported for callers that enumerate it. */
  public static readonly ALL: readonly LandUse[] = LAND_USES;

  /** Narrowing predicate for a string against the vocabulary. */
  public static isLandUse(s: string): s is LandUse {
    return (LAND_USES as readonly string[]).includes(s);
  }

  /**
   * Parse `s` into a land use, or throw naming the offending value and the
   * vocabulary. The setter path's validator. (Named for `Quantity.parse`,
   * not `require` — a method literally named `require` trips the
   * import-boundary lint's computed-`require()` check on its declaration.)
   */
  public static parse(s: string): LandUse {
    if (!LandUses.isLandUse(s)) {
      throw new RangeError(
        `LandUses.parse: unknown land use '${s}' ` +
          `(expected one of ${LAND_USES.join(", ")})`,
      );
    }
    return s;
  }

  /**
   * How much cultivation `use` admits. `wild` admits nothing — see the
   * module doc on why that default is load-bearing.
   */
  public static admitsCultivation(use: LandUse): CultivationScale {
    return SPECS[use].cultivation;
  }

  /** Whether `use` admits cultivation at all (`bed` or `field`). */
  public static permitsAnyCultivation(use: LandUse): boolean {
    return SPECS[use].cultivation !== "none";
  }

  /** The player-facing one-liner for `use` — what a refusal names. */
  public static summaryOf(use: LandUse): string {
    return SPECS[use].summary;
  }

  /** The permissible lot-area band for `use`, in m². */
  public static areaBandOf(use: LandUse): { min: number; max: number } {
    const band = SPECS[use].areaBand;
    return { min: band.min, max: band.max };
  }

  /**
   * Whether `area` (m²) sits inside `use`'s band, inclusive.
   *
   * ⚠ **Unmeasured land is not policed.** `0` — and `null` — mean *nobody
   * declared a size*, which is not the same as *a lot of size zero*, so
   * both pass. That is the shipped convention on `ParcelRecord.area` and
   * the reason every parcel predating the field keeps behaving exactly as
   * it did; it is also what keeps a hermit's unmeasured clearing out of
   * the zoning system entirely.
   */
  public static admitsArea(use: LandUse, area: number | null): boolean {
    if (area === null || area <= 0) return true;
    const band = SPECS[use].areaBand;
    return area >= band.min && area <= band.max;
  }
}
