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

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type { CommandContributions } from "../../api/command";
import { CorpoApi } from "../../api/corpo";
import type { CorpoDescriptor } from "../corpo/Corpo";
import { ContainmentApi } from "../../api/containment";
import { Money } from "./Money";

/** Public shape added by BankMixin. */
export interface Bank {
  /** The bank's corpo affiliation key (resolved via {@link CorpoApi}). */
  getCorpoKey(): string;
  setCorpoKey(value: string): void;
  /** The resolved corpo descriptor, or null when independent/unknown. */
  getCorpo(): CorpoDescriptor | null;
  /** The durable account-resolution key for this branch (its templatePath). */
  getBankPath(): string;
  /** The branch's physical cash on hand (Σ vault coin face-values). */
  getTillLiquidity(): Money;
}

/** Coin-shaped duck type — avoids a lib→obj import of the Coin class. */
interface CashLike {
  getDenomination(): string;
  getQuantity(): number;
}

function isCashLike(stuff: unknown): stuff is CashLike {
  const s = stuff as Partial<CashLike>;
  return (
    typeof s?.getDenomination === "function" &&
    typeof s?.getQuantity === "function"
  );
}

/** The face value (minor units) of a coin stack resting in the vault. */
function stackValue(stuff: CashLike): number {
  return Money.faceValueOf(stuff.getDenomination()) * stuff.getQuantity();
}

export function BankMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class BankMixin extends Base implements Bank {
    static _mixinName = "BankMixin";

    static persistentFields = ["corpoKey"];

    /**
     * The banking verb surface lights up wherever this counter is present in
     * the room (the `environment` bucket — the `Menu` precedent).
     */
    static commandContributions: CommandContributions = {
      self: [],
      environment: [
        "banking/open.yaml",
        "banking/deposit.yaml",
        "banking/withdraw.yaml",
        "banking/balance.yaml",
        "banking/transfer.yaml",
      ],
      inventory: [],
      peers: [],
    };

    /** The bank's corpo affiliation key. */
    public corpoKey = "";

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

    public getBankPath(): string {
      return (this as unknown as Stuff).getTemplatePath() ?? "";
    }

    public getTillLiquidity(): Money {
      let total = 0;
      for (const item of ContainmentApi.getContents(
        this as unknown as Stuff & Container
      )) {
        if (isCashLike(item)) total += stackValue(item);
      }
      return Money.of(total);
    }
  };
}
