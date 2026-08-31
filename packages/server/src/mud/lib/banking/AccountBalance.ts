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
   * The warmed read cache: `accountId → balance`. Always a Map (starts
   * empty) so a cold read returns 0, never throws. `warm()` replaces it;
   * `BankingLogic` keeps it in step as it posts.
   */
  private static _cache = new Map<string, number>();

  /**
   * The currency sibling of {@link _cache}: `accountId → currency`. A second
   * map rather than a reshaped one, deliberately — every existing sync
   * balance read site survives verbatim, where a `{balance, currency}` value
   * shape would have rewritten all of them.
   */
  private static _currencyCache = new Map<string, string>();

  /**
   * Load all balances into the read cache. Called at boot + after rebuild.
   *
   * ⚠ **Throws on a currency-less row.** Booting on an unmigrated database
   * would run the world on money whose denomination nobody knows; failing
   * fast and harmlessly is the designed guard. The deploy order is
   * stop → migrate → deploy → start.
   */
  static async warm(): Promise<void> {
    const rows = await AccountBalance.find<AccountBalance>({});
    const next = new Map<string, number>();
    const nextCurrency = new Map<string, string>();
    for (const r of rows) {
      if (!r.currency) {
        throw new Error(
          `AccountBalance.warm: account '${r.accountId}' has no currency — ` +
            `this database predates the currency build and must be migrated ` +
            `first (packages/server/scripts/migrate-currency.ts --apply)`
        );
      }
      next.set(r.accountId, r.balance);
      nextCurrency.set(r.accountId, r.currency);
    }
    AccountBalance._cache = next;
    AccountBalance._currencyCache = nextCurrency;
  }

  /** The warmed read cache (empty until first warm → 0 reads). */
  static cached(): Map<string, number> {
    return AccountBalance._cache;
  }

  /** Sync balance read off the warmed cache; 0 for an unknown account. */
  static cachedBalance(accountId: string): number {
    return AccountBalance._cache.get(accountId) ?? 0;
  }

  /**
   * Sync currency read off the warmed cache. Empty string for an account the
   * cache has never seen — which callers must read as *"new, adopt the leg's
   * currency"*, never as a mismatch.
   */
  static cachedCurrency(accountId: string): string {
    return AccountBalance._currencyCache.get(accountId) ?? "";
  }

  /** Σ balances per currency, off the warmed caches (sync). */
  static cachedTotalsByCurrency(): Map<string, number> {
    const totals = new Map<string, number>();
    for (const [id, balance] of AccountBalance._cache) {
      const currency = AccountBalance._currencyCache.get(id) ?? "";
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
   */
  static cachedOverdraftByCurrency(): Map<string, number> {
    const owed = new Map<string, number>();
    for (const [id, balance] of AccountBalance._cache) {
      if (balance >= 0) continue;
      const currency = AccountBalance._currencyCache.get(id) ?? "";
      if (!currency) continue;
      owed.set(currency, (owed.get(currency) ?? 0) - balance);
    }
    return owed;
  }

  /** Keep the read cache in step after a posting / rebuild. */
  static putCached(accountId: string, balance: number, currency?: string): void {
    AccountBalance._cache.set(accountId, balance);
    if (currency) AccountBalance._currencyCache.set(accountId, currency);
  }

  /** Drop a closed account from the cache (escrow close — row deleted). */
  static removeCached(accountId: string): void {
    AccountBalance._cache.delete(accountId);
    AccountBalance._currencyCache.delete(accountId);
  }

  /** Test seam — drop the cache so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("AccountBalance._resetForTesting");
    AccountBalance._cache = new Map();
    AccountBalance._currencyCache = new Map();
  }
}
