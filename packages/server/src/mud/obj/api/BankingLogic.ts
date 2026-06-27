// BankingLogic — the hot-reloadable logic singleton behind BankingApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import LedgerEntry from "../../lib/banking/LedgerEntry";
import type {
  LedgerKind,
  PnlCategory,
  ProfitAndLoss,
} from "../../lib/banking/LedgerEntry";
import AccountBalance from "../../lib/banking/AccountBalance";
import SupplyAggregate from "../../lib/banking/SupplyAggregate";
import { Account } from "../../lib/banking/Account";
import { Money } from "../../lib/banking/Money";
import { BankTransaction } from "../../lib/banking/Transaction";
import type { LedgerLeg } from "../../lib/banking/Transaction";
import type { Bank } from "../../lib/banking/Bank";
import type { PaymentCredential } from "../../lib/banking/PaymentCredential";
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

const BankingApiCallers = SecurityPolicies.FromModule("mud/api/banking#BankingApi");

/** Persistence is a no-op unless Mongo is connected (tests, pre-boot). */
function active(): boolean {
  return PersistApi.isConnected();
}

/** Monotonic per-process counter making each transaction id unique. */
let txSeq = 0;

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

/** Monotonic per-process counter making each minted account id unique. */
let acctSeq = 0;

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
  bankPath: string
): Promise<AccountBalance | null> {
  if (!active()) return null;
  const [row] = await AccountBalance.find<AccountBalance>({
    owner: ownerKey,
    bankPath,
  });
  return row ?? null;
}

/** Resolve an account row by its durable id, or null. */
async function accountByIdImpl(accountId: string): Promise<AccountBalance | null> {
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
  corpoKey: string
): Promise<string> {
  if (!active()) {
    throw new Error("BankingLogic.openAccount: no persistence connection");
  }
  const owner = actingActorKey();
  const owned = await accountsOfImpl(owner);
  const already = owned.find((a) => a.bankPath === bankPath);
  if (already) return already.accountId;

  const row = new AccountBalance();
  row.accountId = Account.newId(acctSeq++);
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
  return row.accountId;
}

/**
 * Move `count` coins (value-1 units) from `from`'s contents to `to`,
 * splitting a stack when it holds more than needed. Used for both withdrawal
 * (vault → owner) and cash settlement (payer → payee). v1 assumes face value
 * 1 (count === minor units); denomination change-making is deferred.
 */
async function moveCoins(
  from: Stuff & Container,
  to: Stuff & Container,
  count: number
): Promise<boolean> {
  let remaining = count;
  for (const item of [...ContainmentApi.getContents(from)]) {
    if (remaining <= 0) break;
    if (!isCashLike(item)) continue;
    const have = item.getQuantity();
    if (have <= remaining) {
      ContainmentApi.move(item, to);
      remaining -= have;
    } else {
      const piece = await GlobbableApi.split(item, remaining);
      ContainmentApi.move(piece as unknown as Stuff & Containable, to);
      remaining = 0;
    }
  }
  return remaining === 0;
}

/**
 * The actor's routing payment credential (implant-first via findReachable's
 * self-hosted leg, then carried cards). A **frozen** credential is skipped —
 * a revoked card is not a usable routing credential, so a reissued card is
 * found in its place even while the dead one is still carried.
 */
function reachableCredential(actor: Stuff): (Stuff & PaymentCredential) | null {
  return ContainmentApi.findReachable(
    actor,
    null,
    (s: Stuff): s is Stuff & PaymentCredential => {
      if (!MixinApi.isPaymentCredential(s)) return false;
      return !s.isFrozen();
    }
  );
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
  method: SettlementMethod
): Promise<SettlementReceipt> {
  const payer = actingPrincipal();
  if (!payer) throw new Error("BankingLogic.settle: no acting payer");

  if (method.kind === "cash") {
    if (!charge.payeeContainer) {
      throw new Error("BankingLogic.settle: cash needs someone to hand coin to");
    }
    if (!MixinApi.isContainer(payer)) {
      throw new Error("BankingLogic.settle: the payer can't hold coin");
    }
    const ok = await moveCoins(
      payer as Stuff & Container,
      charge.payeeContainer,
      charge.amount.minor
    );
    if (!ok) throw new Error("BankingLogic.settle: not enough cash on hand");
    return { method: "cash" };
  }

  // credential method
  const cred = reachableCredential(payer);
  if (!cred) throw new Error("BankingLogic.settle: you have no payment credential");
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
    throw new Error("BankingLogic.settle: the credential has no active account");
  }
  if (!cred.authorize(charge.amount)) {
    throw new Error(
      "BankingLogic.settle: the credential declined (frozen or over its cap)"
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
  amount: Money
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
  saleAmount: Money
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

/** A categorized read of one account's ledger — the bar's P&L instrument. */
async function profitAndLossImpl(accountId: string): Promise<ProfitAndLoss> {
  const rows = await entriesForImpl(accountId);
  const lines: Partial<Record<PnlCategory, number>> = {};
  for (const r of rows) {
    const signed = r.toAccount === accountId ? r.amount : -r.amount;
    lines[r.category] = (lines[r.category] ?? 0) + signed;
  }
  return { account: accountId, lines, balance: AccountBalance.cachedBalance(accountId) };
}

/**
 * Issue a fresh payment card linked 1:1 to `accountId`, placed in the
 * acting owner's inventory. The reissue path after a report-lost freeze.
 */
async function issueCardImpl(
  accountId: string,
  capMinor: number
): Promise<Stuff & PaymentCredential> {
  const principal = actingPrincipal();
  const card = await StuffApi.clone<PaymentCard>(TemplatePaths.paymentCard);
  card.linkAccount(accountId);
  card.setActiveAccount(accountId);
  card.setSpendCap(capMinor);
  if (principal && MixinApi.isContainer(principal)) {
    ContainmentApi.move(card as unknown as Stuff & Containable, principal);
  }
  return card as Stuff & PaymentCredential;
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
  opts: { locality?: string | null } = {}
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
  const incoming = await LedgerEntry.find<LedgerEntry>({ toAccount: accountId });
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
export class BankingLogic extends Idea {
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
    category: PnlCategory = "float"
  ): Promise<void> {
    await postTransaction("mint", [
      { from: Account.ISSUANCE, to: toAccountId, amount: amount.minor, memo, category },
    ]);
  }

  /** See {@link BankingApi.drain}. */
  @CallSecurity(BankingApiCallers)
  public async drain(fromAccountId: string, amount: Money, memo = ""): Promise<void> {
    if (active() && AccountBalance.cachedBalance(fromAccountId) < amount.minor) {
      throw new Error(
        `BankingLogic.drain: ${fromAccountId} holds less than ${amount.render()}`
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
  public async openAccount(bankPath: string, corpoKey: string): Promise<string> {
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
    coinStack: Stuff & Globbable
  ): Promise<void> {
    if (!isCashLike(coinStack)) {
      throw new Error("BankingLogic.deposit: that isn't cash");
    }
    const owner = actingActorKey();
    const account = await accountAtImpl(owner, bank.getBankPath());
    if (!account) {
      throw new Error(
        "BankingLogic.deposit: no account here — open one first"
      );
    }
    const value = stackValue(coinStack);
    // Coin physically enters the vault (merges with any resting stack); the
    // balance is credited — the two cancel (supply-neutral cash bridge).
    ContainmentApi.move(
      coinStack as unknown as Stuff & Containable,
      bank as unknown as Stuff & Container
    );
    await postTransaction("deposit", [
      { from: Account.CASH_BRIDGE, to: account.accountId, amount: value },
    ]);
  }

  /** See {@link BankingApi.withdraw}. Balance → cash, bounded by the till. */
  @CallSecurity(BankingApiCallers)
  public async withdraw(bank: Stuff & Bank, amount: Money): Promise<void> {
    const owner = actingActorKey();
    const account = await accountAtImpl(owner, bank.getBankPath());
    if (!account) {
      throw new Error("BankingLogic.withdraw: no account here");
    }
    if (AccountBalance.cachedBalance(account.accountId) < amount.minor) {
      throw new Error(
        `BankingLogic.withdraw: your balance is under ${amount.render()}`
      );
    }
    // The diegetic limit (AC#13): a branch can run low on physical coin even
    // when the account is solvent — bounded by the actual till, not a gate.
    if (bank.getTillLiquidity().minor < amount.minor) {
      throw new Error(
        `BankingLogic.withdraw: the branch can't cover ${amount.render()} ` +
          `in cash right now (till low)`
      );
    }
    const principal = actingPrincipal();
    if (!principal || !MixinApi.isContainer(principal)) {
      throw new Error("BankingLogic.withdraw: nowhere to hand the cash");
    }
    await postTransaction("withdraw", [
      { from: account.accountId, to: Account.CASH_BRIDGE, amount: amount.minor },
    ]);
    await moveCoins(
      bank as unknown as Stuff & Container,
      principal,
      amount.minor
    );
  }

  /** See {@link BankingApi.transfer}. Balance → balance (conserving). */
  @CallSecurity(BankingApiCallers)
  public async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: Money,
    memo = ""
  ): Promise<void> {
    const from = await accountByIdImpl(fromAccountId);
    if (!from) throw new Error("BankingLogic.transfer: no such source account");
    // You may only transfer from your OWN account (anti-spoof; the actor is
    // context-derived, the source must belong to them).
    if (from.owner !== actingActorKey()) {
      throw new Error("BankingLogic.transfer: that isn't your account");
    }
    if (AccountBalance.cachedBalance(fromAccountId) < amount.minor) {
      throw new Error(
        `BankingLogic.transfer: balance under ${amount.render()}`
      );
    }
    await postTransaction("transfer", [
      { from: fromAccountId, to: toAccountId, amount: amount.minor, memo },
    ]);
  }

  /* ──────────────── settlement + the credential ladder ──────────────── */

  /** See {@link BankingApi.settle}. The uniform settlement primitive. */
  @CallSecurity(BankingApiCallers)
  public async settle(
    charge: Charge,
    method: SettlementMethod
  ): Promise<SettlementReceipt> {
    return settleImpl(charge, method);
  }

  /** See {@link BankingApi.setActiveAccount}. Switch the wallet's active acct. */
  @CallSecurity(BankingApiCallers)
  public setActiveAccount(credential: Stuff & PaymentCredential, accountId: string): void {
    credential.setActiveAccount(accountId);
  }

  /** See {@link BankingApi.activeCredential}. The actor's routing credential. */
  @CallSecurity(BankingApiCallers)
  public activeCredential(): (Stuff & PaymentCredential) | null {
    const actor = actingPrincipal();
    return actor ? reachableCredential(actor) : null;
  }

  /** See {@link BankingApi.freezeCredential}. Report-lost — revoke a credential. */
  @CallSecurity(BankingApiCallers)
  public freezeCredential(credential: Stuff & PaymentCredential): void {
    credential.setFrozen(true);
  }

  /** See {@link BankingApi.issueCard}. Issue/reissue a card for an account. */
  @CallSecurity(BankingApiCallers)
  public async issueCard(
    accountId: string,
    capMinor: number
  ): Promise<Stuff & PaymentCredential> {
    return issueCardImpl(accountId, capMinor);
  }

  /* ──────────────── wages + reporting ──────────────── */

  /** See {@link BankingApi.payWage}. Employer account → worker (labor line). */
  @CallSecurity(BankingApiCallers)
  public async payWage(
    employerAccountId: string,
    workerKey: string,
    amount: Money
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
    saleAmount: Money
  ): Promise<Money> {
    return remitDemoTaxImpl(sellerAccountId, saleAmount);
  }
}
