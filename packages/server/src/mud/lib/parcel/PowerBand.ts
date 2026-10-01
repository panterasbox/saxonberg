/**
 * PowerBand — ⭐ **the electric posture a premises declares**, and the closed
 * vocabulary it declares it in.
 *
 * A premises answers one question about power: *what does this place draw?* —
 * `off-grid` (a shack, a frontier farm, ground no wire reaches), or one of
 * three connected bands by scale: `domestic` (a home, a shop's back room),
 * `commercial` (a storefront, a venue), `industrial` (a works, a forge shop).
 *
 * ## Why a band, not a number
 *
 * The requirements are explicit: *"no number is an authority; the build only
 * needs declared-vs-undeclared to catch the mistake."* A band is a **posture**,
 * not a load calculation — the kernel says only which posture a premises
 * declares, and the energy pack prices each band in watts
 * (`energy.band.<band>W`). Same split as `LandUse` (the kernel closes the
 * vocabulary; civics sets the density policy above it).
 *
 * The vocabulary is **closed**, like `LandUse` and the Material library. Four
 * cover everything the game has.
 *
 * ⚠ `off-grid` is a first-class DECLARATION, not the absence of one. A parcel
 * with `powerBand: null` **inherits** its covering parcel's; a parcel with
 * `off-grid` has *said* it draws nothing, which is what makes the frontier
 * shack legible ("off the grid on purpose") rather than a gap.
 *
 * ## ⚠ Data, not a `PowerBands` class
 *
 * Unlike `LandUses`, this ships as a const + a type + a summaries record and
 * **no static-method class** — `lint:lib-statics` is a ratchet on value-object
 * statics, and its guidance is that guards/parse belong on a subsystem Api or
 * inline, not in new `lib/` statics. So `ParcelRecord.setPowerBand` validates
 * inline and `isConnected` is the one-liner `band !== 'off-grid'` at its call
 * sites.
 */

/**
 * The four power bands. Closed — see the module doc. Order is presentational.
 */
export const POWER_BANDS = [
  "off-grid",
  "domestic",
  "commercial",
  "industrial",
] as const;

/** One of {@link POWER_BANDS}. */
export type PowerBand = (typeof POWER_BANDS)[number];

/** One line, player-facing — what a reading or a refusal names. */
export const POWER_BAND_SUMMARIES: Readonly<Record<PowerBand, string>> = {
  "off-grid": "draws no grid power — a hearth, a lamp, or nothing",
  domestic: "a household's draw — lights and a few appliances",
  commercial: "a storefront's draw — a venue's lights and machines",
  industrial: "a works' draw — motors, furnaces and the line",
};
