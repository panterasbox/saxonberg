/**
 * Cuttable — ⭐ **a thing that plans its own cut** (storage-and-ice D16).
 *
 * `cut` is ONE kernel verb over this protocol (the collision ladder's
 * first rung: unify behind an interface). The verb binds a target and the
 * tools in reach; the TARGET says what cutting it with them means — how
 * long, how hard, what to say at the start and what is made at the end —
 * or refuses in its own words (an {@link ActPlan} or an {@link ActRefusal},
 * the one vocabulary of the crafting acts). An ice sheet plans a block off
 * a marked grid, a sugar loaf a piece off the cone; a second cuttable thing
 * needs no kernel edit.
 *
 * ⭐ A **protocol mixin** since controllers-are-io D8a
 * ({@link CuttableMixin}, `_mixinKind = 'protocol'`): an implementer
 * composes it and overrides `cutPlan(req)`; the verb asks
 * `MixinApi.isCuttable`, and the kernel controller never names a pack
 * class.
 *
 * ⭐ Two sides may plan, and the kernel asks them in order: the TARGET
 * (`Cuttable` — an ice sheet plans a block off its own grid), then a bound
 * TOOL (`CutPlanner` — a tailor's shears plan the pattern pieces on any
 * cloth). The second exists because the trade that knows how to cut a thing
 * is not always the trade that made it: the bolt is the weaver's, the
 * pattern the tailor's, and the instrument affords the verb.
 *
 * ⭐⭐ **`cut` is ONE act, and the other cutting acts are not it**
 * (controller-liquidity D14). This protocol once answered ten verbs by a
 * verb string on the request; a target narrowed on the string and a
 * controller narrowed on the answer's tag. Now each act that has more than
 * one host is its own small protocol — `SawableMixin` (the saw), `RivableMixin`
 * (the froe), `ButcherableMixin` (the butcher's knife) — and an act with one
 * host is a method on it (the ice sheet's `groovePlan`/`scrapePlan`, the
 * glass sheet's `scribePlan`/`snapPlan`/`grozePlan`). The cross-cut of a
 * felled bole IS a cut — one length of round timber off it — so the bole
 * answers here, and `fell` stopped cross-cutting.
 */

import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from './ActPlan';
import type { MixinConstructor } from '../mixin';

/** What the cut verb hands the target. */
export interface CutRequest {
  /** Who is cutting. */
  actor: Stuff;
  /** The tools the binder bound (the target narrows them by capability). */
  tools: readonly Stuff[];
  /**
   * The word naming a PART of the target when the target was a word rather
   * than a thing (`cut hole`, `cut marked` — a patch of the ice underfoot),
   * else `null`. (controller-liquidity D14: it was `raw`, the typed text;
   * only a part word survives.)
   */
  part: string | null;
  /**
   * ⭐ How much to cut off, as the player wrote it (`cut rope at 10 m`), or
   * `null` (cordage D4). The target parses it; most targets ignore it.
   */
  length: string | null;
  /** The verb's options, carried through for the target that reads them. */
  options: CutOptions;
}

/** The options `cut` carries through; a target reads the ones it knows (cloth's). */
export interface CutOptions {
  for?: Stuff | null;
  tight?: boolean;
  generous?: boolean;
}

/** The kernel `cut`'s begin facts — by what is being cut. */
export type CutBegin =
  /** A length measured off a rope. */
  | { kind: 'rope'; rope: Stuff; takeM: number }
  /** A sugar loaf set to the nips. */
  | { kind: 'loaf'; loaf: Stuff }
  /** A pattern chalked on cloth — to `subject`'s measure or stock; `waste` = no bench under it. */
  | { kind: 'pattern'; cloth: Stuff; subject: Stuff | null; waste: boolean }
  /** The ice saw set to the ice — a hole for a line, or the grid. */
  | { kind: 'ice'; hole: boolean }
  /** ⭐ A felled bole cross-cut — one length of round timber off it (D14: it was `fell bole`). */
  | { kind: 'length'; bole: Stuff };

/** The kernel `cut`'s done facts. */
export type CutDone =
  | { kind: 'rope'; takeM: number; leftM: number }
  /** The loaf broken into its parts, top to bottom, each with its color. */
  | { kind: 'loaf'; pieces: readonly { part: string; color: string }[] }
  /** The pattern cut: its seam allowance, and the offcuts on the floor. */
  | { kind: 'pattern'; allowance: number; offcuts: number }
  | { kind: 'ice-hole' }
  /** A block off the grid (`null` — the ice would not give one). */
  | { kind: 'ice-block'; block: Stuff | null; kg: number }
  /** A length of timber off a bole; `left` lengths still in it. */
  | { kind: 'length'; timber: Stuff; bole: Stuff; left: number }
  /** The last length: the bole is gone (`boleName`, named before it went). */
  | { kind: 'last-length'; boleName: string }
  /** The thing was gone by the time the cut landed — nothing to say. */
  | { kind: 'gone' };

/** ⭐ Every reason the kernel `cut` is refused — `CutController` words each. */
export type CutRefusal =
  | ActRefusal<'not-cuttable'>
  // a rope (`Rope`)
  | ActRefusal<'no-knife'>
  | ActRefusal<'tied'>
  | ActRefusal<'no-length'>
  | ActRefusal<'bad-length', { length: string }>
  | ActRefusal<'too-long', { lengthM: number }>
  | ActRefusal<'changed'>
  | ActRefusal<'no-piece'>
  // a sugar loaf (trade-sugar `SugarLoaf`)
  | ActRefusal<'no-nips'>
  // cloth, by a cutting tool (trade-tailoring `CuttingTool`)
  | ActRefusal<'too-little-cloth', { pattern: number; units: number; waste: boolean }>
  // the ice (water `IceSheet`)
  | ActRefusal<'no-ice-saw'>
  | ActRefusal<'not-on-ice'>
  | ActRefusal<'no-ice'>
  | ActRefusal<'no-grid'>
  | ActRefusal<'open'>
  // a felled bole (trade-forestry `Bole`)
  | ActRefusal<'no-felling-axe'>
  | ActRefusal<'bole-spent'>;

/** The kernel `cut`'s plan. */
export type CutPlan = ActPlan<CutBegin, CutDone, CutRefusal>;
/** A cut's answer: its plan, or its refusal. */
export type CutAnswer = CutPlan | CutRefusal;

/** A thing that can plan a cut for an actor with a tool. */
export interface Cuttable {
  cutPlan(req: CutRequest): Promise<CutAnswer>;
}

/**
 * ⭐ **`CuttableMixin` — the cut protocol, as a mixin.**
 *
 * IS: a thing that plans its own cut — a rope cut at a length, a sugar
 * loaf a piece off the cone, an ice sheet a block off its grid. IS NOT: a
 * tool that plans the cut of somebody else's thing (a tailor's shears on
 * any cloth answer {@link CutPlanner}, the tool's side), nor a stack you
 * count off.
 *
 * ⚠ The default REFUSES (`not-cuttable`); a host overrides `cutPlan`.
 */
export function CuttableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CuttableMixin extends Base implements Cuttable {
    static _mixinName: string = 'CuttableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Plan the cut, or refuse; the default refuses. */
    public async cutPlan(_req: CutRequest): Promise<CutAnswer> {
      return { ok: false, reason: 'not-cuttable' };
    }
  };
}
