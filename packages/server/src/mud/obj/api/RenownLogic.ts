// RenownLogic — the hot-reloadable logic singleton behind RenownApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import RenownEvent from '../../lib/renown/RenownEvent';
import type {
  RenownEventFields,
  RenownScope,
} from '../../lib/renown/RenownEvent';
import RenownStanding, {
  COOPERATIVE_WIDE,
} from '../../lib/renown/RenownStanding';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { SoulApi } from '../../api/soul';
import { WorldClockApi } from '../../api/worldclock';
import { EventApi } from '../../api/event';
import type { Subscription } from '../../api/event';
import { ScheduleApi } from '../../api/schedule';
import type { ScheduleHandle } from '../../api/schedule';
import { StuffApi } from '../../api/stuff';
import { AddressApi } from '../../api/address';
import { GroupApi } from '../../api/group';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import { ReactionFiredEvent } from '../../lib/events/ReactionFiredEvent';
import type { ReactionFiredPayload } from '../../lib/events/ReactionFiredEvent';
import { CommActEmittedEvent } from '../../lib/events/CommActEmittedEvent';
import type { CommActEmittedPayload } from '../../lib/events/CommActEmittedEvent';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { GroupRef } from '../../lib/social/GroupProvider';
import { PersistApi } from '../../api/persist';

const RenownApiCallers = SecurityPolicies.FromModule(
  'mud/api/renown#RenownApi'
);

/**
 * Recompute cadence — a code constant (cadence is *mechanism*, not a
 * legislated value, per renown-plan §6 decision 3). Cache refresh is a
 * real-time concern, so the recompute rides real-time `ScheduleApi`; the
 * decay math inside still uses game-time `at` deltas.
 */
const RENOWN_RECOMPUTE_MS = 60_000;

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/**
 * Append one raw, scope-tagged signal row. The value-function is NOT
 * applied here — the row stores the pre-valence signal; scoring happens
 * only at recompute. `at` defaults to the game-time witness so callers
 * never re-derive game-time.
 *
 * A module-private free function rather than an intra-singleton self-call,
 * which the call-security gate would deny (the caller would be
 * `RenownLogic`, not the `RenownApi` the gate allows).
 */
async function appendImpl(fields: RenownEventFields): Promise<void> {
  if (!active()) return;
  const ev = new RenownEvent();
  ev.subject = fields.subject;
  ev.source = fields.source;
  ev.kind = fields.kind ?? 'reaction';
  ev.signal = fields.signal ?? {};
  ev.locality = fields.locality ?? null;
  ev.groups = fields.groups ?? [];
  ev.at = fields.at ?? WorldClockApi.getNow().rawValue();
  await ev.save();
}

/**
 * Scope containment — does this event count toward `scope`? `null` =
 * cooperative-wide (every event); a `Group` ref matches the `groups`
 * axis; a locality prefix matches the exact or any nested `locality`.
 * The single definition the raw reader and (later) the recompute share.
 */
function inScope(ev: RenownEvent, scope: RenownScope): boolean {
  if (scope === null) return true;
  if (ev.groups.includes(scope)) return true;
  if (ev.locality === scope) return true;
  if (ev.locality !== null && ev.locality.startsWith(scope + '/')) return true;
  return false;
}

/**
 * Resolve the two scope axes for a fired reaction at ingestion:
 *   - **locality** — for a `location:<stuffId>` reaction, the address
 *     prefix the covering `Locality` claims (or `null` = global); for a
 *     channel reaction, `null`.
 *   - **groups** — the objective `Group`s the signal occurred within: a
 *     channel reaction's own `groupRef`, plus the managed `Group`s the
 *     reactor & subject share.
 *
 * Every leg degrades to empty/`null` when its registry is absent (tests,
 * pre-boot) — scope tagging is best-effort and never blocks the append.
 */
async function resolveScope(
  sourceId: string,
  subjectId: string,
  scope: string
): Promise<{ locality: string | null; groups: GroupRef[] }> {
  const groups = new Set<GroupRef>();

  // A channel act carries its objective group directly.
  if (scope.startsWith('channel:')) {
    groups.add(scope.slice('channel:'.length) as GroupRef);
  }
  // The managed circles the source & subject share.
  try {
    for (const g of await GroupApi.sharedManagedGroups(sourceId, subjectId)) {
      groups.add(g);
    }
  } catch {
    /* group registry absent — no group scope */
  }

  // The locality covering a room-scoped act.
  let locality: string | null = null;
  if (scope.startsWith('location:')) {
    const loc = StuffApi.findById(scope.slice('location:'.length));
    if (loc) {
      try {
        const covered = await AddressApi.resolveLocalityFor(
          loc as Stuff & Container
        );
        locality = covered ? covered.getAddress() : null;
      } catch {
        locality = null;
      }
    }
  }

  return { locality, groups: [...groups] };
}

/**
 * Map a fired reaction into a renown signal row and append it. The RAW
 * emote + tags are stored verbatim (scored only at recompute); the scope
 * axes are resolved by {@link resolveScope}; `at` defaults to the
 * game-time witness inside {@link appendImpl}.
 */
async function appendFromReaction(p: ReactionFiredPayload): Promise<void> {
  const { locality, groups } = await resolveScope(
    p.reactorId,
    p.subjectId,
    p.scope
  );
  await appendImpl({
    subject: p.subjectId,
    source: p.reactorId,
    kind: 'reaction',
    signal: {
      emote: p.emote,
      tags: p.tags,
      commandId: p.commandId,
      ...(p.customText !== undefined ? { customText: p.customText } : {}),
    },
    locality,
    groups,
  });
}

/**
 * Resolve a comm act's audience-scope to its listeners' ids (excluding the
 * speaker). A `location:` scope → the co-present Sensors; a `channel:`
 * scope → the channel's members. Best-effort: empty when the scope can't
 * be resolved (pre-boot / absent registry).
 */
async function resolveAudience(
  subjectId: string,
  scope: string
): Promise<string[]> {
  if (scope.startsWith('location:')) {
    const loc = StuffApi.findById(scope.slice('location:'.length));
    if (!loc || !MixinApi.isContainer(loc)) return [];
    return ContainmentApi.getContents(loc)
      .filter((c) => MixinApi.hasMixin(c, Mixins.Sensor))
      .map((c) => c.stuffId)
      .filter((id) => id !== subjectId);
  }
  if (scope.startsWith('channel:')) {
    try {
      const members = await GroupApi.membersOf(
        scope.slice('channel:'.length) as GroupRef
      );
      return members.map((m) => m.stuffId).filter((id) => id !== subjectId);
    } catch {
      return [];
    }
  }
  return [];
}

/** The per-`(speaker, listener)` dedup window in game-seconds (default 300). */
function receptionWindowS(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.renownReceptionWindowS);
    const n = raw ? Number(raw) : 300;
    return Number.isFinite(n) && n > 0 ? n : 300;
  } catch {
    return 300; // AppSettings not warmed (pre-boot / tests) — sane default
  }
}

/**
 * Mint passive **reception** signals for one comm act: a small per-listener
 * engagement reward for the speaker, **deduped** per `(speaker, listener)`
 * within `receptionWindowS` (reward reaching new people, not repetition).
 * `seen` is the ephemeral per-singleton dedup map (`key → last game-time`).
 */
async function appendFromReception(
  p: CommActEmittedPayload,
  seen: Map<string, number>
): Promise<void> {
  if (!active()) return;
  const windowS = receptionWindowS();
  const nowS = WorldClockApi.getNow().rawValue();
  for (const listenerId of await resolveAudience(p.subjectId, p.scope)) {
    const key = `${p.subjectId}|${listenerId}`;
    const last = seen.get(key);
    if (last !== undefined && nowS - last < windowS) continue; // within window
    seen.set(key, nowS);
    const { locality, groups } = await resolveScope(
      listenerId,
      p.subjectId,
      p.scope
    );
    await appendImpl({
      subject: p.subjectId,
      source: listenerId,
      kind: 'reception',
      signal: { commandId: p.commandId },
      locality,
      groups,
      at: nowS,
    });
  }
}

/* ───────── value-function scoring (applied only at recompute) ───────── */

interface ValueFunction {
  esteemHalfLife: number;
  notorietyHalfLife: number;
  contextMult: Record<string, number>;
  qualityWeight: number;
  receptionValence: number;
}

/**
 * Read the legislated *scalar* value-function params (governance-owned
 * AppSettings). Per-emote **valence is NOT here** — it lives on the emote
 * (`Emote.valence`, read via {@link loadEmoteValences}); these are the
 * dials that genuinely belong in central config (decay, context, quality).
 */
function loadValueFunction(): ValueFunction {
  const json = <T>(key: string, fallback: T): T => {
    const raw = AppApi.setting(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  const halfLives = json<{ esteem?: number; notoriety?: number }>(
    AppSettingKeys.renownDecayHalfLives,
    {}
  );
  const qwRaw = AppApi.setting(AppSettingKeys.renownQualityWeight);
  const qw = qwRaw ? Number(qwRaw) : 1;
  const rvRaw = AppApi.setting(AppSettingKeys.renownReceptionValence);
  const rv = rvRaw ? Number(rvRaw) : 0;
  return {
    esteemHalfLife: halfLives.esteem ?? Infinity,
    notorietyHalfLife: halfLives.notoriety ?? Infinity,
    contextMult: json<Record<string, number>>(
      AppSettingKeys.renownContextMultipliers,
      {}
    ),
    qualityWeight: Number.isFinite(qw) ? qw : 1,
    receptionValence: Number.isFinite(rv) ? rv : 0,
  };
}

/**
 * The verb → signed-valence map from the emote catalogue — the polity's
 * declared value *per emote*. Read once per recompute via `SoulApi.all()`.
 */
async function loadEmoteValences(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const emote of await SoulApi.all()) map.set(emote.verb, emote.valence);
  return map;
}

/** The emote verb a reaction signal carries (the valence key). */
function signalEmote(ev: RenownEvent): string {
  const e = (ev.signal as { emote?: unknown }).emote;
  return typeof e === 'string' ? e : '';
}

/** The tags carried by a reaction signal (the context keys). */
function signalTags(ev: RenownEvent): string[] {
  const t = (ev.signal as { tags?: unknown }).tags;
  return Array.isArray(t) ? (t as string[]) : [];
}

/** Half-life decay 0.5^(age/halfLife); 1 for a non-positive / ∞ half-life. */
function decayWeight(ageS: number, halfLife: number): number {
  if (!Number.isFinite(halfLife) || halfLife <= 0 || ageS <= 0) return 1;
  return Math.pow(0.5, ageS / halfLife);
}

/** Product of the context multipliers a signal's tags match (default 1). */
function contextOf(ev: RenownEvent, vf: ValueFunction): number {
  let context = 1;
  for (const t of signalTags(ev)) {
    const c = vf.contextMult[t];
    if (c !== undefined) context *= c;
  }
  return context;
}

/**
 * The whole scoring, over a scope-slice of events. Two channels combine:
 *   - **reactions** sum LINEARLY — signed emote valence × signed-decay
 *     (esteem half-life positive, notoriety negative) × context;
 *   - **receptions** (passively being heard) accumulate a decayed,
 *     context-weighted count, then enter **log-saturated**:
 *     `receptionValence × ln(1 + Σ)` — so the first public messages matter
 *     far more than the thousandth.
 * The sum is scaled by the quality weight.
 */
function scoreEvents(
  events: RenownEvent[],
  nowS: number,
  vf: ValueFunction,
  emoteValences: Map<string, number>
): number {
  let reactionTotal = 0;
  let receptionWeight = 0;
  for (const ev of events) {
    if (ev.kind === 'reception') {
      receptionWeight +=
        decayWeight(Math.max(0, nowS - ev.at), vf.esteemHalfLife) *
        contextOf(ev, vf);
      continue;
    }
    const valence = emoteValences.get(signalEmote(ev)) ?? 0;
    if (valence === 0) continue;
    const halfLife = valence >= 0 ? vf.esteemHalfLife : vf.notorietyHalfLife;
    reactionTotal +=
      valence *
      decayWeight(Math.max(0, nowS - ev.at), halfLife) *
      contextOf(ev, vf);
  }
  const reception = vf.receptionValence * Math.log(1 + receptionWeight);
  return (reactionTotal + reception) * vf.qualityWeight;
}

/** Map a query scope to its stored key (`null` → cooperative-wide sentinel). */
function scopeKey(scope: RenownScope): string {
  return scope ?? COOPERATIVE_WIDE;
}

/** Upsert one materialized standing row (find-or-insert by {subject, scope}). */
async function upsertStanding(
  subject: string,
  scope: string,
  value: number,
  nowS: number
): Promise<void> {
  const [existing] = await RenownStanding.find({ subject, scope });
  const row = existing ?? new RenownStanding();
  row.subject = subject;
  row.scope = scope;
  row.value = value;
  row.recomputedAt = nowS;
  await row.save();
}

/**
 * The batch recompute: re-score every subject's standing from the raw
 * event log through the current value-function into the materialized
 * aggregate. Reads ONLY the renown log + AppSettings — never the belief
 * store. The materialized scope set per subject is derived from that
 * subject's own events: {cooperative-wide} ∪ its groups ∪ its localities.
 */
async function recomputeImpl(): Promise<void> {
  if (!active()) return;
  const vf = loadValueFunction();
  const emoteValences = await loadEmoteValences();
  const nowS = WorldClockApi.getNow().rawValue();

  const all = await RenownEvent.find({});
  const bySubject = new Map<string, RenownEvent[]>();
  for (const ev of all) {
    const list = bySubject.get(ev.subject);
    if (list) list.push(ev);
    else bySubject.set(ev.subject, [ev]);
  }

  for (const [subject, events] of bySubject) {
    const scopes = new Set<RenownScope>([null]);
    for (const ev of events) {
      for (const g of ev.groups) scopes.add(g);
      if (ev.locality !== null) scopes.add(ev.locality);
    }
    for (const scope of scopes) {
      const slice = events.filter((e) => inScope(e, scope));
      await upsertStanding(
        subject,
        scopeKey(scope),
        scoreEvents(slice, nowS, vf, emoteValences),
        nowS
      );
    }
  }

  // Refresh the read cache from the rebuilt rows.
  await RenownStanding.warm();
}

/** Sync read off the warmed standing cache; neutral 0 for a missing scope. */
function renownOfImpl(subjectId: string, scope: RenownScope): number {
  return (
    RenownStanding.cached().get(
      RenownStanding.key(subjectId, scopeKey(scope))
    ) ?? 0
  );
}

/**
 * RenownLogic — the hot-reloadable logic singleton behind
 * {@link RenownApi}.
 *
 * Lives at `/obj/api/renown` (a stateless `Stuff` singleton, no backing
 * `Template`); `RenownApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The dumb-store / smart-consumer framing lives
 * on the Api face.
 *
 * Internal sub-logic (the `active` check, the append builder, and the
 * scope-containment predicate) lives in module-private free functions, so
 * there are no intra-singleton `this.x()` calls to trip the gate. Each
 * public method carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class RenownLogic extends Idea {
  /**
   * The reaction ingestion subscription — retained so a re-install is a
   * no-op. Transient instance state on the singleton (not persisted); a
   * fresh singleton (post-HMR or post-`clearAll`) re-installs cleanly.
   */
  private reactionSub: Subscription<ReactionFiredPayload> | null = null;

  /** The comm-act reception subscription — retained so re-install is a no-op. */
  private receptionSub: Subscription<CommActEmittedPayload> | null = null;

  /**
   * Ephemeral per-`(speaker, listener)` dedup map (`key → last game-time
   * seconds`) — the reception rate-limiter. Transient instance state; a
   * fresh singleton (post-HMR / post-clearAll) starts empty.
   */
  private receptionSeen = new Map<string, number>();

  /** The recurring recompute handle — retained so re-install is a no-op. */
  private recomputeHandle: ScheduleHandle | null = null;

  /**
   * Install the reaction → renown ingestion tap (idempotent). Subscribes
   * to `ReactionFiredEvent` and appends a scope-tagged `RenownEvent` per
   * fired reaction. Called once at boot (`RenownApi.boot`).
   *
   * The sibling *regard* update is deliberately NOT installed here — a
   * reaction has no principled signed regard delta without the
   * value-function (which renown applies at recompute, but regard has no
   * recompute), so reaction→regard is left to a belief-side build. The
   * renown recompute never reads belief regardless.
   */
  @CallSecurity(RenownApiCallers)
  public installReactionTap(): void {
    if (this.reactionSub) return;
    this.reactionSub = EventApi.on<ReactionFiredPayload>(
      ReactionFiredEvent.KIND,
      (p) => {
        void appendFromReaction(p).catch((err) =>
          console.error('RenownLogic: reaction signal append failed', err)
        );
      }
    );
  }

  /** See {@link RenownApi.append}. */
  @CallSecurity(RenownApiCallers)
  public async append(fields: RenownEventFields): Promise<void> {
    return appendImpl(fields);
  }

  /**
   * Install the comm-act → renown *reception* tap (idempotent). Subscribes
   * to `CommActEmittedEvent` and mints a small, rate-limited per-listener
   * engagement signal for the speaker (passive "being heard"). Sibling to
   * the reaction tap; called once at boot.
   */
  @CallSecurity(RenownApiCallers)
  public installReceptionTap(): void {
    if (this.receptionSub) return;
    const seen = this.receptionSeen;
    this.receptionSub = EventApi.on<CommActEmittedPayload>(
      CommActEmittedEvent.KIND,
      (p) => {
        void appendFromReception(p, seen).catch((err) =>
          console.error('RenownLogic: reception signal append failed', err)
        );
      }
    );
  }

  /**
   * Self-register the real-time recompute schedule (idempotent). Each
   * fire re-scores all standings off the log. Cancellable via the retained
   * `ScheduleHandle`. Renown owns its own cadence — no `WorldClockRegistry`
   * coupling (decision 3).
   */
  @CallSecurity(RenownApiCallers)
  public installRecomputeSchedule(): void {
    if (this.recomputeHandle) return;
    this.recomputeHandle = ScheduleApi.recurring(RENOWN_RECOMPUTE_MS, () => {
      void recomputeImpl().catch((err) =>
        console.error('RenownLogic: scheduled recompute failed', err)
      );
    });
  }

  /** See {@link RenownApi.recompute}. */
  @CallSecurity(RenownApiCallers)
  public async recompute(): Promise<void> {
    return recomputeImpl();
  }

  /** See {@link RenownApi.renownOf}. */
  @CallSecurity(RenownApiCallers)
  public renownOf(subjectId: string, scope: RenownScope = null): number {
    return renownOfImpl(subjectId, scope);
  }

  /**
   * Raw, scope-filtered log reader. Returns the subject's signal rows that
   * fall within `scope` (default: cooperative-wide). The unscored
   * substrate read — the recompute scores; consumers read the aggregate.
   * See {@link RenownApi.eventsFor}.
   */
  @CallSecurity(RenownApiCallers)
  public async eventsFor(
    subjectId: string,
    scope: RenownScope = null
  ): Promise<RenownEvent[]> {
    if (!active()) return [];
    const all = await RenownEvent.find({ subject: subjectId });
    return all.filter((ev) => inScope(ev, scope));
  }
}
