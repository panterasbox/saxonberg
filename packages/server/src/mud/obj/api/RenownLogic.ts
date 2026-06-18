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
import { WorldClockApi } from '../../api/worldclock';
import { EventApi } from '../../api/event';
import type { Subscription } from '../../api/event';
import { StuffApi } from '../../api/stuff';
import { AddressApi } from '../../api/address';
import { GroupApi } from '../../api/group';
import { ReactionFiredEvent } from '../../lib/events/ReactionFiredEvent';
import type { ReactionFiredPayload } from '../../lib/events/ReactionFiredEvent';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { GroupRef } from '../../lib/social/GroupProvider';
import { PersistenceManager } from '../../../backend/PersistenceManager';

const RenownApiCallers = SecurityPolicies.FromModule(
  'mud/api/renown#RenownApi'
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistenceManager.get().isConnected();
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
  p: ReactionFiredPayload
): Promise<{ locality: string | null; groups: GroupRef[] }> {
  const groups = new Set<GroupRef>();

  // A channel reaction carries its objective group directly.
  if (p.scope.startsWith('channel:')) {
    groups.add(p.scope.slice('channel:'.length) as GroupRef);
  }
  // The managed circles the reactor & subject share.
  try {
    for (const g of await GroupApi.sharedManagedGroups(
      p.reactorId,
      p.subjectId
    )) {
      groups.add(g);
    }
  } catch {
    /* group registry absent — no group scope */
  }

  // The locality covering a room-scoped reaction.
  let locality: string | null = null;
  if (p.scope.startsWith('location:')) {
    const loc = StuffApi.findById(p.scope.slice('location:'.length));
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
  const { locality, groups } = await resolveScope(p);
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
