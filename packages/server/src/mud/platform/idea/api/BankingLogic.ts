// BankingLogic — the hot-reloadable logic singleton behind BankingApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import LedgerEntry from "../../../lib/banking/LedgerEntry";
import { PersistedRecord } from "../../../lib/persistence/PersistedRecord";
import type {
  LedgerKind,
  PnlCategory,
  ProfitAndLoss,
  ReconcileResult,
  FullReconcileResult,
  EscrowHoldResult,
} from "../../../lib/banking/LedgerEntry";
import AccountBalance from "../../../lib/banking/AccountBalance";
import SupplyAggregate from "../../../lib/banking/SupplyAggregate";
import { Account } from "../../../lib/banking/Account";
import { Money } from "../../../lib/banking/Money";
import { Coinage } from "../../../lib/banking/Coinage";
import type { CoinLine, CoinSupply } from "../../../lib/banking/Coinage";
import { BankTransaction } from "../../../lib/banking/Transaction";
import type { LedgerLeg } from "../../../lib/banking/Transaction";
import type { Bank } from "../../../lib/banking/Bank";
import type { PaymentCredential } from "../../../lib/credential/Credential";
import type { CredentialWallet } from "../../../lib/credential/CredentialWallet";
import PaymentCard from "../../thing/PaymentCard";
import type {
  Charge,
  SettlementMethod,
  SettlementReceipt,
} from "../../../lib/banking/Charge";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistApi } from "../../../api/persist";
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from "../../../api/execution-context";
import { ContainmentApi } from "../../../api/containment";
import { GlobbableApi } from "../../../api/glob";
import { MixinApi } from "../../../api/mixin";
import { MqlApi } from "../../../api/mql";
import { StuffApi } from "../../../api/stuff";
import { TemplatePaths } from "../../../lib/paths";
import { Property } from "../../../lib/stuff/Propertied";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { CommandGiver } from "../../../lib/command/CommandGiver";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import type { Globbable } from "../../../lib/stuff/Globbable";
import { Currency } from "../../../lib/banking/Currency";

const BankingApiCallers = SecurityPolicies.FromModule("/api/banking#BankingApi",
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** Monotonic per-process counter making each transaction id unique. */
let txSeq = 0;

/* ───────────── sandbox: the scoped balance overlay ─────────────
 *
 * Conservation is scope-aware (sandbox build): a circle session's money
 * legs write STAMPED `bank_ledger` rows (the PM policy seam), but the
 * rebuildable caches (`bank_accounts` / `bank_supply`) are SHADOW(skip)
 * — never touched from circle context. In-circle balances instead live
 * in this per-scope in-memory overlay, replayed leg-by-leg by
 * `postTransaction` — "derive from events" with session lifetime. The
 * overlay is cleared at circle reap (`discardScopeOverlay`); a restart
 * clears it trivially (sessions are runtime state; the sweeper discards
 * the stamped rows). Field context never reads or writes it.
 */
const scopedBalanceOverlay: Map<string, Map<string, number>> = new Map();

/** The current circle scope, with omni collapsed to null. */
function currentCircleScope(): string | null {
  const scope = ExecutionContextApi.getCircleScope();
  return scope === OMNI_SCOPE ? null : scope;
}

function bumpScopedBalance(
  scope: string,
  accountId: string,
  delta: number,
): void {
  let perScope = scopedBalanceOverlay.get(scope);
  if (!perScope) {
    perScope = new Map();
    scopedBalanceOverlay.set(scope, perScope);
  }
  perScope.set(accountId, (perScope.get(accountId) ?? 0) + delta);
}

/**
 * The balance read every internal precondition uses: the warmed field
 * cache, plus — under circle scope only — the session's overlay delta.
 * Field reads never see circle money; circle reads see field balance ∪
 * their own session's plays.
 */
function balanceMinor(accountId: string): number {
  const base = AccountBalance.cachedBalance(accountId);
  const scope = currentCircleScope();
  if (scope === null) return base;
  return base + (scopedBalanceOverlay.get(scope)?.get(accountId) ?? 0);
}

/** The Coin template — the one cash object; cloned per cash issuance. */
const COIN_PATH = "/stuff/thing/Coin";

/**
 * Derive the acting principal's durable `templatePath` from the dispatched
 * execution context — NEVER a caller-supplied value (the gated-Api rule;
 * memory: *gated-api-actor-from-context*). Falls back to `'system'` for an
 * unattributable context (a boot-time / scheduled / forced frame) so a
 * ledger row always names *someone*.
 */
function actingActorKey(): string {
  const principal = actingPrincipal() as {
    getTemplatePath?(): string | null;
  } | null;
  return principal?.getTemplatePath?.() ?? "system";
}

/**
 * The acting principal as a Stuff (for moving coin to/from it), or null.
 *
 * The PAYER is the command frame's giver whenever the command chain has
 * one consistent giver — forced or not. A forced command still runs AS
 * its giver (a brain's hand at the counter, Dave hiring through a
 * dialogue dispatch), and the money authority it spends is the wallet
 * that giver carries, which is the whole wallet rule. Authorship
 * attribution (`getActingAuthor`) keeps failing closed on a forced
 * chain — provenance is a different question from who is paying. A
 * cross-actor cascade (A's command triggering B's) has no single giver
 * and pays as nobody, exactly as before. Outside any command frame the
 * tagged author (a REST boundary's Avatar) is the principal.
 */
function actingPrincipal(): Stuff | null {
  const commands = ExecutionContextApi.getCommandStack();
  if (commands.length > 0) {
    const givers = new Set(commands.map((c) => c.context.commandGiver));
    if (givers.size !== 1) return null;
    return (commands[0]!.context.commandGiver as unknown as Stuff) ?? null;
  }
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/** Coin-shaped duck type — avoids importing the Coin class here. */
interface CashLike {
  getCurrency(): string;
  /** Face value in minor units — the denomination's identity. */
  getDenomination(): number;
  getQuantity(): number;
}

function isCashLike(stuff: unknown): stuff is Stuff & Globbable & CashLike {
  const s = stuff as Partial<CashLike>;
  return (
    typeof s?.getCurrency === "function" &&
    typeof s?.getDenomination === "function" &&
    typeof s?.getQuantity === "function"
  );
}

/** The face value (minor units) of a coin stack. */
function stackValue(stack: CashLike): number {
  return (
    Currency.faceValueOf(stack.getCurrency(), stack.getDenomination()) *
    stack.getQuantity()
  );
}

/** Find every account owned by `ownerKey`. */
async function accountsOfImpl(ownerKey: string): Promise<AccountBalance[]> {
  if (!active()) return [];
  return AccountBalance.find<AccountBalance>({ owner: ownerKey });
}

/** The `ownerKey`'s account at the `bank` institution, or null. */
async function accountAtImpl(
  ownerKey: string,
  bank: string,
): Promise<AccountBalance | null> {
  if (!active()) return null;
  const [row] = await AccountBalance.find<AccountBalance>({
    owner: ownerKey,
    bank,
  });
  return row ?? null;
}

/** Resolve an account row by its durable id, or null. */
async function accountByIdImpl(
  accountId: string,
): Promise<AccountBalance | null> {
  if (!active()) return null;
  const [row] = await AccountBalance.find<AccountBalance>({ accountId });
  return row ?? null;
}

/**
 * Open the acting owner's account at a branch — idempotent (returns the
 * existing account id if one is already open here). The first account an
 * owner opens is their primary (the receive-by-identity default). Records
 * the bank's corpo affiliation on the row (readable via the corpo
 * substrate). The actor is the context-derived author, never a parameter.
 */
async function openAccountImpl(
  bank: string,
  corpoKey: string,
  currency: string,
): Promise<string> {
  if (!active()) {
    throw new Error("BankingLogic.openAccount: no persistence connection");
  }
  const owner = actingActorKey();
  const owned = await accountsOfImpl(owner);
  // An account is single-currency, so `(bank, currency)` is the identity: a
  // holder with zorkmid and scrip accounts at one bank has two rows.
  const already = owned.find(
    (a) => a.bank === bank && a.currency === currency,
  );
  if (already) {
    // Re-open by an existing holder: the wallet credential is
    // session-durable, so a returning player's implant carries an
    // unlinked payment record — `bank open` doubles as the re-link.
    autoLinkToWallet(actingPrincipal(), already.accountId);
    return already.accountId;
  }

  const row = new AccountBalance();
  row.accountId = Account.newId();
  row.owner = owner;
  row.bank = bank;
  row.corpoKey = corpoKey;
  row.isPrimary = owned.length === 0;
  row.isActive = true;
  row.balance = 0;
  row.currency = currency;
  await row.save();
  AccountBalance.putCached(row.accountId, 0, currency);
  // Auto-register the new account onto the owner's implant wallet (the
  // implant links all the owner's accounts; first opened becomes active).
  autoLinkToWallet(actingPrincipal(), row.accountId);
  // Lazily capitalize the branch on its first customer: seed the opening vault
  // float (idempotent, best-effort). The counter is guaranteed live here (the
  // customer is standing at it), which a boot-time seed can't guarantee. A
  // no-op in tests (the float AppSetting is unwarmed → 0).
  const floatMinor = openingFloatMinor();
  const branch = findBranchOf(bank);
  if (floatMinor > 0 && branch) {
    await seedFloatImpl(branch, Money.of(floatMinor, Currency.compact())).catch(() => {
      /* best-effort — a float failure never blocks opening an account */
    });
  }
  return row.accountId;
}

/**
 * The default custodian bank (an institution key) — read from the
 * `banking.defaultCustodianBank` AppSetting **only** (the yaml is the
 * single source of the value; no code default, per the AppSettings
 * doctrine). Empty when unwarmed/unseeded — every custodian consumer
 * then refuses rather than inventing a bank; the shared banking test
 * harness supplies the real seeded value.
 */
function defaultCustodianBankImpl(): string {
  try {
    return AppApi.setting(AppSettingKeys.bankingDefaultCustodianBank) || "";
  } catch {
    return "";
  }
}

/**
 * The first live branch of `bank` (an institution key) — the MQL
 * system-mode enumeration (viewer-blind, the EmploymentLogic
 * allBusinesses precedent). Null when no branch of that bank is live.
 */
function findBranchOf(bank: string): (Stuff & Bank) | null {
  if (!bank) return null;
  const matches = MqlApi.resolveMany("world:[mixin.BankMixin]", {
    commandGiver: null,
    scope: "world",
  });
  return (
    matches.stuff.find(
      (s): s is Stuff & Bank => MixinApi.isBank(s) && s.getBank() === bank,
    ) ?? null
  );
}

/**
 * The every-account-names-a-real-custodian rule: a `bank` (institution
 * key) is a valid custodian iff it is the central bank (state accounts
 * only), the default custodian bank, or an institution with a live
 * branch. Rejects `""` (an account held *nowhere*) and any string that
 * names no real institution — a non-bank "custodian" is no custodian: no
 * Terms, no cash ops, nobody accountable if the books are disputed.
 */
function isRealCustodian(bank: string): boolean {
  if (!bank) return false;
  if (bank === Account.CENTRAL_BANK_INSTITUTION) return true;
  if (bank === defaultCustodianBankImpl()) return true;
  return findBranchOf(bank) !== null;
}

/**
 * Ensure a **venue** account exists (owner = the venue's durable path, not
 * an acting principal — a resource identity), creating a primary one if
 * absent. The bar's P&L account: lazily created on first banking interaction
 * at the venue (order / pnl / payroll), so no boot seeder is needed.
 * `bank` (an institution key) must name a real custodian
 * ({@link isRealCustodian}) — an account is never held nowhere.
 */
async function ensureVenueAccountImpl(
  ownerPath: string,
  bank: string,
  corpoKey: string,
  currency: string,
  openingCapital?: number,
): Promise<string> {
  if (!active()) {
    throw new Error("BankingLogic.ensureVenueAccount: no persistence");
  }
  if (!isRealCustodian(bank)) {
    throw new Error(
      `BankingLogic.ensureVenueAccount: '${bank}' is not a real ` +
        `custodian (the CB, the default custodian bank, or an institution ` +
        `with a live branch)`,
    );
  }
  const owned = await accountsOfImpl(ownerPath);
  const existing = owned.find((a) => a.bank === bank) ?? owned[0];
  if (existing) return existing.accountId;
  const row = new AccountBalance();
  row.accountId = Account.newId();
  row.owner = ownerPath;
  row.bank = bank;
  row.corpoKey = corpoKey;
  row.isPrimary = true;
  row.isActive = true;
  row.balance = 0;
  row.currency = currency;
  await row.save();
  AccountBalance.putCached(row.accountId, 0, currency);
  // ⭐ Capitalize on FIRST materialization — the `openingFloat` pattern one
  // tier down, and idempotent for the same reason: the `existing` guard
  // above means this line is reached exactly once per (owner, bank).
  //
  // `undefined` takes the configured default; an explicit `0` declines it,
  // which is how a WORKER's payer-derived account opens (a worker earns
  // wages, they are not capitalized). Best-effort: a capital failure must
  // never block opening the account — an uncapitalized venue is a venue
  // that cannot buy, not a venue that cannot exist.
  const capital = openingCapital ?? openingCapitalMinor();
  if (capital > 0) {
    await postTransaction("mint", [
      {
        currency,
        from: Account.ISSUANCE,
        to: row.accountId,
        amount: capital,
        memo: "opening capital",
        category: "subsidy",
      },
    ]).catch(() => {
      /* best-effort — see above */
    });
  }
  return row.accountId;
}

/**
 * The cash-like contents of a container, grouped per stack. Filtered to one
 * currency: a payer holding two currencies pays in the one the charge names,
 * and a till makes change only out of its own money.
 */
function cashSupply(holder: Stuff & Container, currency: string): CoinSupply[] {
  const supply: CoinSupply[] = [];
  for (const item of holder.getContents()) {
    if (isCashLike(item) && item.getCurrency() === currency) {
      supply.push({
        currency,
        denomination: item.getDenomination(),
        quantity: item.getQuantity(),
      });
    }
  }
  return supply;
}

/**
 * Take exactly the planned coins out of `from`, calling `dispose` on each
 * removed stack/piece. Splits a stack when it holds more than the plan needs.
 * Returns false only if the container didn't actually hold the planned coins
 * (a concurrent-mutation guard; the plan is pre-validated against the supply).
 */
async function takeCoins(
  from: Stuff & Container,
  plan: readonly CoinLine[],
  dispose: (piece: Stuff & Containable) => void,
): Promise<boolean> {
  for (const line of plan) {
    let need = line.count;
    for (const item of [...from.getContents()]) {
      if (need <= 0) break;
      if (!isCashLike(item) || item.getDenomination() !== line.denomination) {
        continue;
      }
      const have = item.getQuantity();
      if (have <= need) {
        dispose(item as unknown as Stuff & Containable);
        need -= have;
      } else {
        const piece = await GlobbableApi.split(item, need);
        dispose(piece as unknown as Stuff & Containable);
        need = 0;
      }
    }
    if (need > 0) return false;
  }
  return true;
}

/**
 * Move coins summing to exactly `value` (minor units) from `from` to `to`,
 * making change largest-first and splitting a stack when it holds more than
 * needed. Used for withdrawal (vault → owner) and cash settlement (payer →
 * payee). Returns false when the source cannot make the value exactly from
 * its denominations (the till-can't-make-change / exact-cash-or-card signal).
 */
async function moveCoins(
  from: Stuff & Container,
  to: Stuff & Container,
  value: number,
  currency: string,
): Promise<boolean> {
  const plan = Coinage.planSpend(currency, cashSupply(from, currency), value);
  if (!plan) return false;
  return takeCoins(from, plan, (piece) => ContainmentApi.move(piece, to));
}

/** Total cash-like value on hand in a container (Σ face-value × quantity). */
function cashOnHand(holder: Stuff & Container): number {
  let total = 0;
  for (const item of holder.getContents()) {
    if (isCashLike(item)) total += stackValue(item);
  }
  return total;
}

/**
 * Remove exactly `value` (minor units) of cash from `holder`, destroying the
 * coin (it leaves circulation). Returns whether the full value was drained
 * (false when the held denominations can't make it exactly). Used by the
 * on-ledger cash bridge (a cash payment with no physical till): coin is
 * consumed, equal value credited on-ledger — supply-neutral.
 */
async function drainCoins(
  holder: Stuff & Container,
  value: number,
  currency: string,
): Promise<boolean> {
  const plan = Coinage.planSpend(
    currency,
    cashSupply(holder, currency),
    value,
  );
  if (!plan) return false;
  return takeCoins(holder, plan, (piece) =>
    StuffApi.destruct(piece as unknown as Stuff),
  );
}

/* ─────────────────────── Terms · fees · royalty ─────────────────────── */

/** Game seconds in one calendar day (the quota window; DefaultCalendar). */
const GAME_SECONDS_PER_DAY = 86_400;

/** The corpo royalty rate (fraction of each fee → the corpo treasury). */
function royaltyRate(): number {
  try {
    const raw = Number(AppApi.setting(AppSettingKeys.bankingCorpoRoyaltyRate));
    return Number.isFinite(raw) && raw > 0 ? Math.min(1, raw) : 0;
  } catch {
    return 0;
  }
}

/**
 * The branch's operating account — where fee income lands and wages pay from
 * (one P&L). Resolved via the Business operating at the branch (the bar's
 * `getAccountPath()` precedent) so the bank's income + wages share an account;
 * a bare bank falls back to a branch-keyed venue account. EmploymentApi is
 * dynamically imported to dodge the banking↔employment module cycle (the
 * DiagnosticApi precedent).
 */
async function resolveBranchAccountImpl(
  bank: Stuff & Bank,
  currency: string,
): Promise<string> {
  const bankPath = bank.getBankPath();
  const corpoKey = bank.getCorpoKey();
  let ownerPath = bankPath;
  const institution = bank.getBank();
  try {
    const { EmploymentApi } = await import("../../../api/employment");
    // `ensureOperatorAt` stands the branch Business up lazily (off its
    // operatingLocations) so fee income + wages + the opening float all share
    // the one account keyed on the Business path.
    const business = await EmploymentApi.ensureOperatorAt(bankPath);
    if (business) ownerPath = business.getAccountPath();
  } catch {
    // No employment engine available (unit tests / pre-boot) → branch-keyed.
  }
  return ensureVenueAccountImpl(
    ownerPath,
    institution,
    corpoKey,
    currency,
  );
}

/**
 * The corpo's own treasury — a well-known account keyed on `corpoKey`, held at
 * `bank` (the corpo's own bank; intra-bank, 1:1 clean). The mirror of
 * {@link ensureVenueAccountImpl}; created lazily so the corpo has income from
 * the first fee. The corpo `Idea` stays pure data — this is an account it owns.
 */
async function ensureCorpoTreasuryImpl(
  corpoKey: string,
  bank: string,
  currency: string,
): Promise<string> {
  return ensureVenueAccountImpl(`corpo:${corpoKey}`, bank, corpoKey, currency);
}

/**
 * Seed a live branch's opening vault float: mint coin into the till AND credit
 * the branch's own operating account against it (founding capital, backed 1:1
 * → conservation holds). Best-effort + idempotent (a no-op if the branch isn't
 * live or already has a balance). Returns whether it seeded.
 */
async function seedFloatImpl(
  bank: Stuff & Bank,
  amount: Money,
): Promise<boolean> {
  if (amount.minor <= 0) return false;
  const branchAccount = await resolveBranchAccountImpl(bank, amount.currency);
  if (balanceMinor(branchAccount) > 0) return false;
  await issueCashImpl(bank as unknown as Stuff & Container, amount, "float");
  await postTransaction("deposit", [
    {
    currency: amount.currency,
      from: Account.CASH_BRIDGE,
      to: branchAccount,
      amount: amount.minor,
      category: "float",
    },
  ]);
  return true;
}

/** The configured opening float (minor units), 0 if unset/pre-warm. */
function openingFloatMinor(): number {
  try {
    const raw = Number(AppApi.setting(AppSettingKeys.bankingOpeningFloat));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  } catch {
    return 0;
  }
}

/** The configured default opening capital (minor units), 0 if unset/pre-warm. */
function openingCapitalMinor(): number {
  try {
    const raw = Number(AppApi.setting(AppSettingKeys.bankingOpeningCapital));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  } catch {
    return 0;
  }
}

/**
 * Charge a conserved fee: debit `customerAccountId` by `feeMinor`, splitting a
 * royalty off the top to the affiliated corpo's treasury (the rest to the
 * branch operating account). Both legs are pure real-account movement (a
 * `transfer`, category `fee`) → the branch P&L as income, the corpo treasury
 * accumulating from the first transaction, the customer's statement a line.
 * A zero fee (Goodkin's near-state) is a no-op; a self-fee (customer == branch)
 * is skipped. Caller must have ensured the customer holds the fee.
 */
async function chargeFeeImpl(
  bank: Stuff & Bank,
  customerAccountId: string,
  feeMinor: number,
  memo: string,
): Promise<void> {
  if (feeMinor <= 0) return;
  // The fee rides the customer's own money: a fee in currency X must reach a
  // branch account AND a corpo treasury in X, or the leg crosses and throws.
  const customerCurrency = AccountBalance.cachedCurrency(customerAccountId);
  const branchAccount = await resolveBranchAccountImpl(bank, customerCurrency);
  if (branchAccount === customerAccountId) return;
  const corpoKey = bank.getCorpoKey();
  const rate = royaltyRate();
  let royalty = 0;
  // NOTE: declared above the treasury resolve — a fee in currency X must
  // reach a branch account AND a corpo treasury in X, or the leg crosses
  // and postTransaction throws.
  let treasury: string | null = null;
  if (corpoKey && rate > 0) {
    royalty = Math.floor(feeMinor * rate);
    if (royalty > 0) {
      treasury = await ensureCorpoTreasuryImpl(
        corpoKey,
        bank.getBank(),
        customerCurrency,
      );
      // A treasury that resolves to the branch itself (or the customer) can't
      // take a distinct royalty leg — fold it back into the branch share.
      if (treasury === branchAccount || treasury === customerAccountId) {
        royalty = 0;
        treasury = null;
      }
    }
  }
  const legs: LedgerLeg[] = [];
  const toBranch = feeMinor - royalty;
  if (toBranch > 0) {
    legs.push({
    currency: customerCurrency,
      from: customerAccountId,
      to: branchAccount,
      amount: toBranch,
      category: "fee",
      memo,
    });
  }
  if (royalty > 0 && treasury) {
    legs.push({
    currency: customerCurrency,
      from: customerAccountId,
      to: treasury,
      amount: royalty,
      category: "fee",
      memo,
    });
  }
  if (legs.length > 0) await postTransaction("transfer", legs);
}

/**
 * Cash withdrawn from `accountId` **this game-day** — a derive-on-read sum
 * over the append-only ledger's `withdraw` legs since the day boundary (no
 * stored counter, no scheduler; Law-2 clean). The common-pool till guard reads
 * this against the per-account cap.
 */
async function withdrawnTodayImpl(accountId: string): Promise<number> {
  const dayStart =
    Math.floor(WorldClockApi.getNow().rawValue() / GAME_SECONDS_PER_DAY) *
    GAME_SECONDS_PER_DAY;
  const rows = await entriesForImpl(accountId);
  let total = 0;
  for (const r of rows) {
    if (r.kind === "withdraw" && r.fromAccount === accountId && r.at >= dayStart) {
      total += r.amount;
    }
  }
  return total;
}

/**
 * Circle membership is a corpo loyalty program — an attribute of the *member*
 * (the player), NOT of any one bank account. It lives as a plain saved boolean
 * prop on the member, keyed `<corpoKey>.circle` (e.g. `goodkin.circle`), via the
 * general `PropertiedMixin` every Creature carries. The write chokepoint
 * (`enrollCircle`) is the security boundary; the prop itself is ungated state,
 * consistent with how the codebase persists per-Avatar props.
 */
function circleProp(corpoKey: string): Property<boolean> {
  return Property.of<boolean>(`${corpoKey}.circle`);
}

/** Whether `member` belongs to `corpoKey`'s Circle (reads the saved prop). */
function isCircleMember(member: Stuff | null, corpoKey: string): boolean {
  if (!member || !MixinApi.isPropertied(member)) return false;
  return member.getProp(circleProp(corpoKey)) === true;
}

/**
 * The per-account daily cash-withdrawal cap. Circle members (of the account's
 * corpo) get the raised one — read off the withdrawing `member`, not the row.
 */
function withdrawalCapFor(account: AccountBalance, member: Stuff | null): number {
  const key = isCircleMember(member, account.corpoKey || "")
    ? AppSettingKeys.bankingWithdrawalDailyCapCircle
    : AppSettingKeys.bankingWithdrawalDailyCap;
  try {
    const raw = Number(AppApi.setting(key));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  } catch {
    return 0;
  }
}

/**
 * The wire fee (minor units) a transfer levies, read off the *source* bank's
 * Terms: intra-bank (same branch) is free; cross-*bank* same-corpo costs the
 * wire fee; cross-*corpo* costs the heavier cross-corpo fee.
 */
async function transferFeeFor(
  from: AccountBalance,
  to: AccountBalance | null,
): Promise<number> {
  if (!to || from.bank === to.bank) return 0;
  const sourceBank = findBranchOf(from.bank);
  if (!sourceBank) return 0;
  const terms = sourceBank.getTerms();
  const crossCorpo = (from.corpoKey || "") !== (to.corpoKey || "");
  return crossCorpo ? terms.getCrossCorpoFee() : terms.getWireFee();
}

/**
 * The actor's routing payment credential (implant-first via the MQL
 * `reachable` pool's on-person-first ordering — self-hosted wallet, then
 * carried cards). A **frozen** credential is skipped — a revoked card is
 * not a usable routing credential, so a reissued card is found in its
 * place even while the dead one is still carried.
 */
function reachableCredential(actor: Stuff): PaymentCredential | null {
  const holder =
    MqlApi.resolveMany("person", {
      // The settling actor is a Character (a CommandGiver); the static
      // type at this seam is only `Stuff`.
      commandGiver: actor as Stuff & CommandGiver,
      scope: "person",
    }).stuff.find((s): s is Stuff & CredentialWallet => {
      if (!MixinApi.isCredentialWallet(s)) return false;
      const pay = s.getCredential("payment");
      return !!pay && !pay.isFrozen();
    }) ?? null;
  return holder?.getCredential("payment") ?? null;
}

/** Link a freshly-opened account onto the owner's implant wallet (best-effort). */
function autoLinkToWallet(actor: Stuff | null, accountId: string): void {
  if (!actor) return;
  const cred = reachableCredential(actor);
  if (cred) cred.linkAccount(accountId);
}

/**
 * The uniform settlement primitive: one Charge, one method-as-parameter,
 * polymorphic underneath (cash = coin handover off the governed ledger;
 * credential = a ledger debit/credit routed through the owning corpo bank).
 * Returns a receipt the scene reads to name what was tapped.
 */
async function settleImpl(
  charge: Charge,
  method: SettlementMethod,
): Promise<SettlementReceipt> {
  const payer = actingPrincipal();
  if (!payer) throw new Error("BankingLogic.settle: no acting payer");

  if (method.kind === "cash") {
    if (!MixinApi.isContainer(payer)) {
      throw new Error("BankingLogic.settle: the payer can't hold coin");
    }
    // Off-ledger handover to a physical receiver (a till, a person's hand).
    if (charge.payeeContainer) {
      const ok = await moveCoins(
        payer as Stuff & Container,
        charge.payeeContainer,
        charge.amount.minor,
        charge.amount.currency,
      );
      if (!ok) throw new Error("BankingLogic.settle: not enough cash on hand");
      return { method: "cash" };
    }
    // No physical receiver: bank the coin instantly across the cash bridge
    // and settle on-ledger to `payeeAccountId` (+ any splits). Supply-neutral
    // — the coin is consumed, the equal value credited on-ledger. Used where
    // the payee has no local till (a global TPA operating-budget account), so
    // a cash fare's city+TPA split still holds (D12 cash bridge).
    if (!charge.payeeAccountId) {
      throw new Error("BankingLogic.settle: cash needs a payee");
    }
    const payerC = payer as Stuff & Container;
    if (cashOnHand(payerC) < charge.amount.minor) {
      throw new Error("BankingLogic.settle: not enough cash on hand");
    }
    const cashSplits = charge.splits ?? [];
    const cashSplitTotal = cashSplits.reduce((s, x) => s + x.amount.minor, 0);
    if (cashSplitTotal > charge.amount.minor) {
      throw new Error("BankingLogic.settle: splits exceed the charge");
    }
    // Exact-cash-or-card: consume coins summing to exactly the charge, or
    // refuse before any ledger leg posts (the caller falls back to the card).
    const drained = await drainCoins(
      payerC,
      charge.amount.minor,
      charge.amount.currency,
    );
    if (!drained) {
      throw new Error(
        "BankingLogic.settle: can't make the exact amount in cash",
      );
    }
    const bridgeLegs: LedgerLeg[] = [];
    const bridgeMain = charge.amount.minor - cashSplitTotal;
    if (bridgeMain > 0) {
      bridgeLegs.push({
      currency: charge.amount.currency,
        from: Account.CASH_BRIDGE,
        to: charge.payeeAccountId,
        amount: bridgeMain,
        category: charge.category ?? "sales",
        memo: charge.reason,
      });
    }
    for (const sp of cashSplits) {
      bridgeLegs.push({
      currency: charge.amount.currency,
        from: Account.CASH_BRIDGE,
        to: sp.accountId,
        amount: sp.amount.minor,
        category: sp.category ?? "other",
        memo: charge.reason,
      });
    }
    await postTransaction("deposit", bridgeLegs);
    return { method: "cash", accountId: charge.payeeAccountId };
  }

  // credential method
  const cred = reachableCredential(payer);
  if (!cred)
    throw new Error("BankingLogic.settle: you have no payment credential");
  let routingAccount: string | null;
  if (method.fromBank) {
    const acct = await accountAtImpl(actingActorKey(), method.fromBank);
    routingAccount = acct?.accountId ?? null;
    if (!routingAccount) {
      throw new Error("BankingLogic.settle: no account at the override bank");
    }
  } else {
    routingAccount = cred.getActiveAccount();
  }
  if (!routingAccount) {
    throw new Error(
      "BankingLogic.settle: the credential has no active account",
    );
  }
  if (!cred.authorize(charge.amount)) {
    throw new Error(
      "BankingLogic.settle: the credential declined (frozen or over its cap)",
    );
  }
  if (balanceMinor(routingAccount) < charge.amount.minor) {
    throw new Error("BankingLogic.settle: insufficient balance");
  }

  const splits = charge.splits ?? [];
  const splitTotal = splits.reduce((s, x) => s + x.amount.minor, 0);
  if (splitTotal > charge.amount.minor) {
    throw new Error("BankingLogic.settle: splits exceed the charge");
  }
  const legs: LedgerLeg[] = [];
  const mainAmount = charge.amount.minor - splitTotal;
  if (mainAmount > 0) {
    legs.push({
    currency: charge.amount.currency,
      from: routingAccount,
      to: charge.payeeAccountId,
      amount: mainAmount,
      category: charge.category ?? "sales",
      memo: charge.reason,
    });
  }
  for (const sp of splits) {
    legs.push({
    currency: charge.amount.currency,
      from: routingAccount,
      to: sp.accountId,
      amount: sp.amount.minor,
      category: sp.category ?? "other",
      memo: charge.reason,
    });
  }
  await postTransaction("payment", legs);
  const corpoKey = (await accountByIdImpl(routingAccount))?.corpoKey ?? "";
  return { method: "credential", accountId: routingAccount, corpoKey };
}

/**
 * Pay a wage from an employer account to a worker's primary account — the
 * P&L's labor line. A `wage`/`wages` posting; *who* is employed is authored
 * (out of scope). Throws if the worker has no account or the employer is
 * short.
 */
async function payWageImpl(
  employerAccountId: string,
  workerKey: string,
  amount: Money,
  category: PnlCategory = "wages",
  memo = "wage",
): Promise<void> {
  const owned = await accountsOfImpl(workerKey);
  const workerAccount = (owned.find((a) => a.isPrimary) ?? owned[0])?.accountId;
  if (!workerAccount) {
    throw new Error("BankingLogic.payWage: the worker has no account");
  }
  // No employer-solvency check: a venue runs its P&L red by design (the
  // deficit-as-target), with the CB subsidy covering it. The wage is owed
  // regardless; blocking it would defeat the deficit model. (A future
  // employment build can gate player employers on solvency.)
  await postTransaction("wage", [
    {
    currency: amount.currency,
      from: employerAccountId,
      to: workerAccount,
      amount: amount.minor,
      category,
      memo,
    },
  ]);
}

/* ─────────────────── escrow · draw · custodian restamp ─────────────────── */

/**
 * Hold `amount` for a contract: issuer account → the per-contract escrow
 * account (a REAL row — `reconcile` counts held funds throughout). Refuses
 * (a value, not a throw) on a short issuer balance: no credit, anywhere.
 * The escrow row is created with registry fields (owner =
 * `contract:<contractId>`, custodian = the default commercial bank) — never
 * `applyDelta`'s bare auto-create.
 */
async function escrowHoldImpl(
  fromAccountId: string,
  contractId: string,
  amount: Money,
): Promise<EscrowHoldResult> {
  if (!active()) {
    throw new Error("BankingLogic.escrowHold: no persistence connection");
  }
  if (amount.minor <= 0) {
    throw new Error("BankingLogic.escrowHold: amount must be positive");
  }
  if (balanceMinor(fromAccountId) < amount.minor) {
    return { ok: false, reason: "insufficient-funds" };
  }
  const escrowId = Account.escrowAccountFor(contractId);
  const existing = await accountByIdImpl(escrowId);
  if (!existing) {
    // Custody follows the issuer: the escrow account lives at the bank
    // custodying the FUNDING account — *your* bank holds *your* stake (and
    // is pre-positioned as a party for the future escrow-as-a-bank-product
    // seam on Terms). The default is the last resort for a legacy funding
    // row with no recorded custodian.
    const funding = await accountByIdImpl(fromAccountId);
    const custodian =
      funding?.bank && isRealCustodian(funding.bank)
        ? funding.bank
        : defaultCustodianBankImpl();
    if (!custodian) {
      throw new Error(
        "BankingLogic.escrowHold: no custodian resolvable for the escrow " +
          "account (the funding account names no bank and no default is " +
          "seeded)",
      );
    }
    const row = new AccountBalance();
    row.accountId = escrowId;
    row.owner = `contract:${contractId}`;
    row.bank = custodian;
    row.corpoKey = "";
    row.isPrimary = false;
    row.isActive = true;
    row.balance = 0;
    row.currency = amount.currency;
    await row.save();
    AccountBalance.putCached(escrowId, 0, amount.currency);
  }
  const txId = await postTransaction("escrow-hold", [
    {
    currency: amount.currency,
      from: fromAccountId,
      to: escrowId,
      amount: amount.minor,
      category: "escrow",
      memo: `escrow hold ${contractId}`,
    },
  ]);
  return { ok: true, txId };
}

/**
 * Move held funds out of a contract's escrow account (`escrow-release` →
 * the contractor / `escrow-revert` → the issuer). Throws when the escrow
 * balance is short — an over-release is a programmatic invariant breach
 * (the contract logic must never release more than it held), and the
 * per-contract account makes it throw instead of silently robbing another
 * contract's stake (why escrow is not pooled).
 */
async function escrowMoveImpl(
  kind: "escrow-release" | "escrow-revert",
  contractId: string,
  toAccountId: string,
  amount: Money,
): Promise<string> {
  const escrowId = Account.escrowAccountFor(contractId);
  if (active() && balanceMinor(escrowId) < amount.minor) {
    throw new Error(
      `BankingLogic.${kind}: escrow for ${contractId} holds less than ` +
        `${amount.render()} (over-release)`,
    );
  }
  return postTransaction(kind, [
    {
    currency: amount.currency,
      from: escrowId,
      to: toAccountId,
      amount: amount.minor,
      category: "escrow",
      memo: `${kind} ${contractId}`,
    },
  ]);
}

/**
 * Close a contract's escrow account: assert the balance is zero (every
 * terminal transition released or reverted the full stake first), then
 * delete the `bank_accounts` row + warm-cache entry. The append-only ledger
 * legs remain the permanent record — the row is a rebuildable cache, and
 * live escrow rows scale with *open* contracts only. Idempotent (a missing
 * row is a no-op).
 */
async function escrowCloseImpl(contractId: string): Promise<void> {
  if (!active()) return;
  const escrowId = Account.escrowAccountFor(contractId);
  const row = await accountByIdImpl(escrowId);
  if (!row) return;
  if (row.balance !== 0) {
    throw new Error(
      `BankingLogic.escrowClose: escrow for ${contractId} still holds ` +
        `${row.balance} minor units`,
    );
  }
  await row.delete();
  AccountBalance.removeCached(escrowId);
}

/**
 * Pay the proprietor's **draw** — business account → the proprietor's
 * primary, kind `draw` (take-home is not a wage; the leg kind is the tax
 * wedge's future hook). Unlike `payWage` (red-by-design — the deficit
 * model), the draw is **solvency-checked**: a proprietor pocketing from an
 * insolvent business is exactly what the distinct kind exists to expose.
 */
async function payDrawImpl(
  businessAccountId: string,
  proprietorKey: string,
  amount: Money,
): Promise<void> {
  if (amount.minor <= 0) {
    throw new Error("BankingLogic.payDraw: amount must be positive");
  }
  if (
    active() &&
    balanceMinor(businessAccountId) < amount.minor
  ) {
    throw new Error(
      `BankingLogic.payDraw: the business holds less than ${amount.render()}`,
    );
  }
  const owned = await accountsOfImpl(proprietorKey);
  const drawAccount = (owned.find((a) => a.isPrimary) ?? owned[0])?.accountId;
  if (!drawAccount) {
    throw new Error("BankingLogic.payDraw: the proprietor has no account");
  }
  await postTransaction("draw", [
    {
    currency: amount.currency,
      from: businessAccountId,
      to: drawAccount,
      amount: amount.minor,
      category: "draw",
      memo: "proprietor draw",
    },
  ]);
}

/**
 * The idempotent boot restamp (the custodian rule, applied to legacy
 * rows): a cache-field fill, never a money movement — balances and
 * conservation are untouched. Migrates pre-institution rows (`bankPath`
 * branch paths → `bank` institution keys), moves the `treasury` (the
 * legislature's fisc, the sole state account) to the CB, re-owns the
 * legacy raw `tpa` accumulator to the TPA Business, and sends anything
 * still custodied nowhere to the default custodian — the last resort
 * where no relationship is derivable.
 */
async function restampCustodiansImpl(): Promise<void> {
  if (!active()) return;
  const treasuryId = demoTaxConfig().treasury;
  const custodian = defaultCustodianBankImpl();
  // The Teleport Authority Business path (for the legacy `tpa` row
  // migration) — a string read, no content import.
  let tpaBusinessPath = "";
  try {
    tpaBusinessPath =
      AppApi.setting(AppSettingKeys.fasttravelTpaBusinessPath) || "";
  } catch {
    /* unwarmed — the row falls through to the generic rules */
  }
  for (const row of await AccountBalance.find<AccountBalance>({})) {
    if (Account.isEscrowAccount(row.accountId)) continue;
    let dirty = false;
    // Legacy migration (pre-institution-keying): a row that recorded the
    // branch counter's templatePath in `bankPath` maps to the institution
    // — the CB path → the CB; a live branch at that path → its bank key;
    // else the default (v1 has one commercial bank, so every legacy
    // commercial row is its). A cache-field fill, never a money movement.
    if (!row.bank && row.bankPath) {
      if (row.bankPath === "/platform/idea/CentralBank") {
        row.bank = Account.CENTRAL_BANK_INSTITUTION;
      } else {
        const branch = StuffApi.findByTemplatePath<Stuff & Bank>(row.bankPath);
        row.bank =
          branch && MixinApi.isBank(branch) ? branch.getBank() : custodian;
      }
      row.bankPath = "";
      dirty = true;
    }
    // The treasury (the legislature's fisc, the sole state account) banks
    // at the CB.
    if (row.accountId === treasuryId) {
      if (row.bank !== Account.CENTRAL_BANK_INSTITUTION) {
        row.bank = Account.CENTRAL_BANK_INSTITUTION;
        dirty = true;
      }
      if (dirty) await row.save();
      continue;
    }
    // The legacy raw `tpa` accumulator (pre-TPA-Business): re-own it to
    // the Teleport Authority Business so its account resolution finds the
    // accumulated network fees instead of minting a fresh row.
    if (row.accountId === "tpa" && !row.owner && tpaBusinessPath) {
      row.owner = tpaBusinessPath;
      row.bank = custodian;
      row.isPrimary = true;
      await row.save();
      continue;
    }
    // Anything still custodied nowhere goes to the default — the last
    // resort where no relationship is derivable. An unseeded default
    // (no `banking.defaultCustodianBank`) leaves the row for a later
    // boot rather than inventing a bank.
    if (!row.bank && custodian) {
      row.bank = custodian;
      dirty = true;
    }
    if (dirty) await row.save();
  }
}

/** The authored/inert demo tax rate + treasury account, or rate 0 if absent. */
function demoTaxConfig(): { rate: number; treasury: string } {
  try {
    const r = AppApi.setting(AppSettingKeys.bankingSalesTaxRate);
    const rate = r ? Number(r) : 0;
    const treasury =
      AppApi.setting(AppSettingKeys.bankingTreasuryAccount) || "treasury";
    return { rate: Number.isFinite(rate) && rate > 0 ? rate : 0, treasury };
  } catch {
    return { rate: 0, treasury: "treasury" }; // AppSettings not warmed
  }
}

/**
 * Remit the demo sales tax on a sale of `saleAmount` from the seller's
 * account to the placeholder treasury — a `tax`/`tax` posting at the
 * authored, inert rate. The seller-collected model: the tax shows in the
 * seller's P&L (a `tax` line) and the treasury merely accumulates (no
 * appropriation path). Returns the tax remitted (zero when the rate is
 * absent). No solvency check — the venue may run red (the CB subsidizes).
 */
async function remitDemoTaxImpl(
  sellerAccountId: string,
  saleAmount: Money,
): Promise<Money> {
  const { rate, treasury } = demoTaxConfig();
  if (rate <= 0) return Money.zero(Currency.compact());
  const tax = Math.floor(saleAmount.minor * rate);
  if (tax <= 0) return Money.zero(Currency.compact());
  await postTransaction("tax", [
    {
    currency: saleAmount.currency,
      from: sellerAccountId,
      to: treasury,
      amount: tax,
      category: "tax",
      memo: "sales tax",
    },
  ]);
  return Money.of(tax, Currency.compact());
}

/**
 * Mint physical cash into the world — the central-bank cash faucet (the only
 * way coins come into existence beyond a withdrawal). Supply grows by
 * `amount` (mint issuance → cash bridge, no account touched), and a Coin
 * stack of that value appears in `into`. The genesis of circulating cash.
 */
async function issueCashImpl(
  into: Stuff & Container,
  amount: Money,
  category: PnlCategory = "float",
): Promise<Stuff> {
  if (amount.minor <= 0) {
    throw new Error("BankingLogic.issueCash: amount must be positive");
  }
  await postTransaction("mint", [
    {
    currency: amount.currency,
      from: Account.ISSUANCE,
      to: Account.CASH_BRIDGE,
      amount: amount.minor,
      memo: "cash issuance",
      category,
    },
  ]);
  // Dispense largest-first: a real cash faucet hands out efficient coins
  // (25s, then 5s, then 1s), not a heap of ones. Each denomination is its own
  // stack (they never merge — glob identity is `(currency, denomination)`).
  const lines = Coinage.dispense(amount.currency, amount.minor);
  let representative: Stuff | null = null;
  for (const line of lines) {
    const coin = await StuffApi.clone(COIN_PATH);
    const stamped = coin as unknown as {
      currency: string;
      denomination: number;
    };
    stamped.currency = line.currency;
    stamped.denomination = line.denomination;
    (coin as unknown as Globbable).setQuantity(line.count);
    ContainmentApi.move(coin as unknown as Stuff & Containable, into);
    if (!representative) representative = coin;
  }
  // `dispense` yields ≥1 line for a positive amount; the largest is returned
  // as a convenience handle (all stacks are already placed in `into`).
  return representative as Stuff;
}

/** Σ face value of live coin of `currency`, split vault vs circulating. */
function liveCoinOf(currency: string): {
  circulating: number;
  vault: number;
} {
  let circulating = 0;
  let vault = 0;
  for (const coin of StuffApi.findAllByTemplatePath(COIN_PATH)) {
    if (!isCashLike(coin)) continue;
    if (coin.getCurrency() !== currency) continue;
    const container = (
      coin as unknown as { getContainer?(): Stuff | null }
    ).getContainer?.();
    if (container && MixinApi.isBank(container)) vault += stackValue(coin);
    else circulating += stackValue(coin);
  }
  return { circulating, vault };
}

/**
 * Σ face value of coin captured inside `holder_snapshots` for `currency`.
 *
 * ⚠⚠ **This is the term the audit was missing.** `findAllByTemplatePath`
 * reads the in-memory index, so it sees live instances only — and a
 * logged-out player's cash lives in a snapshot blob, not in memory. An audit
 * blind to the largest reservoir of durable coin is theatre, so the complete
 * read pays a collection scan to see it.
 */
async function snapshotCoinOf(currency: string): Promise<number> {
  if (!active()) return 0;
  const records = await PersistedRecord.find<PersistedRecord>({});
  let total = 0;
  // ⚠⚠ A snapshot is a COPY of state that may ALSO be live. If the holder is
  // currently resident, its coins are already counted by `liveCoinOf`, and
  // counting the snapshot too would double them — found by driving, when the
  // audit reported a bottom-up exceeding supply. Only a holder that is NOT
  // materialized is represented solely by its record.
  const isResident = (scope: string): boolean =>
    scope !== "" && StuffApi.findByTemplatePath(scope) !== undefined;
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (obj.templatePath === COIN_PATH) {
      const fields = collectCoinFields(obj);
      if (fields.currency === currency && typeof fields.denomination === "number") {
        total +=
          Currency.faceValueOf(currency, fields.denomination) *
          (fields.quantity ?? 1);
      }
    }
    for (const value of Object.values(obj)) visit(value);
  };
  for (const record of records) {
    if (isResident(record.getScope())) continue;
    visit(record.state);
  }
  return total;
}

/** Pull a captured coin's identity fields out of an opaque snapshot entry. */
function collectCoinFields(entry: Record<string, unknown>): {
  currency?: string;
  denomination?: number;
  quantity?: number;
} {
  const out: { currency?: string; denomination?: number; quantity?: number } = {};
  const scan = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.currency === "string" && out.currency === undefined) {
      out.currency = obj.currency;
    }
    if (typeof obj.denomination === "number" && out.denomination === undefined) {
      out.denomination = obj.denomination;
    }
    if (typeof obj.quantity === "number" && out.quantity === undefined) {
      out.quantity = obj.quantity;
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") scan(value);
    }
  };
  scan(entry);
  return out;
}

/**
 * The conservation audit for ONE currency: top-down supply vs bottom-up
 * (Σ balances + Σ circulating coin). A sync read over the warmed caches +
 * the live coin instances.
 *
 * ⚠ **Circulating-value only, and honest about it.** It cannot see coin in
 * `holder_snapshots` (a logged-out player's cash) and it excludes vault
 * float, so `balanced` is a *circulating*-value identity, not a total-value
 * one. Use {@link fullReconcileImpl} wherever the question is actually "is
 * the money right?"; this stays sync for the paths that cannot await.
 */
function reconcileImpl(currency: string): ReconcileResult {
  const supply = SupplyAggregate.cachedSupply(currency);
  const accountTotal =
    AccountBalance.cachedTotalsByCurrency().get(currency) ?? 0;
  const { circulating: circulatingCoin } = liveCoinOf(currency);
  const overdraft =
    AccountBalance.cachedOverdraftByCurrency().get(currency) ?? 0;
  return {
    currency,
    supply,
    accountTotal,
    circulatingCoin,
    cashInExistence: supply - accountTotal,
    overdraft,
    balanced: supply === accountTotal + circulatingCoin,
  };
}

/**
 * The **complete** conservation audit for one currency — the follow-the-money
 * instrument. Adds the two reservoirs the sync read cannot see: vault float
 * and coin captured in `holder_snapshots`.
 *
 * `supply === accountTotal + circulatingCoin + vaultCoin + snapshotCoin` is
 * the identity that actually holds; anything else is a gauge with a hole in
 * it, and an audit run against a leaky gauge proves nothing.
 */
async function fullReconcileImpl(
  currency: string,
): Promise<FullReconcileResult> {
  const base = reconcileImpl(currency);
  const { vault } = liveCoinOf(currency);
  const snapshotCoin = await snapshotCoinOf(currency);
  // ⚠⚠ VAULT FLOAT IS REPORTED BUT NOT ADDED. `seedFloat` mints coin into the
  // till AND credits the branch's own operating account 1:1 against it, so
  // the float is ALREADY represented on the ledger by that balance. Adding
  // `vault` to the bottom-up term would double-count it by exactly the float
  // — which is why the original `reconcile` skipped vault cash. That skip was
  // load-bearing accounting, not an oversight; found by driving, when the
  // audit reported a bottom-up EXCEEDING supply.
  //
  // `snapshotCoin` is different in kind: coin captured into `holder_snapshots`
  // has no on-ledger counterpart at all, so it is a genuinely missing
  // reservoir and DOES belong in the identity.
  const bottomUp = base.accountTotal + base.circulatingCoin + snapshotCoin;
  return {
    ...base,
    vaultCoin: vault,
    snapshotCoin,
    fullyBalanced: base.supply === bottomUp,
  };
}

/** A categorized read of one account's ledger — the bar's P&L instrument. */
async function profitAndLossImpl(accountId: string): Promise<ProfitAndLoss> {
  const rows = await entriesForImpl(accountId);
  const lines: Partial<Record<PnlCategory, number>> = {};
  for (const r of rows) {
    const income = r.toAccount === accountId;
    const signed = income ? r.amount : -r.amount;
    // One row, two readings: a `sales` leg is the payee's revenue and the
    // payer's cost of goods. The category is stamped once (the seller's
    // side); the buyer's P&L derives its own line on read.
    const category: PnlCategory =
      !income && (r.category === 'sales' || r.category === 'consignment')
        ? 'cogs'
        : r.category;
    lines[category] = (lines[category] ?? 0) + signed;
  }
  return {
    account: accountId,
    lines,
    balance: balanceMinor(accountId),
  };
}

/**
 * Issue a fresh payment card linked 1:1 to `accountId`, placed in the
 * acting owner's inventory. The reissue path after a report-lost freeze.
 */
async function issueCardImpl(
  accountId: string,
  capMinor: number,
  holder?: Stuff,
): Promise<Stuff & CredentialWallet> {
  const principal = holder ?? actingPrincipal();
  const card = await StuffApi.clone<PaymentCard>(TemplatePaths.paymentCard);
  const pay = card.ensureCredential("payment");
  pay.linkAccount(accountId);
  pay.setActiveAccount(accountId);
  pay.setSpendCap(capMinor);
  if (principal && MixinApi.isContainer(principal)) {
    ContainmentApi.move(card as unknown as Stuff & Containable, principal);
  }
  return card as Stuff & CredentialWallet;
}

/**
 * The sealed conservation chokepoint — the **only** code path that writes a
 * {@link LedgerEntry} or mutates an {@link AccountBalance}. It (1) asserts
 * the structural conservation rule (throws on a breach, regardless of
 * connection); (2) — when connected — writes one row per leg, updates each
 * real account's balance + warm cache, and bumps the supply aggregate on
 * mint/drain.
 *
 * A module-private free function rather than an intra-singleton self-call,
 * which the call-security gate would deny (the caller would be
 * `BankingLogic`, not the `BankingApi` the gate allows) — the `RenownLogic`
 * pattern.
 *
 * Returns the minted `txId` (empty when offline — no rows written) so a
 * consumer's own event chain can reference its money legs (the contract
 * events' `txId` link).
 */
async function postTransaction(
  kind: LedgerKind,
  legs: LedgerLeg[],
  opts: { locality?: string | null } = {},
): Promise<string> {
  // Conservation is asserted FIRST — a malformed posting throws with or
  // without a DB connection (the contract violation is the same offline).
  BankTransaction.assertConserving(kind, legs);

  // ⚠⚠ The ENDPOINT CHECK — the impure half of the no-crossing invariant.
  //
  // assertConserving proves the legs agree with each other; this proves they
  // agree with the ACCOUNTS they touch. Without it a same-currency pair of
  // legs could still move zorkmids into a scrip account, which is an
  // invisible mint by a different door.
  //
  // Reads the warmed cache only — never an await per endpoint. A cost on the
  // posting path is a cost someone eventually removes, and this check must
  // never be the thing that gets removed. An account the cache has never seen
  // is NEW (applyDelta is about to create it), so an empty currency adopts
  // the leg's rather than failing.
  for (const leg of legs) {
    for (const endpoint of [leg.from, leg.to]) {
      if (Account.isSentinel(endpoint)) continue;
      const held = AccountBalance.cachedCurrency(endpoint);
      if (held && held !== leg.currency) {
        throw new Error(
          `BankingLogic.postTransaction: account '${endpoint}' is denominated ` +
            `in ${held} but the leg is in ${leg.currency} — a leg may never ` +
            `cross currencies (permanent invariant)`,
        );
      }
    }
  }
  if (!active()) return "";

  const at = WorldClockApi.getNow().rawValue();
  const realAt = Date.now();
  const actor = actingActorKey();
  const txId = `tx-${realAt.toString(36)}-${(txSeq++).toString(36)}`;
  const locality = opts.locality ?? null;

  // Sandbox: a circle transaction writes its (stamped) ledger rows but
  // NEVER touches the field caches — deltas ride the per-scope overlay
  // instead, and the field supply headline provably excludes them.
  const circleScope = currentCircleScope();

  for (const leg of legs) {
    const row = new LedgerEntry();
    row.kind = kind;
    row.fromAccount = leg.from;
    row.toAccount = leg.to;
    row.amount = leg.amount;
    row.currency = leg.currency;
    row.memo = leg.memo ?? "";
    row.category = leg.category ?? defaultCategory(kind);
    row.actor = actor;
    row.locality = locality;
    row.txId = txId;
    row.at = at;
    row.realAt = realAt;
    await row.save();

    if (circleScope !== null) {
      if (!Account.isSentinel(leg.from)) {
        bumpScopedBalance(circleScope, leg.from, -leg.amount);
      }
      if (!Account.isSentinel(leg.to)) {
        bumpScopedBalance(circleScope, leg.to, leg.amount);
      }
      continue;
    }
    if (!Account.isSentinel(leg.from)) {
      await applyDelta(leg.from, -leg.amount, leg.currency);
    }
    if (!Account.isSentinel(leg.to)) {
      await applyDelta(leg.to, leg.amount, leg.currency);
    }
  }

  if (circleScope === null) {
    const { currency, minted, drained } = BankTransaction.supplyDelta(
      kind,
      legs,
    );
    if (minted !== 0 || drained !== 0) {
      await bumpSupply(currency, minted, drained);
    }
  }
  return txId;
}

/** The default P&L category for a kind when a leg doesn't override it. */
function defaultCategory(kind: LedgerKind): PnlCategory {
  switch (kind) {
    case "mint":
      return "subsidy";
    case "deposit":
      return "deposit";
    case "withdraw":
      return "withdraw";
    case "wage":
      return "wages";
    case "tax":
      return "tax";
    case "escrow-hold":
    case "escrow-release":
    case "escrow-revert":
      return "escrow";
    case "draw":
      return "draw";
    default:
      return "other";
  }
}

/** Find-or-create a real account's row, apply a signed delta, keep the cache. */
async function applyDelta(
  accountId: string,
  delta: number,
  currency: string,
): Promise<void> {
  const [existing] = await AccountBalance.find<AccountBalance>({ accountId });
  const row = existing ?? new AccountBalance();
  if (!existing) row.accountId = accountId;
  // A row created inside the transaction adopts the leg's currency; an
  // existing one keeps its own (the endpoint check already proved they agree).
  if (!row.currency) row.currency = currency;
  row.balance += delta;
  await row.save();
  AccountBalance.putCached(accountId, row.balance, row.currency);
}

/**
 * Find-or-create **this currency's** supply row, add the deltas, keep the
 * mirror. Conservation is N independent domains — one row per currency.
 */
async function bumpSupply(
  currency: string,
  minted: number,
  drained: number,
): Promise<void> {
  const [existing] = await SupplyAggregate.find<SupplyAggregate>({ currency });
  const row = existing ?? new SupplyAggregate();
  if (!existing) row.currency = currency;
  row.minted += minted;
  row.drained += drained;
  await row.save();
  await SupplyAggregate.warm();
}

/** All ledger rows touching `accountId` on either side (dedup by `_id`). */
async function entriesForImpl(accountId: string): Promise<LedgerEntry[]> {
  if (!active()) return [];
  const out = await LedgerEntry.find<LedgerEntry>({ fromAccount: accountId });
  const incoming = await LedgerEntry.find<LedgerEntry>({
    toAccount: accountId,
  });
  const seen = new Set(out.map((r) => r._id));
  for (const r of incoming) if (!seen.has(r._id)) out.push(r);
  return out;
}

/** Replay the ledger for `accountId` into a balance (the audit read). */
async function rebuildBalanceImpl(accountId: string): Promise<number> {
  const rows = await entriesForImpl(accountId);
  let balance = 0;
  for (const r of rows) {
    if (r.toAccount === accountId) balance += r.amount;
    if (r.fromAccount === accountId) balance -= r.amount;
  }
  return balance;
}

/** Rebuild the supply aggregate by a full ledger scan (the audit/repair). */
async function recomputeSupplyImpl(): Promise<void> {
  if (!active()) return;
  const rows = await LedgerEntry.find<LedgerEntry>({});
  // Group the full scan by currency: conservation is N independent domains,
  // so the rebuild produces one row per currency, not one headline.
  const totals = new Map<string, { minted: number; drained: number }>();
  for (const r of rows) {
    if (r.kind !== "mint" && r.kind !== "drain") continue;
    const currency = r.currency;
    if (!currency) {
      throw new Error(
        `BankingLogic.recomputeSupply: ledger row ${r.txId} has no currency ` +
          `— migrate before rebuilding ` +
          `(packages/server/scripts/migrate-currency.ts --apply)`,
      );
    }
    const seen = totals.get(currency) ?? { minted: 0, drained: 0 };
    if (r.kind === "mint") seen.minted += r.amount;
    else seen.drained += r.amount;
    totals.set(currency, seen);
  }
  const existing = await SupplyAggregate.find<SupplyAggregate>({});
  const byCurrency = new Map(existing.map((r) => [r.currency, r]));
  for (const [currency, { minted, drained }] of totals) {
    const row = byCurrency.get(currency) ?? new SupplyAggregate();
    row.currency = currency;
    row.minted = minted;
    row.drained = drained;
    await row.save();
  }
  await SupplyAggregate.warm();
}

/**
 * BankingLogic — the hot-reloadable logic singleton behind
 * {@link BankingApi}.
 *
 * Lives at `/platform/idea/api/banking` (a stateless `Stuff` singleton, no backing
 * `Template`); `BankingApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The conservation chokepoint
 * ({@link postTransaction}) and all sub-logic are module-private free
 * functions, so there are no intra-singleton `this.x()` calls to trip the
 * gate. Each public method carries the `FromModule` gate; nothing outside
 * this module constructs a {@link LedgerEntry} or mutates an
 * {@link AccountBalance}.
 *
 * @internal
 */
@Unshadowable
export class BankingLogic extends ApiLogic {
  /**
   * See {@link BankingApi.boot}. Idempotent. Runs the custodian restamp
   * pass (a cache-field fill over legacy `bank_accounts` rows — no money
   * moves); the warm caches are loaded by AppBootstrap
   * (AccountBalance.warm / SupplyAggregate.warm) before this.
   */
  @CallSecurity(BankingApiCallers)
  public async boot(): Promise<void> {
    await restampCustodiansImpl();
  }

  /** See {@link BankingApi.mint}. */
  @CallSecurity(BankingApiCallers)
  public async mint(
    toAccountId: string,
    amount: Money,
    memo = "",
    category: PnlCategory = "float",
  ): Promise<void> {
    await postTransaction("mint", [
      {
      currency: amount.currency,
        from: Account.ISSUANCE,
        to: toAccountId,
        amount: amount.minor,
        memo,
        category,
      },
    ]);
  }

  /** See {@link BankingApi.drain}. */
  @CallSecurity(BankingApiCallers)
  public async drain(
    fromAccountId: string,
    amount: Money,
    memo = "",
  ): Promise<void> {
    if (
      active() &&
      balanceMinor(fromAccountId) < amount.minor
    ) {
      throw new Error(
        `BankingLogic.drain: ${fromAccountId} holds less than ${amount.render()}`,
      );
    }
    await postTransaction("drain", [
      {
        from: fromAccountId,
        to: Account.ISSUANCE,
        amount: amount.minor,
        currency: amount.currency,
        memo,
      },
    ]);
  }

  /** See {@link BankingApi.float}. Convenience over mint (category `float`). */
  @CallSecurity(BankingApiCallers)
  public async float(accountId: string, amount: Money): Promise<void> {
    await postTransaction("mint", [
      {
      currency: amount.currency,
        from: Account.ISSUANCE,
        to: accountId,
        amount: amount.minor,
        memo: "float liquidity",
        category: "float",
      },
    ]);
  }

  /** See {@link BankingApi.balanceOf}. Sync warm read. */
  @CallSecurity(BankingApiCallers)
  public balanceOf(accountId: string): Money {
    return Money.of(balanceMinor(accountId), Currency.compact());
  }

  /** See {@link BankingApi.discardScopeOverlay}. */
  @CallSecurity(BankingApiCallers)
  public discardScopeOverlay(scope: string): void {
    scopedBalanceOverlay.delete(scope);
  }

  /** See {@link BankingApi.moneySupply}. Sync warm read, per currency. */
  @CallSecurity(BankingApiCallers)
  public moneySupply(currency: string): Money {
    return Money.of(SupplyAggregate.cachedSupply(currency), currency);
  }

  /** See {@link BankingApi.entriesFor}. */
  @CallSecurity(BankingApiCallers)
  public async entriesFor(accountId: string): Promise<LedgerEntry[]> {
    return entriesForImpl(accountId);
  }

  /** See {@link BankingApi.rebuildBalance}. */
  @CallSecurity(BankingApiCallers)
  public async rebuildBalance(accountId: string): Promise<Money> {
    return Money.of(await rebuildBalanceImpl(accountId), Currency.compact());
  }

  /** See {@link BankingApi.recomputeSupply}. */
  @CallSecurity(BankingApiCallers)
  public async recomputeSupply(): Promise<void> {
    return recomputeSupplyImpl();
  }

  /* ───────────────────────── custodial bank ops ───────────────────────── */

  /** See {@link BankingApi.openAccount}. */
  @CallSecurity(BankingApiCallers)
  public async openAccount(
    bank: string,
    corpoKey: string,
    currency: string,
  ): Promise<string> {
    return openAccountImpl(bank, corpoKey, currency);
  }

  /** See {@link BankingApi.myAccountAt}. The actor's account at a bank. */
  @CallSecurity(BankingApiCallers)
  public async myAccountAt(bank: string): Promise<string | null> {
    const account = await accountAtImpl(actingActorKey(), bank);
    return account?.accountId ?? null;
  }

  /** See {@link BankingApi.accountsOf}. Every account the actor holds. */
  @CallSecurity(BankingApiCallers)
  public async accountsOf(): Promise<AccountBalance[]> {
    return accountsOfImpl(actingActorKey());
  }

  /** See {@link BankingApi.primaryAccountIdOf}. Receive-by-identity target. */
  @CallSecurity(BankingApiCallers)
  public async primaryAccountIdOf(ownerKey: string): Promise<string | null> {
    const owned = await accountsOfImpl(ownerKey);
    const primary = owned.find((a) => a.isPrimary) ?? owned[0];
    return primary?.accountId ?? null;
  }

  /** See {@link BankingApi.corpoKeyOf}. The account's recorded affiliation. */
  @CallSecurity(BankingApiCallers)
  public async corpoKeyOf(accountId: string): Promise<string | null> {
    const account = await accountByIdImpl(accountId);
    return account?.corpoKey ?? null;
  }

  /** See {@link BankingApi.ownerKeyOf}. The account's recorded owner key. */
  @CallSecurity(BankingApiCallers)
  public async ownerKeyOf(accountId: string): Promise<string | null> {
    const account = await accountByIdImpl(accountId);
    return account?.owner ?? null;
  }

  /** See {@link BankingApi.linkAccount}. */
  @CallSecurity(BankingApiCallers)
  public linkAccount(actor: Stuff, accountId: string): boolean {
    const cred = reachableCredential(actor);
    if (!cred) return false;
    cred.linkAccount(accountId);
    return true;
  }

  /** See {@link BankingApi.unlinkAccount}. */
  @CallSecurity(BankingApiCallers)
  public unlinkAccount(actor: Stuff, accountId: string): void {
    reachableCredential(actor)?.unlinkAccount(accountId);
  }

  /** See {@link BankingApi.deposit}. Coin → vault, balance credited (1:1). */
  @CallSecurity(BankingApiCallers)
  public async deposit(
    bank: Stuff & Bank,
    coinStack: Stuff & Globbable,
  ): Promise<void> {
    if (!isCashLike(coinStack)) {
      throw new Error("BankingLogic.deposit: that isn't cash");
    }
    const owner = actingActorKey();
    const account = await accountAtImpl(owner, bank.getBank());
    if (!account) {
      throw new Error("BankingLogic.deposit: no account here — open one first");
    }
    const value = stackValue(coinStack);
    // Coin physically enters the vault (merges with any resting stack); the
    // balance is credited — the two cancel (supply-neutral cash bridge).
    ContainmentApi.move(
      coinStack as unknown as Stuff & Containable,
      bank as unknown as Stuff & Container,
    );
    await postTransaction("deposit", [
      {
        from: Account.CASH_BRIDGE,
        to: account.accountId,
        amount: value,
        currency: account.currency,
      },
    ]);
    // The convenience fee (Terms), conserved → branch + corpo royalty. Zero
    // for Goodkin (no-op); charged out of the just-credited balance.
    const fee = bank.getTerms().getTransactionFee();
    if (fee > 0 && balanceMinor(account.accountId) >= fee) {
      await chargeFeeImpl(bank, account.accountId, fee, "deposit fee");
    }
  }

  /** See {@link BankingApi.withdraw}. Balance → cash, bounded by the till. */
  @CallSecurity(BankingApiCallers)
  public async withdraw(bank: Stuff & Bank, amount: Money): Promise<void> {
    const owner = actingActorKey();
    const account = await accountAtImpl(owner, bank.getBank());
    if (!account) {
      throw new Error("BankingLogic.withdraw: no account here");
    }
    const terms = bank.getTerms();
    const fee = terms.getTransactionFee();
    const balance = balanceMinor(account.accountId);
    if (balance < amount.minor + fee) {
      throw new Error(
        `BankingLogic.withdraw: your balance is under ${amount.render()}` +
          (fee > 0 ? ` (plus a ${fee}-credit fee)` : ""),
      );
    }
    // Minimum-balance floor (Terms) — a withdrawal can't drop you below it.
    if (balance - amount.minor - fee < terms.getMinBalance()) {
      throw new Error(
        `BankingLogic.withdraw: that would drop you below the ${terms.getMinBalance()}-credit minimum`,
      );
    }
    // Common-pool guard (anti-grief): a per-account daily cash cap so one
    // actor can't drain the shared till to deny others. Derive-on-read over
    // the ledger; per-account, never collective (a bank run is a feature);
    // over the cap → refuse and push onto the ledger (card/transfer). Scales
    // with standing (Circle → higher cap).
    const cap = withdrawalCapFor(account, actingPrincipal());
    if (cap > 0) {
      const already = await withdrawnTodayImpl(account.accountId);
      if (already + amount.minor > cap) {
        throw new Error(
          `BankingLogic.withdraw: that exceeds today's ${cap}-credit cash ` +
            `limit (you've drawn ${already}) — pay by card or transfer instead`,
        );
      }
    }
    // The diegetic limit (AC#13): a branch can run low on physical coin even
    // when the account is solvent — bounded by the actual till, not a gate.
    if (bank.getTillLiquidity().minor < amount.minor) {
      throw new Error(
        `BankingLogic.withdraw: the branch can't cover ${amount.render()} ` +
          `in cash right now (till low)`,
      );
    }
    const principal = actingPrincipal();
    if (!principal || !MixinApi.isContainer(principal)) {
      throw new Error("BankingLogic.withdraw: nowhere to hand the cash");
    }
    // Dispense largest-first, bounded by the till's denominations. The till
    // can hold enough total value yet be unable to make the amount *exactly*
    // (e.g. only 25s for a 10-credit pull) — a distinct, diegetic refusal from
    // till-low, checked before the ledger moves so the debit never outruns the
    // coin. Exact-cash-or-card: push the customer onto card / transfer.
    const bankContainer = bank as unknown as Stuff & Container;
    if (
      Coinage.planSpend(
        amount.currency,
        cashSupply(bankContainer, amount.currency),
        amount.minor,
      ) === null
    ) {
      throw new Error(
        `BankingLogic.withdraw: the branch can't make ${amount.render()} ` +
          `in exact change right now (try a card payment or transfer)`,
      );
    }
    await postTransaction("withdraw", [
      {
      currency: amount.currency,
        from: account.accountId,
        to: Account.CASH_BRIDGE,
        amount: amount.minor,
      },
    ]);
    // Till security: open the disbursement window around the one legitimate
    // vault-coin removal so `canRemoveContainable` permits it (loose `get` of
    // the till stays vetoed). `finally` guarantees the window closes.
    bank._beginDisbursing();
    try {
      await moveCoins(
        bankContainer,
        principal,
        amount.minor,
        amount.currency,
      );
    } finally {
      bank._endDisbursing();
    }
    // The convenience fee (Terms), conserved → branch + corpo royalty. Zero
    // for Goodkin (no-op). Charged after the cash is handed over.
    await chargeFeeImpl(bank, account.accountId, fee, "withdrawal fee");
  }

  /** See {@link BankingApi.transfer}. Balance → balance (conserving). */
  @CallSecurity(BankingApiCallers)
  public async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: Money,
    memo = "",
  ): Promise<void> {
    const from = await accountByIdImpl(fromAccountId);
    if (!from) throw new Error("BankingLogic.transfer: no such source account");
    // You may only transfer from your OWN account (anti-spoof; the actor is
    // context-derived, the source must belong to them).
    if (from.owner !== actingActorKey()) {
      throw new Error("BankingLogic.transfer: that isn't your account");
    }
    // A wire fee (Terms) on movement/convenience — the only live Goodkin fee.
    // Intra-bank (same branch) is free; cross-*bank* (same corpo) costs the
    // wire fee; cross-*corpo* costs the (heavier) cross-corpo fee — rivalry
    // has a cost. The source bank's schedule prices it. Read before the move
    // so the balance check covers amount + fee.
    const to = await accountByIdImpl(toAccountId);
    const wireFee = await transferFeeFor(from, to);
    if (balanceMinor(fromAccountId) < amount.minor + wireFee) {
      throw new Error(
        `BankingLogic.transfer: balance under ${amount.render()}` +
          (wireFee > 0 ? ` (plus a ${wireFee}-credit wire fee)` : ""),
      );
    }
    await postTransaction("transfer", [
      {
        from: fromAccountId,
        to: toAccountId,
        amount: amount.minor,
        currency: amount.currency,
        memo,
      },
    ]);
    if (wireFee > 0) {
      const sourceBank = findBranchOf(from.bank);
      if (sourceBank) {
        await chargeFeeImpl(sourceBank, fromAccountId, wireFee, "wire fee");
      }
    }
  }

  /* ──────────────── settlement + the credential ladder ──────────────── */

  /** See {@link BankingApi.settle}. The uniform settlement primitive. */
  @CallSecurity(BankingApiCallers)
  public async settle(
    charge: Charge,
    method: SettlementMethod,
  ): Promise<SettlementReceipt> {
    return settleImpl(charge, method);
  }

  /** See {@link BankingApi.activeCredential}. The actor's routing credential. */
  @CallSecurity(BankingApiCallers)
  public activeCredential(): PaymentCredential | null {
    const actor = actingPrincipal();
    return actor ? reachableCredential(actor) : null;
  }

  /** See {@link BankingApi.issueCard}. Issue/reissue a card for an account. */
  @CallSecurity(BankingApiCallers)
  public async issueCard(
    accountId: string,
    capMinor: number,
    holder?: Stuff,
  ): Promise<Stuff & CredentialWallet> {
    return issueCardImpl(accountId, capMinor, holder);
  }

  /* ──────────────── wages + reporting ──────────────── */

  /** See {@link BankingApi.payWage}. Employer account → worker (labor line). */
  @CallSecurity(BankingApiCallers)
  public async payWage(
    employerAccountId: string,
    workerKey: string,
    amount: Money,
    category: PnlCategory = "wages",
    memo = "wage",
  ): Promise<void> {
    return payWageImpl(employerAccountId, workerKey, amount, category, memo);
  }

  /** See {@link BankingApi.payDraw}. Business → proprietor, solvency-checked. */
  @CallSecurity(BankingApiCallers)
  public async payDraw(
    businessAccountId: string,
    proprietorKey: string,
    amount: Money,
  ): Promise<void> {
    return payDrawImpl(businessAccountId, proprietorKey, amount);
  }

  /* ──────────────── escrow (the contract system's agent) ──────────────── */

  /** See {@link BankingApi.escrowHold}. Issuer → the per-contract escrow. */
  @CallSecurity(BankingApiCallers)
  public async escrowHold(
    fromAccountId: string,
    contractId: string,
    amount: Money,
  ): Promise<EscrowHoldResult> {
    return escrowHoldImpl(fromAccountId, contractId, amount);
  }

  /** See {@link BankingApi.escrowRelease}. Escrow → the contractor. */
  @CallSecurity(BankingApiCallers)
  public async escrowRelease(
    contractId: string,
    toAccountId: string,
    amount: Money,
  ): Promise<string> {
    return escrowMoveImpl("escrow-release", contractId, toAccountId, amount);
  }

  /** See {@link BankingApi.escrowRevert}. Escrow → the issuer. */
  @CallSecurity(BankingApiCallers)
  public async escrowRevert(
    contractId: string,
    toAccountId: string,
    amount: Money,
  ): Promise<string> {
    return escrowMoveImpl("escrow-revert", contractId, toAccountId, amount);
  }

  /** See {@link BankingApi.escrowBalanceOf}. The legibility read (sync). */
  @CallSecurity(BankingApiCallers)
  public escrowBalanceOf(contractId: string): Money {
    return Money.of(
      balanceMinor(Account.escrowAccountFor(contractId)),
      Currency.compact()
    );
  }

  /** See {@link BankingApi.escrowClose}. Assert zero, delete the row. */
  @CallSecurity(BankingApiCallers)
  public async escrowClose(contractId: string): Promise<void> {
    return escrowCloseImpl(contractId);
  }

  /** See {@link BankingApi.defaultCustodianBank}. The custodian default. */
  @CallSecurity(BankingApiCallers)
  public defaultCustodianBank(): string {
    return defaultCustodianBankImpl();
  }

  /** See {@link BankingApi.custodianOf}. An account's custodian bank. */
  @CallSecurity(BankingApiCallers)
  public async custodianOf(accountId: string): Promise<string | null> {
    const row = await accountByIdImpl(accountId);
    return row?.bank || null;
  }

  /** See {@link BankingApi.profitAndLoss}. Categorized ledger read. */
  @CallSecurity(BankingApiCallers)
  public async profitAndLoss(accountId: string): Promise<ProfitAndLoss> {
    return profitAndLossImpl(accountId);
  }

  /** See {@link BankingApi.remitDemoTax}. Seller → treasury at the inert rate. */
  @CallSecurity(BankingApiCallers)
  public async remitDemoTax(
    sellerAccountId: string,
    saleAmount: Money,
  ): Promise<Money> {
    return remitDemoTaxImpl(sellerAccountId, saleAmount);
  }

  /** See {@link BankingApi.issueCash}. The central-bank physical cash faucet. */
  @CallSecurity(BankingApiCallers)
  public async issueCash(
    into: Stuff & Container,
    amount: Money,
    category: PnlCategory = "float",
  ): Promise<Stuff> {
    return issueCashImpl(into, amount, category);
  }

  /**
   * See {@link BankingApi.reconcile}. The circulating-value audit (sync).
   * ⚠ Blind to vault float and to coin captured in `holder_snapshots` — use
   * {@link fullReconcile} when the question is "is the money right?".
   */
  @CallSecurity(BankingApiCallers)
  public reconcile(currency: string): ReconcileResult {
    return reconcileImpl(currency);
  }

  /** See {@link BankingApi.fullReconcile}. The complete audit (async). */
  @CallSecurity(BankingApiCallers)
  public async fullReconcile(currency: string): Promise<FullReconcileResult> {
    return fullReconcileImpl(currency);
  }

  /** See {@link BankingApi.ensureVenueAccount}. Lazily create a venue account. */
  @CallSecurity(BankingApiCallers)
  public async ensureVenueAccount(
    ownerPath: string,
    bank: string,
    corpoKey: string,
    currency: string,
    openingCapital?: number,
  ): Promise<string> {
    return ensureVenueAccountImpl(
      ownerPath,
      bank,
      corpoKey,
      currency,
      openingCapital,
    );
  }

  /** See {@link BankingApi.ensureCorpoTreasury}. The corpo's royalty account. */
  @CallSecurity(BankingApiCallers)
  public async ensureCorpoTreasury(
    corpoKey: string,
    bank: string,
    currency: string,
  ): Promise<string> {
    return ensureCorpoTreasuryImpl(corpoKey, bank, currency);
  }

  // The opening float (seedFloatImpl) and the withdrawal-quota reader
  // (withdrawnTodayImpl) are NOT public Api methods: the float triggers lazily
  // on the first openAccount, and the quota is read inside withdraw. Both are
  // module-internal — exposing them would put internal ops on the author
  // surface (callable == visible == cared-about) with no author consumer.

  /**
   * See {@link BankingApi.enrollCircle}. Enrol `ownerKey`'s account at a
   * `corpoKey`-affiliated bank into the Circle (the recognized-standing perk).
   * Returns whether an account was found (false → the player hasn't opened one
   * yet, so the officer nudges rather than enrols). The enrollment-tree effect.
   */
  @CallSecurity(BankingApiCallers)
  public async enrollCircle(
    ownerKey: string,
    corpoKey: string,
  ): Promise<boolean> {
    // The gameplay gate: you must have opened an account at this corpo's bank
    // before its Circle will have you (the officer nudges otherwise).
    const accounts = await accountsOfImpl(ownerKey);
    if (!accounts.some((a) => a.corpoKey === corpoKey)) return false;
    // The membership itself rides the *member*, not the account — a saved prop
    // on the player. Resolve the live member Stuff (present in the dialogue) and
    // write it. Persist through the member's own spine save when it offers one
    // (Avatar), matching the old account.save() immediacy; otherwise the next
    // autosave capture carries it (the per-Avatar-prop idiom, e.g. contacts).
    const member = StuffApi.findByTemplatePath<Stuff>(ownerKey);
    if (!member || !MixinApi.isPropertied(member)) return false;
    member.setProp(circleProp(corpoKey), true);
    const savable = member as Stuff & { save?: () => Promise<void> };
    if (typeof savable.save === "function") await savable.save();
    return true;
  }
}
