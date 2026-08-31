// RegardLogic — the hot-reloadable logic singleton behind RegardApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { REGARD } from '../../../lib/belief/BeliefStore';

const RegardApiCallers = SecurityPolicies.FromModule('/api/regard#RegardApi');

/** Inclusive bounds on stored regard. The range is normative (clamped). */
const REGARD_MIN = -100;
const REGARD_MAX = 100;

/** Clamp to the normative `-100..+100` range. */
function clamp(value: number): number {
  return Math.max(REGARD_MIN, Math.min(REGARD_MAX, value));
}

/**
 * Read the viewer's current regard for the subject, or `0` when the
 * viewer holds no beliefs / the subject has no durable key / no record
 * exists. (Read-time decay off `lastSeen` is a deferred consumer concern;
 * v1 returns the raw stored value.)
 */
function readRegard(viewer: Stuff, subject: Stuff): number {
  if (!MixinApi.isBeliefStore(viewer)) return 0;
  const referent = subject.getIdentityPath();
  if (!referent) return 0;
  return viewer.recall(REGARD, referent)?.payload.regard ?? 0;
}

/**
 * Write an absolute (clamped) regard value. No-ops for a non-belief-
 * holding viewer or a keyless subject. The store overwrites the payload
 * scalar — the arithmetic happened in the caller.
 */
function writeRegard(viewer: Stuff, subject: Stuff, value: number): void {
  if (!MixinApi.isBeliefStore(viewer)) return;
  const referent = subject.getIdentityPath();
  if (!referent) return;
  viewer.know(REGARD, referent, { regard: clamp(value) });
}

/**
 * RegardLogic — the hot-reloadable logic singleton behind
 * {@link RegardApi}.
 *
 * Lives at `/platform/idea/api/regard` (a stateless `Stuff` singleton, no backing
 * `Template`); `RegardApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The belief store stays **dumb CRUD** — all the
 * attitude arithmetic (read-modify-write delta, the `-100..+100` clamp,
 * and the eventual read-time decay) lives here. Internal sub-logic
 * (`readRegard` / `writeRegard` / `clamp`) lives in module-private free
 * functions, so there are no intra-singleton `this.x()` calls to trip the
 * gate. Each public method carries the `FromModule` gate per method.
 * `dest /platform/idea/api/regard` reloads it.
 *
 * @internal
 */
@Unshadowable
export class RegardLogic extends ApiLogic {
  /** See {@link RegardApi.getRegard}. */
  @CallSecurity(RegardApiCallers)
  public getRegard(viewer: Stuff, subject: Stuff): number {
    return readRegard(viewer, subject);
  }

  /** See {@link RegardApi.adjustRegard}. */
  @CallSecurity(RegardApiCallers)
  public adjustRegard(viewer: Stuff, subject: Stuff, delta: number): void {
    writeRegard(viewer, subject, readRegard(viewer, subject) + delta);
  }

  /** See {@link RegardApi.setRegard}. */
  @CallSecurity(RegardApiCallers)
  public setRegard(viewer: Stuff, subject: Stuff, value: number): void {
    writeRegard(viewer, subject, value);
  }

  /** See {@link RegardApi.clearRegard}. */
  @CallSecurity(RegardApiCallers)
  public clearRegard(viewer: Stuff, subject: Stuff): void {
    if (!MixinApi.isBeliefStore(viewer)) return;
    const referent = subject.getIdentityPath();
    if (!referent) return;
    viewer.forgetField(REGARD, referent, 'regard');
  }

  /** See {@link RegardApi.regardsHeldBy}. */
  @CallSecurity(RegardApiCallers)
  public regardsHeldBy(viewer: Stuff): ReadonlyMap<string, number> {
    const out = new Map<string, number>();
    if (!MixinApi.isBeliefStore(viewer)) return out;
    for (const [referent, record] of viewer.recallRealm(REGARD)) {
      out.set(referent, record.payload.regard ?? 0);
    }
    return out;
  }
}
