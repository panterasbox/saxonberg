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
 */

import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from './ActPlan';
import type { MixinConstructor } from '../mixin';
import type { CraftingFailure } from './CraftingDecline';
import type Material from '../material/Material';

/**
 * ⭐ Every cutting act a target may be asked to plan (controllers-are-io
 * D8c): the kernel's `cut`, and the trade cuts that ask the same target —
 * the saw, the froe, the cross-cut, the butcher's knife, the glazier's
 * wheel and pliers, the ice plough and scraper. Each verb's answers are an
 * entry in {@link CutAnswers}; the request names the verb, the answer
 * carries it back, and the asking controller narrows on it.
 */
export type CutVerb = keyof CutAnswers;

/**
 * ── The trade cuts that ask a target (controllers-are-io D8c): the saw and
 * the froe and the cross-cut on a felled bole or a billet, the butcher's
 * knife on a carcass, the glazier's wheel and pliers on flat glass. ⭐ Only
 * the cut's DECISION is the target's — will it cut, what the cut takes off
 * it, what it makes; the instrument checks stay with each verb.
 *
 * ⚠ `saw` and `butcher` answer a plan the CONTROLLER drives
 * (`durationMs: 0`, never engaged by `engagePlan`): a sawmill paces the cut
 * by the log's mass and the race, and a butchering is instant — the target
 * answers the facts (the charge; the carcass ledger) and its `onComplete`
 * is the take, called by the verb at the moment the cut consumes it.
 */

/** What a log puts on the saw carriage, and how green it is. */
export interface SawCharge {
  kg: number;
  /** The wood. */
  material: Material | null;
  /** Seasoned fraction of what went on (a bole is green: 0). */
  seasoned: number;
}
/** What the saw's take left of the log. */
export interface SawTaken {
  /** Lengths still in it; 0 = the butt, and it is gone. */
  left: number;
}
export type SawRefusal =
  | ActRefusal<'not-cuttable'>
  | ActRefusal<'not-sawable'>
  | ActRefusal<'bole-spent'>;

/** `rive` — a length off a bole into billets, or a billet into a recipe's piece. */
export type RiveBegin = { kind: 'bole'; bole: Stuff } | { kind: 'billet' };
export type RiveDone =
  /** Billets off a bole; `left` lengths still in it (0: the butt, gone — `boleName`). */
  | { kind: 'billets'; count: number; wandered: boolean; left: number; bole: Stuff; boleName: string }
  /** A billet riven into a recipe's piece (`riven` — the billet, named before it went). */
  | { kind: 'piece'; riven: string; output: Stuff }
  /** The bole or the rover was gone when it landed. */
  | { kind: 'gone' };
export type RiveRefusal =
  | ActRefusal<'not-cuttable'>
  | ActRefusal<'will-not-rive', { woodName: string }>
  | ActRefusal<'bole-spent'>
  | ActRefusal<'not-rivable-into', { word: string; choices: readonly string[] }>
  | ActRefusal<'nothing-to-rive'>
  | ActRefusal<'which-rive', { names: readonly string[] }>
  /** The craft refused — `failure` is the crafting failure, said as a craft says it. */
  | ActRefusal<'craft-refused', { failure: CraftingFailure }>;

/** `fell bole` — one length of timber off the trunk. */
export interface CrosscutBegin {
  bole: Stuff;
}
export type CrosscutDone =
  | { kind: 'length'; timber: Stuff; bole: Stuff; left: number }
  /** The last length: the bole is gone (`boleName`, named before it went). */
  | { kind: 'last'; boleName: string }
  | { kind: 'gone' };
export type CrosscutRefusal = ActRefusal<'not-cuttable'> | ActRefusal<'bole-spent'>;

/** One line of a species' yield, as the butcher asks the carcass about it. */
export interface CarcassLine {
  /** The cut row's path. */
  cut: string;
  /** The muscles it claims (empty = a whole line, kept by its path). */
  tissues: readonly string[];
}
/**
 * ⭐ The carcass ledger a body answers `butcher` with: the condition it
 * died in, and which lines are still on it. A line taken is marked here.
 */
export interface ButcherCarcass {
  /** The condition frozen at the kill, or `null` when none was stamped. */
  fleshPct: number | null;
  /** Is this line still on the body? */
  stillOn(line: CarcassLine): boolean;
  /** Mark this line taken off the body. */
  take(line: CarcassLine): void;
}
/** Every line of the species' yield is off the body — it goes. */
export interface ButcherDone {
  spent: boolean;
}

/** The snap: the sheet that parted (named before it went). */
export interface GlassSnapDone {
  sheetName: string;
}
/** The cold-bench cuts on flat glass. */
export type GlassCutRefusal = ActRefusal<'not-cuttable'> | ActRefusal<'unscribed'>;

/** What the cut verb hands the target. */
export interface CutRequest<V extends CutVerb = CutVerb> {
  /** ⭐ Which cut is asked — the target answers this verb only. */
  verb: V;
  /** Who is cutting. */
  actor: Stuff;
  /** The tools the binder bound (the target narrows them by capability). */
  tools: readonly Stuff[];
  /** The raw word when the target was a word rather than a thing (`hole`, `marked`). */
  raw: string | null;
  /**
   * ⭐ How much to cut off, as the player wrote it (`cut rope at 10 m`), or
   * `null` (cordage D4). The target parses it; most targets ignore it.
   */
  length: string | null;
  /** The verb's options, carried through for the target that reads them. */
  options: CutOptions;
}

/** The options any cut verb carries through; a target reads the ones it knows. */
export interface CutOptions {
  for?: Stuff | null;
  tight?: boolean;
  generous?: boolean;
  /** The word for what to cut it into (`rive billet into shakes`). */
  into?: string;
  /** `butcher`: every line of the species' yield, for the carcass's spent check. */
  lines?: readonly CarcassLine[];
}

/**
 * ⭐ The answers of each cut verb, by verb: what its begin words need, what
 * its done words need, and every reason it refuses. ⚠ Every entry's refusal
 * includes `not-cuttable` — {@link CuttableMixin}'s default.
 */
export interface CutAnswers {
  cut: { begin: CutBegin; done: CutDone; refusal: CutRefusal };
  groove: { begin: undefined; done: GrooveDone; refusal: GrooveRefusal };
  scrape: { begin: undefined; done: ScrapeDone; refusal: ScrapeRefusal };
  // ── the wood, the carcass and the cold glass bench (F4 section below)
  saw: { begin: SawCharge; done: SawTaken; refusal: SawRefusal };
  rive: { begin: RiveBegin; done: RiveDone; refusal: RiveRefusal };
  crosscut: { begin: CrosscutBegin; done: CrosscutDone; refusal: CrosscutRefusal };
  butcher: { begin: ButcherCarcass; done: ButcherDone; refusal: ActRefusal<'not-cuttable'> };
  scribe: { begin: undefined; done: undefined; refusal: GlassCutRefusal };
  snap: { begin: undefined; done: GlassSnapDone; refusal: GlassCutRefusal };
  groze: { begin: undefined; done: undefined; refusal: GlassCutRefusal };
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
  | { kind: 'ice'; hole: boolean };

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
  | ActRefusal<'open'>;

/** `groove`'s done facts: the grid scored, its spacing. */
export type GrooveDone = { gridCm: number };
/** ⭐ Every reason `groove` is refused (water `IceSheet`) — trade-ice words each. */
export type GrooveRefusal =
  | ActRefusal<'not-cuttable'>
  | ActRefusal<'not-on-ice'>
  | ActRefusal<'no-horse'>
  | ActRefusal<'no-clear-ice'>
  | ActRefusal<'open'>;

/** `scrape`'s done facts: the area scraped down to the black. */
export type ScrapeDone = { areaM2: number };
/** ⭐ Every reason `scrape` is refused (water `IceSheet`) — trade-ice words each. */
export type ScrapeRefusal =
  | ActRefusal<'not-cuttable'>
  | ActRefusal<'not-on-ice'>
  | ActRefusal<'no-snowy-ice'>
  | ActRefusal<'open'>
  | ActRefusal<'nothing-left'>;

/** One verb's answer: its plan or its refusal, tagged with the verb. */
export type CutAnswerFor<V extends CutVerb> = (
  | ActPlan<CutAnswers[V]['begin'], CutAnswers[V]['done'], CutAnswers[V]['refusal']>
  | CutAnswers[V]['refusal']
) & { verb: V };

/** Any cut verb's answer — narrowed by the asking controller on `verb`. */
export type CutAnswer = { [V in CutVerb]: CutAnswerFor<V> }[CutVerb];

/** A thing that can plan a cut for an actor with a tool. */
export interface Cuttable {
  cutPlan(req: CutRequest): Promise<CutAnswer>;
}

/** A tool that plans the cut of a target it knows how to cut. */
export interface CutPlanner {
  /** The plan, a refusal, or `null` when this tool has nothing to say about `target`. */
  cutPlanFor(target: Stuff, req: CutRequest<'cut'>): Promise<CutAnswerFor<'cut'> | null>;
}

/**
 * ⭐ **`CutPlannerMixin` — the tool's side of the cut, as a mixin**
 * (controllers-are-io W4).
 *
 * IS: a tool that plans the cut of a thing it knows how to cut that is not
 * {@link Cuttable} itself — a tailor's shears on a bolt of cloth (the bolt
 * is the weaver's; the pattern is the tailor's). IS NOT: the thing being
 * cut, nor a mere edge (an edge is the `cutting` capability on a `Tool`).
 *
 * ⚠ Kept a kernel protocol though it has one composer (trade-tailoring's
 * `CuttingTool`): the kernel `cut` must ask a PACK tool, and a kernel
 * controller cannot name a pack class — so the shape it asks is declared
 * here, and asked through `MixinApi.isCutPlanner`, never by probing for a
 * method. The default has nothing to say (`null`).
 */
export function CutPlannerMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CutPlannerMixin extends Base implements CutPlanner {
    static _mixinName: string = 'CutPlannerMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Plan the cut of `target`, or `null` when this tool has nothing to say. */
    public async cutPlanFor(_target: Stuff, _req: CutRequest<'cut'>): Promise<CutAnswerFor<'cut'> | null> {
      return null;
    }
  };
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
    public async cutPlan(req: CutRequest): Promise<CutAnswer> {
      return { ok: false, verb: req.verb, reason: 'not-cuttable' } as CutAnswer;
    }
  };
}
