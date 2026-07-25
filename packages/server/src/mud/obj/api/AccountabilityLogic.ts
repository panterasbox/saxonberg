// AccountabilityLogic — the hot-reloadable logic singleton behind
// AccountabilityApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { WorldClockApi } from '../../api/worldclock';
import AccountabilityEvent, {
  type AccountabilityFields,
  type BlameVerdict,
} from '../../lib/accountability/AccountabilityEvent';

const AccountabilityApiCallers = SecurityPolicies.FromModule(
  '/api/accountability#AccountabilityApi',
);

/** Game-time seconds witness, tolerant of a disconnected clock. */
function gameNow(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

/** Build and persist one row from the supplied fields (defaulting the
 * combat-only + clock fields). */
async function appendRow(fields: AccountabilityFields): Promise<void> {
  const ev = new AccountabilityEvent();
  ev.kind = fields.kind;
  ev.sessionId = fields.sessionId;
  ev.initiator = fields.initiator;
  ev.opponent = fields.opponent;
  ev.victim = fields.victim ?? '';
  ev.killer = fields.killer ?? '';
  ev.lethality = fields.lethality ?? 'non-lethal';
  ev.stopCondition = fields.stopCondition ?? 'yield';
  ev.consented = fields.consented;
  ev.sentient = fields.sentient;
  ev.locality = fields.locality ?? null;
  ev.formationPath = fields.formationPath ?? '';
  ev.killerRole = fields.killerRole ?? '';
  ev.directedBy = fields.directedBy ?? '';
  ev.at = fields.at ?? gameNow();
  ev.realAt = fields.realAt ?? Date.now();
  await ev.save();
}

async function blameForImpl(victimId: string): Promise<BlameVerdict | null> {
  const rows = await AccountabilityEvent.find<AccountabilityEvent>({
    victim: victimId,
  });
  return AccountabilityEvent.deriveBlame(rows);
}

/**
 * AccountabilityLogic — the hot-reloadable logic singleton behind
 * {@link AccountabilityApi}.
 *
 * Lives at `/obj/api/accountability` (a stateless `Stuff` singleton, no
 * backing `Template`); `AccountabilityApi`'s public statics forward here
 * via `StuffApi.singletonSync`. The ledger stays **dumb append-only** — the
 * only smarts are the pure `AccountabilityEvent.deriveBlame` replay reader.
 * Internal sub-logic lives in module-private free functions, so there are
 * no intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate. `dest /obj/api/accountability` reloads it.
 *
 * @internal
 */
@Unshadowable
export class AccountabilityLogic extends ApiLogic {
  /** See {@link AccountabilityApi.record}. Fire-and-forget: a write failure
   * never blocks the producing beat (a fight, a trap spring). */
  @CallSecurity(AccountabilityApiCallers)
  public record(fields: AccountabilityFields): void {
    void appendRow(fields).catch(() => {
      /* the ledger is best-effort; a write failure never breaks the beat */
    });
  }

  /** See {@link AccountabilityApi.blameFor}. */
  @CallSecurity(AccountabilityApiCallers)
  public async blameFor(victimId: string): Promise<BlameVerdict | null> {
    return blameForImpl(victimId);
  }

  /** See {@link AccountabilityApi.crimeFor}. */
  @CallSecurity(AccountabilityApiCallers)
  public async crimeFor(victimId: string): Promise<boolean> {
    return (await blameForImpl(victimId))?.crime ?? false;
  }

  /** See {@link AccountabilityApi.eventsForSession}. */
  @CallSecurity(AccountabilityApiCallers)
  public async eventsForSession(
    sessionId: string,
  ): Promise<AccountabilityEvent[]> {
    const rows = await AccountabilityEvent.find<AccountabilityEvent>({
      sessionId,
    });
    return rows.sort((a, b) => a.realAt - b.realAt);
  }
}
