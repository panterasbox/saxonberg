// AccountabilityLogic — the hot-reloadable logic singleton behind
// AccountabilityApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { WorldClockApi } from '../../../api/worldclock';
import AccountabilityEvent, {
  type AccountabilityFields,
  type BlameVerdict,
} from '../../../lib/accountability/AccountabilityEvent';

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

/**
 * ⚠⚠ The empty-string sink, closed.
 *
 * `blameFor(victimId)` keys on `victim`. While producers substituted `''`
 * for an unresolvable durable id, every such harm accumulated under one
 * key — a shared bucket that `blameFor('')` would have read as one
 * person's history. This refuses a terminal row that names no victim
 * rather than writing it, so the bucket cannot exist.
 *
 * ⭐ `initiator` / `opponent` / `killer` are deliberately NOT checked:
 * `AccountabilityEvent.NOBODY` is a meaningful value for all three (an
 * environmental death is nobody's doing). Only the victim of a terminal
 * row must be somebody.
 */
function refusalReason(fields: AccountabilityFields): string | null {
  if (fields.kind !== 'death' && fields.kind !== 'harm') return null;
  if (fields.victim && fields.victim !== AccountabilityEvent.NOBODY) {
    return null;
  }
  return (
    `a '${fields.kind}' row with no victim (session ` +
    `'${fields.sessionId}') — the producer could not resolve a durable ` +
    `identity and must skip the append rather than key the row on the ` +
    `empty string`
  );
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
  ev.killerFor = fields.killerFor ?? '';
  ev.victimFor = fields.victimFor ?? '';
  ev.at = fields.at ?? gameNow();
  ev.realAt = fields.realAt ?? Date.now();
  await ev.save();
}

/**
 * ⭐ **An institution's record** — what a body of people has lost, and
 * what it is blamed for.
 *
 * The ledger already derived *who answers for a harm*; nothing
 * player-facing could ever read it, so *"the watch counts its losses"*
 * was a claim nobody in the game could check. This is the read behind
 * that.
 *
 * ⚠⚠ **The two halves are gated differently, and that asymmetry is the
 * design.** `blamed` counts only rows that derive as a **crime** —
 * naming an institution over a lawful duel is noise, exactly as
 * `commandResponsible` is crime-gated. `losses` counts every terminal
 * row, crime or not: *a lawful duel that kills a guard is no crime
 * against the watch, and it is still a guard the watch lost.* A body
 * that could only count its murdered and never its fallen would be the
 * wrong instrument.
 *
 * Circle-marked rows are dropped on both sides — `deriveBlame`'s rule,
 * applied here for the same reason: a killing staged in a private circle
 * is not evidence about anyone, and that must include an institution.
 */
async function institutionRecordImpl(
  partyId: string,
): Promise<{ losses: AccountabilityEvent[]; blamed: AccountabilityEvent[] }> {
  if (!partyId) return { losses: [], blamed: [] };
  const rows = await AccountabilityEvent.find<AccountabilityEvent>({
    $or: [{ victimFor: partyId }, { killerFor: partyId }],
  });
  const terminal = rows.filter(
    (r) => !r.circleScope && (r.kind === 'death' || r.kind === 'harm'),
  );
  const byTime = (a: AccountabilityEvent, b: AccountabilityEvent): number =>
    a.realAt - b.realAt;
  return {
    losses: terminal.filter((r) => r.victimFor === partyId).sort(byTime),
    blamed: terminal
      .filter(
        (r) =>
          r.killerFor === partyId &&
          (AccountabilityEvent.deriveBlame([r])?.crime ?? false),
      )
      .sort(byTime),
  };
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
 * Lives at `/platform/idea/api/accountability` (a stateless `Stuff` singleton, no
 * backing `Template`); `AccountabilityApi`'s public statics forward here
 * via `StuffApi.singletonSync`. The ledger stays **dumb append-only** — the
 * only smarts are the pure `AccountabilityEvent.deriveBlame` replay reader.
 * Internal sub-logic lives in module-private free functions, so there are
 * no intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate. `dest /platform/idea/api/accountability` reloads it.
 *
 * @internal
 */
@Unshadowable
export class AccountabilityLogic extends ApiLogic {
  /** See {@link AccountabilityApi.record}. Fire-and-forget: a write failure
   * never blocks the producing beat (a fight, a trap spring). */
  @CallSecurity(AccountabilityApiCallers)
  public record(fields: AccountabilityFields): void {
    const refusal = refusalReason(fields);
    if (refusal) {
      // Loud, not silent — the whole point of removing the `?? ''` sink
      // is that an unattributable harm becomes visible instead of
      // accumulating under a shared key.
      console.error(`AccountabilityApi.record refused ${refusal}.`);
      return;
    }
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

  /** See {@link AccountabilityApi.institutionRecordFor}. */
  @CallSecurity(AccountabilityApiCallers)
  public async institutionRecordFor(
    partyId: string,
  ): Promise<{ losses: AccountabilityEvent[]; blamed: AccountabilityEvent[] }> {
    return institutionRecordImpl(partyId);
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
