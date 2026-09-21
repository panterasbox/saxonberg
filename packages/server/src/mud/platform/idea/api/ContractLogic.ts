/**
 * @internal — the logic singleton behind `ContractApi`. Registers at
 * `/platform/idea/api/contract`; methods admit only the `ContractApi` face. Extends
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

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { StuffApi } from "../../../api/stuff";
import { Template } from "../../../lib/stuff/Template";
import { MixinApi } from "../../../api/mixin";
import { Currency, BankingApi, Money, Account } from "../../../api/banking";
import { PlayerApi } from "../../../api/player";
import { EmploymentApi } from "../../../api/employment";
import type { Business as BusinessShape } from "../Business";
import { ExecutionContextApi } from "../../../api/execution-context";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistApi } from "../../../api/persist";
import { SecurityApi } from "../../../api/security";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
import { Condition } from "../../../lib/employment/Condition";
import type { ConditionData } from "../../../lib/employment/Condition";
import {
  ContractRecord,
  type ContractParty,
} from "../../../lib/employment/ContractRecord";
import {
  ContractEvent,
  type ContractEventKind,
} from "../../../lib/employment/ContractEvent";
import { Creature } from "../../../lib/creature/Creature";
import type {
  GigSpec,
  PostGigResult,
  ClaimResult,
  AbandonResult,
  FulfillResult,
  CompleteResult,
} from "../../../api/contract";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { CategoryMeasure } from '../../../lib/employment/CategoryMeasure';
import { ContainmentApi } from "../../../api/containment";
import { DocumentApi } from "../../../api/document";
import { GrammarApi } from "../../../api/grammar";
import type { Bank } from "../../../lib/banking/Bank";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import type {
  ContractKind,
  CreditRung,
  CreditSecurity,
  CreditTermsData,
} from "../../../lib/employment/CreditTerms";
import type { RemittanceSplit } from "../../../lib/banking/Charge";

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

/** Game-time seconds, or 0 when no world clock is running. */
function worldSeconds(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
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
  const author = ExecutionContextApi.getActingAuthor() as Stuff | null;
  if (author) return author;

  /*
   * ⭐ An NPC driving ITSELF.
   *
   * `getActingAuthor` refuses any chain containing a forced frame, and
   * that is right for AUTHORSHIP: a forced command may have been made to
   * run by somebody else, and a provenance row that named the wrong
   * person would be worse than none.
   *
   * But it made contracts the outlier in the economy. Every other
   * economic act an NPC performs — `buy` and `consign`, both of which
   * move real money — resolves its principal from the command GIVER and
   * the wallet's active account, and works. ⚠⚠ Found by DRIVING: the
   * supply brains' `job post` came back *"no attributable poster"* and
   * the whole labor market was inert, on a build whose second purpose is
   * that labor market. No unit test would have caught it, because no
   * unit test posts through a brain.
   *
   * ⚠ The narrowing is what makes it safe: a chain whose frames do not
   * all share ONE giver is still unattributable, so a forced command
   * somebody else caused is refused exactly as it was.
   */
  const commands = ExecutionContextApi.getCommandStack();
  if (commands.length === 0) return null;
  const givers = new Set(commands.map((c) => c.context.commandGiver));
  return givers.size === 1
    ? ((commands[0]!.context.commandGiver as Stuff) ?? null)
    : null;
}

/** The acting principal's durable key, or "". */
function actorKey(): string {
  return actor()?.getIdentityPath() ?? "";
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
 * demand). Null when the path names nothing buildable.
 */
async function resolveDestination(path: string): Promise<Stuff | null> {
  // ⚠ The multi-instance form, for the same reason the item check uses
  // it: fixtures are SHARED ROWS. One `/trade/haulage/thing/receiving-
  // bench` row stands in every venue that receives goods, so the
  // singleton lookup throws the day a second venue has one — and the
  // throw would land inside a forced NPC command, where it is invisible.
  const live = StuffApi.findAllByTemplatePath(path)[0];
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
/**
 * How much of what the condition asks for is delivered at `dest` — the
 * `supply` tally. ⭐ A COUNT of things for a kind, and a measured
 * QUANTITY for a category: six litres of gin is six litres whether it
 * arrived in one demijohn or eight bottles, which is the whole point of
 * letting a contract say what the business wants.
 *
 * ⭐ The same walk as {@link findDeliveredItemAt}, counting instead of
 * short-circuiting. It is a separate function rather than a flag because
 * the two questions differ in cost: delivery stops at the first hit and
 * supply cannot.
 *
 * ⚠ `Stackable` goods are refused by `matchesItem`, so this counts
 * DISCRETE things — ten lumps of ore, not a merged stack of ten. That is
 * the same identity rule crates exist for, and it is why a supply gig
 * for something fungible is unpostable rather than unverifiable.
 */
function countDeliveredItemsAt(
  dest: Stuff,
  condition: ConditionData,
  depth = 0,
): number {
  let found = 0;
  if (MixinApi.isSurfaced(dest)) {
    for (const item of dest.getResting()) {
      if (
        new Condition(condition).matchesItem(item) &&
        new Condition(condition).holdsFor(item)
      ) {
        found += contributionOf(condition, item);
      }
    }
  }
  if (depth > MAX_SEARCH_DEPTH || !MixinApi.isContainer(dest)) return found;
  for (const item of dest.getContents()) {
    if (item instanceof Creature) continue;
    if (
      new Condition(condition).matchesItem(item) &&
      new Condition(condition).holdsFor(item)
    ) {
      found += contributionOf(condition, item);
    }
    found += countDeliveredItemsAt(item, condition, depth + 1);
  }
  return found;
}

/**
/**
 * ⚠ The longest gap a single sample may credit. The far-past guard the
 * condition reconciles already use: a world that was down overnight must
 * not pay a night's wages to somebody who logged out in the right
 * doorway. Comfortably longer than the sweep interval, so an ordinary
 * missed tick still pays in full.
 */
const MAX_WATCH_SAMPLE_SEC = 900;

/**
 * ⭐⭐⭐ **The watch reconcile — a guard is paid for being there, and
 * being there is something the engine can see without being told.**
 *
 * ⚠⚠ This replaced a `watch` VERB, and the reasoning is the build's
 * sharpest correction. Typing `watch` never made anybody keep watch; it
 * marked an intention, and the engine then trusted it. But the clause is
 * *"be at place P for N hours"*, and where somebody is standing is a
 * fact the engine already holds. So there is no verb, no engagement and
 * nothing to remember to type: you claim the gig, you go and stand at
 * the post, and the contract notices.
 *
 * ⭐ **The `AttendanceEngagement` precedent decided it.** A shopkeeper
 * does not type `attend` — attendance starts because a customer arrived
 * and the roster says who is on shift. Standing a post is the same
 * shape, and it should not have needed a word.
 *
 * ⭐⭐ **And the hands-free rule got better by losing its rule.** The old
 * engagement CLAIMED `body`/`hands`/`attention`, so the game refused to
 * let you craft while on watch. Now nothing refuses: craft if you like —
 * those minutes simply do not count. That is the same doctrine as the
 * guard who was robbed blind and still gets paid. **The engine measures
 * presence, not virtue**, and a bad guard is expressed by a short
 * paycheque instead of by a prohibition somebody had to write.
 */
async function reconcileWatchesImpl(): Promise<number> {
  if (!active()) return 0;
  const now = worldSeconds();
  if (now <= 0) return 0;
  let credited = 0;
  for (const record of await ContractRecord.findAllClaimed()) {
    const condition = conditionOf(record);
    if (condition?.template !== "watch") continue;
    const seen = record.watchSeenSec ?? 0;
    // ⚠ First sight stamps and pays nothing — the first-touch rule. An
    // unstamped record is a gig just claimed, not an eight-hour vigil.
    const elapsed = seen > 0 ? Math.min(now - seen, MAX_WATCH_SAMPLE_SEC) : 0;
    record.watchSeenSec = now;
    if (elapsed > 0 && standingThePost(record, condition)) {
      record.watchedSec = (record.watchedSec ?? 0) + elapsed;
      credited++;
    }
    await record.save();
  }
  return credited;
}

/**
 * Is the claimant, right now, at the post with their hands free?
 *
 * ⚠ Deliberately three cheap facts and no fourth. Whether they were
 * *watching* is not a modelled thing and must never be guessed at.
 */
function standingThePost(
  record: ContractRecord,
  condition: ConditionData,
): boolean {
  const worker = claimantStuff(record);
  if (!worker) return false; // logged out, or not resident — nobody is there
  if (!MixinApi.isContainable(worker)) return false;
  if (worker.getContainer()?.getTemplatePath() !== condition.destinationPath) {
    return false;
  }
  // ⭐ Hands free, expressed as the absence of any other engagement
  // rather than as a rule about which acts a guard may perform. Hewing
  // takes your hands; while it does, you are not standing a post.
  if (MixinApi.isEngaged(worker) && worker.getEngagements().length > 0) {
    return false;
  }
  return true;
}

/**
 * The live body behind a claimant key, or null when nobody is standing
 * there.
 *
 * ⭐ Resolved off the CONNECTED roster rather than by a lookup, and that
 * is the honest reading rather than a shortcut: a guard who logged out is
 * not at their post, so a claimant with no live avatar should accrue
 * nothing. The absent case and the not-here case are the same case.
 */
function claimantStuff(record: ContractRecord): Stuff | null {
  if (!record.claimant) return null;
  for (const avatar of PlayerApi.connectedAvatars()) {
    const who = avatar as unknown as Stuff;
    if (who.getIdentityPath() === record.claimant) return who;
  }
  return null;
}

/** Whether the condition is satisfied at `dest` — one, or a tally. */
function conditionHoldsAt(dest: Stuff, condition: ConditionData): boolean {
  if (condition.template === 'supply') {
    return (
      countDeliveredItemsAt(dest, condition) >= new Condition(condition).countOf()
    );
  }
  return findDeliveredItemAt(dest, condition) !== null;
}

function findDeliveredItemAt(
  dest: Stuff,
  condition: ConditionData,
  depth = 0,
): Stuff | null {
  if (MixinApi.isSurfaced(dest)) {
    for (const item of dest.getResting()) {
      if (
        new Condition(condition).matchesItem(item) &&
        new Condition(condition).holdsFor(item)
      ) {
        return item;
      }
    }
  }
  if (depth > MAX_SEARCH_DEPTH || !MixinApi.isContainer(dest)) return null;
  for (const item of dest.getContents()) {
    if (item instanceof Creature) continue;
    if (
      new Condition(condition).matchesItem(item) &&
      new Condition(condition).holdsFor(item)
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
 * NPC standup) — the nudge no-ops then (the regard face's documented degrade);
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
      Money.of(record.rewardMinor, BankingApi.compactCurrency()),
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
    if (MixinApi.isBeliefStore(issuerPerson)) {
      issuerPerson.adjustRegard(
        contractor,
        -dial(AppSettingKeys.contractBreachRegardPenalty, 15),
      );
    }
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
        Money.of(record.rewardMinor, BankingApi.compactCurrency()),
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

/** Resolve the issuer party + funding account for a post (a player's
 * primary account, or the proprietor's Business account with `asBusiness`;
 * bounty escrows now, exclusive funds-checks now and holds at claim). */
async function resolveIssuer(
  poster: Stuff,
  asBusiness: boolean,
): Promise<
  | { ok: true; party: ContractParty; accountId: string }
  | { ok: false; reason: string }
> {
  if (asBusiness) {
    /*
     * ⭐ The PROPRIETOR, or somebody who buys for the house.
     *
     * It used to be the proprietor alone, which made posting the one
     * economic act an employee could not do on the house's behalf —
     * `buy` and `consign … --ask` both already spend the house's money
     * through `buysFor` and the wallet's active account, and both are
     * how every producer floor in the realm works.
     *
     * ⚠⚠ Found by DRIVING: the supply brains' postings came back *"you
     * don't run a business"* on every floor at once, because a floor
     * hand holds a `purchases` position and not the proprietorship. The
     * whole labor market was inert behind it.
     *
     * **The seat is the authority.** A purchasing clerk posting work
     * their house funds is exactly what a purchasing clerk does, and it
     * carries the same authority `consign` already grants them.
     */
    const business =
      EmploymentApi.businessOfProprietor(poster) ??
      (await buysForOf(poster));
    if (!business) {
      return {
        ok: false,
        reason: "you don't run a business, and you buy for nobody",
      };
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
  const key = poster.getIdentityPath() ?? "";
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
    // ⚠⚠ `findAllByTemplatePath`, NEVER `findByTemplatePath` — the
    // singleton form THROWS when a path has more than one live instance,
    // and a kind-bound gig names a kind, which is to say the common case
    // is many. A live drive caught this: twelve bottles of gin exist, so
    // every one of the keeper's twelve postings died with
    // `expected singleton, found 12` — a controller-error, swallowed by
    // the forced command, leaving a bar that ordered nothing and said
    // nothing. It was latent until an order could name a kind the poster
    // was not holding; then it broke every kind-bound gig in the realm,
    // players included.
    const exemplar = StuffApi.findAllByTemplatePath(
      spec.condition.item.path,
    )[0];
    if (exemplar && MixinApi.isStackable(exemplar)) {
      return { ok: false, reason: "fungible goods can't be contracted" };
    }
    // ⭐ And the kind has to BE something. A poster naming a kind it has
    // none of (`job post --of <kind>`, which is how a venue that has run
    // dry orders anything at all) can name a path that is nothing at
    // all — and that gig could never be satisfied, so its escrow would
    // sit until somebody abandoned it.
    //
    // ⚠ A live instance IS the proof, checked first: if the world holds
    // one of these, the kind plainly exists and no store round-trip is
    // needed. The template row is the fallback, and it is the only path
    // a blind `--of` can take.
    if (!exemplar && !(await Template.findByPath(spec.condition.item.path))) {
      return { ok: false, reason: "there's no such kind" };
    }
  }

  // A pre-satisfied gig is degenerate — the work is already done.
  if (conditionHoldsAt(dest, spec.condition)) {
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
  // Where the work starts. An explicit `--from` wins; otherwise the
  // poster's own environment, which is the right answer for an NPC
  // posting from its floor and costs the caller nothing.
  record.origin = spec.originPath ?? originOfPoster(poster);
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
      Money.of(spec.rewardMinor, BankingApi.compactCurrency()),
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
  const key = claimer.getIdentityPath() ?? "";
  if (key === record.issuer.templatePath) {
    return { ok: false, reason: "you can't claim your own gig" };
  }
  const held = await BankingApi.escrowHold(
    record.issuerAccountId,
    contractId,
    Money.of(record.rewardMinor, BankingApi.compactCurrency()),
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
  const key = presenter.getIdentityPath() ?? "";
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
  if (!conditionHoldsAt(dest, condition)) {
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
  const key = completer.getIdentityPath() ?? "";
  if (record.claimMode === "exclusive" && record.claimant !== key) {
    return { ok: false, reason: "that isn't your claim" };
  }
  const condition = conditionOf(record);
  if (!condition) return { ok: false, reason: "that gig has no condition" };

  // Verification: live `holdsFor` now, OR a sealed post-claim `fulfilled`
  // row whose actor is the completer (the payout survives state drift).
  let verified = false;
  // ⭐ A `watch` clause verifies against the ACCRUED WATCH on the record,
  // not against anything at a destination — there is no item to find.
  if (condition.template === "watch") {
    verified = new Condition(condition).watchHolds(record.watchedSec ?? 0);
    if (!verified) {
      return { ok: false, reason: "the watch isn't served out" };
    }
  }
  const dest = verified
    ? null
    : await resolveDestination(condition.destinationPath);
  if (dest && conditionHoldsAt(dest, condition)) verified = true;
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
    // A PAYEE opening an account to receive a gig's stake; it opens on
    // nothing, like every account.
    payee = await BankingApi.ensureVenueAccount(
      key,
      custodian,
      "",
      BankingApi.compactCurrency(),
    );
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
    Money.of(record.rewardMinor, BankingApi.compactCurrency()),
  );
  await appendEvent(contractId, "settled", {
    actor: key,
    counterparty: key,
    txId,
  });
  await BankingApi.escrowClose(contractId);

  /*
   * ⭐⭐ Tell the ISSUER, and nobody else.
   *
   * A settled gig is a fact some trades act on — haulage files a bill of
   * lading, because **a player who claims a haul gig and delivers it has
   * to file the same paper `ship` at a counter does**, and D16 makes the
   * gig the dominant carriage path. The contract substrate has no
   * business knowing which trades those are, so it calls a `@hook` on
   * the business that posted the work and names no trade.
   *
   * ⚠⚠ This was a global bus event (`contract.settled`) with exactly one
   * emitter and one subscriber, and it cost the kernel three pieces of
   * vocabulary to serve one pack — an `Events` entry, an interface
   * shaped around that pack's fields, and an `emittableBy()` policy left
   * OPEN so anything could forge the announcement. The hook is narrower
   * in every direction and the kernel learns no new nouns.
   *
   * ⚠ Fire-and-forget, and it must stay that way: the money has already
   * moved. A throwing override must not unwind a completed contract.
   */
  const issuerBusiness = StuffApi.findAllByTemplatePath(
    fresh.issuer.templatePath,
  )[0];
  if (issuerBusiness && MixinApi.isBusiness(issuerBusiness)) {
    void issuerBusiness
      .onContractSettled(fresh)
      .catch((err) =>
        console.error('ContractLogic: onContractSettled failed', err),
      );
  }
  return { ok: true, paidMinor: record.rewardMinor };
}

async function openGigsOnImpl(boardPath: string): Promise<ContractRecord[]> {
  if (!active()) return [];
  return liveAfterExpiry(await ContractRecord.findLiveByBoard(boardPath));
}

async function openGigsFromImpl(
  originPath: string,
): Promise<ContractRecord[]> {
  if (!active() || originPath.length === 0) return [];
  return liveAfterExpiry(await ContractRecord.findLiveByOrigin(originPath));
}

/** Lazy expiry over a candidate set — the one place the sweep-free rule lives. */
async function liveAfterExpiry(
  live: ContractRecord[],
): Promise<ContractRecord[]> {
  const out: ContractRecord[] = [];
  for (const record of live) {
    const fresh = await expireStale(record);
    if (fresh.state === "open" || fresh.state === "claimed") out.push(fresh);
  }
  return out;
}

/**
 * The poster's own environment as a durable path — the default origin.
 * `""` when the poster is nowhere addressable, which reads as *this gig
 * names no origin* rather than as an error: a bounty for something to be
 * fetched from wherever is a legitimate posting.
 */
function originOfPoster(poster: Stuff): string {
  if (!MixinApi.isContainable(poster)) return "";
  return poster.getContainer()?.getTemplatePath() ?? "";
}


/* ═══════════════════ the credit face (economic bootstrap) ═══════════════════ */

/** Game-seconds in a game-year (the calendar's 360-day year at 86,400 game-s a day). */
const GAME_YEAR_S = 360 * 86_400;
/** The Treasury organization — the Note's counterparty, the standing facility's lender. */
const TREASURY_PATH = "/compact/treasury";
/** The papers directory every instrument files under. */
const PAPERS_DIR = "papers";

export type LoanRefusal = { ok: false; reason: string; detail: string };
export type IssueLoanResult = { ok: true; contractId: string; advanced: number } | LoanRefusal;

export interface IssueLoanSpec {
  /** The borrower — a Business (the house). */
  borrower: Stuff & BusinessShape;
  /** The lender's counter — its Terms carry the rate and the share. */
  counter: Stuff & Bank;
  principalMinor: number;
  rung: 1 | 2;
}

export interface WindowDefaultRate {
  currency: string;
  /** Σ window advances behind loans since boot (open + closed), minor units. */
  advanced: number;
  /** Σ window advances behind loans that defaulted, minor units. */
  defaulted: number;
  /** defaulted ÷ advanced, or 0. */
  rate: number;
}

export interface TreasuryPaper {
  currency: string;
  openingAdvancesOwed: number;
  notesOwed: number;
  unclaimedHeld: number;
}

/** A readable line per instrument, for `wallet`, `house book`, `bank book`. */
export interface InstrumentLine {
  contractId: string;
  kind: ContractKind;
  role: "owes" | "holds";
  counterparty: string;
  owedMinor: number;
  principalMinor: number;
  rung: CreditRung;
  state: string;
  words: string;
}

function party(kind: ContractParty["kind"], templatePath: string): ContractParty {
  return { kind, templatePath };
}

/** The Business a party names, when it is resident. */
function businessOf(p: ContractParty): (Stuff & BusinessShape) | null {
  const live = StuffApi.findByTemplatePath(p.templatePath);
  return live && MixinApi.isBusiness(live) ? (live as Stuff & BusinessShape) : null;
}

/** The primary account a party's money lands in, or null. */
async function accountOfParty(p: ContractParty): Promise<string | null> {
  if (p.kind === "business") {
    const biz = businessOf(p);
    if (biz) return EmploymentApi.operatingAccountOf(biz);
  }
  return BankingApi.primaryAccountIdOf(p.templatePath);
}

/** What a party is called, for a paper. */
function labelOfParty(p: ContractParty): string {
  if (p.templatePath === TREASURY_PATH) return "the Treasury";
  const live = StuffApi.findByTemplatePath(p.templatePath);
  if (live && MixinApi.isOrganization(live)) return EmploymentApi.organizationLabel(live);
  return live?.getPresentation() ?? p.templatePath;
}

/** The branch a party's papers file under, and the path of one instrument's paper. */
function paperPathFor(p: ContractParty, contractId: string, leaf?: string): string {
  const branch = p.kind === "player"
    ? `/home/${p.templatePath.split("/").filter(Boolean).pop() ?? ""}`
    : p.templatePath;
  return `${branch}/${PAPERS_DIR}/${leaf ?? contractId}`;
}

/** An amount in WORDS with its unit — *twenty zorkmids* — the no-gauge rule for a paper a person reads. */
function moneyInWords(minor: number): string {
  const record = Currency.of(BankingApi.compactCurrency());
  const unit = minor === 1 ? record.unit : record.plural;
  return `${GrammarApi.inWords(minor)} ${unit}`;
}

function percentInWords(fraction: number): string {
  const pct = fraction * 100;
  const whole = Math.round(pct);
  return Math.abs(pct - whole) < 1e-9 ? GrammarApi.inWords(whole) : `${pct}`;
}

/** The instrument's face, in words — what a person reads. */
function faceOf(record: ContractRecord): string {
  const t = record.terms;
  if (!t) return "";
  const money = moneyInWords;
  const lines: string[] = [];
  if (record.kind === "note") {
    lines.push(
      `An Arrival Note. ${labelOfParty(record.issuer)} issues this note to the Treasury of the Compact.`,
      `Principal: ${money(t.principalMinor)} — money entered the world against this promise.`,
      `Rate: none — the Compact's rate for newcomers.`,
      `Discharge: forgiven on the first wage earned, or after ${GrammarApi.inWords(t.dischargeAfterGameDays)} game-days, whichever comes first. You earn it into being yours.`,
      `Security: the balance it funded, and nothing else.`,
      `Recourse: none beyond the security. Walk away and the worst case is the unspent balance goes home. No labor is ever owed.`,
    );
  } else if (record.kind === "loan") {
    const secured =
      t.security.kind === "inventory"
        ? "the goods on the counter, title retained by the lender until paid"
        : t.security.kind === "account"
          ? "the balance it funded"
          : "nothing — unsecured";
    lines.push(
      `A loan. ${labelOfParty(record.issuer)} owes ${labelOfParty(record.holder ?? record.issuer)}.`,
      `Principal: ${money(t.principalMinor)}${t.rung === "opening" ? " — the Treasury's standing advance on a new house's first account" : ""}.`,
      `Rate: ${t.ratePerGameYear > 0 ? `${percentInWords(t.ratePerGameYear)} per cent a game-year (a real month)` : "none"}.`,
      `Repaid as ${percentInWords(t.share)} per cent of each inflow to the borrower's account until principal and interest are cleared. No due date.`,
      `Secured by ${secured}.`,
      `Default: no inflows for the Schedule's horizon while a balance is outstanding; the lender may then act on the security. Nothing chases the borrower beyond it.`,
    );
  } else if (record.kind === "unclaimed") {
    lines.push(
      `Unclaimed property. The Treasury holds ${money(t.principalMinor)} for ${labelOfParty(record.holder ?? record.issuer)}, reclaimable on return, whenever that is. The state cannot default.`,
    );
  }
  return lines.join("\n");
}

/** Write (or rewrite) an instrument's paper under each party's branch. */
async function fileInstrument(record: ContractRecord, appended: string[] = []): Promise<void> {
  const data = {
    contractId: record.contractId,
    kind: record.kind,
    state: record.state,
    issued: record.postedAt,
    face: faceOf(record),
    owedMinor: record.owedMinor,
    history: appended,
  };
  const parties: ContractParty[] = [record.issuer];
  if (record.holder) parties.push(record.holder);
  for (const p of parties) {
    const leaf = record.kind === "note" && p.kind === "player" ? "arrival-note" : record.contractId;
    try {
      await DocumentApi.saveInstrument(p.templatePath, paperPathFor(p, record.contractId, leaf), data);
    } catch {
      /* a party with no branch (a raw test key) keeps no paper — the row is the claim */
    }
  }
}

/** Append a dated line to an instrument's papers. */
async function appendToPapers(record: ContractRecord, line: string): Promise<void> {
  const history: string[] = [];
  const first = record.holder ?? record.issuer;
  const leaf = record.kind === "note" && record.issuer.kind === "player" ? "arrival-note" : record.contractId;
  const existing = await DocumentApi.read(paperPathFor(record.issuer, record.contractId, leaf)).catch(() => null);
  const prior = (existing?.data as { history?: unknown } | undefined)?.history;
  if (Array.isArray(prior)) history.push(...prior.filter((x): x is string => typeof x === "string"));
  void first;
  history.push(line);
  await fileInstrument(record, history);
}

/**
 * ⭐ Accrual is stamp-forward on every touch: `owed *= (1 + r)^(Δ game-years)`,
 * the continuous-compounding approximation over the interval since the
 * last stamp, in integer minor units. A 0% instrument only re-stamps.
 */
function accrue(record: ContractRecord): void {
  const now = worldSeconds();
  const t = record.terms;
  if (!t || record.owedMinor <= 0) {
    record.owedStampS = now;
    return;
  }
  const dt = Math.max(0, now - record.owedStampS);
  if (t.ratePerGameYear > 0 && dt > 0) {
    const years = dt / GAME_YEAR_S;
    record.owedMinor = Math.round(record.owedMinor * Math.pow(1 + t.ratePerGameYear, years));
  }
  record.owedStampS = now;
}

/** A new instrument row, common to every kind. */
function newInstrument(
  kind: ContractKind,
  issuer: ContractParty,
  holder: ContractParty,
  terms: CreditTermsData,
): ContractRecord {
  const record = new ContractRecord();
  record.contractId = SecurityApi.uuid();
  record.kind = kind;
  record.state = "open";
  record.issuer = issuer;
  record.holder = holder;
  record.terms = terms;
  record.owedMinor = terms.principalMinor;
  record.owedStampS = worldSeconds();
  record.postedAt = worldSeconds();
  return record;
}

/* ── the gates: reads of the borrower's own ledger ── */

/**
 * Completed supplier terms — the borrower's PURCHASE HISTORY (the
 * requirements' rung-1 borrower is *"a shop with a clean purchase
 * history"*): `payment` legs OUT of the borrower's account that paid a
 * supplier for goods. Two shapes, one event: a `terms` leg (the shop
 * paying a consignor at sale — rung 0 completed) and a `sales` leg to
 * another HOUSE's account (the keeper paying at a supplier's counter —
 * the same term, settled on the spot). ⭐ Build decision (W7): the plan's
 * gate read only the `terms` leg, under which a shop that buys for cash
 * at the cash-and-carry — every keeper's `stocks` beat — could never
 * climb, and the NPC borrower the drive watches would have been dead.
 */
async function completedTermsOf(borrowerAccountId: string): Promise<number> {
  const rows = await BankingApi.entriesFor(borrowerAccountId);
  const houses = new Map<string, boolean>();
  let n = 0;
  for (const r of rows) {
    if (r.fromAccount !== borrowerAccountId || r.kind !== "payment") continue;
    if (r.category === "terms") {
      n += 1;
      continue;
    }
    if (r.category !== "sales" || !r.toAccount) continue;
    let isHouse = houses.get(r.toAccount);
    if (isHouse === undefined) {
      const owner = await BankingApi.ownerKeyOf(r.toAccount);
      const live = owner ? StuffApi.findByTemplatePath(owner) : null;
      isHouse = live !== undefined && live !== null && MixinApi.isBusiness(live);
      houses.set(r.toAccount, isHouse);
    }
    if (isHouse) n += 1;
  }
  return n;
}

/** Loans of `rung` the borrower has fully repaid. */
async function settledLoansOf(borrowerKey: string, rung: CreditRung): Promise<number> {
  const rows = await ContractRecord.findByKind("loan", "settled");
  return rows.filter((r) => r.issuer.templatePath === borrowerKey && r.terms?.rung === rung).length;
}

/** Loans the borrower has defaulted on (ever). */
async function defaultedLoansOf(borrowerKey: string): Promise<number> {
  const rows = await ContractRecord.findByKind("loan", "breached");
  return rows.filter((r) => r.issuer.templatePath === borrowerKey).length;
}

/** The share a lender posts, clamped to the reserve's bounds. */
function clampShare(posted: number): number {
  const min = dial(AppSettingKeys.reserveRepaymentShareMin, 0.1);
  const max = dial(AppSettingKeys.reserveRepaymentShareMax, 0.5);
  const share = posted > 0 ? posted : min;
  return Math.min(max, Math.max(min, share));
}

/**
 * ⭐ **Issue a loan** — rungs 1 and 2 (economic bootstrap D12). Every gate
 * is a read of the borrower's own ledger, and a refusal names the number.
 * Rung 1 (inventory finance): the bank advances the principal from its
 * own balance, then presents the paper at the window and is advanced
 * `(1 − h) × principal` back — so the bank need only hold the haircut
 * share. Rung 2 (working capital): from the bank's own balance only,
 * unsecured, bounded by the Schedule's cap.
 */
async function issueLoanImpl(spec: IssueLoanSpec): Promise<IssueLoanResult> {
  if (!active()) return { ok: false, reason: "offline", detail: "" };
  const { borrower, counter, principalMinor, rung } = spec;
  if (!Number.isInteger(principalMinor) || principalMinor <= 0) {
    return { ok: false, reason: "bad-amount", detail: String(principalMinor) };
  }
  const terms = counter.getTerms();
  if (!terms.lends()) {
    return { ok: false, reason: "no-lending-terms", detail: counter.getBank() };
  }
  const counterPath = counter.getTemplatePath() ?? "";
  const lender = counterPath ? await EmploymentApi.ensureOperatorAt(counterPath) : null;
  if (!lender) {
    return { ok: false, reason: "no-lender", detail: counterPath };
  }
  if (!lender.isChartered("bank")) {
    return { ok: false, reason: "not-chartered", detail: lender.getTemplatePath() ?? "" };
  }
  const borrowerKey = borrower.getAccountPath();
  const borrowerAccount = await EmploymentApi.operatingAccountOf(borrower);
  const lenderAccount = await EmploymentApi.operatingAccountOf(lender);
  const currency = BankingApi.compactCurrency();

  // The gates — numbers of ledger events, named in the refusal.
  const defaulted = await defaultedLoansOf(borrowerKey);
  if (defaulted > 0) {
    return { ok: false, reason: "ladder-gate", detail: `a defaulted loan stands on the book: ${GrammarApi.inWords(defaulted)}` };
  }
  let security: CreditSecurity = { kind: "none" };
  let windowAdvanceMinor = 0;
  if (rung === 1) {
    const need = Math.max(0, Math.floor(dial(AppSettingKeys.reserveLadderTermsRequired, 3)));
    const have = await completedTermsOf(borrowerAccount);
    if (have < need) {
      return {
        ok: false,
        reason: "ladder-gate",
        detail: `${GrammarApi.inWords(need)} completed supplier terms are required; you have ${GrammarApi.inWords(have)}`,
      };
    }
    const counters = borrower.getOperatingLocations().filter((p) => {
      const live = StuffApi.findByTemplatePath(p);
      return live !== undefined && MixinApi.isConsignmentShelf(live);
    });
    const secured = counters[0];
    if (!secured) {
      return { ok: false, reason: "no-security", detail: "the house operates no counter to pledge" };
    }
    security = { kind: "inventory", counterPath: secured };
    const haircut = dial(AppSettingKeys.reserveHaircut, 0.2);
    windowAdvanceMinor = Math.floor(principalMinor * (1 - haircut));
    const bankMustHold = principalMinor - windowAdvanceMinor;
    if (BankingApi.balanceOf(lenderAccount).minor < bankMustHold) {
      return {
        ok: false,
        reason: "lender-short",
        detail: `the bank must hold the haircut share, ${Money.of(bankMustHold, currency).render()}`,
      };
    }
  } else {
    const need = Math.max(0, Math.floor(dial(AppSettingKeys.reserveLadderLoansRequired, 2)));
    const have = await settledLoansOf(borrowerKey, 1);
    if (have < need) {
      return {
        ok: false,
        reason: "ladder-gate",
        detail: `${GrammarApi.inWords(need)} repaid inventory loans are required; you have ${GrammarApi.inWords(have)}`,
      };
    }
    const cap = Math.floor(dial(AppSettingKeys.reserveLadderWorkingCapitalCap, 5000));
    const drawn = (await ContractRecord.findOpenByIssuer(borrowerKey, "loan"))
      .filter((r) => r.terms?.rung === 2)
      .reduce((n, r) => n + r.owedMinor, 0);
    if (drawn + principalMinor > cap) {
      return {
        ok: false,
        reason: "ladder-gate",
        detail: `the working-capital line is capped at ${Money.of(cap, currency).render()}; ${Money.of(drawn, currency).render()} is drawn`,
      };
    }
    if (BankingApi.balanceOf(lenderAccount).minor < principalMinor) {
      return { ok: false, reason: "lender-short", detail: "the bank lends working capital from its own balance only" };
    }
  }

  // The bank must hold the whole principal at the moment it advances; the
  // window refills (1 − h) of it a breath later. So a rung-1 lender whose
  // balance is between the haircut share and the principal is bridged by
  // the window FIRST — the paper exists (the row is written below) before
  // the mint, and the mint is memo'd to it.
  const record = newInstrument(
    "loan",
    party("business", borrowerKey),
    party("business", lender.getTemplatePath() ?? ""),
    {
      rung,
      ratePerGameYear: terms.getLoanRatePerGameYear(),
      share: clampShare(terms.getRepaymentShare()),
      security,
      principalMinor,
      windowAdvanceMinor,
      dischargeOnFirstWage: false,
      dischargeAfterGameDays: 0,
    },
  );
  await saveRecord(record);
  if (windowAdvanceMinor > 0) {
    await BankingApi.windowAdvance(lenderAccount, Money.of(windowAdvanceMinor, currency), record.contractId);
  }
  const txId = await BankingApi.advance(lenderAccount, borrowerAccount, Money.of(principalMinor, currency), `loan ${record.contractId}`);
  await appendEvent(record.contractId, "advanced", {
    counterparty: borrowerKey,
    txId,
    memo: rung === 1 ? `inventory finance; window ${windowAdvanceMinor}` : "working capital",
  });
  await fileInstrument(record);
  return { ok: true, contractId: record.contractId, advanced: principalMinor };
}

/**
 * The standing facility (economic bootstrap D9): a business's OPENING
 * ADVANCE — a 0% loan from the Treasury on its first account, secured by
 * that account, repaid as a share of inflows like any loan. Refused (a
 * value) when the treasury cannot cover it. Idempotent per borrower.
 */
async function openingAdvanceImpl(businessKey: string): Promise<IssueLoanResult> {
  if (!active()) return { ok: false, reason: "offline", detail: "" };
  const live = StuffApi.findByTemplatePath(businessKey);
  if (!live || !MixinApi.isBusiness(live)) return { ok: false, reason: "no-business", detail: businessKey };
  const business = live as Stuff & BusinessShape;
  const borrowerKey = business.getAccountPath();
  const already = (await ContractRecord.findOpenByIssuer(borrowerKey, "loan")).some((r) => r.terms?.rung === "opening");
  if (already) return { ok: false, reason: "already-advanced", detail: borrowerKey };
  const principalMinor = Math.floor(dial(AppSettingKeys.treasuryOpeningAdvance, 0));
  if (principalMinor <= 0) return { ok: false, reason: "no-facility", detail: "" };
  const currency = BankingApi.compactCurrency();
  await BankingApi.reconcilePerpetual(currency);
  const treasury = await BankingApi.treasuryAccountId(currency);
  // ⚠ The PRIMARY account read, not `operatingAccountOf` — that seam is
  // what asked for this advance, and asking it back would recurse until
  // the heap went (found the first time it ran).
  const borrowerAccount = await BankingApi.primaryAccountIdOf(borrowerKey);
  if (!borrowerAccount) return { ok: false, reason: "no-account", detail: borrowerKey };
  if (BankingApi.balanceOf(treasury).minor < principalMinor) {
    return { ok: false, reason: "treasury-short", detail: Money.of(principalMinor, currency).render() };
  }
  const record = newInstrument(
    "loan",
    party("business", borrowerKey),
    party("organization", TREASURY_PATH),
    {
      rung: "opening",
      ratePerGameYear: 0,
      share: clampShare(0),
      security: { kind: "account", accountId: borrowerAccount },
      principalMinor,
      windowAdvanceMinor: 0,
      dischargeOnFirstWage: false,
      dischargeAfterGameDays: 0,
    },
  );
  await saveRecord(record);
  const txId = await BankingApi.advance(treasury, borrowerAccount, Money.of(principalMinor, currency), `opening advance ${record.contractId}`);
  await appendEvent(record.contractId, "advanced", { counterparty: borrowerKey, txId, memo: "opening advance" });
  await fileInstrument(record);
  return { ok: true, contractId: record.contractId, advanced: principalMinor };
}

export type IssueNoteResult = { ok: true; contractId: string; principal: number; paperPath: string } | LoanRefusal;

/**
 * ⭐ **The Arrival Note** (economic bootstrap D10). At `embody confirm`
 * the member ISSUES a note to the Treasury and receives the principal as
 * coin in hand — money entered the world against this promise. Rate 0
 * (the Compact's rate for newcomers); discharged by the first wage or by
 * the Schedule's game-days, whichever first; secured by the balance it
 * funded and nothing else; NO RECOURSE beyond it. Written by the machine,
 * filed in the member's own papers at `/home/<key>/papers/arrival-note`.
 * No character in the fiction hands it over. Idempotent per member.
 */
async function issueNoteImpl(key: string): Promise<IssueNoteResult> {
  if (!active()) return { ok: false, reason: "offline", detail: "" };
  if (!key) return { ok: false, reason: "no-identity", detail: "" };
  // The member, resident: an Avatar by its player id, else whatever is
  // registered at the key (a fixture).
  const playerId = key.startsWith("/platform/agent/Avatar/") ? key.split("/").filter(Boolean).pop() ?? "" : "";
  const live = (playerId ? PlayerApi.findAvatarByPlayerId(playerId) : undefined) ?? StuffApi.findByTemplatePath(key);
  if (!live || !MixinApi.isContainer(live)) return { ok: false, reason: "no-hands", detail: key };
  const avatar = live as Stuff & Container;
  const already = await ContractRecord.findOpenByIssuer(key, "note");
  if (already.length > 0) return { ok: false, reason: "already-issued", detail: key };
  const principal = Math.floor(dial(AppSettingKeys.treasuryArrivalPrincipal, 0));
  if (principal <= 0) return { ok: false, reason: "no-facility", detail: "" };
  const currency = BankingApi.compactCurrency();
  await BankingApi.reconcilePerpetual(currency);
  const treasury = await BankingApi.treasuryAccountId(currency);
  if (BankingApi.balanceOf(treasury).minor < principal) {
    return { ok: false, reason: "treasury-short", detail: Money.of(principal, currency).render() };
  }
  const record = newInstrument(
    "note",
    party("player", key),
    party("organization", TREASURY_PATH),
    {
      rung: "note",
      ratePerGameYear: 0,
      share: 0,
      security: { kind: "account", accountId: "" },
      principalMinor: principal,
      windowAdvanceMinor: 0,
      dischargeOnFirstWage: true,
      dischargeAfterGameDays: Math.floor(dial(AppSettingKeys.treasuryNoteDischargeGameDays, 0)),
    },
  );
  await saveRecord(record);
  await BankingApi.disburse(treasury, avatar, Money.of(principal, currency), "arrival");
  await appendEvent(record.contractId, "advanced", { counterparty: key, memo: "the Arrival Note's principal, in hand" });
  await fileInstrument(record);
  return { ok: true, contractId: record.contractId, principal, paperPath: paperPathFor(record.issuer, record.contractId, "arrival-note") };
}

/** Discharge a note: forgiven, the row settled, the paper appended. */
async function dischargeNote(record: ContractRecord, why: string): Promise<void> {
  record.state = "settled";
  record.owedMinor = 0;
  record.closedAt = worldSeconds();
  await saveRecord(record);
  await appendEvent(record.contractId, "discharged", { memo: why });
  await appendToPapers(record, `Discharged: ${why}. The balance is yours.`);
}

/**
 * ⭐ A wage landed for `workerKey` — the Note's discharge (economic
 * bootstrap D10): every open note the worker issued is forgiven. Returns
 * the discharged note ids so the payroll can tell them, if resident.
 */
async function onWageLandedImpl(workerKey: string): Promise<string[]> {
  if (!active() || !workerKey) return [];
  const notes = await ContractRecord.findOpenByIssuer(workerKey, "note");
  const out: string[] = [];
  for (const note of notes) {
    if (!note.terms?.dischargeOnFirstWage) continue;
    await dischargeNote(note, "the first wage was earned");
    out.push(note.contractId);
  }
  return out;
}

/** The lazy discharge: a note past its game-days active is forgiven on any touch. */
async function reconcileNotesImpl(issuerKey: string): Promise<string[]> {
  if (!active() || !issuerKey) return [];
  const notes = await ContractRecord.findOpenByIssuer(issuerKey, "note");
  const out: string[] = [];
  const now = worldSeconds();
  for (const note of notes) {
    const days = note.terms?.dischargeAfterGameDays ?? 0;
    if (days <= 0) continue;
    if (now - note.postedAt < days * 86_400) continue;
    await dischargeNote(note, `${GrammarApi.inWords(days)} game-days active`);
    out.push(note.contractId);
  }
  return out;
}

/**
 * The share of an inflow taken for the payee's creditors — the rider
 * splits `settle` appends (economic bootstrap D12): for each open loan
 * the payee has issued (oldest first), `share × amount` up to what is
 * owed, to the creditor's account, category `repayment`; accrued interest
 * first as `interest`. One transaction, conserving.
 */
async function repaymentSplitsForImpl(
  payeeAccountId: string,
  amountMinor: number,
): Promise<Array<RemittanceSplit & { contractId: string }>> {
  if (!active() || amountMinor <= 0) return [];
  const ownerKey = await BankingApi.ownerKeyOf(payeeAccountId);
  if (!ownerKey) return [];
  const loans = await ContractRecord.findOpenByIssuer(ownerKey, "loan");
  const out: Array<RemittanceSplit & { contractId: string }> = [];
  let left = amountMinor;
  for (const loan of loans) {
    if (left <= 0 || !loan.holder || !loan.terms) continue;
    accrue(loan);
    await saveRecord(loan);
    const creditor = await accountOfParty(loan.holder);
    if (!creditor || creditor === payeeAccountId) continue;
    const take = Math.min(loan.owedMinor, Math.round(amountMinor * loan.terms.share), left);
    if (take <= 0) continue;
    const interest = Math.max(0, loan.owedMinor - loan.terms.principalMinor);
    const asInterest = Math.min(interest, take);
    if (asInterest > 0) {
      out.push({ contractId: loan.contractId, accountId: creditor, amount: Money.of(asInterest, BankingApi.compactCurrency()), category: "interest" });
    }
    if (take - asInterest > 0) {
      out.push({ contractId: loan.contractId, accountId: creditor, amount: Money.of(take - asInterest, BankingApi.compactCurrency()), category: "repayment" });
    }
    left -= take;
  }
  return out;
}

/**
 * Record a repayment that landed: reduce what is owed, append `repaid`,
 * repay the window pro rata, and settle the row when it clears (the lien
 * releases with it).
 */
async function recordRepaymentImpl(contractId: string, amountMinor: number, txId: string): Promise<void> {
  if (!active()) return;
  const record = await ContractRecord.findByContractId(contractId);
  if (!record || record.state !== "open" || !record.terms) return;
  accrue(record);
  const before = record.owedMinor;
  record.owedMinor = Math.max(0, record.owedMinor - amountMinor);
  const principalPaid = Math.min(amountMinor, record.terms.principalMinor);
  record.terms = { ...record.terms, principalMinor: Math.max(0, record.terms.principalMinor - principalPaid) };
  await appendEvent(contractId, "repaid", { txId, memo: `${amountMinor} of ${before}` });
  // The window: the bank repays the reserve the same fraction of the advance.
  if (record.terms.windowAdvanceMinor > 0 && record.holder) {
    const lenderAccount = await accountOfParty(record.holder);
    const originalPrincipal = record.terms.principalMinor + principalPaid;
    const windowShare = originalPrincipal > 0 ? Math.round(record.terms.windowAdvanceMinor * (principalPaid / originalPrincipal)) : 0;
    if (lenderAccount && windowShare > 0) {
      await BankingApi.windowRepay(lenderAccount, Money.of(windowShare, BankingApi.compactCurrency()), contractId);
      record.terms = { ...record.terms, windowAdvanceMinor: Math.max(0, record.terms.windowAdvanceMinor - windowShare) };
    }
  }
  if (record.owedMinor <= 0) {
    record.state = "settled";
    record.closedAt = worldSeconds();
    await appendEvent(contractId, "settled", { memo: "repaid in full; the lien is released" });
    await saveRecord(record);
    await appendToPapers(record, "Repaid in full. The lien is released.");
    return;
  }
  await saveRecord(record);
}

/** The newest inflow (a credit) to `accountId`, in game-seconds, or 0. */
async function lastInflowAt(accountId: string): Promise<number> {
  const rows = await BankingApi.entriesFor(accountId);
  let newest = 0;
  for (const r of rows) if (r.toAccount === accountId && r.at > newest) newest = r.at;
  return newest;
}

/**
 * ⭐ Default is REVEALED on read, never scheduled (economic bootstrap
 * D12): a loan whose borrower has had no inflows for the Schedule's
 * horizon while a balance is outstanding is in default. The creditor's
 * rule then acts — repossession of the pledged counter's goods to the
 * lender's counter — and the window advance behind it is written off on
 * the record (the reserve's default rate reads it). Returns how many
 * loans defaulted on this read.
 */
async function reconcileLoansImpl(borrowerKey: string | null): Promise<number> {
  if (!active()) return 0;
  const horizonDays = dial(AppSettingKeys.reserveDefaultHorizonGameDays, 30);
  const horizonS = horizonDays * 86_400;
  const open = borrowerKey
    ? await ContractRecord.findOpenByIssuer(borrowerKey, "loan")
    : await ContractRecord.findByKind("loan", "open");
  let defaulted = 0;
  const now = worldSeconds();
  for (const loan of open) {
    if (!loan.terms || loan.owedMinor <= 0) continue;
    const account = await accountOfParty(loan.issuer);
    if (!account) continue;
    const last = Math.max(await lastInflowAt(account), loan.postedAt);
    if (now - last < horizonS) continue;
    accrue(loan);
    loan.state = "breached";
    loan.closedAt = now;
    await saveRecord(loan);
    await appendEvent(loan.contractId, "defaulted", {
      memo: `no inflows for ${GrammarApi.inWords(Math.floor(horizonDays))} game-days; window ${loan.terms.windowAdvanceMinor}`,
    });
    defaulted += 1;
    await repossess(loan);
    await appendToPapers(loan, "In default: no inflows for the horizon. The lender has acted on the security.");
  }
  return defaulted;
}

/** The creditor's rule on default: every good on the pledged counter the borrower owns goes to the lender's counter. */
async function repossess(loan: ContractRecord): Promise<void> {
  const t = loan.terms;
  if (!t || t.security.kind !== "inventory" || !loan.holder) return;
  const shelf = StuffApi.findByTemplatePath(t.security.counterPath);
  const lender = businessOf(loan.holder);
  if (!shelf || !MixinApi.isContainer(shelf) || !lender) return;
  const lenderCounter = lender
    .getOperatingLocations()
    .map((p) => StuffApi.findByTemplatePath(p))
    .find((s): s is Stuff & Container => s !== undefined && MixinApi.isContainer(s) && MixinApi.isBank(s));
  if (!lenderCounter) return;
  let taken = 0;
  for (const item of [...shelf.getContents()]) {
    if (!MixinApi.isChattel(item)) continue;
    const owner = await item.chattelOwner();
    if (!owner || owner.kind === "group" || owner.templatePath !== loan.issuer.templatePath) continue;
    await item.transferChattel(lender as unknown as Stuff);
    ContainmentApi.move(item as unknown as Stuff & Containable, lenderCounter);
    if (MixinApi.isConsignmentShelf(shelf)) shelf.removeListing(item.getChattelId());
    taken += 1;
  }
  await appendEvent(loan.contractId, "repossessed", { memo: `${taken} good(s) taken to the lender's counter` });
}

/** The reserve's default rate on window paper: Σ defaulted window advances ÷ Σ window advances. */
async function windowDefaultRateImpl(currency: string): Promise<WindowDefaultRate> {
  if (!active()) return { currency, advanced: 0, defaulted: 0, rate: 0 };
  const rows = await ContractRecord.find<ContractRecord>({ kind: "loan" });
  let advanced = 0;
  let defaulted = 0;
  for (const r of rows) {
    if (r.terms?.rung !== 1) continue;
    // The window advance BEHIND the paper is the figure at issue. A live
    // or settled row carries what is still outstanding on it; a defaulted
    // one wrote the figure it was written off at onto its `defaulted`
    // event. The advance ORIGINALLY made rides the `advanced` event's
    // memo? No — it rides the `window` mint leg; the row's terms are
    // enough here: outstanding-at-default is what the reserve ate.
    const events = await ContractEvent.findByContractId(r.contractId);
    const wroteOff = events.find((e) => e.event === "defaulted");
    const behind = wroteOff
      ? Number(/window (\d+)/.exec(wroteOff.memo)?.[1] ?? r.terms.windowAdvanceMinor)
      : r.terms.windowAdvanceMinor;
    const original = Number(/window (\d+)/.exec(events.find((e) => e.event === "advanced")?.memo ?? "")?.[1] ?? NaN);
    advanced += Number.isFinite(original) ? original : behind;
    if (r.state === "breached") defaulted += behind;
  }
  return { currency, advanced, defaulted, rate: advanced > 0 ? defaulted / advanced : 0 };
}

/** The Treasury's paper: what it is owed on opening advances and notes, and what it holds unclaimed. */
async function treasuryPaperImpl(currency: string): Promise<TreasuryPaper> {
  if (!active()) return { currency, openingAdvancesOwed: 0, notesOwed: 0, unclaimedHeld: 0 };
  const held = await ContractRecord.findOpenByHolder(TREASURY_PATH, "loan");
  const notes = await ContractRecord.findOpenByHolder(TREASURY_PATH, "note");
  const unclaimed = await ContractRecord.findOpenByIssuer(TREASURY_PATH, "unclaimed");
  const sum = (rows: ContractRecord[]) => rows.reduce((n, r) => n + r.owedMinor, 0);
  return { currency, openingAdvancesOwed: sum(held), notesOwed: sum(notes), unclaimedHeld: sum(unclaimed) };
}

/** Every open instrument `ownerKey` issues or holds, as readable lines. */
async function instrumentsOfImpl(ownerKey: string): Promise<InstrumentLine[]> {
  if (!active() || !ownerKey) return [];
  await reconcileNotesImpl(ownerKey);
  const out: InstrumentLine[] = [];
  const money = moneyInWords;
  for (const kind of ["note", "loan", "unclaimed"] as const) {
    for (const r of await ContractRecord.findOpenByIssuer(ownerKey, kind)) {
      accrue(r);
      const other = r.holder ? labelOfParty(r.holder) : "";
      const rate = r.terms && r.terms.ratePerGameYear > 0 ? `at ${percentInWords(r.terms.ratePerGameYear)} per cent a game-year` : "at no interest";
      const words =
        kind === "note"
          ? `You hold an Arrival Note for ${money(r.terms?.principalMinor ?? 0)}, ${rate}, to ${other}.`
          : kind === "loan"
            ? `You owe ${other} ${money(r.owedMinor)} ${rate}${r.terms?.rung === "opening" ? " (the Treasury's opening advance)" : ""}.`
            : `The Treasury holds ${money(r.owedMinor)} of yours, unclaimed — reclaimable on return.`;
      out.push({ contractId: r.contractId, kind, role: "owes", counterparty: other, owedMinor: r.owedMinor, principalMinor: r.terms?.principalMinor ?? 0, rung: r.terms?.rung ?? 1, state: r.state, words });
    }
    for (const r of await ContractRecord.findOpenByHolder(ownerKey, kind)) {
      accrue(r);
      const other = labelOfParty(r.issuer);
      const words =
        kind === "unclaimed"
          ? `The Treasury holds ${money(r.owedMinor)} for you, unclaimed — reclaimable on return.`
          : `${other} owes you ${money(r.owedMinor)}${r.terms?.security.kind === "inventory" ? " — a lien on their counter's goods" : ""}.`;
      out.push({ contractId: r.contractId, kind, role: "holds", counterparty: other, owedMinor: r.owedMinor, principalMinor: r.terms?.principalMinor ?? 0, rung: r.terms?.rung ?? 1, state: r.state, words });
    }
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

  /**
   * See {@link ContractApi.reconcileWatches}.
   *
   * ⚠ The CADENCE lives on `WatchWarden`, not here. `AttendantLogic`
   * keeps its own sweep handle because it is entangled with that
   * module's hot-reload re-assertion; this one only calls a static, so
   * the timer belongs with the operator-shaped singleton that arms it —
   * and putting it there also keeps `ScheduleApi` out of this module's
   * import graph, which is not cosmetic (see the warden's docstring).
   */
  @CallSecurity(ContractApiCallers)
  public async reconcileWatches(): Promise<number> {
    return reconcileWatchesImpl();
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

  /** See {@link ContractApi.openGigsFrom}. */
  @CallSecurity(ContractApiCallers)
  public async openGigsFrom(originPath: string): Promise<ContractRecord[]> {
    return openGigsFromImpl(originPath);
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

  /* ── the credit face (economic bootstrap) ── */

  /** See {@link ContractApi.issueLoan}. */
  @CallSecurity(ContractApiCallers)
  public async issueLoan(spec: IssueLoanSpec): Promise<IssueLoanResult> {
    return issueLoanImpl(spec);
  }

  /** See {@link ContractApi.openingAdvance}. */
  @CallSecurity(ContractApiCallers)
  public async openingAdvance(businessKey: string): Promise<IssueLoanResult> {
    return openingAdvanceImpl(businessKey);
  }

  /** See {@link ContractApi.issueNote}. */
  @CallSecurity(ContractApiCallers)
  public async issueNote(memberKey: string): Promise<IssueNoteResult> {
    return issueNoteImpl(memberKey);
  }

  /** See {@link ContractApi.onWageLanded}. */
  @CallSecurity(ContractApiCallers)
  public async onWageLanded(workerKey: string): Promise<string[]> {
    return onWageLandedImpl(workerKey);
  }

  /** See {@link ContractApi.reconcileNotes}. */
  @CallSecurity(ContractApiCallers)
  public async reconcileNotes(issuerKey: string): Promise<string[]> {
    return reconcileNotesImpl(issuerKey);
  }

  /** See {@link ContractApi.repaymentSplitsFor}. */
  @CallSecurity(ContractApiCallers)
  public async repaymentSplitsFor(
    payeeAccountId: string,
    amountMinor: number,
  ): Promise<Array<RemittanceSplit & { contractId: string }>> {
    return repaymentSplitsForImpl(payeeAccountId, amountMinor);
  }

  /** See {@link ContractApi.recordRepayment}. */
  @CallSecurity(ContractApiCallers)
  public async recordRepayment(contractId: string, amountMinor: number, txId: string): Promise<void> {
    return recordRepaymentImpl(contractId, amountMinor, txId);
  }

  /** See {@link ContractApi.reconcileLoans}. */
  @CallSecurity(ContractApiCallers)
  public async reconcileLoans(borrowerKey: string | null): Promise<number> {
    return reconcileLoansImpl(borrowerKey);
  }

  /** See {@link ContractApi.windowDefaultRate}. */
  @CallSecurity(ContractApiCallers)
  public async windowDefaultRate(currency: string): Promise<WindowDefaultRate> {
    return windowDefaultRateImpl(currency);
  }

  /** See {@link ContractApi.treasuryPaper}. */
  @CallSecurity(ContractApiCallers)
  public async treasuryPaper(currency: string): Promise<TreasuryPaper> {
    return treasuryPaperImpl(currency);
  }

  /** See {@link ContractApi.instrumentsOf}. */
  @CallSecurity(ContractApiCallers)
  public async instrumentsOf(ownerKey: string): Promise<InstrumentLine[]> {
    return instrumentsOfImpl(ownerKey);
  }
}

/**
 * The business this poster buys for — the house whose account a
 * purchasing seat may spend. One, or the one operating where the poster
 * stands; ambiguity is refused rather than guessed at.
 */
async function buysForOf(
  poster: Stuff,
): Promise<(Stuff & BusinessShape) | null> {
  if (!MixinApi.isEmployed(poster)) return null;
  const houses = await poster.buysFor();
  if (houses.length === 0) return null;
  if (houses.length === 1) return houses[0] as Stuff & BusinessShape;
  const here = MixinApi.isContainable(poster)
    ? (poster.getContainer()?.getTemplatePath() ?? "")
    : "";
  return (
    (houses.find((b) => b.getOperatingLocations().includes(here)) as
      | (Stuff & BusinessShape)
      | undefined) ?? null
  );
}

/** One item's contribution toward a condition's count — inlined from
 *  `Condition` when this file turned out to be its only caller. A
 *  non-category condition counts the item once. */
function contributionOf(data: ConditionData, item: Stuff): number {
  if (data.item.kind !== 'category') return 1;
  return CategoryMeasure.contribution(item, data.item.category, data.item.unit);
}
