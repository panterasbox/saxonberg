/**
 * PaymentCredentialMixin — the on-ledger payment credential: a set of
 * linked accounts, an active-account pointer, a per-credential spend cap,
 * and a frozen flag. Base-agnostic (the `TravelCredentialMixin` shape), so
 * it composes around BOTH a carryable {@link PaymentCard} `Thing` (1:1 with
 * one account — a bearer instrument a finder can spend) AND an incorporeal
 * {@link PaymentImplantUpdate} `AetherHostedMixin(Idea)` (the wallet — links
 * all the owner's accounts, one active). State lives on the credential Stuff
 * in either base, which is what makes the card transferable (and losable).
 *
 * The credential **authorizes** a charge against its routing account and is
 * reached via the shipped `ContainmentApi.findReachable` host-descent +
 * carried-inventory scan (the `teleport` TPA-fork precedent — one scan,
 * either base).
 *
 * The **risk ladder**: cash is bearer with no recourse; the implant is
 * body-bound (the secure default); the card is a bearer instrument bounded
 * by `freeze` (report-lost → `frozen`, the account/balance untouched,
 * reissue a fresh card) and a per-credential `spendCap`. `authorize`
 * enforces both — over-cap or frozen is refused, the diegetic limit, never a
 * fee (Law 2).
 *
 * Persistence is **session-durable** in v1 (the `TravelCredential` caveat):
 * the implant is re-cloned each session, so links are re-established by
 * `openAccount` on relog. Cross-restart durability rides future persistence.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { Money } from "./Money";

/** A credential with no explicit cap admits any amount (the implant default). */
export const UNCAPPED = -1;

/** Public shape provided by PaymentCredentialMixin. */
export interface PaymentCredential {
  /** Link an account this credential may route from; first becomes active. */
  linkAccount(accountId: string): void;
  /** Whether `accountId` is linked to this credential. */
  hasAccount(accountId: string): boolean;
  /** A copy of the linked-account set. */
  getLinkedAccounts(): ReadonlySet<string>;
  /** The account a default (no-override) payment routes from, or null. */
  getActiveAccount(): string | null;
  /** Set the active account (must be linked). Throws if not linked. */
  setActiveAccount(accountId: string): void;
  /** The per-credential spend cap (UNCAPPED = no limit). */
  getSpendCap(): number;
  setSpendCap(minor: number): void;
  /** Whether the credential is frozen (report-lost). */
  isFrozen(): boolean;
  setFrozen(frozen: boolean): void;
  /** True iff this credential may clear `amount` (not frozen, within cap). */
  authorize(amount: Money): boolean;
}

export function PaymentCredentialMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class PaymentCredentialMixin extends Base implements PaymentCredential {
    static _mixinName = "PaymentCredentialMixin";

    static persistentFields = [
      "linkedAccounts",
      "activeAccount",
      "spendCap",
      "frozen",
    ];

    /** The accounts this credential may route from. */
    private _linkedAccounts: Set<string> = new Set();
    /** The default routing account (one of the linked set), or "". */
    public activeAccount = "";
    /** Per-credential spend cap in minor units; UNCAPPED = no limit. */
    public spendCap: number = UNCAPPED;
    /** Report-lost flag — a frozen credential authorizes nothing. */
    public frozen = false;

    /** Persistence accessor for the linked-account set (array round-trip). */
    get linkedAccounts(): string[] {
      return [...this._linkedAccounts];
    }
    set linkedAccounts(refs: string[]) {
      this._linkedAccounts = new Set(refs);
    }

    public linkAccount(accountId: string): void {
      this._linkedAccounts.add(accountId);
      if (!this.activeAccount) this.activeAccount = accountId;
    }

    public hasAccount(accountId: string): boolean {
      return this._linkedAccounts.has(accountId);
    }

    public getLinkedAccounts(): ReadonlySet<string> {
      return new Set(this._linkedAccounts);
    }

    public getActiveAccount(): string | null {
      return this.activeAccount || null;
    }

    public setActiveAccount(accountId: string): void {
      if (!this._linkedAccounts.has(accountId)) {
        throw new Error(
          `PaymentCredential.setActiveAccount: ${accountId} is not linked`
        );
      }
      this.activeAccount = accountId;
    }

    public getSpendCap(): number {
      return this.spendCap;
    }

    public setSpendCap(minor: number): void {
      this.spendCap = minor;
    }

    public isFrozen(): boolean {
      return this.frozen;
    }

    public setFrozen(frozen: boolean): void {
      this.frozen = frozen;
    }

    public authorize(amount: Money): boolean {
      if (this.frozen) return false;
      if (this.spendCap !== UNCAPPED && amount.minor > this.spendCap) {
        return false;
      }
      return true;
    }
  };
}
