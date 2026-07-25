/**
 * @internal — the logic singleton behind `ContractApi`. Registers at
 * `/obj/api/contract`; methods admit only the `ContractApi` face. Extends
 * `ApiLogic` (residency-exempt). All real logic lives in module-private
 * free functions (the `BankingLogic`/`EmploymentLogic` precedent — no
 * gated `this.x()` self-calls).
 *
 * **Stateless** — no watch index, no warm cache: with turn-in verification
 * every touchpoint reads `ContractRecord` by finder and judges the
 * petition against modeled state at that moment. Expiry is lazy-on-read
 * (`expireStale` at every touchpoint — the withdrawal-quota / residency
 * observe-first posture; conservation makes laziness safe, the held stake
 * sits in a real account `reconcile` counts while nobody looks).
 */

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { StuffApi } from "../../api/stuff";
import { MixinApi } from "../../api/mixin";
import { BankingApi, Money, Account } from "../../api/banking";
import { PlayerApi } from "../../api/player";
import { EmploymentApi } from "../../api/employment";
import { ExecutionContextApi } from "../../api/execution-context";
import { WorldClockApi } from "../../api/worldclock";
import { PersistApi } from "../../api/persist";
import { RegardApi } from "../../api/regard";
import { SecurityApi } from "../../api/security";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { Condition } from "../../lib/employment/Condition";
import type { ConditionData } from "../../lib/employment/Condition";
import {
  ContractRecord,
  type ContractParty,
} from "../../lib/employment/ContractRecord";
import {
  ContractEvent,
  type ContractEventKind,
} from "../../lib/employment/ContractEvent";
import { Creature } from "../../lib/creature/Creature";
import type {
  GigSpec,
  PostGigResult,
  ClaimResult,
  AbandonResult,
  FulfillResult,
  CompleteResult,
} from "../../api/contract";
import type { Stuff } from "../../lib/stuff/Stuff";

const ContractApiCallers = SecurityPolicies.FromModule(
  "/api/contract#ContractApi",
);

/** One game-hour in game-seconds (the expiry math). */
const ONE_GAME_HOUR_S = 3_600;

/** How deep the downward destination search descends (chests in rooms). */
const MAX_SEARCH_DEPTH = 6;

/** Persistence is required for every contract touchpoint. */
function active(): boolean {
  return PersistApi.isConnected();
}

/** A dial read; unwarmed/unseeded (throw or empty) → the fallback. */
function dial(key: string, fallback: number): number {
  try {
    const v = AppApi.setting(key);
    if (v === "") return fallback;
    const raw = Number(v);
    return Number.isFinite(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

/** The acting principal as a live Stuff, or null (unattributable). */
function actor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/** The acting principal's durable key, or "". */
function actorKey(): string {
  return actor()?.getTemplatePath() ?? "";
}

/** Append one event row (money legs live in bank_ledger; txId links). */
async function appendEvent(
  contractId: string,
  event: ContractEventKind,
  fields: Partial<
    Pick<ContractEvent, "actor" | "counterparty" | "txId" | "memo">
  > = {},
): Promise<void> {
  const row = new ContractEvent();
  row.contractId = contractId;
  row.event = event;
  row.actor = fields.actor ?? actorKey() ?? "system";
  row.counterparty = fields.counterparty ?? "";
  row.txId = fields.txId ?? "";
  row.memo = fields.memo ?? "";
  row.at = WorldClockApi.getNow().rawValue();
  row.realAt = Date.now();
  await row.save();
}

/** Stamp the record's audit clock and save. */
async function saveRecord(record: ContractRecord): Promise<void> {
  record.realAt = Date.now();
  await record.save();
}

/**
 * Resolve the destination — live instance first, else the residency
 * re-clone path (`singletonOrClone`: an evicted room re-materializes on
 * demand — the R2 note). Null when the path names nothing buildable.
 */
async function resolveDestination(path: string): Promise<Stuff | null> {
  const live = StuffApi.findByTemplatePath(path);
  if (live) return live;
  try {
    return await StuffApi.singletonOrClone<Stuff>(path);
  } catch {
    return null;
  }
}

/**
 * Find a **delivered** matching item at the destination — a bounded
 * viewer-blind containment read (never a world scan): the destination's
 * contents (recursive, skipping Creatures — a carried item is not
 * delivered) plus, for a Surfaced fixture, the items resting on it. Each
 * candidate is confirmed with the authoritative `Condition.holdsFor`.
 */
function findDeliveredItemAt(
  dest: Stuff,
  condition: ConditionData,
  depth = 0,
): Stuff | null {
  if (MixinApi.isSurfaced(dest)) {
    for (const item of dest.getResting()) {
      if (
        Condition.matchesItem(condition, item) &&
        Condition.holdsFor(condition, item)
      ) {
        return item;
      }
    }
  }
  if (depth > MAX_SEARCH_DEPTH || !MixinApi.isContainer(dest)) return null;
  for (const item of dest.getContents()) {
    if (item instanceof Creature) continue;
    if (
      Condition.matchesItem(condition, item) &&
      Condition.holdsFor(condition, item)
    ) {
      return item;
    }
    const inner = findDeliveredItemAt(item, condition, depth + 1);
    if (inner) return inner;
  }
  return null;
}

/**
 * Whether `presenter` is at the destination — the environment chain
 * includes the destination itself or its immediate host (a fixture
 * destination like a counter: the presenter stands in the counter's room,
 * never inside the counter). The diegetic handoff is local, not remote.
 */
function presenterAtDestination(presenter: Stuff, dest: Stuff): boolean {
  const destHost = MixinApi.isContainable(dest) ? dest.getContainer() : null;
  let node: Stuff | null = MixinApi.isContainable(presenter)
    ? presenter.getContainer()
    : null;
  for (let depth = 0; node && depth < MAX_SEARCH_DEPTH; depth++) {
    if (node === dest || (destHost && node === destHost)) return true;
    node = MixinApi.isContainable(node) ? node.getContainer() : null;
  }
  return false;
}

/**
 * Resolve the issuer's *person* (the regard holder): the issuer itself
 * for a player, the proprietor for a business. Null when not live (lazy
 * NPC standup) — the nudge no-ops then (RegardApi's documented degrade);
 * the durable `breached` row stays the authoritative record.
 */
function issuerPersonOf(record: ContractRecord): Stuff | null {
  if (record.issuer.kind === "player") {
    return StuffApi.findByTemplatePath(record.issuer.templatePath) ?? null;
  }
  const business = StuffApi.findByTemplatePath(record.issuer.templatePath);
  if (!business || !MixinApi.isBusiness(business)) return null;
  const proprietor = business.getProprietor();
  return proprietor
    ? (StuffApi.findByTemplatePath(proprietor) ?? null)
    : null;
}

/**
 * The shared breach path (abandon / claim expiry): revert the escrow to
 * the issuer, record `breached` (naming the claimant) + `released-back`,
 * land the issuer-side regard nudge, clear the claim, reopen the gig.
 * The zero-balance escrow row stays — the id is reused by the next
 * claim's hold (rows scale with open contracts either way).
 */
async function breachClaim(
  record: ContractRecord,
  reason: string,
): Promise<void> {
  const claimant = record.claimant;
  let txId = "";
  if (BankingApi.escrowBalanceOf(record.contractId).minor > 0) {
    txId = await BankingApi.escrowRevert(
      record.contractId,
      record.issuerAccountId,
      Money.of(record.rewardMinor),
    );
  }
  await appendEvent(record.contractId, "breached", {
    actor: claimant,
    counterparty: record.issuer.templatePath,
    txId,
    memo: reason,
  });
  // Breach must be felt, cheaply: the issuer's regard for the breaching
  // claimant drops (per-viewer, no global reputation write). Best-effort —
  // either side not live → graceful no-op.
  const issuerPerson = issuerPersonOf(record);
  const contractor = claimant ? StuffApi.findByTemplatePath(claimant) : null;
  if (issuerPerson && contractor) {
    RegardApi.adjustRegard(
      issuerPerson,
      contractor,
      -dial(AppSettingKeys.contractBreachRegardPenalty, 15),
    );
  }
  record.claimant = "";
  record.claimedAt = 0;
  record.claimExpiresAt = 0;
  record.state = "open";
  await saveRecord(record);
  await appendEvent(record.contractId, "released-back", { actor: claimant });
}

/**
 * Lazy expiry (observe-first — no sweep): a claim past its expiry
 * breaches the claimant and reopens; an open posting past its lifetime
 * reverts any held escrow to the issuer and expires. Every touchpoint
 * runs this before acting. Returns the (possibly transitioned) record.
 */
async function expireStale(record: ContractRecord): Promise<ContractRecord> {
  const now = WorldClockApi.getNow().rawValue();
  if (
    record.state === "claimed" &&
    record.claimExpiresAt > 0 &&
    now >= record.claimExpiresAt
  ) {
    await breachClaim(record, "claim expired");
  }
  if (
    record.state === "open" &&
    record.postingExpiresAt > 0 &&
    now >= record.postingExpiresAt
  ) {
    let txId = "";
    if (BankingApi.escrowBalanceOf(record.contractId).minor > 0) {
      txId = await BankingApi.escrowRevert(
        record.contractId,
        record.issuerAccountId,
        Money.of(record.rewardMinor),
      );
    }
    record.state = "expired";
    record.closedAt = now;
    await saveRecord(record);
    await appendEvent(record.contractId, "reverted", {
      counterparty: record.issuer.templatePath,
      txId,
      memo: "posting expired",
    });
    await BankingApi.escrowClose(record.contractId);
  }
  return record;
}

/** Resolve the issuer party + funding account for a post (Decision I). */
async function resolveIssuer(
  poster: Stuff,
  asBusiness: boolean,
): Promise<
  | { ok: true; party: ContractParty; accountId: string }
  | { ok: false; reason: string }
> {
  if (asBusiness) {
    const business = EmploymentApi.businessOfProprietor(poster);
    if (!business) {
      return { ok: false, reason: "you don't run a business" };
    }
    let accountId: string;
    try {
      // Custody is the business's authored banksAt (never a default).
      accountId = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return { ok: false, reason: "the business banks nowhere" };
    }
    return {
      ok: true,
      party: {
        kind: "business",
        templatePath: business.getTemplatePath() ?? "",
      },
      accountId,
    };
  }
  const key = poster.getTemplatePath() ?? "";
  const accountId = await BankingApi.primaryAccountIdOf(key);
  if (!accountId) {
    return { ok: false, reason: "you have no account to fund the escrow" };
  }
  return { ok: true, party: { kind: "player", templatePath: key }, accountId };
}

async function postImpl(spec: GigSpec): Promise<PostGigResult> {
  if (!active()) return { ok: false, reason: "no persistence connection" };
  const poster = actor();
  if (!poster) return { ok: false, reason: "no attributable poster" };

  // The verification boundary: an invalid or non-template condition is
  // refused — a clause may only be escrowed if the engine can verify it.
  const invalid = Condition.validate(spec.condition);
  if (invalid) return { ok: false, reason: invalid };
  if (!Number.isInteger(spec.rewardMinor) || spec.rewardMinor <= 0) {
    return { ok: false, reason: "the reward must be a positive amount" };
  }

  // The destination must resolve to somewhere a delivery can land.
  const dest = await resolveDestination(spec.condition.destinationPath);
  if (!dest || !(MixinApi.isContainer(dest) || MixinApi.isSurfaced(dest))) {
    return { ok: false, reason: "the destination can't receive a delivery" };
  }

  // A fungible stack can never satisfy a gig (no stable identity).
  if (spec.condition.item.kind === "template") {
    const exemplar = StuffApi.findByTemplatePath(spec.condition.item.path);
    if (exemplar && MixinApi.isGlobbable(exemplar)) {
      return { ok: false, reason: "fungible goods can't be contracted" };
    }
  }

  // A pre-satisfied gig is degenerate — the work is already done.
  if (findDeliveredItemAt(dest, spec.condition)) {
    return { ok: false, reason: "that condition already holds" };
  }

  const issuer = await resolveIssuer(poster, spec.asBusiness === true);
  if (!issuer.ok) return { ok: false, reason: issuer.reason };

  const contractId = SecurityApi.uuid();
  const now = WorldClockApi.getNow().rawValue();
  const record = new ContractRecord();
  record.contractId = contractId;
  record.state = "open";
  record.boardPath = spec.boardPath;
  record.issuer = issuer.party;
  record.issuerAccountId = issuer.accountId;
  record.claimMode = spec.claimMode;
  record.clause = { shape: "achieve", condition: spec.condition };
  record.rewardMinor = spec.rewardMinor;
  record.escrowAccountId = ""; // stamped below once a hold mints it
  record.postedAt = now;
  const lifetimeHours =
    spec.expiresGameHours ??
    dial(AppSettingKeys.contractPostingExpiryDefaultGameHours, 0);
  record.postingExpiresAt =
    lifetimeHours > 0 ? now + lifetimeHours * ONE_GAME_HOUR_S : 0;

  let postTxId = "";
  if (spec.claimMode === "open-bounty") {
    // A bounty escrows at post — the board never advertises a check the
    // system can't cash.
    const held = await BankingApi.escrowHold(
      issuer.accountId,
      contractId,
      Money.of(spec.rewardMinor),
    );
    if (!held.ok) {
      return { ok: false, reason: "you can't fund that reward" };
    }
    postTxId = held.txId;
    record.escrowAccountId = `escrow:contract:${contractId}`;
  } else if (
    BankingApi.balanceOf(issuer.accountId).minor < spec.rewardMinor
  ) {
    // Exclusive holds at claim, but posting still fails if the issuer
    // can't fund it now.
    return { ok: false, reason: "you can't fund that reward" };
  }

  await saveRecord(record);
  await appendEvent(contractId, "posted", {
    actor: issuer.party.templatePath,
    txId: postTxId,
  });
  return { ok: true, contractId };
}

async function claimImpl(contractId: string): Promise<ClaimResult> {
  if (!active()) return { ok: false, reason: "no persistence connection" };
  const claimer = actor();
  if (!claimer) return { ok: false, reason: "no attributable claimant" };
  let record = await ContractRecord.findByContractId(contractId);
  if (!record) return { ok: false, reason: "no such gig" };
  record = await expireStale(record);
  if (record.claimMode === "open-bounty") {
    return { ok: false, reason: "a bounty needs no claim — just deliver" };
  }
  if (record.state !== "open") {
    return { ok: false, reason: "that gig isn't open" };
  }
  const key = claimer.getTemplatePath() ?? "";
  if (key === record.issuer.templatePath) {
    return { ok: false, reason: "you can't claim your own gig" };
  }
  const held = await BankingApi.escrowHold(
    record.issuerAccountId,
    contractId,
    Money.of(record.rewardMinor),
  );
  if (!held.ok) {
    // Funds moved since posting — the board never advertises a check the
    // system can't cash: close the gig.
    record.state = "expired";
    record.closedAt = WorldClockApi.getNow().rawValue();
    await saveRecord(record);
    await appendEvent(contractId, "reverted", { memo: "unfundable" });
    await BankingApi.escrowClose(contractId);
    return { ok: false, reason: "the issuer can no longer fund this gig" };
  }
  const now = WorldClockApi.getNow().rawValue();
  record.escrowAccountId = `escrow:contract:${contractId}`;
  record.claimant = key;
  record.claimedAt = now;
  record.claimExpiresAt =
    now + dial(AppSettingKeys.contractClaimExpiryGameHours, 48) * ONE_GAME_HOUR_S;
  record.state = "claimed";
  await saveRecord(record);
  await appendEvent(contractId, "claimed", { actor: key, txId: held.txId });
  return { ok: true };
}

async function abandonImpl(contractId: string): Promise<AbandonResult> {
  if (!active()) return { ok: false, reason: "no persistence connection" };
  const key = actorKey();
  if (!key) return { ok: false, reason: "no attributable claimant" };
  let record = await ContractRecord.findByContractId(contractId);
  if (!record) return { ok: false, reason: "no such gig" };
  record = await expireStale(record);
  if (record.state !== "claimed" || record.claimant !== key) {
    return { ok: false, reason: "you don't hold that claim" };
  }
  await breachClaim(record, "abandoned");
  return { ok: true };
}

/** The condition of a live record (v1: exactly one achieve clause). */
function conditionOf(record: ContractRecord): ConditionData | null {
  return record.clause?.condition ?? null;
}

/**
 * Whether `key` already sealed a valid `fulfilled` row: actor matches,
 * minted after the claim (exclusive) or the posting (open-bounty — no
 * claim step exists).
 */
async function hasValidFulfilledRow(
  record: ContractRecord,
  key: string,
): Promise<boolean> {
  const since =
    record.claimMode === "exclusive" ? record.claimedAt : record.postedAt;
  const events = await ContractEvent.findByContractId(record.contractId);
  return events.some(
    (e) => e.event === "fulfilled" && e.actor === key && e.at >= since,
  );
}

async function fulfillImpl(contractId: string): Promise<FulfillResult> {
  if (!active()) return { ok: false, reason: "no persistence connection" };
  const presenter = actor();
  if (!presenter) return { ok: false, reason: "no attributable presenter" };
  let record = await ContractRecord.findByContractId(contractId);
  if (!record) return { ok: false, reason: "no such gig" };
  record = await expireStale(record);
  if (record.state !== "open" && record.state !== "claimed") {
    return { ok: false, reason: "that gig is closed" };
  }
  const key = presenter.getTemplatePath() ?? "";
  if (record.claimMode === "exclusive" && record.claimant !== key) {
    return { ok: false, reason: "that isn't your claim" };
  }
  const condition = conditionOf(record);
  if (!condition) return { ok: false, reason: "that gig has no condition" };

  // The handoff is diegetic, not remote — the presenter must be there.
  const dest = await resolveDestination(condition.destinationPath);
  if (!dest || !presenterAtDestination(presenter, dest)) {
    return { ok: false, reason: "you aren't at the destination" };
  }
  if (await hasValidFulfilledRow(record, key)) {
    return { ok: false, reason: "already fulfilled — redeem it at the board" };
  }
  // The engine checks NOW (strict possession included) — the player
  // petitions, the state decides.
  if (!findDeliveredItemAt(dest, condition)) {
    return { ok: false, reason: "the delivery isn't done" };
  }
  // The engine-sealed proof-of-delivery: no money, no state transition.
  await appendEvent(contractId, "fulfilled", { actor: key });
  return { ok: true };
}

async function completeImpl(contractId: string): Promise<CompleteResult> {
  if (!active()) return { ok: false, reason: "no persistence connection" };
  const completer = actor();
  if (!completer) return { ok: false, reason: "no attributable completer" };
  let record = await ContractRecord.findByContractId(contractId);
  if (!record) return { ok: false, reason: "no such gig" };
  record = await expireStale(record);
  if (record.state !== "open" && record.state !== "claimed") {
    return { ok: false, reason: "that gig is closed" };
  }
  const key = completer.getTemplatePath() ?? "";
  if (record.claimMode === "exclusive" && record.claimant !== key) {
    return { ok: false, reason: "that isn't your claim" };
  }
  const condition = conditionOf(record);
  if (!condition) return { ok: false, reason: "that gig has no condition" };

  // Verification: live `holdsFor` now, OR a sealed post-claim `fulfilled`
  // row whose actor is the completer (the payout survives state drift).
  let verified = false;
  const dest = await resolveDestination(condition.destinationPath);
  if (dest && findDeliveredItemAt(dest, condition)) verified = true;
  if (!verified && (await hasValidFulfilledRow(record, key))) verified = true;
  if (!verified) return { ok: false, reason: "the delivery isn't done" };

  // An open-bounty pays from the escrow held at post; an exclusive from
  // the escrow held at claim. Either way the stake must be in flight.
  if (BankingApi.escrowBalanceOf(contractId).minor < record.rewardMinor) {
    return { ok: false, reason: "the stake isn't held" };
  }

  // Resolve where the payout lands BEFORE the terminal flip (a settled-but-
  // unpaid record must be unreachable). Payer-derived, never a default: a
  // **player** must already hold an account — no silent sign-up; the
  // refusal is the nudge to open one (gig settlement in coin is a named
  // deferred seam). An NPC payee gets an account opened at the bank
  // custodying the escrow (your first account opens where your first
  // money comes from).
  let payee = await BankingApi.primaryAccountIdOf(key);
  if (!payee) {
    if (PlayerApi.isAvatarStuff(completer)) {
      return {
        ok: false,
        reason: "you have no account to be paid into — open one at a bank",
      };
    }
    const custodian = await BankingApi.custodianOf(
      Account.escrowAccountFor(contractId),
    );
    if (!custodian) {
      return { ok: false, reason: "the stake's bank can't be resolved" };
    }
    payee = await BankingApi.ensureVenueAccount(key, custodian, "");
  }

  // The compare-and-set state guard: re-read, flip terminal, save — a
  // concurrent second `complete` sees the terminal state and is refused.
  const fresh = await ContractRecord.findByContractId(contractId);
  if (!fresh || (fresh.state !== "open" && fresh.state !== "claimed")) {
    return { ok: false, reason: "that gig is closed" };
  }
  fresh.state = "settled";
  fresh.settledBy = key;
  fresh.closedAt = WorldClockApi.getNow().rawValue();
  await saveRecord(fresh);
  const txId = await BankingApi.escrowRelease(
    contractId,
    payee,
    Money.of(record.rewardMinor),
  );
  await appendEvent(contractId, "settled", {
    actor: key,
    counterparty: key,
    txId,
  });
  await BankingApi.escrowClose(contractId);
  return { ok: true, paidMinor: record.rewardMinor };
}

async function openGigsOnImpl(boardPath: string): Promise<ContractRecord[]> {
  if (!active()) return [];
  const live = await ContractRecord.findLiveByBoard(boardPath);
  const out: ContractRecord[] = [];
  for (const record of live) {
    const fresh = await expireStale(record);
    if (fresh.state === "open" || fresh.state === "claimed") out.push(fresh);
  }
  return out;
}

@Unshadowable
export class ContractLogic extends ApiLogic {
  /** See {@link ContractApi.post}. */
  @CallSecurity(ContractApiCallers)
  public async post(spec: GigSpec): Promise<PostGigResult> {
    return postImpl(spec);
  }

  /** See {@link ContractApi.claim}. */
  @CallSecurity(ContractApiCallers)
  public async claim(contractId: string): Promise<ClaimResult> {
    return claimImpl(contractId);
  }

  /** See {@link ContractApi.abandon}. */
  @CallSecurity(ContractApiCallers)
  public async abandon(contractId: string): Promise<AbandonResult> {
    return abandonImpl(contractId);
  }

  /** See {@link ContractApi.fulfill}. */
  @CallSecurity(ContractApiCallers)
  public async fulfill(contractId: string): Promise<FulfillResult> {
    return fulfillImpl(contractId);
  }

  /** See {@link ContractApi.complete}. */
  @CallSecurity(ContractApiCallers)
  public async complete(contractId: string): Promise<CompleteResult> {
    return completeImpl(contractId);
  }

  /** See {@link ContractApi.openGigsOn}. */
  @CallSecurity(ContractApiCallers)
  public async openGigsOn(boardPath: string): Promise<ContractRecord[]> {
    return openGigsOnImpl(boardPath);
  }

  /** See {@link ContractApi.activeClaims}. */
  @CallSecurity(ContractApiCallers)
  public async activeClaims(): Promise<ContractRecord[]> {
    if (!active()) return [];
    const key = actorKey();
    if (!key) return [];
    const held = await ContractRecord.findActiveByClaimant(key);
    const out: ContractRecord[] = [];
    for (const record of held) {
      const fresh = await expireStale(record);
      if (fresh.state === "claimed" && fresh.claimant === key) out.push(fresh);
    }
    return out;
  }

  /** See {@link ContractApi.contractById}. */
  @CallSecurity(ContractApiCallers)
  public async contractById(
    contractId: string,
  ): Promise<ContractRecord | null> {
    if (!active()) return null;
    const record = await ContractRecord.findByContractId(contractId);
    return record ? expireStale(record) : null;
  }

  /** See {@link ContractApi.eventsFor}. */
  @CallSecurity(ContractApiCallers)
  public async eventsFor(contractId: string): Promise<ContractEvent[]> {
    if (!active()) return [];
    return ContractEvent.findByContractId(contractId);
  }
}
