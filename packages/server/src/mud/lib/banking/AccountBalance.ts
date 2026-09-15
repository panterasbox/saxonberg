/**
 * AccountBalance — one materialized account row in the `bank_accounts`
 * collection: the **account registry** (owner / bank / corpo / primary /
 * active) **and** its materialized balance, folded together (the
 * `RenownStanding` precedent — one collection carries both the key and the
 * derived value).
 *
 * The balance is a **derived cache, never authoritative**: replaying the
 * `bank_ledger` rows for `accountId` reproduces it exactly (the
 * rebuild-from-log invariant), so dropping this collection and replaying
 * the ledger reconstructs every balance. Reads (`BankingApi.balanceOf`) hit
 * the in-memory `_cache` warmed at boot (the `RenownStanding.warm` /
 * `AppSettings.warm` precedent), so the read surface never awaits.
 *
 * `accountId` is the durable ledger key (opaque, minted by {@link Account}
 * `newId`); the registry fields carry the friendly identity on top.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import { SecurityApi } from "../../api/security";
import type { FieldMeta } from "../mixin";
import { WarmedIndex } from "../persistence/WarmedIndex";

export default class AccountBalance extends Document {
  static collectionName = Collections.BankAccounts;
  static fieldMeta: FieldMeta = {
    accountId: { persistent: true },
    owner: { persistent: true },
    bank: { persistent: true },
    bankPath: { persistent: true },
    corpoKey: { persistent: true },
    isPrimary: { persistent: true },
    isActive: { persistent: true },
    balance: { persistent: true },
    currency: { persistent: true },
  };

  /** Durable, opaque ledger key. */
  accountId = "";
  /** Durable key of the account owner (a `templatePath`). */
  owner = "";
  /**
   * The **bank institution** custodying this account (`goodkin`,
   * `central-bank`, …) — your account exists at the BANK and is
   * serviceable at every branch of it; a branch is a service point, not
   * the account's identity.
   */
  bank = "";
  /**
   * LEGACY (pre-institution-keying): the branch counter's templatePath.
   * Hydrates old rows so the boot restamp can migrate them into `bank`;
   * cleared on migration, empty on every new row. Remove with the
   * terminus-banking build.
   */
  bankPath = "";
  /** The bank's corpo affiliation (resolved at open; readable via corpo). */
  corpoKey = "";
  /** The owner's designated receive-by-identity account. */
  isPrimary = false;
  /** Whether the account is open for operations. */
  isActive = true;
  /** Materialized balance in minor units — derived from the ledger. */
  balance = 0;
  /**
   * The currency this account is denominated in. **An account holds exactly
   * one currency** (a zorkmid account and a scrip account are two accounts,
   * as in real banking) — which is what keeps conservation a one-line
   * per-currency assertion and leaves the scalar `balance` and its warmed
   * cache untouched.
   *
   * ⚠ Defaults to `""`, **not** the compact currency: an unmigrated row must
   * hydrate currency-less and be loud. A compact-currency default would make
   * an unmigrated row look correct, which is the silent-revalue failure mode
   * wearing a different hat.
   */
  currency = "";
  // Circle membership (Goodkin's recognized-standing perk) is NOT an account
  // field — it's an attribute of the *member*, held as a `<corpoKey>.circle`
  // saved prop on the player (PropertiedMixin). See BankingLogic.enrollCircle
  // / withdrawalCapFor.

  /**
   * The warmed read index: `accountId → {balance, currency}`.
   *
   * ⭐ **One index, not two parallel maps.** It was `_cache` (balance)
   * beside `_currencyCache` (currency), keyed identically, with a
   * comment saying the split was "deliberate — every existing sync
   * balance read site survives verbatim". It does survive: the readers
   * below are what the call sites use, and they hide the value shape.
   * What the split cost was an invariant nothing enforced — two maps can
   * disagree about which accounts exist, and the aggregates below read
   * both.
   *
   * Storage is {@link WarmedIndex}; the WARM stays here, because what it
   * refuses is this subsystem's business. See that class for why this
   * cannot live on `BankingLogic`.
   */
  static #index = new WarmedIndex<{ balance: number; currency: string }>();

  /**
   * Load all balances into the read index. Called at boot + after rebuild.
   *
   * ⚠ **Throws on a currency-less row.** Booting on an unmigrated database
   * would run the world on money whose denomination nobody knows; failing
   * fast and harmlessly is the designed guard. The deploy order is
   * stop → migrate → deploy → start.
   *
   * @internal the callable doors are `BankingApi.balanceOf` and its supply
   * reads; the warm is boot's. Not author surface.
   */
  static async warm(): Promise<void> {
    const rows = await AccountBalance.find<AccountBalance>({});
    AccountBalance.#index.replaceWith(
      rows.map((r) => {
        if (!r.currency) {
          throw new Error(
            `AccountBalance.warm: account '${r.accountId}' has no currency — ` +
              `this database predates the currency build and must be migrated ` +
              `first (packages/server/scripts/migrate-currency.ts --apply)`,
          );
        }
        return [
          r.accountId,
          { balance: r.balance, currency: r.currency },
        ] as const;
      }),
    );
  }

  /**
   * The warmed read index (empty until first warm → 0 reads).
   *
   * @internal the callable door is `BankingApi.balanceOf`.
   */
  static cached(): ReadonlyMap<string, { balance: number; currency: string }> {
    return AccountBalance.#index.entries();
  }

  /**
   * Sync balance read off the warmed index; 0 for an unknown account.
   *
   * @internal the callable door is `BankingApi.balanceOf`.
   */
  static cachedBalance(accountId: string): number {
    return AccountBalance.#index.get(accountId)?.balance ?? 0;
  }

  /**
   * Sync currency read off the warmed index. Empty string for an account the
   * index has never seen — which callers must read as *"new, adopt the leg's
   * currency"*, never as a mismatch.
   *
   * @internal the callable door is `BankingApi.balanceOf`'s `Money`.
   */
  static cachedCurrency(accountId: string): string {
    return AccountBalance.#index.get(accountId)?.currency ?? "";
  }

  /**
   * Σ balances per currency, off the warmed index (sync).
   *
   * @internal reached through `BankingApi`'s supply + audit reads.
   */
  static cachedTotalsByCurrency(): Map<string, number> {
    const totals = new Map<string, number>();
    for (const { balance, currency } of AccountBalance.#index.entries().values()) {
      if (!currency) continue;
      totals.set(currency, (totals.get(currency) ?? 0) + balance);
    }
    return totals;
  }

  /**
   * Σ of the NEGATIVE account balances per currency, as a positive number —
   * the world's outstanding overdraft.
   *
   * ⭐ Why this is worth its own aggregate: an account allowed to go negative
   * is a second mint the Governor does not control. Wages post with no
   * solvency check (a venue runs red by design), so an unfunded business can
   * pay staff money that was never issued — and because
   * {@link cachedTotalsByCurrency} NETS, the supply report cancels the two
   * halves and reads zero while that money sits in workers' pockets, ready
   * to spend. A live drive found a world with a reported supply of 0 and
   * 599 zorkmids circulating.
   *
   * Conservation still holds arithmetically; what breaks is the meaning of
   * "money supply". Reporting the overdraft separately keeps the audit
   * honest without changing what anybody is allowed to do.
   *
   * @internal reached through `BankingApi`'s supply + audit reads.
   */
  static cachedOverdraftByCurrency(): Map<string, number> {
    const owed = new Map<string, number>();
    for (const { balance, currency } of AccountBalance.#index.entries().values()) {
      if (balance >= 0 || !currency) continue;
      owed.set(currency, (owed.get(currency) ?? 0) - balance);
    }
    return owed;
  }

  /**
   * Keep the read index in step after a posting / rebuild.
   *
   * ⚠ An omitted `currency` keeps whatever the index already held, which
   * is what a balance-only post means. A first sighting with no currency
   * stores the empty string, and `cachedCurrency` reads that as *"new"*.
   *
   * @internal `BankingLogic` calls this as it posts.
   */
  static putCached(accountId: string, balance: number, currency?: string): void {
    const existing = AccountBalance.#index.get(accountId);
    AccountBalance.#index.put(accountId, {
      balance,
      currency: currency ?? existing?.currency ?? "",
    });
  }

  /**
   * Drop a closed account from the index (escrow close — row deleted).
   *
   * @internal `BankingLogic` calls this as it closes.
   */
  static removeCached(accountId: string): void {
    AccountBalance.#index.remove(accountId);
  }

  /** Test seam — drop the index so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("AccountBalance._resetForTesting");
    AccountBalance.#index.clear();
  }
}
