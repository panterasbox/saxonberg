// EmploymentLogic — the hot-reloadable logic singleton behind EmploymentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';
import { CompactApi } from '../../../api/compact';
import { GovernmentApi } from '../../../api/government';
import { PlayerApi } from '../../../api/player';
import { PerceptionApi } from '../../../api/perception';
import { BankingApi, Money } from '../../../api/banking';
import type { RemittanceSplit } from '../../../api/banking';
import { WorldClockApi } from '../../../api/worldclock';
import type { ClockHandle } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import { DefaultCalendar } from '../../../lib/time/DefaultCalendar';
import { Mixins } from '../../../lib/mixin';
import type { Business } from '../Business';
import type { Organization } from '../../../lib/employment/Organization';
import type { PrincipalRef } from '../../../lib/employment/Authority';
import type { Employed } from '../../../lib/employment/Employed';
import type { ParLine } from '../../../lib/employment/ParLine';
import {
  Employment,
  type EmploymentStatus,
} from '../../../lib/employment/Employment';
import { Currency } from "../../../lib/banking/Currency";
import { UNCAPPED } from '../../../lib/credential/Credential';

/** One game-hour in game-seconds — the roster tick cadence. */
const ONE_GAME_HOUR_S = 3_600;

/** Statuses the roster no longer governs (explicit exit — not resurrected). */
const TERMINAL: readonly EmploymentStatus[] = ['quit', 'fired'];

const EmploymentApiCallers = SecurityPolicies.FromModule(
  '/api/employment#EmploymentApi',
);

/** A Business as a live Stuff — the enumerable seeded entity. */
type BusinessStuff = Stuff & Business;
/** Any organization as a live Stuff — a Business, a ministry, a publisher. */
type OrganizationStuff = Stuff & Organization;
/** An employable actor. */
type EmployedActor = Stuff & Employed;

/**
 * **The** authority resolver: does `principal` hold `ref`? One function
 * answering one question, dispatching on the tag and nothing else.
 *
 * There is deliberately **no** "which authority does this actor satisfy?"
 * helper — that shape turns a refusal into a downgrade.
 *
 * Fails **closed** throughout: an unauthored (`null`) authority refuses
 * everyone, and each delegate already fails closed with no registry. The
 * founder passes `office` and `committee` only; see {@link PrincipalRef}
 * for why that column decides what a cold box can do at all.
 */
async function holdsAuthorityImpl(
  principal: Stuff | null,
  ref: PrincipalRef | null,
): Promise<boolean> {
  if (principal === null || ref === null) return false;
  switch (ref.kind) {
    case 'entity': {
      const path = principal.getTemplatePath();
      return path !== null && path === ref.path;
    }
    case 'office':
      return CompactApi.holdsOffice(principal, ref.office);
    case 'seat':
      return GovernmentApi.holdsSeat(principal, ref.government, ref.seat);
    case 'committee':
      // Committee membership is a group read keyed on a playerId, so the
      // Avatar narrowing comes first — a non-Avatar fails closed without
      // touching the registry.
      return PlayerApi.isAvatarStuff(principal)
        ? CompactApi.isCommitteeMember(principal, ref.parcel)
        : false;
  }
}

/**
 * Proprietor authority — the organization's appointing authority, with
 * the Prime Minister's seat as the **operator override** (content-packs
 * wave 3, D2d: "the PM may do all of it anywhere" — the accountable
 * person, checked as an OFFICE, never the founder).
 *
 * ⚠ The override rides *on top of* an authority and is never one in its
 * own right — which is why there is no `author` `PrincipalRef` kind. For
 * an `entity` authority this is byte-identical to the shipped
 * `proprietorPath` check.
 */
async function isProprietorOfImpl(
  subject: Stuff,
  organization: OrganizationStuff,
): Promise<boolean> {
  if (await holdsAuthorityImpl(subject, organization.getAppointingAuthority())) {
    return true;
  }
  return CompactApi.holdsOffice(subject, 'prime-minister');
}

/**
 * ⭐ **The one holder-resolution path**: every position at `organization`
 * mapped to the actors holding it, in a single scan.
 *
 * Two sources, unioned: live non-terminal `Employment` records (runtime
 * hires) and the authored roster (what makes a never-ticked, lazily
 * stood-up organization's holder provable). **An explicit exit suppresses
 * the roster entry** — an exit is never resurrected, the same rule
 * `holdsSeat` implements.
 *
 * Everything that asks *who holds what here* reads this — `holdersOf` and
 * the publishing entitlement both — deliberately, so there is exactly one
 * exit-handling path rather than a second one drifting away from it.
 *
 * Holders are enumerated viewer-blind: the question is about the chart,
 * not about who can see whom.
 */
function holdersByPositionImpl(
  organization: OrganizationStuff,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const organizationPath = organization.getTemplatePath() ?? '';
  if (!organizationPath) return out;
  const add = (positionKey: string, who: string): void => {
    const bucket = out.get(positionKey);
    if (bucket) bucket.add(who);
    else out.set(positionKey, new Set([who]));
  };

  const exited = new Set<string>();
  const holders = MqlApi.resolveMany('world:[mixin.EmployedMixin]', {
    commandGiver: null,
    scope: 'world',
  }).stuff.filter((s): s is EmployedActor => MixinApi.isEmployed(s));
  for (const holder of holders) {
    const who = holder.getTemplatePath() ?? '';
    if (!who) continue;
    const record = holder.getEmployment(organizationPath);
    if (!record) continue;
    if (TERMINAL.includes(record.status)) exited.add(who);
    else add(record.positionKey, who);
  }

  for (const assignment of organization.getRosterAssignments()) {
    if (!assignment.assignee || exited.has(assignment.assignee)) continue;
    add(assignment.positionKey, assignment.assignee);
  }
  return out;
}

/**
 * Every actor holding `positionKey` at `organization` — the uniform
 * *who-holds-P-in-O?* read, identical for a ministry, a shop and a
 * publisher. Durable templatePaths, in no guaranteed order.
 */
function holdersOfImpl(
  organization: OrganizationStuff,
  positionKey: string,
): string[] {
  return [...(holdersByPositionImpl(organization).get(positionKey) ?? [])];
}

/**
 * ⭐ May `principal` publish as `publisher`? Exactly *does the principal
 * hold a non-exited position at this organization whose key is in
 * `publishingPositions`* — with an **empty list meaning any position**.
 *
 * ⚠ **It never consults the appointing authority.** Appointment and
 * exercise are different powers: whoever may fill the press office's
 * positions has, by that alone, no power to publish through it. A
 * committee member holding no publishing position is **refused** — the
 * explicit negative this function exists to make true, and the one a
 * reviewer is most likely to "fix" by re-adding an `||`.
 *
 * Fails closed: an organization that does not publish, one with no
 * resolvable path, and a principal with no durable identity are all no.
 */
function mayPublishAsImpl(
  principal: Stuff | null,
  publisher: OrganizationStuff,
): boolean {
  if (principal === null) return false;
  if (!MixinApi.isPublisher(publisher)) return false;
  const who = principal.getTemplatePath();
  if (who === null || who.length === 0) return false;
  const allowed = publisher.getPublishingPositions();
  for (const [positionKey, holders] of holdersByPositionImpl(publisher)) {
    if (allowed.length > 0 && !allowed.includes(positionKey)) continue;
    if (holders.has(who)) return true;
  }
  return false;
}

/**
 * Does `principal` hold any non-exited position at `organization`? The
 * positionless twin of `mayPublishAsImpl`, over the same single
 * holder-resolution scan. Fails closed on a principal with no durable
 * identity.
 */
function holdsPositionImpl(
  principal: Stuff | null,
  organization: OrganizationStuff,
): boolean {
  if (principal === null) return false;
  const who = principal.getIdentityPath() ?? principal.getTemplatePath();
  if (!who) return false;
  for (const holders of holdersByPositionImpl(organization).values()) {
    if (holders.has(who)) return true;
  }
  return false;
}

/**
 * The organization chain above `organization`, nearest parent first — a
 * department inside a ministry, a desk inside a paper.
 *
 * ⚠ **A parent cycle is refused, not looped on** (a self-parenting
 * organization included): the walk throws rather than returning a
 * truncated chain, because a chart that eats its own tail is an authoring
 * error and a quiet partial answer hides it. A parent path that resolves
 * to nothing — or to something that is not an organization — simply ends
 * the chain: that is a gap, not a contradiction.
 */
function organizationChainOfImpl(
  organization: OrganizationStuff,
): OrganizationStuff[] {
  const out: OrganizationStuff[] = [];
  const seen = new Set<string>([organization.getTemplatePath() ?? '']);
  let current: OrganizationStuff = organization;
  for (;;) {
    const parentPath = current.getParentOrganizationPath();
    if (!parentPath) return out;
    if (seen.has(parentPath)) {
      throw new Error(
        `EmploymentLogic.organizationChainOf: parent cycle at ` +
          `'${parentPath}'`,
      );
    }
    seen.add(parentPath);
    const parent = StuffApi.findByTemplatePath(parentPath);
    if (!parent || !MixinApi.isOrganization(parent)) return out;
    out.push(parent);
    current = parent;
  }
}

/**
 * Every live Business — an MQL system enumeration (null giver: the roster
 * tick and the purchasing read must see every business regardless of any
 * viewer's fog). The singleton caches this; the free functions read it
 * fresh.
 */
function allBusinessesImpl(): BusinessStuff[] {
  const matches = MqlApi.resolveMany('world:[mixin.BusinessMixin]', {
    commandGiver: null,
    scope: 'world',
  });
  return matches.stuff.filter((s): s is BusinessStuff =>
    MixinApi.hasMixin(s, Mixins.Business),
  );
}

/** Hire `actor` into `business`'s `positionKey`. Returns the record, or null. */
async function hireImpl(
  organization: OrganizationStuff,
  actor: Stuff,
  positionKey: string,
): Promise<Employment | null> {
  if (!MixinApi.isEmployed(actor)) return null;
  const record = organization.hire(
    actor as EmployedActor,
    positionKey,
    WorldClockApi.getNow().rawValue(),
  );
  if (record) await issueHouseCardImpl(organization, actor, positionKey);
  return record;
}

/**
 * The house card — the NPC shape of the purchasing conferral (libations
 * 3d). A **player** in a `purchases` position links the operating account
 * into the implant they already carry (`wallet use house`); an NPC runs no
 * default loadout and has no implant, so a `purchases` holder that is not
 * an Avatar is dealt a `PaymentCard` linked to the business's operating
 * account at hire — the same credential kind, the same `buy`/`consign`
 * path, a different holder class. Idempotent: a card already linked to
 * that account is left alone. A business with no `banksAt` has no
 * account to link — nothing is issued.
 */
async function issueHouseCardImpl(
  organization: OrganizationStuff,
  actor: Stuff,
  positionKey: string,
): Promise<void> {
  if (!MixinApi.isBusiness(organization)) return;
  const position = organization.getPosition(positionKey);
  if (!position?.purchases) return;
  if (PlayerApi.isAvatarStuff(actor) || !MixinApi.isContainer(actor)) return;
  let account: string;
  try {
    account = await operatingAccountOfImpl(organization as BusinessStuff);
  } catch (err) {
    // A purchasing NPC with no operating account cannot trade as the
    // house — say so; a silent return left every hand cardless.
    console.warn(
      `EmploymentLogic: no house card for ${actor.getTemplatePath()} — ` +
        `${organization.getTemplatePath()} has no operating account: ${String(err)}`,
    );
    return;
  }
  for (const held of actor.getContents()) {
    if (!MixinApi.isCredentialWallet(held)) continue;
    if (held.getCredential('payment')?.hasAccount(account)) return;
  }
  await BankingApi.issueCard(account, UNCAPPED_HOUSE_CARD, actor);
  console.info(
    `EmploymentLogic: house card dealt to ${actor.getTemplatePath()} for ${organization.getTemplatePath()}`,
  );
}

/** The house card's spend cap: the position's authority is the seat's, not a number. */
const UNCAPPED_HOUSE_CARD = UNCAPPED;

/** Fire / quit — flip the record's status (history is preserved). The
 * mutation is the business's own transition when its Idea is standing;
 * lazy standup means a record can outlive the live instance, so the
 * engine's janitorial arm covers the direct write. */
async function endEmploymentImpl(
  actor: Stuff,
  organizationPath: string,
  status: 'fired' | 'quit',
): Promise<void> {
  if (!MixinApi.isEmployed(actor)) return;
  const organization = StuffApi.findByTemplatePath(organizationPath);
  if (organization && MixinApi.hasMixin(organization, Mixins.Organization)) {
    (organization as OrganizationStuff).endEmployment(
      actor as EmployedActor,
      status,
    );
  } else {
    (actor as EmployedActor)._setEmploymentStatus(organizationPath, status);
  }
  // Leaving the position takes the house account out of the wallet: the
  // link was the position's, never the holder's. Best-effort — a business
  // with no operating account (or an actor with no credential) has nothing
  // to unlink. The proprietor keeps standing authority (a cover never
  // links, so a cover's end never unlinks).
  if (organization && MixinApi.isBusiness(organization)) {
    const account = await BankingApi.primaryAccountIdOf(
      organization.getAccountPath(),
    );
    if (account) BankingApi.unlinkAccount(actor, account);
  }
}

/**
 * ⭐ Every Business `actor` **buys for**: each one where the actor holds a
 * non-exited position authored `purchases: true`, plus the one whose
 * proprietor the actor is (the proprietor buys for their own house by
 * default). The one read behind `wallet use house`, the house-stamping
 * `buy`, `consign`-as-the-business and the `house` app's gate.
 *
 * ⚠ Authority is the **position's**: a holder of the house tablet who
 * holds no position here is not in this list, whatever they carry.
 */
async function buysForImpl(actor: Stuff): Promise<BusinessStuff[]> {
  const who = actor.getIdentityPath() ?? actor.getTemplatePath();
  if (!who) return [];
  // The actor's own records + each business's roster — never the
  // world-wide holder scan (`holdersByPositionImpl`): `buysFor` runs on
  // every `consign`/`buy`-as-the-house and every keeper beat, and the
  // first live drive found it at 70% of a saturated CPU.
  const out: BusinessStuff[] = [];
  const employed = MixinApi.isEmployed(actor) ? (actor as EmployedActor) : null;
  for (const business of allBusinessesImpl()) {
    const path = business.getTemplatePath() ?? '';
    const record = employed?.getEmployment(path);
    const exited = record ? TERMINAL.includes(record.status) : false;
    const keys = new Set<string>();
    if (record && !exited) keys.add(record.positionKey);
    if (!exited) {
      for (const a of business.getRosterAssignments()) {
        if (a.assignee === who) keys.add(a.positionKey);
      }
    }
    let buys = false;
    for (const key of keys) {
      if (business.getPosition(key)?.purchases) {
        buys = true;
        break;
      }
    }
    if (!buys && (await isProprietorOfImpl(actor, business))) buys = true;
    if (buys) out.push(business);
  }
  return out;
}

/** One line of the live stock sheet — a par line against what is on hand. */
export interface StockSheetLine {
  line: ParLine;
  /** On hand, in the line's unit, over what the viewer perceives. */
  onHand: number;
  /** `max(0, level − onHand)`. */
  shortfall: number;
}

/** A glass row (or any good) that names its par category directly. */
interface Categorized {
  getCategory?(): string;
}

/**
 * Every good the viewer can perceive from where they stand, descending
 * into open containers (a bottle in a rack, a lime in a crate) but never
 * into a sealed one (a bottle in a closed cupboard is not on the sheet).
 * The viewer's own inventory counts — what you carry is on hand.
 */
function perceivedGoods(viewer: Stuff): Stuff[] {
  const out: Stuff[] = [];
  const seen = new Set<string>();
  const walk = (container: Stuff): void => {
    if (!MixinApi.isContainer(container)) return;
    for (const item of container.getContents()) {
      if (seen.has(item.stuffId)) continue;
      seen.add(item.stuffId);
      if (item !== viewer && !PerceptionApi.perceives(viewer, item)) continue;
      out.push(item);
      const closed = MixinApi.isSealable(item) && !item.isOpen();
      if (!closed) walk(item);
    }
  };
  walk(viewer);
  if (MixinApi.isContainable(viewer)) {
    const here = viewer.getContainer();
    if (here) walk(here);
  }
  return out;
}

/** Whether `item` counts against a par category (see {@link ParLine}). */
function matchesCategory(item: Stuff, category: string): boolean {
  const named = (item as unknown as Categorized).getCategory?.();
  if (named === category) return true;
  if (MixinApi.isTangible(item)) {
    const material = item.getMaterial();
    if (material?.hasTag(category)) return true;
  }
  return false;
}

/**
 * The perceived goods that count against a par `category` — the same
 * matcher the sheet sums, handed back as items so a buyer at a counter
 * can name what to `buy` (a bottle whose interior carries the tag, a
 * crate of the fruit, a glass that names the category).
 */
function goodsForImpl(viewer: Stuff, category: string): Stuff[] {
  return perceivedGoods(viewer).filter((item) => {
    if (matchesCategory(item, category)) return true;
    if (!MixinApi.isBulkable(item) || !item.hasInteriorBulk()) return false;
    return item.getBulkMaterial('interior')?.hasTag(category) ?? false;
  });
}

/**
 * The live stock sheet for `viewer` at `business` — each par line against
 * the on-hand total over the goods the **viewer perceives** (litres over
 * bulk holders whose interior material carries the category tag, kg over
 * the same by density, count over discrete goods whose material carries
 * it or that name it). One function, two consumers: `house stock` and the
 * keeper's `restocks` brain — so the NPC reads exactly the sheet a player
 * would.
 */
function stockSheetForImpl(
  viewer: Stuff,
  business: BusinessStuff,
): StockSheetLine[] {
  const goods = perceivedGoods(viewer);
  return business.getParLines().map((line) => {
    let onHand = 0;
    for (const item of goods) {
      if (line.unit === 'count') {
        if (!matchesCategory(item, line.category)) continue;
        onHand += MixinApi.isGlobbable(item) ? item.getQuantity() : 1;
        continue;
      }
      if (!MixinApi.isBulkable(item) || !item.hasInteriorBulk()) continue;
      const material = item.getBulkMaterial('interior');
      if (!material?.hasTag(line.category)) continue;
      const litres = item.getBulkAmount('interior').rawValue();
      onHand +=
        line.unit === 'L'
          ? litres
          : (litres / 1000) * material.getDensity().rawValue();
    }
    onHand = Math.round(onHand * 1000) / 1000;
    return { line, onHand, shortfall: Math.max(0, line.level - onHand) };
  });
}

/**
 * Begin a proprietor's cover: upsert a **transient, on-shift** Employment
 * against the business's (first) position — reusing the whole on-shift→
 * confer path, so the covering proprietor gains the Position's capability
 * (`MakerMixin` for the bar). Unpaid by construction: the wage settlement
 * skips a proprietor-held Employment, and the roster tick never governs the
 * proprietor (they hold no roster slot), so the cover is never resurrected
 * or paid. Idempotent-ish: a re-begin just refreshes the record.
 */
function beginCoverImpl(
  self: Stuff,
  business: OrganizationStuff,
): Employment | null {
  if (!MixinApi.isEmployed(self)) return null;
  return business.beginCover(
    self as EmployedActor,
    WorldClockApi.getNow().rawValue(),
  );
}

/** End a proprietor's cover: drop the transient cover Employment. */
function endCoverImpl(self: Stuff, business: OrganizationStuff): void {
  if (!MixinApi.isEmployed(self)) return;
  business.endCover(self as EmployedActor);
}

/**
 * The present on-shift server for a tip — a present, **active** maker in
 * `patron`'s location, other than the patron (the `CraftingLogic.resolveMaker`
 * scan, one cardinality across: whoever is tending now). The EFT tip routes
 * to this actor's account; `collect` gates on being this actor.
 */
function tipRecipientForImpl(patron: Stuff): Stuff | null {
  if (!MixinApi.isContainable(patron)) return null;
  const loc = patron.getContainer();
  if (!loc || !MixinApi.isContainer(loc)) return null;
  for (const c of loc.getContents()) {
    if (c !== patron && MixinApi.isMaker(c)) return c;
  }
  return null;
}

/**
 * The one resolution seam for a Business's operating account: custody is
 * the business's **authored** `banksAt` — where a business banks is a fact
 * about the business (a term of its arrangement), never a call-site
 * default. A business that authors no `banksAt` cannot open an operating
 * account: an authoring error, refused loudly (the
 * no-operator-to-collect-the-fare precedent).
 */
async function operatingAccountOfImpl(
  business: BusinessStuff,
): Promise<string> {
  const banksAt = business.getBanksAt();
  if (!banksAt) {
    throw new Error(
      `EmploymentLogic.operatingAccountOf: ${business.getTemplatePath()} ` +
        `authors no banksAt — a business must name the bank that custodies ` +
        `its operating account`,
    );
  }
  return BankingApi.ensureVenueAccount(
    business.getAccountPath(),
    banksAt,
    '',
    Currency.compact(),
  );
}

/**
 * Ensure a worker can be paid into an account, **payer-derived**: an NPC
 * with no account gets one opened at the *employer's* bank (your first
 * account opens where your first money comes from — the business's
 * authored `banksAt`). A **player** is never silently signed up for a
 * bank: no primary account → not payable (false); they open their own at
 * a branch.
 */
async function ensurePayableWorker(
  employeeKey: string,
  business: BusinessStuff,
): Promise<boolean> {
  if ((await BankingApi.primaryAccountIdOf(employeeKey)) != null) return true;
  const live = StuffApi.findByTemplatePath(employeeKey);
  if (live && PlayerApi.isAvatarStuff(live)) return false;
  const banksAt = business.getBanksAt();
  if (!banksAt) return false;
  // A worker's first account opens in the PAYER's currency — which is how
  // company-scrip wages will eventually work. Nothing else here is scrip.
  await BankingApi.ensureVenueAccount(
    employeeKey,
    banksAt,
    '',
    Currency.compact(),
  );
  return true;
}

/**
 * Settle the wage for a completed shift — the shift-end (on→off transition)
 * is the pay milestone: a **lump of `rate × shift-hours`, once, at the
 * boundary** (not a continuous sweep). `employment` carries the
 * `onShiftSince` stamp (captured before the caller clears it) and
 * `offTimeRaw` is the shift-end instant, so an early clock-out just pays the
 * partial. Skips the proprietor's own cover Employment (unpaid by
 * construction — no self-wage). Reads the game clock only via the passed
 * `offTimeRaw`, so a paused world (frozen clock) accrues nothing.
 *
 * The employer account keys on the **Business path** (not the venue), so
 * order income and shift wages settle on one account.
 */
async function settleShiftWageImpl(
  business: BusinessStuff,
  employeeKey: string,
  employment: Employment,
  offTimeRaw: number,
): Promise<void> {
  const onSince = employment.onShiftSince;
  if (onSince == null) return; // never actually on shift
  if (!employeeKey) return;
  // Unpaid cover: the proprietor tending their own bar draws no wage.
  if (employeeKey === business.getProprietor()) return;

  const position = business.getPosition(employment.positionKey);
  if (!position || position.wageRate <= 0) return;
  // A non-time basis accrues no shift wage (piecework pays per attributed
  // settlement, share-of-flow at the revenue split). With no authored
  // non-time Position, behavior is byte-identical to before.
  if (position.basis() !== 'time') return;

  const gameHours = (offTimeRaw - onSince) / ONE_GAME_HOUR_S;
  if (gameHours <= 0) return;
  const amount = Math.round(position.wageRate * gameHours);
  if (amount <= 0) return;

  const account = await operatingAccountOfImpl(business);
  // Payer-derived payability: an NPC worker (the terminal clerk, the bar
  // cast) gets an account opened at the employer's own bank; a player who
  // hasn't opened one forfeits until they do (never silently signed up).
  if (!(await ensurePayableWorker(employeeKey, business))) {
    console.warn(
      `EmploymentLogic: ${employeeKey} has no account to be paid into ` +
        `(players open their own at a branch) — shift wage skipped`,
    );
    return;
  }
  await BankingApi.payWage(account, employeeKey, Money.of(amount, Currency.compact()));
}

/**
 * Pay a per-settlement (piece-rate) employee for `units` attributed
 * settlements: `units × rate` as a `wage`-kind posting, category
 * `piecework` (labor income — the wage-vs-draw tax wedge stays a *kind*
 * distinction; the P&L line is the piece-rate's own). Verifies the
 * participant relationship first: a stored, non-terminal Employment at
 * this business whose Position basis is `per-settlement`.
 */
async function settlePieceworkImpl(
  business: BusinessStuff,
  employeeKey: string,
  units: number,
): Promise<void> {
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error('EmploymentLogic.settlePiecework: units must be positive');
  }
  const businessPath = business.getTemplatePath() ?? '';
  const actor = StuffApi.findByTemplatePath(employeeKey);
  if (!actor || !MixinApi.isEmployed(actor)) {
    throw new Error('EmploymentLogic.settlePiecework: no such employee');
  }
  const employment = (actor as EmployedActor).getEmployment(businessPath);
  if (!employment || TERMINAL.includes(employment.status)) {
    throw new Error(
      'EmploymentLogic.settlePiecework: no live employment at this business',
    );
  }
  const position = business.getPosition(employment.positionKey);
  if (!position || position.basis() !== 'per-settlement') {
    throw new Error(
      'EmploymentLogic.settlePiecework: the position is not piece-rate',
    );
  }
  const rate = position.compensation?.rate ?? 0;
  const amount = units * rate;
  if (amount <= 0) return;
  const account = await operatingAccountOfImpl(business);
  if (!(await ensurePayableWorker(employeeKey, business))) {
    throw new Error(
      'EmploymentLogic.settlePiecework: the employee has no account to be ' +
        'paid into (players open their own at a branch)',
    );
  }
  await BankingApi.payWage(
    account,
    employeeKey,
    Money.of(amount, Currency.compact()),
    'piecework',
    'piecework',
  );
}

/**
 * The share-of-flow splits for a revenue moment at `business`: one
 * remittance split per non-terminal Employment whose Position basis is
 * `share-of-flow` (`floor(share × amount)`, category `commission`, to the
 * holder's primary account), capped so Σ splits < amount. Empty for all
 * shipped content (no authored Position carries the basis) — the
 * consignment-split trick, now nameable on an employment arrangement.
 * Holders are enumerated viewer-blind (MQL system mode over the Employed
 * marker — share-of-flow needs no roster slot, so the roster can't serve
 * as the index).
 */
async function flowSplitsForImpl(
  business: BusinessStuff,
  amountMinor: number,
): Promise<RemittanceSplit[]> {
  if (amountMinor <= 0) return [];
  const businessPath = business.getTemplatePath() ?? '';
  const holders = MqlApi.resolveMany('world:[mixin.EmployedMixin]', {
    commandGiver: null,
    scope: 'world',
  }).stuff.filter((s): s is EmployedActor => MixinApi.isEmployed(s));
  const splits: RemittanceSplit[] = [];
  let total = 0;
  for (const holder of holders) {
    const employment = holder.getEmployment(businessPath);
    if (!employment || TERMINAL.includes(employment.status)) continue;
    const position = business.getPosition(employment.positionKey);
    if (!position || position.basis() !== 'share-of-flow') continue;
    const share = position.compensation?.share ?? 0;
    const cut = Math.floor(amountMinor * share);
    if (cut <= 0) continue;
    if (total + cut >= amountMinor) break; // Σ splits stays below the flow
    const holderKey = holder.getTemplatePath() ?? '';
    if (!holderKey) continue;
    // Payer-derived: an NPC holder gets an account at the business's own
    // bank; a player with none is skipped (never silently signed up — the
    // split simply doesn't fire until they open an account).
    if (!(await ensurePayableWorker(holderKey, business))) continue;
    const account = await BankingApi.primaryAccountIdOf(holderKey);
    if (!account) continue;
    splits.push({
      accountId: account,
      amount: Money.of(cut, Currency.compact()),
      category: 'commission',
    });
    total += cut;
  }
  return splits;
}

/**
 * EmploymentLogic — the hot-reloadable logic singleton behind
 * {@link EmploymentApi}.
 *
 * Lives at `/platform/idea/api/employment` (a stateless `Stuff` singleton, no backing
 * `Template`); `EmploymentApi`'s statics forward here via
 * `StuffApi.singletonSync`. The Business index + all mutation logic live in
 * module-private functions (the `CorpoLogic` / `CraftingLogic` precedent),
 * so there are no intra-singleton `this.x()` calls to trip the gate. Each
 * public method carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class EmploymentLogic extends ApiLogic {
  /**
   * The Business index — businesses are found by the `BusinessMixin`
   * marker (never a field on a room), the `SlotLogic` / `LocomotionLogic`
   * enumerate-by-scan precedent. Cached on the singleton instance so a
   * `StuffApi.clearAll` (which recreates the singleton) starts fresh;
   * rebuilt on a miss (the cache is a fast path, the live scan is the
   * source of truth). An ungated private helper — no gate to trip.
   */
  private businessCache: BusinessStuff[] | null = null;

  private allBusinesses(): BusinessStuff[] {
    if (this.businessCache) return this.businessCache;
    const out = allBusinessesImpl();
    this.businessCache = out;
    return out;
  }

  private findBusiness(
    match: (b: BusinessStuff) => boolean,
  ): BusinessStuff | null {
    const hit = this.allBusinesses().find(match);
    if (hit) return hit;
    // A newly-stood-up business may post-date the cache: rebuild + retry.
    this.businessCache = null;
    return this.allBusinesses().find(match) ?? null;
  }

  /** The recurring game-time tick handle (runtime-only; re-armed on reload). */
  private rosterHandle: ClockHandle | null = null;

  /**
   * The roster maintenance pass (ungated private — the gated public
   * `tickRoster` and the schedule callback both delegate here, so no
   * intra-singleton gated `this.x()` call trips the gate). Enumerates every
   * Business, evaluates each roster assignment against the game clock, and
   * maintains the assignee's stored `Employment.status`:
   *
   *   - **lazy-materialize** a record from the assignment (the roster is the
   *     single source of truth — the seeds carry no employment block);
   *   - **off→on**: stamp `onShiftSince = now`;
   *   - **on→off**: settle the shift wage off the captured record *before*
   *     clearing `onShiftSince`, then flip to off-shift.
   *
   * A `quit` / `fired` record is left alone (an explicit exit is never
   * resurrected by the seed roster).
   */
  private runTick(): void {
    const now = WorldClockApi.getNow();
    const date = DefaultCalendar.singleton().decompose(now);
    const nowRaw = now.rawValue();
    for (const business of this.allBusinesses()) {
      const businessPath = business.getTemplatePath() ?? '';
      if (!businessPath) continue;
      const roster = business.getRoster();
      for (const assignment of roster.getAssignments()) {
        const actor = StuffApi.findByTemplatePath(assignment.assignee);
        if (!actor || !MixinApi.isEmployed(actor)) {
          console.warn(
            `EmploymentLogic: roster ${businessPath}/${assignment.positionKey} — ` +
              `assignee ${assignment.assignee} ${actor ? 'is not Employed' : 'is not live'}`,
          );
          continue;
        }
        const employed = actor as EmployedActor;

        const emp = business.ensureRostered(
          employed,
          assignment.positionKey,
          nowRaw,
        );
        {
          // A roster-materialized purchasing NPC is dealt its house card
          // (3d) — on EVERY tick, not only a fresh record: a restored NPC
          // carries its record but not its inventory (the card is not
          // captured with it), and the issue is idempotent on the
          // inventory. Fire-and-forget like the wage settle below.
          void issueHouseCardImpl(
            business,
            actor,
            assignment.positionKey,
          ).catch((err) =>
            console.error('EmploymentLogic: house card issue failed', err),
          );
        }
        if (TERMINAL.includes(emp.status)) continue;

        const desired = roster.evaluate(assignment, date);
        const currentlyOn = emp.status === 'on-shift';
        if (desired === 'on-shift' && !currentlyOn) {
          business.beginShift(employed, nowRaw);
        } else if (desired === 'off-shift' && currentlyOn) {
          // Settle off the captured record (has `onShiftSince`) at this
          // tick's instant, before the synchronous clear below — no race.
          void settleShiftWageImpl(
            business,
            assignment.assignee,
            emp,
            nowRaw,
          ).catch((err) =>
            console.error('EmploymentLogic: shift-wage settle failed', err),
          );
          business.endShift(employed);
        }
      }
    }
  }

  /** Self-register the recurring game-time roster tick (idempotent). */
  private installRosterSchedule(): void {
    if (this.rosterHandle) return;
    this.rosterHandle = WorldClockApi.every(
      Quantity.of(ONE_GAME_HOUR_S, 's'),
      () => {
        try {
          this.runTick();
        } catch (err) {
          console.error('EmploymentLogic: roster tick failed', err);
        }
      },
    );
  }

  /** See {@link EmploymentApi.isProprietorOf}. */
  @CallSecurity(EmploymentApiCallers)
  public async isProprietorOf(
    subject: Stuff,
    organization: OrganizationStuff,
  ): Promise<boolean> {
    return isProprietorOfImpl(subject, organization);
  }

  /** See {@link EmploymentApi.holdsAuthority}. */
  @CallSecurity(EmploymentApiCallers)
  public holdsAuthority(
    principal: Stuff | null,
    ref: PrincipalRef | null,
  ): Promise<boolean> {
    return holdsAuthorityImpl(principal, ref);
  }

  /** See {@link EmploymentApi.organizationChainOf}. */
  @CallSecurity(EmploymentApiCallers)
  public organizationChainOf(
    organization: OrganizationStuff,
  ): OrganizationStuff[] {
    return organizationChainOfImpl(organization);
  }

  /** See {@link EmploymentApi.mayPublishAs}. */
  @CallSecurity(EmploymentApiCallers)
  public mayPublishAs(
    principal: Stuff | null,
    publisher: OrganizationStuff,
  ): boolean {
    return mayPublishAsImpl(principal, publisher);
  }

  /** See {@link EmploymentApi.holdsPosition}. */
  @CallSecurity(EmploymentApiCallers)
  public holdsPosition(
    principal: Stuff | null,
    organization: OrganizationStuff,
  ): boolean {
    return holdsPositionImpl(principal, organization);
  }

  /** See {@link EmploymentApi.holdersOf}. */
  @CallSecurity(EmploymentApiCallers)
  public holdersOf(
    organization: OrganizationStuff,
    positionKey: string,
  ): string[] {
    return holdersOfImpl(organization, positionKey);
  }

  /** See {@link EmploymentApi.hire}. */
  @CallSecurity(EmploymentApiCallers)
  public async hire(
    organization: OrganizationStuff,
    actor: Stuff,
    positionKey: string,
  ): Promise<Employment | null> {
    return hireImpl(organization, actor, positionKey);
  }

  /** See {@link EmploymentApi.fire}. */
  @CallSecurity(EmploymentApiCallers)
  public fire(organization: OrganizationStuff, actor: Stuff): Promise<void> {
    return endEmploymentImpl(
      actor,
      organization.getTemplatePath() ?? '',
      'fired',
    );
  }

  /** See {@link EmploymentApi.quit}. */
  @CallSecurity(EmploymentApiCallers)
  public quit(actor: Stuff, organizationPath: string): Promise<void> {
    return endEmploymentImpl(actor, organizationPath, 'quit');
  }

  /** See {@link EmploymentApi.buysFor}. */
  @CallSecurity(EmploymentApiCallers)
  public buysFor(actor: Stuff): Promise<BusinessStuff[]> {
    return buysForImpl(actor);
  }

  /** See {@link EmploymentApi.stockSheetFor}. */
  @CallSecurity(EmploymentApiCallers)
  public stockSheetFor(
    viewer: Stuff,
    business: BusinessStuff,
  ): StockSheetLine[] {
    return stockSheetForImpl(viewer, business);
  }

  /** See {@link EmploymentApi.goodsFor}. */
  @CallSecurity(EmploymentApiCallers)
  public goodsFor(viewer: Stuff, category: string): Stuff[] {
    return goodsForImpl(viewer, category);
  }

  /** See {@link EmploymentApi.beginCover}. */
  @CallSecurity(EmploymentApiCallers)
  public beginCover(
    self: Stuff,
    business: OrganizationStuff,
  ): Employment | null {
    return beginCoverImpl(self, business);
  }

  /** See {@link EmploymentApi.endCover}. */
  @CallSecurity(EmploymentApiCallers)
  public endCover(self: Stuff, business: OrganizationStuff): void {
    endCoverImpl(self, business);
  }

  /** See {@link EmploymentApi.tipRecipientFor}. */
  @CallSecurity(EmploymentApiCallers)
  public tipRecipientFor(patron: Stuff): Stuff | null {
    return tipRecipientForImpl(patron);
  }

  /** See {@link EmploymentApi.businessAt}. */
  @CallSecurity(EmploymentApiCallers)
  public businessAt(locationPath: string): BusinessStuff | null {
    return this.findBusiness((b) =>
      b.getOperatingLocations().includes(locationPath),
    );
  }

  /**
   * Cached reverse index `operatingLocation → BusinessTemplatePath`, built
   * from the authored Business templates' own `operatingLocations` data. The
   * derived-standup source of truth (no per-instance standup hook). Filtered
   * cheaply by the presence of the `operatingLocations` field — no class
   * resolution; `ensureOperatorAt` verifies `isBusiness` after standup. Nulled
   * with `businessCache` on a fresh singleton (a `StuffApi.clearAll`).
   */
  private operatorIndex: Map<string, string> | null = null;

  private async buildOperatorIndex(): Promise<Map<string, string>> {
    if (this.operatorIndex) return this.operatorIndex;
    const { Template } = await import('../../../lib/stuff/Template');
    const idx = new Map<string, string>();
    for (const t of await Template.findDescendants('/')) {
      const ops = t.data?.operatingLocations as unknown;
      if (!Array.isArray(ops)) continue;
      for (const loc of ops) {
        if (typeof loc === 'string' && loc.length > 0) idx.set(loc, t.path);
      }
    }
    this.operatorIndex = idx;
    return idx;
  }

  /** See {@link EmploymentApi.ensureOperatorAt}. */
  @CallSecurity(EmploymentApiCallers)
  public async ensureOperatorAt(
    locationPath: string,
  ): Promise<BusinessStuff | null> {
    // Call the ungated private finder, not `this.businessAt` — a gated
    // intra-singleton self-call would be denied (the caller is the logic, not
    // the face).
    const live = this.findBusiness((b) =>
      b.getOperatingLocations().includes(locationPath),
    );
    if (live) return live;
    // Derive the operator from the authored Business templates and stand it up
    // lazily (idempotent). No manifest entry, no clerk/venue standup hook.
    const idx = await this.buildOperatorIndex();
    const tplPath = idx.get(locationPath);
    if (!tplPath) return null;
    const inst = await StuffApi.singletonOrClone<Stuff>(tplPath);
    this.businessCache = null; // the live scan must re-see the new instance
    if (MixinApi.isBusiness(inst)) {
      // A lazily stood-up business arrives with CORRECT on-shift state —
      // the same immediate roster pass `boot()` runs for boot-time
      // businesses. Without it, a cold venue's first customer finds the
      // roster hired but nobody conferred (`order` → no-maker) until the
      // next scheduled tick.
      this.runTick();
      return inst;
    }
    return null;
  }

  /** See {@link EmploymentApi.businessOfProprietor}. */
  @CallSecurity(EmploymentApiCallers)
  public businessOfProprietor(subject: Stuff): BusinessStuff | null {
    const path = subject.getTemplatePath();
    if (!path) return null;
    return this.findBusiness((b) => b.getProprietor() === path);
  }

  /** See {@link EmploymentApi.tickRoster}. */
  @CallSecurity(EmploymentApiCallers)
  public tickRoster(): void {
    this.runTick();
  }

  /** See {@link EmploymentApi.shiftStateOf}. */
  @CallSecurity(EmploymentApiCallers)
  public shiftStateOf(actor: Stuff): 'on-shift' | 'off-shift' {
    return MixinApi.isEmployed(actor) &&
      (actor as EmployedActor).isOnShift()
      ? 'on-shift'
      : 'off-shift';
  }

  /** See {@link EmploymentApi.operatingAccountOf}. */
  @CallSecurity(EmploymentApiCallers)
  public operatingAccountOf(business: BusinessStuff): Promise<string> {
    return operatingAccountOfImpl(business);
  }

  /** See {@link EmploymentApi.settlePiecework}. */
  @CallSecurity(EmploymentApiCallers)
  public settlePiecework(
    business: BusinessStuff,
    employeeKey: string,
    units = 1,
  ): Promise<void> {
    return settlePieceworkImpl(business, employeeKey, units);
  }

  /** See {@link EmploymentApi.flowSplitsFor}. */
  @CallSecurity(EmploymentApiCallers)
  public flowSplitsFor(
    business: BusinessStuff,
    amountMinor: number,
  ): Promise<RemittanceSplit[]> {
    return flowSplitsForImpl(business, amountMinor);
  }

  /** See {@link EmploymentApi.settleShiftWage}. */
  @CallSecurity(EmploymentApiCallers)
  public settleShiftWage(
    business: BusinessStuff,
    employeeKey: string,
    employment: Employment,
  ): Promise<void> {
    return settleShiftWageImpl(
      business,
      employeeKey,
      employment,
      WorldClockApi.getNow().rawValue(),
    );
  }

  /**
   * See {@link EmploymentApi.boot}. Run one immediate roster pass (so
   * on-shift state is correct at boot) then self-register the recurring
   * game-time tick. Idempotent via the retained handle. The game-time
   * schedule freezes with a paused world, so accrual freezes too.
   */
  @CallSecurity(EmploymentApiCallers)
  public boot(): void {
    this.runTick();
    this.installRosterSchedule();
  }
}
