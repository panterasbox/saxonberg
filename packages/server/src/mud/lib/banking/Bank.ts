/**
 * BankMixin — the custodial-branch capability: a corpo affiliation, a cash
 * vault, a till-liquidity gauge, and the banking verb surface.
 *
 * Hosted on a **teller-counter `Thing` fixture** inside the branch Location
 * (the `Menu` precedent), NOT on the Location itself: a Location's own
 * `commandContributions` don't reach its occupants — only sibling *contents*
 * contribute to the `environment` bucket — so the affordance must come from a
 * fixture in the room. The branch is the *place*; this counter is what makes
 * the banking verbs light up while you're there. The host is also a
 * `Container`: its contents ARE the cash vault (deposited coin stacks), so
 * "vault coins" = coins physically resting in a BankMixin host.
 *
 * Corpo affiliation rides a plain `corpoKey` resolved on read via `CorpoApi`
 * (a bank is *affiliated to* a corpo — not a branded product, so not
 * `BrandedMixin`). Opening an account records that key on the account row,
 * readable through the corpo substrate.
 *
 * Custodial means **1:1**: the vault's coin value equals the sum of the
 * branch's account balances across deposit / withdraw / same-bank transfer.
 * The till gauge is the branch's *physical* cash — a withdrawal is bounded by
 * it (a branch can run low on coin even when the account is solvent), the
 * diegetic limit the central bank's branch-float makes meaningful.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import type { CommandContributions } from "../../api/command";
import { CorpoApi } from "../../api/corpo";
import type { CorpoDescriptor } from "../../obj/corpo/Corpo";
import { CallSecurity, Final, Unshadowable } from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";
import type { VetoResult } from "../errors";
import { Money } from "./Money";
import { Terms } from "./Terms";
import type { TermsData } from "./Terms";
import { Currency } from "./Currency";

/**
 * The banking subsystem's own gate — admits the `BankingApi` face and the
 * `BankingLogic` singleton (its template path), mirroring `FromContainmentApi`.
 * The vault-disbursement seam (`_beginDisbursing`/`_endDisbursing`) is reachable
 * only through the banking verbs, never player code.
 */
const FromBankingApi = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("/api/banking#BankingApi", {
    includeSubclasses: false,
  }),
  SecurityPolicies.FromTemplate("/obj/api/banking"),
);

/** Public shape added by BankMixin. */
export interface Bank {
  /** The bank's corpo affiliation key (resolved via {@link CorpoApi}). */
  getCorpoKey(): string;
  setCorpoKey(value: string): void;
  /** The resolved corpo descriptor, or null when independent/unknown. */
  getCorpo(): CorpoDescriptor | null;
  /** The durable account-resolution key for this branch (its templatePath). */
  getBankPath(): string;
  /** The institution key this counter is a branch OF (e.g. `goodkin`). */
  getBank(): string;
  /** The branch's physical cash on hand (Σ vault coin face-values). */
  getTillLiquidity(): Money;
  /** The authored fee/minimum schedule read at each verb. */
  getTerms(): Terms;
  /**
   * Open the vault-disbursement window (privileged — banking verbs only): while
   * open, {@link Bank.canRemoveContainable} permits vault-coin removal. Pair
   * with {@link Bank._endDisbursing} in a `finally`.
   */
  _beginDisbursing(): void;
  /** Close the vault-disbursement window. */
  _endDisbursing(): void;
}

/** Coin-shaped duck type — avoids a lib→obj import of the Coin class. */
interface CashLike {
  getCurrency(): string;
  /** Face value in minor units — the denomination's identity. */
  getDenomination(): number;
  getQuantity(): number;
}

function isCashLike(stuff: unknown): stuff is CashLike {
  const s = stuff as Partial<CashLike>;
  return (
    typeof s?.getCurrency === "function" &&
    typeof s?.getDenomination === "function" &&
    typeof s?.getQuantity === "function"
  );
}

/** The face value (minor units) of a coin stack resting in the vault. */
function stackValue(stuff: CashLike): number {
  return (
    Currency.faceValueOf(stuff.getCurrency(), stuff.getDenomination()) *
    stuff.getQuantity()
  );
}

export function BankMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class BankMixin extends Base implements Bank {
    static _mixinName = "BankMixin";

    static fieldMeta: FieldMeta = {
      corpoKey: { persistent: true, authorable: true, authorPicker: 'Corpo' },
      terms: { persistent: true, authorable: true },
      bank: { persistent: true, authorable: true },
    };

    /**
     * The banking verb surface lights up wherever this counter is present in
     * the room (the `environment` bucket — the `Menu` precedent).
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: ["banking/bank.yaml"],
      environment: [],
    };

    /**
     * The bank's corpo affiliation key.
     */
    public corpoKey = "";

    /**
     * The **bank institution** this counter is a branch of — the durable
     * key an account's custody records (`AccountBalance.bank`,
     * `banksAt`). The five corpo banks are their corpos' finance arms, so
     * the key defaults to `corpoKey` (goodkin/hollis/vionne/aevex/veshko);
     * an **independent** bank authors its own key here (a key with no
     * corpo behind it — the `Brand.owner === ''` precedent). Your account
     * exists at the BANK; a branch is a service point of it (till physics
     * stay per-branch).
     */
    public bank = "";

    public getCorpoKey(): string {
      return this.corpoKey;
    }

    public setCorpoKey(value: string): void {
      this.corpoKey = value;
    }

    public getCorpo(): CorpoDescriptor | null {
      if (!this.corpoKey) return null;
      return CorpoApi.getCorpo(this.corpoKey);
    }

    /**
     * The authored fee/minimum schedule (seed `data.terms`), round-tripped
     * through the raw `terms` field. Absent → the fee-free default.
     */
    public terms: TermsData = {};

    public getTerms(): Terms {
      return Terms.fromData(this.terms);
    }

    public getBankPath(): string {
      return (this as unknown as Stuff).getTemplatePath() ?? "";
    }

    public getBank(): string {
      return this.bank || this.corpoKey;
    }

    public getTillLiquidity(): Money {
      let total = 0;
      for (const item of (this as unknown as Stuff & Container).getContents()) {
        if (isCashLike(item)) total += stackValue(item);
      }
      return Money.of(total, Currency.compact());
    }

    /**
     * Till security: the vault is real `Coin` in a `Container`, so its
     * contents must never be loose-`get`table — "loot the drawer" would be
     * free money with no withdrawal. The banking verbs open a disbursement
     * window (`_beginDisbursing`) around the one legitimate removal; any other
     * removal of cash-like coin from the vault is vetoed. (Non-cash items, if
     * ever placed here, are unrestricted.) The sibling of the exclusive lease
     * and the common-pool quota — the third anti-grief guard.
     */
    private _disbursing = false;

    @CallSecurity(FromBankingApi)
    @Final
    @Unshadowable
    public _beginDisbursing(): void {
      this._disbursing = true;
    }

    @CallSecurity(FromBankingApi)
    @Final
    @Unshadowable
    public _endDisbursing(): void {
      this._disbursing = false;
    }

    public canRemoveContainable(thing: Stuff & Containable): VetoResult {
      if (this._disbursing) return { ok: true };
      if (isCashLike(thing)) {
        return {
          ok: false,
          reason: "The till is secured — withdraw through the teller.",
        };
      }
      return { ok: true };
    }
  }
  return BankMixin;
}
