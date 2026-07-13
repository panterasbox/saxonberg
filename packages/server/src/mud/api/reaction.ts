/**
 * ReactionApi — the thin, gated facade over the reaction substrate.
 *
 * A reaction is an ordinary emote carrying one extra scope:
 * `inReactionTo: <commandId>`. Everything that makes a reaction *feel*
 * different from a plain emote — the tally, the toggle, the threshold
 * aggregation, the renown event — is a thin layer
 * ({@link ReactionRegistry}) hung off the emote path. There is no
 * parallel dispatch; the emote send pokes this Api, and this Api
 * forwards to the registry singleton.
 *
 * State lives on the {@link ReactionRegistry} singleton at
 * `/obj/ReactionRegistry`; this Api holds no state. Every registry
 * method is gated `FromModule('/api/reaction#ReactionApi')`, so the
 * facade is the only legitimate path. Mirrors the
 * `MqlSubscriptionApi` ↔ `MqlSubscriptionRegistry` split, minus the
 * HMR logic-singleton indirection (registry state survives an Api
 * reload because it lives on the Stuff, not the Api).
 *
 * See docs/subsystems/reactions.md.
 */

import type { ReactionDeltaEnvelope } from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type Interactive from '../obj/Interactive';
// Value-import is safe: `ReactionRegistry`'s import of this module is
// type-only, so there is no runtime cycle, and `resolveRegistry` reads
// the binding lazily inside the function body regardless.
import ReactionRegistry from '../obj/ReactionRegistry';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { TemplatePaths } from '../lib/paths';

/* ─────────────────────────── public surface ─────────────────────── */

/** The closed v1 set of topics whose frames denote a reactable act. */
const REACTABLE_TOPICS: ReadonlySet<string> = new Set([
  'world.speech.say',
  'world.speech.whisper',
  'world.speech.shout',
  'world.expression.emote',
  'world.chat.message',
  // Combat — dramatic exchange beats are reactable (the crowd cheers a
  // hit). Only dramatic beats call noteReactableAct; tick/pressed stay
  // silent. See docs/subsystems/combat.md.
  'world.combat.exchange',
]);

/**
 * Synchronous request from `SoulMixin.emote`/`emoteFree` on a scoped
 * emote. The registry tallies/toggles, fires renown on a flip-on, and
 * returns whether the per-emote fan-out line should be suppressed.
 */
export interface ScopedEmoteRequest {
  /** The reactor. Only its `stuffId` (and HasInteractive, if present) is
   *  read by the registry — no Sensor surface needed, so a plain `Stuff`
   *  keeps callers cast-free. */
  reactor: Stuff;
  inReactionTo: string;
  /** Canonical emote verb, or a free-form marker. */
  verb: string;
  emoji?: string;
  tags: string[];
  customText?: string;
}

/** Decision returned to the emote send path. */
export interface ScopedEmoteDecision {
  /** True at/above threshold: skip the diegetic line, counter only. */
  suppressFanOut: boolean;
  /** False when the act isn't a known reactable act (defence in depth). */
  reactable: boolean;
}

/** Messaging-side capture: an act becomes reactable on first observation. */
export interface ReactableActRequest {
  commandId: string;
  /** The act's author — `payload.speaker` subject. */
  subject: Stuff;
  /** Audience-scope key: `location:<id>` | `channel:<groupRef>`. */
  scope: string;
}

/** Wire-facing expand pull. */
export interface ExpandRequest {
  interactive: Interactive;
  requestId: string;
  commandId: string;
}

/**
 * A scope-keyed delta consumer. The normal player path delivers
 * per-viewer via `MessageApi.sendEnvelope`; an explicit sink is the
 * seam for the read-only `service:broadcast` overlay principal (which
 * has no Interactive) and for tests.
 */
export interface ReactionSink {
  /** Identity for de-dup / cancel. */
  readonly id: string;
  /** Viewer for per-recipient familiar-biased sampling; null = no sample. */
  viewer?: (Stuff & Sensor) | null;
  /** Does this sink see acts in the given audience-scope? */
  seesScope(scope: string): boolean;
  /** Deliver one coalesced delta (frameId stamped downstream / by the sink). */
  emitDelta(env: Omit<ReactionDeltaEnvelope, 'frameId'>): void;
}

/* ─────────────────────── registry resolution ────────────────────── */

const REGISTRY_PATH = TemplatePaths.reactionRegistry;

/**
 * Resolve the registry singleton, lazy-creating a transient instance
 * when bootstrap hasn't seeded one yet (tests). Production hits the
 * manifest path via `findByTemplatePath`.
 */
function resolveRegistry(): ReactionRegistry {
  const existing =
    StuffApi.findByTemplatePath<ReactionRegistry>(REGISTRY_PATH) ?? null;
  if (existing) return existing;
  const reg = StuffApi.createSync<ReactionRegistry>(
    () => new ReactionRegistry(),
  );
  reg.setTemplatePath(REGISTRY_PATH);
  return reg;
}

/* ───────────────────────────── ReactionApi ──────────────────────── */

export class ReactionApi {
  private constructor() {}

  /** The closed v1 reactable-topic set (re-exported for messaging). */
  public static readonly REACTABLE_TOPICS = REACTABLE_TOPICS;

  /** A frame is reactable iff its topic is one of the v1 act-kinds. */
  public static isReactableTopic(topic: string): boolean {
    return REACTABLE_TOPICS.has(topic);
  }

  /**
   * The audience-scope key for an in-room act: the circle of co-present
   * witnesses. A Containable speaker scopes to its environment (the
   * room everyone shares); a pure-Container speaker (a haunted room)
   * scopes to itself. Returns null when the speaker is neither — such
   * an act has no co-present audience and isn't reactable.
   */
  public static locationScopeFor(stuff: Stuff): string | null {
    if (MixinApi.isContainable(stuff)) {
      const env = stuff.getContainer();
      return env ? `location:${env.stuffId}` : null;
    }
    if (MixinApi.isContainer(stuff)) {
      return `location:${stuff.stuffId}`;
    }
    return null;
  }

  /**
   * Called synchronously from `SoulMixin.emote`/`emoteFree` on a scoped
   * emote. Add-only tally (idempotent re-react) + renown + threshold;
   * returns the suppression decision so the caller knows whether to skip
   * its diegetic line.
   */
  public static onScopedEmote(req: ScopedEmoteRequest): ScopedEmoteDecision {
    return resolveRegistry().onScopedEmote(req);
  }

  /**
   * Explicitly remove the reactor's `(reactor, emote)` reaction — the
   * un-react op. No renown, no diegetic line; the count just drops.
   * Reacting itself is add-only/idempotent, so this is the only way to
   * decrement a reaction (GUI click on an active chip / `react
   * --remove`).
   */
  public static removeReaction(req: ScopedEmoteRequest): void {
    resolveRegistry().removeReaction(req);
  }

  /**
   * Messaging-side: register an act as reactable the FIRST time a frame
   * for that `commandId` is composed. Idempotent — only the first call
   * per `commandId` captures subject + scope.
   */
  public static noteReactableAct(req: ReactableActRequest): void {
    resolveRegistry().noteReactableAct(req);
  }

  /**
   * Speaker + audience-scope of a reactable act by `commandId`, or `null`
   * if none is registered. The renown reception consumer uses this to
   * recover the speaker from a receiver's `CommReceivedEvent` (and to
   * filter out non-comm frames, which return `null`).
   */
  public static actInfo(
    commandId: string
  ): { subjectId: string; scope: string } | null {
    return resolveRegistry().actInfo(commandId);
  }

  /**
   * Record that a reactable-act frame was delivered to an Interactive,
   * keying its gutter `frameId` → the act's `commandId` so `react
   * --msg <n>` resolves server-side. Bounded ring.
   */
  public static noteDeliveredFrame(
    interactive: Interactive,
    frameId: number,
    commandId: string,
  ): void {
    resolveRegistry().noteDeliveredFrame(interactive, frameId, commandId);
  }

  /** Resolve a gutter number to a `commandId` for one Interactive. */
  public static resolveGutter(
    interactive: Interactive,
    frameId: number,
  ): string | null {
    return resolveRegistry().resolveGutter(interactive, frameId);
  }

  /** The subject's most-recent reactable act (for `react --to <person>`). */
  public static lastReactableActBy(subjectId: string): string | null {
    return resolveRegistry().lastReactableActBy(subjectId);
  }

  /** The most-recent reactable act delivered to this Interactive (default selector). */
  public static lastDeliveredActFor(interactive: Interactive): string | null {
    return resolveRegistry().lastDeliveredActFor(interactive);
  }

  /** Is `commandId` a known reactable act? (controller pre-gate). */
  public static isReactableAct(commandId: string): boolean {
    return resolveRegistry().isReactableAct(commandId);
  }

  /** The act's audience-scope, or null if unknown. */
  public static scopeOf(commandId: string): string | null {
    return resolveRegistry().scopeOf(commandId);
  }

  /** Wire-facing expand pull (routed from `Application`). */
  public static handleExpand(req: ExpandRequest): void {
    resolveRegistry().handleExpand(req);
  }

  /** Register the normal per-player sink for an Interactive (on connect). */
  public static registerInteractive(interactive: Interactive): void {
    resolveRegistry().registerInteractive(interactive);
  }

  /** Disconnect cleanup (mirrors `MqlSubscriptionApi`). */
  public static cancelAllForInteractive(interactive: Interactive): void {
    resolveRegistry().cancelAllForInteractive(interactive);
  }

  /** Overlay-ready: subscribe a scope-keyed read-only sink. */
  public static subscribeScope(sink: ReactionSink, scope: string): void {
    resolveRegistry().subscribeScope(sink, scope);
  }

  /** Cancel a previously-subscribed sink. */
  public static cancelSink(sink: ReactionSink): void {
    resolveRegistry().cancelSink(sink);
  }

  /* ─── test seams ─── */

  public static _flushNowForTesting(): void {
    SecurityApi.assertTestOnly('_flushNowForTesting');
    resolveRegistry()._flushNow();
  }

  public static _setTestModeForTesting(on: boolean): void {
    SecurityApi.assertTestOnly('_setTestModeForTesting');
    resolveRegistry()._setTestMode(on);
  }

  public static _setNowForTesting(fn: () => number): void {
    SecurityApi.assertTestOnly('_setNowForTesting');
    resolveRegistry()._setNow(fn);
  }

  public static _actCountForTesting(): number {
    SecurityApi.assertTestOnly('_actCountForTesting');
    return resolveRegistry()._actCount();
  }

  public static _actStateForTesting(commandId: string): unknown {
    SecurityApi.assertTestOnly('_actStateForTesting');
    return resolveRegistry()._actState(commandId);
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    resolveRegistry()._clearAll();
  }
}

SecurityApi.decorateApiClass(ReactionApi);
