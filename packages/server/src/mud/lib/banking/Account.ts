/**
 * Account — the account-identity vocabulary for the banking ledger: the
 * durable account-id sentinels that are NOT real accounts, the central
 * bank's own account id, and the helpers that classify / mint an id.
 *
 * The *registry* (owner / bank / corpo / primary) and the *balance* are
 * folded onto the materialized {@link AccountBalance} row (the
 * `RenownStanding` precedent — one collection carries both the key and the
 * value); this module is only the id vocabulary the ledger keys on.
 *
 * A real account has an {@link AccountBalance} row; a **sentinel** is a
 * ledger counterparty with no balance row — the boundary where money enters
 * or leaves the *account domain*:
 *   - {@link Account.ISSUANCE} — the mint source / drain sink. The only
 *     counterparty whose presence changes total money supply.
 *   - {@link Account.CASH_BRIDGE} — the deposit source / withdraw sink. The
 *     boundary between the off-ledger coin domain and the on-ledger account
 *     domain; supply-neutral (a coin of equal value crosses the other way).
 *
 * {@link Account.CENTRAL_BANK} is a *real* account (it can hold and float
 * money), distinct from the issuance sentinel; "in circulation" excludes
 * its holdings.
 *
 * A static-method value-object (no instances): the home that keeps the
 * id vocabulary as one named concept rather than free-floating helpers.
 */

import { SecurityApi } from "../../api/security";

export class Account {
  /** The mint source / drain sink — the supply faucet counterparty. */
  public static readonly ISSUANCE = "issuance:central-bank";

  /** The cash↔balance bridge counterparty (deposit from / withdraw to). */
  public static readonly CASH_BRIDGE = "cash:bridge";

  /** The central bank's own (real) operating account id. */
  public static readonly CENTRAL_BANK = "central-bank";

  /**
   * The central bank as a **custodian institution** (an
   * `AccountBalance.bank` value). Only an organ of the polity banks at
   * the CB — the sole current occupant is the `treasury` (the
   * legislature's fisc); everything else is private and banks at a
   * commercial bank (the every-account-names-a-real-custodian rule).
   * (Same string as {@link Account.CENTRAL_BANK}, deliberately — one is
   * an accountId, the other an institution key; different columns read
   * them.)
   */
  public static readonly CENTRAL_BANK_INSTITUTION = "central-bank";

  /** The escrow-account id-prefix (the contract system's agent accounts). */
  private static readonly ESCROW_PREFIX = "escrow:contract:";

  /**
   * The per-contract escrow account id — deterministic, so the ledger legs
   * and the contract events key on the same identity. A REAL account (it
   * holds a balance row while the stake is in flight — `reconcile` counts
   * it), owned by `contract:<contractId>`, custodied at the default
   * commercial bank, and deleted at contract close ({@link BankingLogic}
   * `escrowClose`).
   */
  public static escrowAccountFor(contractId: string): string {
    return `${Account.ESCROW_PREFIX}${contractId}`;
  }

  /** True iff `accountId` is a per-contract escrow account (audit hook). */
  public static isEscrowAccount(accountId: string): boolean {
    return accountId.startsWith(Account.ESCROW_PREFIX);
  }

  /** The non-account ledger counterparties (no {@link AccountBalance} row). */
  private static readonly SENTINELS: ReadonlySet<string> = new Set([
    Account.ISSUANCE,
    Account.CASH_BRIDGE,
  ]);

  /** True iff `accountId` is a sentinel counterparty (no balance row). */
  public static isSentinel(accountId: string): boolean {
    return Account.SENTINELS.has(accountId);
  }

  /**
   * Mint a fresh, opaque, durable account id — a nanoid via the one id seam
   * ({@link SecurityApi.uuid}). The id keys the ledger; the friendly identity
   * (owner / bank) lives on the {@link AccountBalance} registry row — the
   * "durable id underneath, friendly identity on top" pattern (`templatePath`
   * / `ContactsMixin`).
   */
  public static newId(): string {
    return SecurityApi.uuid();
  }
}
