/**
 * The brain category contract — NPC behavior Wave 1.
 *
 * A **brain** is a stateless strategy module: given a fired trigger
 * (cadence or perception witness) plus the host NPC and a config blob,
 * it decides what to emit and emits it through the normal channels
 * (speech / emote / locomotion / activity). Brains are **code**, not
 * Stuff — transient strategy logic, like an `Engagement` is a plain
 * object (see activity.md decision #1). The NPC holds *data* (a
 * `behaviors:` spec list); the brain holds *logic*.
 *
 * **Module shape (the marker).** A brain module's sole concept-export
 * is `export const brain = class { … }` — a *named class-expression*.
 * It must be class-like (a function with a prototype) so the hot-reload
 * registry retains it (`HotReloadApi#extractClassLikeExports` keeps only
 * `typeof === 'function'` exports); a plain `const brain = {}` object
 * would be dropped and the per-invocation re-resolve seam would find
 * nothing. Metadata + the `act` entry live as **statics** so they read
 * without instantiation. See docs/subsystems/behavior.md.
 *
 * **Resolution + HMR.** `BehavedMixin` stores only the brain *path*
 * string and re-resolves the current class per invocation via
 * `StuffApi.resolveExportSync(path, 'brain')`. Editing a brain +
 * reloading its path means the live NPC's next action runs the new code
 * — no re-spawn, no captured reference.
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot } from '../activity/Engaged';
import type { Urgency } from './Urgency';
import type { TaskKind } from './Urgency';
import type { MessageFrame } from '@saxonberg/types';
import type Interactive from '../../platform/idea/Interactive';

/** The canonical export name a brain module marks itself with. */
export const BRAIN_EXPORT = 'brain' as const;

/**
 * The two reasons a **deliberated** task stops, as a declaration-merge
 * augmentation of the shared registry (the `lib/script/AbortReason.ts`
 * shape — the engagement layer already registers `cancelled`/`replaced`/
 * `preconditions-changed`/`host-destroyed`/`thrown`, and a pack may add
 * its own the same way).
 *
 * - `called` — somebody with a claim on this agent's attention asked for
 *   it. A patron ordered; the bartender sets down the crate.
 * - `outranked` — the agent's own next beat found something that matters
 *   more. Nobody asked; the agent changed its mind.
 *
 * ⚠⚠ **`interruptibleBy` had never been consulted by anything.** Every
 * engagement in the tree declared a set and `SchedulerRegistry.cancel`
 * cancelled unconditionally regardless; the deliberation beat and the
 * call are the field's first readers. A beat that declares neither of
 * these cannot be interrupted by either, which is now a statement with
 * consequences.
 */
declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    called: true;
    outranked: true;
  }
}

/** The behavioural abort reasons, as a runtime array. */
export const BEHAVIOR_ABORT_REASONS = ['called', 'outranked'] as const;

/**
 * What a reflex beat yields to when its brain says nothing: both of them.
 * A brain that wants to be uninterruptible says `interruptibleBy: []` and
 * means it.
 */
export const DEFAULT_BEAT_INTERRUPTIBLE: readonly AbortReason[] =
  BEHAVIOR_ABORT_REASONS;

/**
 * A single behavior spec — the unit of the host's `behaviors:` data
 * list. Pure data: `{ brain (path), trigger, config }`. Persisted on
 * the host; never code.
 */
export interface BehaviorSpec {
  /** Logical path to the brain module, e.g. `/lib/behavior/patrols`. */
  brain: string;
  /** `cadence:<N>s` or a witness alias (`arrival`/`departure`/`emote`/`speech`). */
  trigger: string;
  /** Brain-specific configuration. Interpreted by the brain. */
  config?: Record<string, unknown>;
}

/**
 * What a brain receives when a trigger fires. The host is the actor
 * (emission is `host.say(...)` etc. — the actor is the receiver, never
 * an argument); `config` is the spec's config; `state` is a per-(host,
 * spec) runtime scratch bag the framework owns (NOT persisted — patrol
 * index, greet seen-set, etc. live here so brains stay stateless);
 * `perceived` is present only for witness triggers.
 */
export interface BrainContext {
  host: Stuff;
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  perceived?: { frame: MessageFrame; subject?: Stuff };
  trigger: { source: 'cadence' | 'witness' | 'candidate'; raw: string };

  // Emission helpers bound to the host (the framework supplies them so
  // brains stay free of mixin-narrowing boilerplate and the contract
  // keeps "the actor is the receiver, never an argument"). Each is a
  // safe no-op when the host lacks the relevant mixin.
  /** Speak as the host (no-op if the host isn't Vocal). */
  say(text: string, target?: Stuff): void;
  /** Resolve a catalog emote by verb and perform it (no-op if not Soul / unknown verb). */
  emote(verb: string, target?: Stuff): Promise<void>;
  /** Perform a free-form emote (no-op if the host isn't Soul). */
  emoteFree(text: string, target?: Stuff): void;
}

/**
 * The static side of a brain class — what `BehavedMixin` reads off the
 * resolved `brain` export. `claims` / `requiresFree` are
 * **brain-declared** (not author-set) so the spec stays
 * `{ brain, trigger, config }` and the contention wiring comes along
 * with the brain.
 */
export interface BrainStatics {
  /** Display label (CMS palette; cancel/engagement type tag). */
  readonly label: string;
  /** Engagement slots this brain occupies while acting. */
  readonly claims?: readonly EngagementSlot[];
  /** Slots that must be free for this brain to proceed / hold. */
  readonly requiresFree?: readonly EngagementSlot[];
  /**
   * When true (default), cadence fires are skipped if the host's room
   * has no perceiving audience — no point animating an empty bar.
   * `shifts` opts out (`false`): it must run unwatched to migrate
   * off-stage cast.
   */
  readonly presenceGated?: boolean;
  /**
   * When true (default), this brain's cadence is **ambient chatter** and
   * is subject to the global pacing dial (`behavior.ambientCadenceScale` +
   * `behavior.ambientCadenceFloorMs`) — the "a little goes a long way"
   * budget. Functional pollers that happen to run on a cadence but whose
   * timing is load-bearing (`shifts` reading roster state, `covers`
   * checking for an absent maker) set `false` so their authored interval
   * is honored exactly. See docs/subsystems/behavior.md § Ambient pacing
   * budget.
   */
  readonly ambient?: boolean;
  /**
   * ⭐ What KIND of act this is — read by the arbiter only to break a tie
   * **within** an urgency band, and by the author palette to say what a
   * brain is for. Optional so an un-migrated brain still type-checks;
   * mandatory for any brain a row wires as a `candidate` (the
   * `lint:idle-cadence` arm).
   */
  readonly kind?: TaskKind;
  /**
   * ⭐⭐ One sentence saying what this brain DOES, for the author palette.
   * ⚠ Not the label: 38 brains shipped with `label` repeating the
   * filename, so the palette could tell an author the name of a thing
   * they had already typed and nothing else.
   */
  readonly summary?: string;
  /** The Discipline this act exercises, when it exercises one. */
  readonly discipline?: string;
  /** Kinds of good this act brings into the world (for the chain walk). */
  readonly produces?: readonly string[];
  /** Kinds of good this act consumes. */
  readonly consumes?: readonly string[];
  /**
   * What the host must compose for this brain to work at all — checked at
   * wire time and failed loudly, like a bad trigger. A brain wired onto a
   * host that cannot run it is otherwise a spec that does nothing forever.
   */
  readonly requires?: { readonly mixins?: readonly string[] };
  /**
   * What stops this act once it is running. ⚠ Empty means **nothing can**
   * — not even a call. Omitted means {@link DEFAULT_BEAT_INTERRUPTIBLE}.
   */
  readonly interruptibleBy?: readonly AbortReason[];
  /**
   * ⭐⭐ **How much this brain wants the next beat, and why.** The
   * deliberation seam: the agent asks every candidate once per beat and
   * runs exactly one winner. Returning `new Urgency('idle')` means *not this
   * beat* and is the common answer.
   *
   * Only the brain can answer it — a triage rank is readable only by
   * `nurses`, a stomach only by `eats` — which is why this is a static on
   * the brain and not a number in the row.
   *
   * ⚠ Async by design: the reads brains need (a metabolism reconcile, a
   * transcript fold, a par sheet through perception) already are.
   *
   * @hook
   */
  urgency?(ctx: BrainContext): Urgency | Promise<Urgency>;
  /** The entry point the framework invokes when a wired trigger fires. */
  act(ctx: BrainContext): void | Promise<void>;
  /**
   * The **responder-open seam** — implemented only by dialogue brains
   * (`tree-dialogue`, and the later `intent-dialogue`). The `talk`
   * controller resolves the host's dialogue spec by path and calls this
   * to begin a conversation; it is distinct from `act` (a dialogue
   * brain's `engage` trigger wires nothing, so its `act` never fires).
   * Other brains leave it unset. See docs/subsystems/npc-dialogue.md.
   *
   * @hook
   */
  open?(args: DialogueOpenArgs): Promise<DialogueOpenResult>;
}

/** Arguments to {@link BrainStatics.open}. */
export interface DialogueOpenArgs {
  /** The engaging player's character (drives the tree, speaks aloud). */
  player: Stuff;
  /** The responder host (the NPC; speaks its beats). */
  npc: Stuff;
  /** The dialogue spec's `config` — the tree, an opaque blob. */
  config: Record<string, unknown>;
  /** The driver's connection, captured for the private choice wheel. */
  interactive?: Interactive;
}

/**
 * The outcome of {@link BrainStatics.open}. `ok:false` carries the
 * reason so the `talk` controller renders the right decline prose:
 * `no-tree` (host has no usable tree), `busy` (host already in a
 * conversation — 1:1), `no-viewer` (no live connection to prompt).
 */
export type DialogueOpenResult =
  | { ok: true }
  | { ok: false; reason: 'no-tree' | 'busy' | 'no-viewer' };

/** Witness trigger kinds (perception-driven, via `handleMessage`). */
export type WitnessKind = 'arrival' | 'departure' | 'emote' | 'speech';

/**
 * A parsed trigger: either a cadence (timer) or a witness (perception)
 * selector. State conditions ("at night", "my shift") are NOT a trigger
 * source — they are guards inside brain code reading `WorldClockApi`.
 */
export type ParsedTrigger =
  | { source: 'cadence'; intervalMs: number }
  | { source: 'witness'; kind: WitnessKind }
  // `engage` wires nothing — no timer, no witness dispatch. It exists so
  // the spec surfaces the tree to the `talk` controller, warms the brain
  // path at wire time, and marks the host as conversational (the
  // discoverability signal). The brain is reached only via `open`.
  | { source: 'engage' }
  // ⭐ `candidate` wires no timer of its own. The brain joins the host's
  // ONE deliberation beat and is asked `urgency(ctx)` each time it runs;
  // pacing stops being the row's business and becomes the agent's. A
  // `candidate` spec over a brain declaring no `urgency` is skipped with
  // a warning (and refused by `lint:idle-cadence`).
  | { source: 'candidate' };

/**
 * Witness alias → the frame `topic` (prefix) it observes on the host's
 * own perception stream. Every event trigger is a topic predicate over
 * `SensorMixin.handleMessage` — no global bus subscription. `arrival`
 * and `departure` share the movement topic and are disambiguated by the
 * room-occupant delta the framework computes.
 */
export const WITNESS_TOPIC: Record<WitnessKind, string> = {
  arrival: 'act.move',
  departure: 'act.move',
  emote: 'act.emote',
  speech: 'speech.',
} as const;

// Trigger parsing lives on `BehavedMixin` (`_parseTrigger`) — the owner
// of trigger wiring — per the export-discipline rule (no free-floating
// helpers in lib/). This module exports only the category's types +
// vocabulary constants.
