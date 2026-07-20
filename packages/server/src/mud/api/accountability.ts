/**
 * AccountabilityApi — the gated, typed forwarding shell for the unified
 * **harm-accountability** substrate: the append-only ledger of *who harmed
 * whom, on what terms, and did the victim consent*, from which `crime`
 * derives on read.
 *
 * This is the keystone the concealment/combat vertical shares. Combat's
 * former `combat_attribution_events` blame ledger was **extracted here**
 * (`lib/accountability/AccountabilityEvent.ts`, byte-identical derivation)
 * and combat migrated onto it as its first consumer; a sprung player-trap
 * is the second producer (a single `harm` row). The mandate is broad — the
 * *record of harm*, not the narrow "culpability" a crime-only Api would
 * imply: `crime`/`blame` is one derive-on-read consumer, and reputation /
 * bounty / court readers plug into the same rows without a rewrite.
 *
 * A dumb store — the orchestration (append, replay-derive) lives in the
 * hot-reloadable {@link AccountabilityLogic} singleton at
 * `/obj/api/accountability`, reached synchronously via
 * `StuffApi.singletonSync`; this Api is a thin forwarding shell. Actor /
 * consent / sentience ride in the row fields (durable `templatePath`s), set
 * by the producer that knows them — never inferred here.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { AccountabilityLogic } from '../obj/api/AccountabilityLogic';
import type {
  AccountabilityFields,
  BlameVerdict,
} from '../lib/accountability/AccountabilityEvent';
import type AccountabilityEvent from '../lib/accountability/AccountabilityEvent';
import { fileURLToPath } from 'url';

export type {
  AccountabilityFields,
  BlameVerdict,
  AccountabilityKind,
} from '../lib/accountability/AccountabilityEvent';

const LOGIC_PATH = '/obj/api/accountability';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/AccountabilityLogic', import.meta.url),
);

/** Resolve the HMR-able AccountabilityLogic singleton (sync). */
function logic(): AccountabilityLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'AccountabilityLogic',
      ) as typeof AccountabilityLogic | null) ?? AccountabilityLogic)(),
  );
}

export class AccountabilityApi {
  /**
   * Append one attribution row to the ledger. **Fire-and-forget** — a
   * write failure never blocks the producing beat (a fight, a trap
   * spring). `kind`/`sessionId`/`initiator`/`opponent` are required; the
   * clock fields default to the game-time / wall clock.
   */
  public static record(fields: AccountabilityFields): void {
    logic().record(fields);
  }

  /**
   * The blame verdict for a victim, derived on read by replaying the
   * append-only ledger. `null` if the victim has no attributed terminal
   * harm. `victimId` is the durable `templatePath`.
   */
  public static blameFor(victimId: string): Promise<BlameVerdict | null> {
    return logic().blameFor(victimId);
  }

  /**
   * Whether the ledger derives a **crime** against this victim — harm to a
   * non-consenting sentient (the kind-branched rule). `false` when there is
   * no terminal harm row.
   */
  public static crimeFor(victimId: string): Promise<boolean> {
    return logic().crimeFor(victimId);
  }

  /** Every attribution row for a session (read/analytics; ordered by realAt). */
  public static eventsForSession(
    sessionId: string,
  ): Promise<AccountabilityEvent[]> {
    return logic().eventsForSession(sessionId);
  }
}
