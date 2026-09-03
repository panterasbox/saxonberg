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
import AccountBalance from "../../lib/banking/AccountBalance";
import SupplyAggregate from "../../lib/banking/SupplyAggregate";
import { BankingLogic } from "./api/BankingLogic";
import { StuffApi } from "../../api/stuff";
import type { VetoResult } from "../../lib/errors";
import type { EvictionContext } from '../../lib/stuff/Stuff';

const CentralBankBase = PostRegistrationMixin(Idea);

export default class CentralBank extends CentralBankBase {

  /**
   * Self-warming boot (the boot()-retirement shape; no
   * `BankingApi.boot()` sequencer line): warm the account-balance read
   * cache and the single-row supply headline from their materialized
   * rows — so the first `balanceOf` / `moneySupply` reads are populated
   * — then run the idempotent custodian restamp on the logic singleton
   * (whose gate admits this singleton by template).
   */
  public override async postRegister(_context?: unknown): Promise<void> {
    await AccountBalance.warm();
    await SupplyAggregate.warm();
    // The Api's own logic() factory (with its HMR getCurrentExport
    // wrapper) is authoritative; at boot the statically-imported class
    // is identical, and singletonSync returns any already-live one.
    const logic = StuffApi.singletonSync(
      "/platform/idea/api/banking",
      () => new BankingLogic(),
    );
    await logic.restampCustodians();
  }

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
