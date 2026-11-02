/**
 * SupplyState — **the one closed vocabulary a utility fails in**.
 *
 * Seven words, and every supply in the game says its failure in one of
 * them: water, and whatever utility lands next. An eighth is a design
 * conversation, not an edit (the seventh, `unplumbed`, was one — the
 * water-supply build, 2026-11-02: `dry` would make the river lie for a
 * house no pipe reaches) — the whole value of the list is that a
 * player who has learned what `dry` means at a standpipe has learned
 * what it means everywhere, and a builder reading a failure knows the
 * shape of the fix without knowing the subsystem.
 *
 * ⚠ **This lives in the kernel deliberately**, even though the water
 * pack is its only speaker today. Two packs that must agree on the same
 * six strings are an entangled namespace, and an entangled namespace is
 * one of the two things that genuinely belong here. The alternative —
 * the vocabulary owned by whichever utility shipped first — would make
 * a future power pack depend on the water pack for a word.
 *
 * Success is **not** in the list. A working supply reports `null`; the
 * vocabulary is exhaustively about what went wrong, so a caller cannot
 * accidentally treat "fine" as one more failure mode among many.
 *
 * See [docs/subsystems/watershed.md].
 */

/**
 * Why a supply is not delivering.
 *
 * | | |
 * |---|---|
 * | `dry` | the **source** has nothing to give — the river is too low, the well is out |
 * | `cut` | the **line** is physically broken |
 * | `frozen` | the line or the source is below freezing |
 * | `fouled` | what arrives is unfit — contamination past what treatment removes |
 * | `off` | somebody **closed** it, and somebody can open it again |
 * | `overdrawn` | more is being asked of it than its **capacity** carries |
 * | `unplumbed` | **nothing is connected** — no pipe brings water here |
 */
export type SupplyState =
  | 'unplumbed'
  | 'dry'
  | 'cut'
  | 'frozen'
  | 'fouled'
  | 'off'
  | 'overdrawn';

/** Validation array / iteration order for {@link SupplyState}. */
export const SUPPLY_STATES: readonly SupplyState[] = [
  'unplumbed',
  'dry',
  'cut',
  'frozen',
  'fouled',
  'off',
  'overdrawn',
] as const;

/**
 * The order a supply reports its troubles in, worst first.
 *
 * A supply can be in several of these at once — a cut main in a frozen
 * January that nobody has switched on is all three — and something has
 * to decide which one the player is told about. The rule is **the one
 * furthest from being fixed by the person asking**: physical
 * destruction, then a deliberate closure, then the source, then what is
 * in the water, then how much is being asked of it. Reporting
 * `overdrawn` on a severed pipe would be true and useless. `unplumbed`
 * heads the list: a house no pipe reaches is further from water than one
 * whose pipe is cut.
 */
export const SUPPLY_STATE_PRECEDENCE: readonly SupplyState[] = [
  'unplumbed',
  'cut',
  'off',
  'dry',
  'frozen',
  'fouled',
  'overdrawn',
] as const;

/** One-line player-facing gloss per state — the legibility half. */
export const SUPPLY_STATE_GLOSS: Record<SupplyState, string> = {
  unplumbed: "no pipe brings water here",
  dry: 'the source has run too low to draw from',
  cut: 'the line is broken',
  frozen: 'it is frozen',
  fouled: 'what comes through is not fit to use',
  off: 'it has been shut off',
  overdrawn: 'more is being drawn than it can carry',
};

/**
 * What a utility says about itself when somebody analyses it.
 *
 * Plain data, so the **kernel never has to import the pack that
 * produces it**. A `Conduit` lives in the `water` pack; `analyze water`
 * is a platform verb; the two meet here, over a shape, exactly as the
 * residences build's `HoldingView` seam meets its holdings. Where the
 * kernel must read a pack's object it goes by shape or by MQL class
 * name, never by import.
 */
export interface SupplyReport {
  /** What it is, in the player's words ("the city intake"). */
  label: string;
  /** `null` when it is working; the six-word vocabulary otherwise. */
  state: SupplyState | null;
  /** Ordered lines of working — the "show me why" half of `analyze`. */
  lines: string[];
}

/**
 * The structural view `analyze water` narrows to.
 *
 * Optional by construction: a thing either answers the question or it
 * is not a supply, and the caller checks rather than the type system.
 */
export interface SupplyReporting {
  /** Everything worth saying about this supply right now. */
  supplyReport?: (nowS: number) => Promise<SupplyReport>;
}

/**
 * ⭐ **The SYNCHRONOUS subset of a supply's state** — what a tap asks of the
 * main it is plumbed to, on every draw and every `look`.
 *
 * The sync sibling of {@link SupplyReporting}, for the reason
 * {@link StreetLightingSupply.isServingNow} is sync: the read sits on a hot
 * path (a bulk policy seam, a markup augmenter) that cannot await. So it
 * answers only what is sync-knowable — a cut line, a closed valve, a pump
 * that is not running — and leaves the words that need the river (`dry`,
 * `frozen`, `fouled`) to the async report. `null` means delivering.
 *
 * ⚠ Implemented by the water pack's `Conduit`; read by the kernel's
 * `WaterFixture` by SHAPE, so the kernel never imports the pack.
 */
export interface SupplyServing {
  /** Why this supply is not delivering right now, or `null` if it is. */
  supplyStateNow(): SupplyState | null;
  /**
   * ⭐ How hard the water it delivers is, °dH — its SOURCE's (cleanliness
   * D12): every tap off the Cold Fell aqueduct runs soft because the fell
   * does. Optional: a supply that carries no water (a feeder) has none.
   */
  readWaterHardnessDgh?(): Promise<number | null>;
  /**
   * ⭐ What the water it delivers IS (water-supply D8) — its source's pH,
   * hardness and salt, which a tap settles into its own water so a lead
   * pipe and a field read the supply's chemistry. Optional: a supply that
   * cannot say leaves the water's chemistry unsaid.
   */
  readWaterChemistry?(): Promise<{ pH: number; hardnessDgh: number; salinityPpt: number } | null>;
}

/**
 * ⭐⭐ **Everything a tap can hang off** (water-supply build, D3) — a main, a
 * tank, a cistern, a well with a running pump. A premises cites one of
 * these by template path (`ParcelRecord.waterSource`); a fixture loads it
 * on use and asks it, never the other way round, and never enumerates the
 * other outlets.
 *
 * Implemented STRUCTURALLY (the {@link SupplyServing} rule): the water
 * pack's `Conduit` and `StorageNode`, the kernel's `WaterStore` and `Well`.
 */
export interface WaterSupply extends SupplyServing, SupplyReporting {
  /**
   * The elevation of the water's SURFACE, metres above sea level — what a
   * tap's head is measured from. `null` when unknown (the tap then runs
   * at full head, as every tap did before heads existed).
   */
  supplyHeadM(): Promise<number | null>;
  /**
   * Give up to `litres` and return what was actually given — a main gives
   * all it is asked while delivering, a store its level, nothing when the
   * supply reads a state.
   */
  drawL(litres: number): number;
  /**
   * How much a tap may draw from it right now, litres — `Infinity` for a
   * main or a natural source, a store's level for a store, 0 when it
   * reads a state.
   */
  availableL(): number;
  /**
   * ⭐ What share of a full draw an outlet on a premises of `landUse` gets
   * right now (water-supply D6): `1` when the supply carries everything
   * asked of it, `0` when that rank has gone dry, between for a trickle.
   * A divider decides it by its `shares:` rule — `priority` (civic, then the
   * trades, then houses) or `proportion` (everybody the same fraction). An
   * outlet asks ITS supply; it never enumerates the others.
   */
  shareFor(landUse: string): Promise<number>;
}

/** How a short supply shares what it has (water-supply D6). */
export type SupplyShares = 'priority' | 'proportion';

/**
 * ⭐⭐ **What can keep a town's streets lit tonight** — the goods leg the
 * street-lighting bill was missing.
 *
 * `Locality.settleStreetLighting` names a `supply` and hands it the night's
 * candidate streets in seniority order; the supply decides how many it can
 * actually cover and consumes what that costs. This is the seam that turns
 * "money moved to a shop" into "oil burned" / "a wire is live" — the kernel
 * declares the shape, the packs implement it, and the kernel never imports
 * them (the `SupplyReport` rule, one shape over).
 *
 * ⚠ **Who implements this**, both in packs, both found by
 * `StuffApi.singleton(<the row's path>)`:
 *  - `/system/energy/thing/FuelStore` — drains lamp-oil litres from the
 *    casks it holds, one street-night at a time, in the order handed in,
 *    until it runs dry (a short *supply* darkens the junior streets the way
 *    a short *treasury* already does).
 *  - `/system/energy/idea/GridCatalogue` — returns the energized subset (a
 *    cut, not a budget, is what darkens an electric street; seniority is
 *    irrelevant to a wire).
 */
export interface StreetLightingSupply {
  /**
   * Cover as many of `paths` (already in seniority order) as the supply can
   * tonight, consuming what that costs, and return exactly the subset it
   * lit — in order. An empty array means the supply is spent (the streets
   * stand cold, and `look` says so).
   */
  lightStreets(
    paths: readonly string[],
    nowS: number,
  ): Promise<readonly string[]>;
  /**
   * Live: is this street's supply still reaching it *right now*? Sync,
   * because the vision walk asks — a cut line or a dry store darkens the
   * street the same second, without waiting for the next dusk settle.
   */
  isServingNow(path: string): boolean;
  /**
   * How a lit lamp on this supply reads — *"burning the town's oil"*,
   * *"fed from the Wharfside line"* — so the epoch is derived off a lamp,
   * never flagged. `null` (or absent) leaves the street's own prose alone.
   */
  lightingSourceLabel?(): string | null;
}
