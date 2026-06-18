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
