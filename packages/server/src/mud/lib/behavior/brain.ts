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

import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot } from '../activity/Engaged';
import type { MessageFrame } from '@saxonberg/types';
import type Interactive from '../../obj/Interactive';

/** The canonical export name a brain module marks itself with. */
export const BRAIN_EXPORT = 'brain' as const;

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
  trigger: { source: 'cadence' | 'witness'; raw: string };

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
  | { source: 'engage' };

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
  speech: 'world.speech.',
} as const;

// Trigger parsing lives on `BehavedMixin` (`_parseTrigger`) — the owner
// of trigger wiring — per the export-discipline rule (no free-floating
// helpers in lib/). This module exports only the category's types +
// vocabulary constants.
