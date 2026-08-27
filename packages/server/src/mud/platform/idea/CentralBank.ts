/**
 * CentralBank — the singleton mint/sink, at `/platform/idea/CentralBank`.
 *
 * The only faucet/sink for money: total supply changes solely by a logged
 * central-bank mint or drain, every operation auditable. v1 builds only the
 * monetary *mechanism* (mint / drain / float / seed), not its governance —
 * the legislative/archive/judicial wrapper is the Compact-governance build's job
 * and grafts on later without disturbing the mechanism.
 *
 * The mint/drain/float *logic* lives in {@link BankingLogic} and is surfaced
 * (developer-gated) through `BankingApi`, NOT as a free Stuff method players
 * can reach. This singleton holds the central bank's own account identity
 * and is the world-presence anchor the later governance wrapper attaches to
 * — a `PostRegistrationMixin(Idea)` singleton (the catalogue precedent,
 * with the singleton-destruct refusal).
 */

import { Idea } from "../../lib/stuff/Idea";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { Account } from "../../lib/banking/Account";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from '../../lib/stuff/Stuff';

const CentralBankBase = PostRegistrationMixin(Idea);

export default class CentralBank extends CentralBankBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /** The central bank's own (real) operating account id. */
  public getAccountId(): string {
    return Account.CENTRAL_BANK;
  }

  /** Singleton refusal (mirrors the catalogue singletons). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        "CentralBank is a system singleton and cannot be destructed; " +
        "use forceDestruct (admin-gated) if you really mean it",
    };
  }
}
