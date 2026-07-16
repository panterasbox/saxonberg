// BankingLogic — the hot-reloadable logic singleton behind BankingApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import LedgerEntry from "../../lib/banking/LedgerEntry";
import type {
  LedgerKind,
  PnlCategory,
  ProfitAndLoss,
  ReconcileResult,
} from "../../lib/banking/LedgerEntry";
import AccountBalance from "../../lib/banking/AccountBalance";
import SupplyAggregate from "../../lib/banking/SupplyAggregate";
import { Account } from "../../lib/banking/Account";
import { Money } from "../../lib/banking/Money";
import { Coinage } from "../../lib/banking/Coinage";
import type { CoinLine, CoinSupply } from "../../lib/banking/Coinage";
import { BankTransaction } from "../../lib/banking/Transaction";
import type { LedgerLeg } from "../../lib/banking/Transaction";
import type { Bank } from "../../lib/banking/Bank";
import type { PaymentCredential } from "../../lib/credential/Credential";
import type { CredentialWallet } from "../../lib/credential/CredentialWallet";
import PaymentCard from "../../lib/banking/PaymentCard";
import type {
  Charge,
  SettlementMethod,
  SettlementReceipt,
} from "../../lib/banking/Charge";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { WorldClockApi } from "../../api/worldclock";
import { PersistApi } from "../../api/persist";
import { ExecutionContextApi } from "../../api/execution-context";
import { ContainmentApi } from "../../api/containment";
import { GlobbableApi } from "../../api/glob";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { TemplatePaths } from "../../lib/paths";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import type { Containable } from "../../lib/spatial/Containable";
import type { Globbable } from "../../lib/stuff/Globbable";

const BankingApiCallers = SecurityPolicies.FromModule("/api/banking#BankingApi",
);

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** Monotonic per-process counter making each transaction id unique. */
let txSeq = 0;

/** The Coin template — the one cash object; cloned per cash issuance. */
const COIN_PATH = "/obj/Coin";

/**
 * Derive the acting principal's durable `templatePath` from the dispatched
 * execution context — NEVER a caller-supplied value (the gated-Api rule;
 * memory: *gated-api-actor-from-context*). Falls back to `'system'` for an
 * unattributable context (a boot-time / scheduled / forced frame) so a
 * ledger row always names *someone*.
 */
function actingActorKey(): string {
  const principal = ExecutionContextApi.getActingAuthor() as {
    getTemplatePath?(): string | null;
  } | null;
  return principal?.getTemplatePath?.() ?? "system";
}

/** The acting principal as a Stuff (for moving coin to/from it), or null. */
function actingPrincipal(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/** Coin-shaped duck type — avoids importing the Coin class here. */
interface CashLike {
  getDenomination(): string;
  getQuantity(): number;
}

function isCashLike(stuff: unknown): stuff is Stuff & Globbable & CashLike {
  const s = stuff as Partial<CashLike>;
  return (
    typeof s?.getDenomination === "function" &&
    typeof s?.getQuantity === "function"
  );
}

/** The face value (minor units) of a coin stack. */
function stackValue(stack: CashLike): number {
  return Money.faceValueOf(stack.getDenomination()) * stack.getQuantity();
}

/** Find every account owned by `ownerKey`. */
async function accountsOfImpl(ownerKey: string): Promise<AccountBalance[]> {
  if (!active()) return [];
  return AccountBalance.find<AccountBalance>({ owner: ownerKey });
}

/** The `ownerKey`'s account at `bankPath`, or null. */
async function accountAtImpl(
  ownerKey: string,
  bankPath: string,
): Promise<AccountBalance | null> {
  if (!active()) return null;
  const [row] = await AccountBalance.find<AccountBalance>({
    owner: ownerKey,
    bankPath,
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
  bankPath: string,
  corpoKey: string,
): Promise<string> {
  if (!active()) {
    throw new Error("BankingLogic.openAccount: no persistence connection");
  }
  const owner = actingActorKey();
  const owned = await accountsOfImpl(owner);
  const already = owned.find((a) => a.bankPath === bankPath);
  if (already) return already.accountId;

  const row = new AccountBalance();
  row.accountId = Account.newId();
  row.owner = owner;
  row.bankPath = bankPath;
  row.corpoKey = corpoKey;
  row.isPrimary = owned.length === 0;
  row.isActive = true;
  row.balance = 0;
  await row.save();
  AccountBalance.putCached(row.accountId, 0);
  // Auto-register the new account onto the owner's implant wallet (the
  // implant links all the owner's accounts; first opened becomes active).
  autoLinkToWallet(actingPrincipal(), row.accountId);
  // Lazily capitalize the branch on its first customer: seed the opening vault
  // float (idempotent, best-effort). The counter is guaranteed live here (the
  // customer is standing at it), which a boot-time seed can't guarantee. A
  // no-op in tests (the float AppSetting is unwarmed → 0).
  const floatMinor = openingFloatMinor();
  if (floatMinor > 0) {
    await seedFloatImpl(bankPath, Money.of(floatMinor)).catch(() => {
      /* best-effort — a float failure never blocks opening an account */
    });
  }
  return row.accountId;
}

/**
 * Ensure a **venue** account exists (owner = the venue's durable path, not
 * an acting principal — a resource identity), creating a primary one if
 * absent. The bar's P&L account: lazily created on first banking interaction
 * at the venue (order / pnl / payroll), so no boot seeder is needed.
 */
async function ensureVenueAccountImpl(
  ownerPath: string,
  bankPath: string,
  corpoKey: string,
): Promise<string> {
  if (!active()) {
    throw new Error("BankingLogic.ensureVenueAccount: no persistence");
  }
  const owned = await accountsOfImpl(ownerPath);
  const existing = owned.find((a) => a.bankPath === bankPath) ?? owned[0];
  if (existing) return existing.accountId;
  const row = new AccountBalance();
  row.accountId = Account.newId();
  row.owner = ownerPath;
  row.bankPath = bankPath;
  row.corpoKey = corpoKey;
  row.isPrimary = true;
  row.isActive = true;
  row.balance = 0;
  await row.save();
  AccountBalance.putCached(row.accountId, 0);
  return row.accountId;
}

/** The cash-like contents of a container, grouped by denomination (per-stack). */
function cashSupply(holder: Stuff & Container): CoinSupply[] {
  const supply: CoinSupply[] = [];
  for (const item of ContainmentApi.getContents(holder)) {
    if (isCashLike(item)) {
      supply.push({
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
    for (const item of [...ContainmentApi.getContents(from)]) {
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
): Promise<boolean> {
  const plan = Coinage.planSpend(cashSupply(from), value);
  if (!plan) return false;
  return takeCoins(from, plan, (piece) => ContainmentApi.move(piece, to));
}

/** Total cash-like value on hand in a container (Σ face-value × quantity). */
function cashOnHand(holder: Stuff & Container): number {
  let total = 0;
  for (const item of ContainmentApi.getContents(holder)) {
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
): Promise<boolean> {
  const plan = Coinage.planSpend(cashSupply(holder), value);
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
async function resolveBranchAccountImpl(bank: Stuff & Bank): Promise<string> {
  const bankPath = bank.getBankPath();
  const corpoKey = bank.getCorpoKey();
  let ownerPath = bankPath;
  try {
    const { EmploymentApi } = await import("../../api/employment");
    // `ensureOperatorAt` stands the branch Business up lazily (off its
    // operatingLocations) so fee income + wages + the opening float all share
    // the one account keyed on the Business path.
    const business = await EmploymentApi.ensureOperatorAt(bankPath);
    if (business) ownerPath = business.getAccountPath();
  } catch {
    // No employment engine available (unit tests / pre-boot) → branch-keyed.
  }
  return ensureVenueAccountImpl(ownerPath, bankPath, corpoKey);
}

/**
 * The corpo's own treasury — a well-known account keyed on `corpoKey`, held at
 * `bankPath` (the corpo's own bank; intra-bank, 1:1 clean). The mirror of
 * {@link ensureVenueAccountImpl}; created lazily so the corpo has income from
 * the first fee. The corpo `Idea` stays pure data — this is an account it owns.
 */
async function ensureCorpoTreasuryImpl(
  corpoKey: string,
  bankPath: string,
): Promise<string> {
  return ensureVenueAccountImpl(`corpo:${corpoKey}`, bankPath, corpoKey);
}

/**
 * Seed a live branch's opening vault float: mint coin into the till AND credit
 * the branch's own operating account against it (founding capital, backed 1:1
 * → conservation holds). Best-effort + idempotent (a no-op if the branch isn't
 * live or already has a balance). Returns whether it seeded.
 */
async function seedFloatImpl(bankPath: string, amount: Money): Promise<boolean> {
  if (amount.minor <= 0) return false;
  const bank = StuffApi.findByTemplatePath<Stuff & Bank>(bankPath);
  if (!bank || !MixinApi.isBank(bank)) return false;
  const branchAccount = await resolveBranchAccountImpl(bank);
  if (AccountBalance.cachedBalance(branchAccount) > 0) return false;
  await issueCashImpl(bank as unknown as Stuff & Container, amount, "float");
  await postTransaction("deposit", [
    {
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
  const branchAccount = await resolveBranchAccountImpl(bank);
  if (branchAccount === customerAccountId) return;
  const corpoKey = bank.getCorpoKey();
  const rate = royaltyRate();
  let royalty = 0;
  let treasury: string | null = null;
  if (corpoKey && rate > 0) {
    royalty = Math.floor(feeMinor * rate);
    if (royalty > 0) {
      treasury = await ensureCorpoTreasuryImpl(corpoKey, bank.getBankPath());
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
      from: customerAccountId,
      to: branchAccount,
      amount: toBranch,
      category: "fee",
      memo,
    });
  }
  if (royalty > 0 && treasury) {
    legs.push({
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

/** The per-account daily cash-withdrawal cap (Circle members get the raised one). */
function withdrawalCapFor(account: AccountBalance): number {
  const key = account.isCircle
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
  if (!to || from.bankPath === to.bankPath) return 0;
  const sourceBank = StuffApi.findByTemplatePath<Stuff & Bank>(from.bankPath);
  if (!sourceBank || !MixinApi.isBank(sourceBank)) return 0;
  const terms = sourceBank.getTerms();
  const crossCorpo = (from.corpoKey || "") !== (to.corpoKey || "");
  return crossCorpo ? terms.getCrossCorpoFee() : terms.getWireFee();
}

/**
 * The actor's routing payment credential (implant-first via findReachable's
 * self-hosted leg, then carried cards). A **frozen** credential is skipped —
 * a revoked card is not a usable routing credential, so a reissued card is
 * found in its place even while the dead one is still carried.
 */
function reachableCredential(actor: Stuff): PaymentCredential | null {
  const holder = ContainmentApi.findReachable(
    actor,
    null,
    (s: Stuff): s is Stuff & CredentialWallet => {
      if (!MixinApi.isCredentialWallet(s)) return false;
      const pay = s.getCredential("payment");
      return !!pay && !pay.isFrozen();
    },
  );
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
    const drained = await drainCoins(payerC, charge.amount.minor);
    if (!drained) {
      throw new Error(
        "BankingLogic.settle: can't make the exact amount in cash",
      );
    }
    const bridgeLegs: LedgerLeg[] = [];
    const bridgeMain = charge.amount.minor - cashSplitTotal;
    if (bridgeMain > 0) {
      bridgeLegs.push({
        from: Account.CASH_BRIDGE,
        to: charge.payeeAccountId,
        amount: bridgeMain,
        category: charge.category ?? "sales",
        memo: charge.reason,
      });
    }
    for (const sp of cashSplits) {
      bridgeLegs.push({
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
  if (method.fromBankPath) {
    const acct = await accountAtImpl(actingActorKey(), method.fromBankPath);
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
  if (AccountBalance.cachedBalance(routingAccount) < charge.amount.minor) {
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
      from: routingAccount,
      to: charge.payeeAccountId,
      amount: mainAmount,
      category: charge.category ?? "sales",
      memo: charge.reason,
    });
  }
  for (const sp of splits) {
    legs.push({
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
      from: employerAccountId,
      to: workerAccount,
      amount: amount.minor,
      category: "wages",
      memo: "wage",
    },
  ]);
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
  if (rate <= 0) return Money.zero();
  const tax = Math.floor(saleAmount.minor * rate);
  if (tax <= 0) return Money.zero();
  await postTransaction("tax", [
    {
      from: sellerAccountId,
      to: treasury,
      amount: tax,
      category: "tax",
      memo: "sales tax",
    },
  ]);
  return Money.of(tax);
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
      from: Account.ISSUANCE,
      to: Account.CASH_BRIDGE,
      amount: amount.minor,
      memo: "cash issuance",
      category,
    },
  ]);
  // Dispense largest-first: a real cash faucet hands out efficient coins
  // (25s, then 5s, then 1s), not a heap of ones. Each denomination is its own
  // stack (they never merge — `globIdentityFields = ['denomination']`).
  const lines = Coinage.dispense(amount.minor);
  let representative: Stuff | null = null;
  for (const line of lines) {
    const coin = await StuffApi.clone(COIN_PATH);
    (coin as unknown as { denomination: string }).denomination =
      line.denomination;
    (coin as unknown as Globbable).setQuantity(line.count);
    ContainmentApi.move(coin as unknown as Stuff & Containable, into);
    if (!representative) representative = coin;
  }
  // `dispense` yields ≥1 line for a positive amount; the largest is returned
  // as a convenience handle (all stacks are already placed in `into`).
  return representative as Stuff;
}

/**
 * The conservation audit: top-down supply vs bottom-up (Σ balances + Σ
 * circulating coins outside vaults). A sync read over the warmed caches +
 * the live coin instances — the reconciliation invariant the operator
 * dogfaods the deficit with.
 */
function reconcileImpl(): ReconcileResult {
  const supply = SupplyAggregate.cachedSupply();
  let accountTotal = 0;
  for (const v of AccountBalance.cached().values()) accountTotal += v;
  let circulatingCoin = 0;
  for (const coin of StuffApi.findAllByTemplatePath(COIN_PATH)) {
    if (!isCashLike(coin)) continue;
    const container = (
      coin as unknown as { getContainer?(): Stuff | null }
    ).getContainer?.();
    if (container && MixinApi.isBank(container)) continue; // vault cash
    circulatingCoin += stackValue(coin);
  }
  return {
    supply,
    accountTotal,
    circulatingCoin,
    cashInExistence: supply - accountTotal,
    balanced: supply === accountTotal + circulatingCoin,
  };
}

/** A categorized read of one account's ledger — the bar's P&L instrument. */
async function profitAndLossImpl(accountId: string): Promise<ProfitAndLoss> {
  const rows = await entriesForImpl(accountId);
  const lines: Partial<Record<PnlCategory, number>> = {};
  for (const r of rows) {
    const signed = r.toAccount === accountId ? r.amount : -r.amount;
    lines[r.category] = (lines[r.category] ?? 0) + signed;
  }
  return {
    account: accountId,
    lines,
    balance: AccountBalance.cachedBalance(accountId),
  };
}

/**
 * Issue a fresh payment card linked 1:1 to `accountId`, placed in the
 * acting owner's inventory. The reissue path after a report-lost freeze.
 */
async function issueCardImpl(
  accountId: string,
  capMinor: number,
): Promise<Stuff & CredentialWallet> {
  const principal = actingPrincipal();
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
 */
async function postTransaction(
  kind: LedgerKind,
  legs: LedgerLeg[],
  opts: { locality?: string | null } = {},
): Promise<void> {
  // Conservation is asserted FIRST — a malformed posting throws with or
  // without a DB connection (the contract violation is the same offline).
  BankTransaction.assertConserving(kind, legs);
  if (!active()) return;

  const at = WorldClockApi.getNow().rawValue();
  const realAt = Date.now();
  const actor = actingActorKey();
  const txId = `tx-${realAt.toString(36)}-${(txSeq++).toString(36)}`;
  const locality = opts.locality ?? null;

  for (const leg of legs) {
    const row = new LedgerEntry();
    row.kind = kind;
    row.fromAccount = leg.from;
    row.toAccount = leg.to;
    row.amount = leg.amount;
    row.memo = leg.memo ?? "";
    row.category = leg.category ?? defaultCategory(kind);
    row.actor = actor;
    row.locality = locality;
    row.txId = txId;
    row.at = at;
    row.realAt = realAt;
    await row.save();

    if (!Account.isSentinel(leg.from)) await applyDelta(leg.from, -leg.amount);
    if (!Account.isSentinel(leg.to)) await applyDelta(leg.to, leg.amount);
  }

  const { minted, drained } = BankTransaction.supplyDelta(kind, legs);
  if (minted !== 0 || drained !== 0) await bumpSupply(minted, drained);
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
    default:
      return "other";
  }
}

/** Find-or-create a real account's row, apply a signed delta, keep the cache. */
async function applyDelta(accountId: string, delta: number): Promise<void> {
  const [existing] = await AccountBalance.find<AccountBalance>({ accountId });
  const row = existing ?? new AccountBalance();
  if (!existing) row.accountId = accountId;
  row.balance += delta;
  await row.save();
  AccountBalance.putCached(accountId, row.balance);
}

/** Find-or-create the single supply row, add the deltas, keep the mirror. */
async function bumpSupply(minted: number, drained: number): Promise<void> {
  const [existing] = await SupplyAggregate.find<SupplyAggregate>({});
  const row = existing ?? new SupplyAggregate();
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
  let minted = 0;
  let drained = 0;
  for (const r of rows) {
    if (r.kind === "mint") minted += r.amount;
    if (r.kind === "drain") drained += r.amount;
  }
  const [existing] = await SupplyAggregate.find<SupplyAggregate>({});
  const row = existing ?? new SupplyAggregate();
  row.minted = minted;
  row.drained = drained;
  await row.save();
  await SupplyAggregate.warm();
}

/**
 * BankingLogic — the hot-reloadable logic singleton behind
 * {@link BankingApi}.
 *
 * Lives at `/obj/api/banking` (a stateless `Stuff` singleton, no backing
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
  /** See {@link BankingApi.boot}. Idempotent; reserved for future taps. */
  @CallSecurity(BankingApiCallers)
  public boot(): void {
    // No event taps in this phase; the warm caches are loaded by
    // AppBootstrap (AccountBalance.warm / SupplyAggregate.warm). Kept as the
    // stable activation seam so later phases install taps here.
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
      AccountBalance.cachedBalance(fromAccountId) < amount.minor
    ) {
      throw new Error(
        `BankingLogic.drain: ${fromAccountId} holds less than ${amount.render()}`,
      );
    }
    await postTransaction("drain", [
      { from: fromAccountId, to: Account.ISSUANCE, amount: amount.minor, memo },
    ]);
  }

  /** See {@link BankingApi.float}. Convenience over mint (category `float`). */
  @CallSecurity(BankingApiCallers)
  public async float(accountId: string, amount: Money): Promise<void> {
    await postTransaction("mint", [
      {
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
    return Money.of(AccountBalance.cachedBalance(accountId));
  }

  /** See {@link BankingApi.moneySupply}. Sync warm read. */
  @CallSecurity(BankingApiCallers)
  public moneySupply(): Money {
    return Money.of(SupplyAggregate.cachedSupply());
  }

  /** See {@link BankingApi.entriesFor}. */
  @CallSecurity(BankingApiCallers)
  public async entriesFor(accountId: string): Promise<LedgerEntry[]> {
    return entriesForImpl(accountId);
  }

  /** See {@link BankingApi.rebuildBalance}. */
  @CallSecurity(BankingApiCallers)
  public async rebuildBalance(accountId: string): Promise<Money> {
    return Money.of(await rebuildBalanceImpl(accountId));
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
    bankPath: string,
    corpoKey: string,
  ): Promise<string> {
    return openAccountImpl(bankPath, corpoKey);
  }

  /** See {@link BankingApi.myAccountAt}. The actor's account id at a branch. */
  @CallSecurity(BankingApiCallers)
  public async myAccountAt(bankPath: string): Promise<string | null> {
    const account = await accountAtImpl(actingActorKey(), bankPath);
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
    const account = await accountAtImpl(owner, bank.getBankPath());
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
      { from: Account.CASH_BRIDGE, to: account.accountId, amount: value },
    ]);
    // The convenience fee (Terms), conserved → branch + corpo royalty. Zero
    // for Goodkin (no-op); charged out of the just-credited balance.
    const fee = bank.getTerms().getTransactionFee();
    if (fee > 0 && AccountBalance.cachedBalance(account.accountId) >= fee) {
      await chargeFeeImpl(bank, account.accountId, fee, "deposit fee");
    }
  }

  /** See {@link BankingApi.withdraw}. Balance → cash, bounded by the till. */
  @CallSecurity(BankingApiCallers)
  public async withdraw(bank: Stuff & Bank, amount: Money): Promise<void> {
    const owner = actingActorKey();
    const account = await accountAtImpl(owner, bank.getBankPath());
    if (!account) {
      throw new Error("BankingLogic.withdraw: no account here");
    }
    const terms = bank.getTerms();
    const fee = terms.getTransactionFee();
    const balance = AccountBalance.cachedBalance(account.accountId);
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
    const cap = withdrawalCapFor(account);
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
    if (Coinage.planSpend(cashSupply(bankContainer), amount.minor) === null) {
      throw new Error(
        `BankingLogic.withdraw: the branch can't make ${amount.render()} ` +
          `in exact change right now (try a card payment or transfer)`,
      );
    }
    await postTransaction("withdraw", [
      {
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
      await moveCoins(bankContainer, principal, amount.minor);
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
    if (AccountBalance.cachedBalance(fromAccountId) < amount.minor + wireFee) {
      throw new Error(
        `BankingLogic.transfer: balance under ${amount.render()}` +
          (wireFee > 0 ? ` (plus a ${wireFee}-credit wire fee)` : ""),
      );
    }
    await postTransaction("transfer", [
      { from: fromAccountId, to: toAccountId, amount: amount.minor, memo },
    ]);
    if (wireFee > 0) {
      const sourceBank = StuffApi.findByTemplatePath<Stuff & Bank>(
        from.bankPath,
      );
      if (sourceBank && MixinApi.isBank(sourceBank)) {
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

  /** See {@link BankingApi.setActiveAccount}. Switch the wallet's active acct. */
  @CallSecurity(BankingApiCallers)
  public setActiveAccount(
    credential: PaymentCredential,
    accountId: string,
  ): void {
    credential.setActiveAccount(accountId);
  }

  /** See {@link BankingApi.activeCredential}. The actor's routing credential. */
  @CallSecurity(BankingApiCallers)
  public activeCredential(): PaymentCredential | null {
    const actor = actingPrincipal();
    return actor ? reachableCredential(actor) : null;
  }

  /** See {@link BankingApi.freezeCredential}. Report-lost — revoke a credential. */
  @CallSecurity(BankingApiCallers)
  public freezeCredential(credential: PaymentCredential): void {
    credential.setFrozen(true);
  }

  /** See {@link BankingApi.issueCard}. Issue/reissue a card for an account. */
  @CallSecurity(BankingApiCallers)
  public async issueCard(
    accountId: string,
    capMinor: number,
  ): Promise<Stuff & CredentialWallet> {
    return issueCardImpl(accountId, capMinor);
  }

  /* ──────────────── wages + reporting ──────────────── */

  /** See {@link BankingApi.payWage}. Employer account → worker (labor line). */
  @CallSecurity(BankingApiCallers)
  public async payWage(
    employerAccountId: string,
    workerKey: string,
    amount: Money,
  ): Promise<void> {
    return payWageImpl(employerAccountId, workerKey, amount);
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

  /** See {@link BankingApi.reconcile}. The conservation audit (sync). */
  @CallSecurity(BankingApiCallers)
  public reconcile(): ReconcileResult {
    return reconcileImpl();
  }

  /** See {@link BankingApi.ensureVenueAccount}. Lazily create a venue account. */
  @CallSecurity(BankingApiCallers)
  public async ensureVenueAccount(
    ownerPath: string,
    bankPath: string,
    corpoKey: string,
  ): Promise<string> {
    return ensureVenueAccountImpl(ownerPath, bankPath, corpoKey);
  }

  /** See {@link BankingApi.ensureCorpoTreasury}. The corpo's royalty account. */
  @CallSecurity(BankingApiCallers)
  public async ensureCorpoTreasury(
    corpoKey: string,
    bankPath: string,
  ): Promise<string> {
    return ensureCorpoTreasuryImpl(corpoKey, bankPath);
  }

  /**
   * See {@link BankingApi.seedFloat}. Seed a live branch's opening vault float:
   * mint coin into the till (supply grows) AND credit the branch's own
   * operating account against it, so the founding cash is backed 1:1 by the
   * bank's own balance (conservation + the custodial invariant hold). Best-
   * effort + idempotent — a no-op if the branch isn't live yet or already has a
   * balance. Returns whether it seeded. Lets early withdrawals work before
   * customer deposits accumulate.
   */
  @CallSecurity(BankingApiCallers)
  public async seedFloat(bankPath: string, amount: Money): Promise<boolean> {
    return seedFloatImpl(bankPath, amount);
  }

  /** See {@link BankingApi.withdrawnToday}. Cash drawn from an account today. */
  @CallSecurity(BankingApiCallers)
  public async withdrawnToday(accountId: string): Promise<number> {
    return withdrawnTodayImpl(accountId);
  }

  /**
   * See {@link BankingApi.setAccountCircle}. Set the Circle affiliation marker
   * on an account (the enrollment ceremony's write) — confers the raised
   * withdrawal quota. Idempotent; a no-op for an unknown account.
   */
  @CallSecurity(BankingApiCallers)
  public async setAccountCircle(
    accountId: string,
    isCircle: boolean,
  ): Promise<void> {
    const account = await accountByIdImpl(accountId);
    if (!account) return;
    account.isCircle = isCircle;
    await account.save();
  }

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
    const accounts = await accountsOfImpl(ownerKey);
    const account = accounts.find((a) => a.corpoKey === corpoKey);
    if (!account) return false;
    account.isCircle = true;
    await account.save();
    return true;
  }
}
