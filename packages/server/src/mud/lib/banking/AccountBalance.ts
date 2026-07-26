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
import { Collections } from "../../../backend/PersistenceManager";
import { SecurityApi } from "../../api/security";

export default class AccountBalance extends Document {
  static collectionName = Collections.BankAccounts;
  static persistentFields = [
    "accountId",
    "owner",
    "bank",
    "bankPath",
    "corpoKey",
    "isPrimary",
    "isActive",
    "balance",
  ];

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

  /** Load all balances into the read cache. Called at boot + after rebuild. */
  static async warm(): Promise<void> {
    const rows = await AccountBalance.find<AccountBalance>({});
    const next = new Map<string, number>();
    for (const r of rows) next.set(r.accountId, r.balance);
    AccountBalance._cache = next;
  }

  /** The warmed read cache (empty until first warm → 0 reads). */
  static cached(): Map<string, number> {
    return AccountBalance._cache;
  }

  /** Sync balance read off the warmed cache; 0 for an unknown account. */
  static cachedBalance(accountId: string): number {
    return AccountBalance._cache.get(accountId) ?? 0;
  }

  /** Keep the read cache in step after a posting / rebuild. */
  static putCached(accountId: string, balance: number): void {
    AccountBalance._cache.set(accountId, balance);
  }

  /** Drop a closed account from the cache (escrow close — row deleted). */
  static removeCached(accountId: string): void {
    AccountBalance._cache.delete(accountId);
  }

  /** Test seam — drop the cache so each test warms a fresh instance. */
  static _resetForTesting(): void {
    SecurityApi.assertTestOnly("AccountBalance._resetForTesting");
    AccountBalance._cache = new Map();
  }
}
