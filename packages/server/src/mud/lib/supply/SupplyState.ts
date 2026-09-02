/**
 * SupplyState — **the one closed vocabulary a utility fails in**.
 *
 * Six words, and every supply in the game says its failure in one of
 * them: water, and whatever utility lands next. A seventh is a design
 * conversation, not an edit — the whole value of the list is that a
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
 */
export type SupplyState =
  | 'dry'
  | 'cut'
  | 'frozen'
  | 'fouled'
  | 'off'
  | 'overdrawn';

/** Validation array / iteration order for {@link SupplyState}. */
export const SUPPLY_STATES: readonly SupplyState[] = [
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
 * `overdrawn` on a severed pipe would be true and useless.
 */
export const SUPPLY_STATE_PRECEDENCE: readonly SupplyState[] = [
  'cut',
  'off',
  'dry',
  'frozen',
  'fouled',
  'overdrawn',
] as const;

/** One-line player-facing gloss per state — the legibility half. */
export const SUPPLY_STATE_GLOSS: Record<SupplyState, string> = {
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
