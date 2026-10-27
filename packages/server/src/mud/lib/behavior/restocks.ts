/**
 * `restocks` brain — the keeper reads the par sheet and buys the shortfall.
 *
 * The front half of the bar's supply chain (libations D7, decision h):
 * a Business keeps a **par manifest** (`parLines`, the level of each
 * category it means to have on hand and the supplier it buys from), and
 * whoever holds its `purchases` position keeps the rail to it. Each beat
 * on shift, the keeper reads `EmploymentApi.stockSheetFor` — the SAME
 * sheet `house stock` shows a player, perception-scoped, so she counts
 * what she can see from where she stands — groups the short lines by
 * supplier, and posts a carriage bounty for each one that is short and
 * not already on the board. Then she empties the receiving bench onto
 * the rail. Then the bussing beat: any soiled, empty glass in the room
 * is collected, washed and racked.
 *
 * ⭐ **Nothing here is unavailable to a player.** Every act is a literal
 * verb through `forceCommand` (the giver's own method since the OO sweep)
 * — `wallet use house`, `job post`, `get`, `put … on`, `pour … into`,
 * `wash` — gated exactly as a typed line is.
 *
 * ## ⭐⭐ The keeper stopped TRAVELLING (logistics D11)
 *
 * She used to `teleport` to the supplier's counter, buy the shortfall,
 * and `teleport` back. **Distance was free** — the same magic as the
 * bar's `populates:` bottles, one level up the chain.
 *
 * She does not walk instead. She **posts the work and receives the
 * goods**, and somebody else carries them: a player, or the carrier's
 * own carter as the fallback. That is a better reading of the goal than
 * the literal one — not *"the keeper walks four rooms"* but ***"the
 * keeper does not travel, because carriage is somebody's job"*** — and
 * it is the whole point of the logistics build.
 *
 * ⚠ The literal reading was impossible anyway: this brain's host is the
 * **Saxonberg Lounge bar**, and *"Saxonberg and the Lounge joining the
 * map"* is a stated non-goal. The leg into the Lounge rides the TPA
 * lane, which is a lane with no intermediate stops and no duration —
 * D2's own limit case doing exactly the work D2 says it does.
 *
 * ## ⚠ Why the order names a BENCH and not the shelf
 *
 * A gig is refused if its condition **already holds**, and a short line
 * usually still has something on the shelf — so an order whose
 * destination was the shelf would be refused precisely when the bar most
 * wanted it. The order lands on a **receiving bench**, which the keeper
 * empties onto the shelf every beat and which is therefore empty by
 * construction. The bench is the loading dock, and it exists for a
 * mechanical reason rather than a decorative one.
 *
 * ⭐ The hauler buys at the supplier and is reimbursed by the reward, so
 * the distributor is still paid and the consignors still see their
 * resale. That is a real **second rung** of the labor market: the
 * producer leg needs no capital at all, and this one needs enough to
 * front a load.
 *
 * Not presence-gated and not ambient: the back loop runs unwatched, on
 * the authored cadence.
 *
 * config: `{ shelf: string, rack?: string, bin?: string, cold?: string,
 * batch?: number, board?: string, bench?: string, reward?: number }` —
 * template paths of the fixtures in the keeper's own room (bottles and
 * crates go ON the shelf, glasses IN the rack, crushed ice is poured INTO
 * the bin, a block of ice goes IN the cold box and the box is shut again);
 * `batch` caps
 * the orders per beat (default 12); `board` the works board she posts
 * to, `bench` the receiving bench orders land on, and `reward` what the
 * house pays for one delivered line — **goods plus carriage**, because
 * the hauler fronts the purchase. The supplier is never config: it comes
 * from each par line — and so may the price: a line with `rewardPerUnit`
 * is paid by the unit and ordered only as far as the house can fund it.
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { NavigationApi } from '../../api/navigation';
import { EmploymentApi, type Business, type StockSheetLine } from '../../api/employment';
import { ContractApi } from '../../api/contract';
import { BankingApi } from '../../api/banking';
import type { ConditionData } from '../employment/Condition';
import type { CommandGiver } from '../command/CommandGiver';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';
import type { EngagementSlot } from '../activity/Engaged';
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

/** How a par unit is said in an order — the `job post` phrase's words. */
const UNIT_WORD: Record<string, string> = { L: 'litres', kg: 'kilos', count: 'pieces' };

const DEFAULT_BATCH = 12;
/**
 * ⭐ What the house pays for one delivered line — **goods plus
 * carriage**, because the hauler fronts the purchase at the supplier
 * and is reimbursed on delivery. Authored per venue; this is the floor.
 */
const DEFAULT_REWARD = 24;

type Keeper = Stuff & Mobile & Containable & Container & CommandGiver;

/** A pool glass — names its par category and knows whether it is used. */
interface Glass {
  getCategory?(): string;
  isSoiled?(): boolean;
  isBulkEmpty?(affordance: 'interior'): boolean;
}

export const brain = class {
  static label = 'restocks';
  static kind: TaskKind = 'work';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static summary =
    'Reads the par sheet from where she stands, posts a carriage bounty ' +
    'for every short line, lands the bench onto the rail, and busses glasses.';
  static consumes: readonly string[] = ['stock'];
  /**
   * ⭐ A short line is `pressing` and a clean rail is `wanted`. Both are
   * real work, and the difference is what a keeper would actually feel:
   * running out of gin beats collecting an empty glass.
   *
   * The sheet is read from the rail, perception-scoped — the same read
   * `house stock` shows a player, so she counts what she can see.
   */
  static async urgency(ctx: BrainContext): Promise<Urgency> {
    const host = ctx.host;
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') {
      return new Urgency("idle");
    }
    if (!MixinApi.isContainable(host)) return new Urgency("idle");
    const home = host.getContainer();
    if (!home || !MixinApi.isContainer(home)) return new Urgency("idle");
    const business = await businessHere(host as unknown as Stuff, home);
    if (!business) return new Urgency("idle");
    const short = business
      .stockSheetFor(host as unknown as Stuff)
      .filter((l) => l.shortfall > 0 && l.line.supplier);
    if (short.length) {
      return new Urgency(
        'pressing',
        'runs an eye down the rail and reaches for the order book',
      );
    }
    return new Urgency('wanted', 'starts gathering the empties');
  }
  static presenceGated = false;
  // Functional poller (moves stock), not ambient chatter — exempt from
  // the global ambient-cadence dial.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    const keeper = host as Keeper;
    if (!MixinApi.isEmployed(keeper) || keeper.shiftState() !== 'on-shift')
      return;
    const home = keeper.getContainer();
    if (!home || !MixinApi.isContainer(home)) return;

    // The business she buys for HERE — the one operating where she stands.
    const business = await businessHere(keeper, home);
    if (!business) return;

    const shelfPath = ctx.config.shelf;
    if (typeof shelfPath !== 'string') return;
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);

    // The sheet, read from the rail — what she can see is what is on hand.
    const short = business.stockSheetFor(keeper).filter(
      (l) => l.shortfall > 0 && l.line.supplier,
    );
    const bySupplier = new Map<string, StockSheetLine[]>();
    for (const l of short) {
      const bucket = bySupplier.get(l.line.supplier);
      if (bucket) bucket.push(l);
      else bySupplier.set(l.line.supplier, [l]);
    }

    // ⭐⭐ **Order the shortfall; do not go and get it.** One posting per
    // short line, bounded by `batch`, funded by the house, landing on
    // the receiving bench.
    const boardPath = ctx.config.board;
    const benchPath = ctx.config.bench;
    if (typeof boardPath === 'string' && typeof benchPath === 'string') {
      await order(keeper, business, bySupplier, {
        boardPath,
        benchPath,
        reward: positiveInt(ctx.config.reward, DEFAULT_REWARD),
        batch,
      });
    }

    // ⭐ **Receive.** Anything a hauler put on the bench is the bar's
    // now — take it off and shelve it exactly as a purchase used to be
    // shelved. This is the whole of what "the keeper became a receiver"
    // means, and it is the same six lines as before with a different
    // source.
    const bought = await unpackBench(keeper, home, benchPath, batch);

    // Shelve what came in: ice into the bin, glasses into the rack,
    // everything else onto the shelf.
    const shelfKw = fixtureKeyword(home, shelfPath);
    const rackKw = fixtureKeyword(home, ctx.config.rack);
    const binKw = fixtureKeyword(home, ctx.config.bin);
    const coldKw = fixtureKeyword(home, ctx.config.cold);
    for (const item of bought) {
      const kw = keywordOf(item);
      if (!kw) continue;
      // ⭐ Ice goes in the cold box, and the box is shut again
      // (storage-and-ice D21).
      if (coldKw && isSolidIce(item)) {
        await unpackIntoCold(keeper, kw, coldKw);
        continue;
      }
      if (isIce(item) && binKw) {
        await keeper.forceCommand(`pour ${kw} into ${binKw}`);
      } else if (isGlass(item) && rackKw) {
        await keeper.forceCommand(`put ${kw} in ${rackKw}`);
      } else if (shelfKw) {
        await keeper.forceCommand(`put ${kw} on ${shelfKw}`);
      }
    }

    // The bussing beat: a used, empty glass loose in the room is
    // collected, washed and racked.
    //
    // ⚠⚠ `get 1 <kw>`, never a bare `get <kw>` — and this one WAS bare
    // until the logistics build's structural assertion caught it. `get`
    // binds GREEDILY, so a bar with six dirty coupes on it put all six
    // in the keeper's hands on the first pass of a loop that then washed
    // and racked one of them per iteration, five of them out of her
    // hands rather than off the bar. The sibling `consigns` brain
    // carries a long comment about exactly this failure, found by
    // driving; the bussing beat kept it.
    if (rackKw) {
      for (const item of home.getContents() as Stuff[]) {
        if (!isGlass(item) || !isSoiledEmpty(item) || !MixinApi.isContainable(item)) continue;
        const kw = keywordOf(item);
        if (!kw) continue;
        await keeper.forceCommand(`get 1 ${kw}`);
        if (item.getContainer() !== keeper) continue;
        await keeper.forceCommand(`wash ${kw}`);
        await keeper.forceCommand(`put ${kw} in ${rackKw}`);
      }
    }
  }
} satisfies BrainStatics;

/** The business the keeper buys for that operates in `room`, else her only one. */
async function businessHere(
  keeper: Stuff,
  room: Stuff,
): Promise<(Stuff & Business) | null> {
  if (!MixinApi.isEmployed(keeper)) return null;
  const buysFor = await keeper.buysFor();
  if (buysFor.length === 0) return null;
  const herePath = room.getTemplatePath() ?? '';
  return (
    buysFor.find((b) => b.getOperatingLocations().includes(herePath)) ??
    (buysFor.length === 1 ? buysFor[0]! : null)
  );
}

/**
 * The room of a supplier's counter — the first operating location holding a
 * Stock. ⭐ LOADED ON USE (sugar W6): the supplier is an authored reference
 * (the par line names it), so it is followed, never only looked up — a
 * supplier across the sea that nobody has visited is not loaded, and a
 * registry read alone would never order from it at all.
 */
async function counterRoomOf(supplierPath: string): Promise<(Stuff & Container) | null> {
  const supplier = await StuffApi.singleton(supplierPath).catch(() => null);
  if (!supplier || !MixinApi.isBusiness(supplier)) return null;
  for (const locPath of supplier.getOperatingLocations()) {
    // ⚠ Only a PLACE is loaded by its path — the location graph says which
    // paths are places. An operating location may name the counter itself
    // (`…/thing/stock`), and a singleton read of a thing whose room is not
    // loaded would mint a stray counter; the room loads its own as a prop.
    // `singleton` IS the get-or-create: its first act is the index read.
    const loc = (await NavigationApi.node(locPath).catch(() => null))
      ? await StuffApi.singleton(locPath).catch(() => null)
      : StuffApi.findByTemplatePath(locPath);
    if (!loc || !MixinApi.isContainer(loc)) continue;
    const hasCounter = (loc.getContents() as Stuff[]).some((c) =>
      MixinApi.isConsignmentShelf(c),
    );
    if (hasCounter) return loc as Stuff & Container;
  }
  return null;
}

/** The primary keyword of the live instance of `templatePath` in `room`. */
function fixtureKeyword(room: Stuff & Container, templatePath: unknown): string | null {
  if (typeof templatePath !== 'string') return null;
  const fixture = (room.getContents() as Stuff[]).find(
    (c) => c.getTemplatePath() === templatePath,
  );
  return fixture ? keywordOf(fixture) : null;
}

function keywordOf(thing: Stuff): string | null {
  if (!MixinApi.isPerceptible(thing)) return null;
  return thing.getPrimaryKeyword() || (thing.getKeywords()[0] ?? null);
}

/**
 * ⭐ A delivered good that goes in the house's COLD box (storage-and-ice
 * D21) — a block or lump of ice, not a bag of crushed ice (that pours into
 * a bin). Read off the material's `ice` tag, like `isIce`.
 */
function isSolidIce(thing: Stuff): boolean {
  if (MixinApi.isBulkable(thing) && thing.hasInteriorBulk()) return false;
  if (!MixinApi.isTangible(thing)) return false;
  return thing.getMaterial()?.hasTag('ice') ?? false;
}

/**
 * ⭐ Unpack into the cold (storage-and-ice D21): open the box, put the
 * good in, shut it again — a cold box is shut to KEEP. ONE named branch
 * with a plain `cold:` config option, so a move of the receive step onto
 * the business carries it whole (the repair build's W7).
 */
async function unpackIntoCold(keeper: Keeper, kw: string, coldKw: string): Promise<void> {
  await keeper.forceCommand(`open ${coldKw}`);
  await keeper.forceCommand(`put ${kw} in ${coldKw}`);
  await keeper.forceCommand(`close ${coldKw}`);
}

function isIce(thing: Stuff): boolean {
  if (!MixinApi.isBulkable(thing) || !thing.hasInteriorBulk()) return false;
  return thing.getBulkMaterial('interior')?.hasTag('ice') ?? false;
}

function isGlass(thing: Stuff): boolean {
  return (
    MixinApi.isCrafted(thing) &&
    typeof (thing as unknown as Glass).getCategory === 'function' &&
    typeof (thing as unknown as Glass).isSoiled === 'function'
  );
}

function isSoiledEmpty(thing: Stuff): boolean {
  const g = thing as unknown as Glass;
  return g.isSoiled?.() === true && g.isBulkEmpty?.('interior') === true;
}

function positiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

/**
 * Post one carriage order per short line, on the works board the keeper
 * stands beside.
 *
 * ⚠⚠ **How the order names what it wants.** A unit already on the rail
 * is the best answer: point at it and say `--kind`, so the order reads
 * *a bottle of this* rather than *this bottle* (every bottle a bar owns
 * is chattel-marked, because the bar bought it).
 *
 * ⭐⭐ But a bar that has RUN DRY has nothing to point at — and that is
 * exactly when it most wants a delivery. The rail-only version could
 * therefore never order a line at literal zero, which on a fresh realm
 * is every line: **Dave's Bar shipped unable to open.** The par line's
 * own `exemplar` names the kind (`job post --of <kind>`), which is the
 * proprietor's decision anyway — *which* gin this bar stocks. A line
 * with no `exemplar` still behaves the old way, and can only be
 * re-ordered while a unit is on the shelf.
 *
 * ⭐ `job post` takes its item as a STRING, resolved reachable-first and
 * falling back to a kind's path — the same rule its `destination` has
 * always used, and for the same reason: what you name may not be here.
 *
 * ⚠⚠ `--bounty` and NO `--expires`. A bounty escrows at post and has no
 * claim step, so **anyone may turn it in and the first to do so is
 * paid** — which is how "a player who takes it is paid and the NPC does
 * not also perform it" falls out for free. And a posting that lapsed
 * would revert the escrow and leave the bar unstocked, which is the
 * exact regression D11 forbids: the window a hauler waits is the
 * CARTER's patience, not the posting's lifetime.
 *
 * ⚠⚠⚠ **And a line already ordered is not ordered again.** A bounty with
 * no expiry sits on the board until somebody carries it, while the line
 * it was posted about stays short until they do — so without this the
 * keeper escrows another reward every single beat and the house is
 * bankrupt by morning. Nothing in the suite could see that (one beat
 * looks perfect) and the live drive's window was minutes, not a night.
 */
async function order(
  keeper: Keeper,
  business: Stuff & Business,
  bySupplier: Map<string, StockSheetLine[]>,
  opts: { boardPath: string; benchPath: string; reward: number; batch: number },
): Promise<void> {
  let budget = opts.batch;
  let traded = false;
  const pending = await pendingKinds(opts.boardPath, opts.benchPath);
  // ⭐ What the house can still escrow this beat (sugar W6): a line priced
  // per unit orders only as much as this pays for — a house with fifty
  // in the till asks for three blocks, not eight it cannot pay for, and
  // a refused posting would have ordered nothing at all.
  // Read on the first such line only: a flat-priced house never asks.
  let funds: number | null = null;
  for (const [supplierPath, lines] of bySupplier) {
    if (budget <= 0) break;
    const counterRoom = await counterRoomOf(supplierPath);
    if (!counterRoom) continue;
    const fromPath = counterRoom.getTemplatePath() ?? '';
    if (fromPath === '') continue;

    for (const line of lines) {
      if (budget <= 0) break;
      // What to name in the order, and how. A unit on the rail is the
      // best answer — point at it and say `--kind`. With the rail bare
      // there is nothing to point at, so the par line's own `exemplar`
      // names the kind directly.
      const onHand = exemplarFor(keeper, line);
      const kind = onHand?.getTemplatePath() ?? line.line.exemplar;
      if (!kind) continue;
      // Already on the board and still un-carried: wait for it.
      // ⚠ A FUNGIBLE good is ordered by its category, never its row: a
      // stack has no identity a kind-bound gig can count, so the board
      // refuses it ("fungible goods can't be contracted") and the line
      // was never ordered — the sugar house's lime, found by its drive.
      const byKind = line.line.unit === 'count' && !isFungible(onHand, kind);
      const key = byKind ? kind : `cat:${line.line.category}`;
      if (pending.has(key)) continue;
      // What she names: the unit on the rail by keyword, or the kind by
      // its path when there is nothing to point at.
      const naming = onHand ? keywordOf(onHand) : kind;
      if (!naming) continue;
      if (!traded) {
        // Every beat, not once: a forced command reports no outcome, and
        // a keeper dealt her card after a failed first attempt must still
        // trade as the house.
        await keeper.forceCommand('wallet use house');
        traded = true;
      }
      /*
       * ⭐⭐⭐ ONE gig per short line, in the LINE'S OWN WORDS.
       *
       * It posted twelve single-item bounties a beat before `supply`
       * existed, then one gig per line for a GUESSED bottle count — and
       * the guess was itself the bug the review found: a contract bound
       * to a template path means "eight of that exact row", so a hauler
       * who brought one demijohn holding six litres had done the job and
       * the engine counted zero.
       *
       * ⭐ Now it orders what the par sheet says: `supply 6 litres of
       * gin`. The unit conversion is gone because there is nothing left
       * to convert, and how somebody fills it — bottles, a keg, a
       * demijohn, bought or carried from home — is their business.
       */
      let shortfall = Math.round(line.shortfall * 1000) / 1000;
      if (line.line.unit === 'count') shortfall = Math.ceil(shortfall);
      let reward = opts.reward;
      const perUnit = line.line.rewardPerUnit;
      if (perUnit > 0) {
        funds ??= BankingApi.balanceOf(
          await EmploymentApi.operatingAccountOf(business),
        ).minor;
        shortfall = Math.min(shortfall, Math.floor(funds / perUnit));
        if (shortfall <= 0) continue;
        reward = Math.ceil(shortfall * perUnit);
      }
      const phrase =
        byKind
          ? `supply ${shortfall} ${naming}`
          : `supply ${shortfall} ${UNIT_WORD[line.line.unit]} of ${line.line.category}`;
      await keeper.forceCommand(
        `job post ${phrase} to ${opts.benchPath} for ${reward} ` +
          `--bounty --business --from ${fromPath}`,
      );
      if (funds !== null) funds -= reward;
      pending.add(key);
      budget -= 1;
    }
  }
}

/** Whether the good a count line names is a merging stack. */
function isFungible(onHand: Stuff | null, kind: string): boolean {
  const exemplar = onHand ?? StuffApi.findAllByTemplatePath(kind)[0] ?? null;
  return exemplar !== null && MixinApi.isStackable(exemplar);
}

/**
 * What identifies a line on the board — a kind's path, or a category.
 * ⚠ The two shapes must produce the same key here and at the post site,
 * or the re-order guard silently stops guarding.
 */
function pendingKey(item: ConditionData['item']): string {
  if (item.kind === 'category') return `cat:${item.category}`;
  if (item.kind === 'template') return item.path;
  if (item.kind === 'identity') return `identity:${item.identityPath}`;
  return `chattel:${item.chattelId}`;
}

/** The kinds already posted to this bench and not yet carried. */
async function pendingKinds(
  boardPath: string,
  benchPath: string,
): Promise<Set<string>> {
  const open = await ContractApi.openGigsOn(boardPath);
  const kinds = new Set<string>();
  for (const gig of open) {
    const condition = gig.clause?.condition;
    if (!condition || condition.destinationPath !== benchPath) continue;
    // ⚠⚠ BOTH shapes. The guard read template paths only, and the day
    // the keeper started ordering by CATEGORY it went blind — every
    // beat re-posting a line already on the board, which is the bankrupt
    // -by-morning bug all over again. The key is whatever identifies the
    // line, and a category line is identified by its category.
    kinds.add(pendingKey(condition.item));
  }
  return kinds;
}

/**
 * Take everything a hauler left on the receiving bench, so the shelving
 * pass can put it away.
 *
 * ⚠⚠ `get 1 <kw>`, never a bare `get <kw>` — `get` binds GREEDILY, and a
 * bench holding six of one thing would otherwise put all six in the
 * keeper's arms in one call and make every bound above it meaningless.
 * The `consigns` brain learned this the expensive way.
 */
async function unpackBench(
  keeper: Keeper,
  home: Stuff & Container,
  benchPath: unknown,
  batch: number,
): Promise<Stuff[]> {
  if (typeof benchPath !== 'string' || benchPath === '') return [];
  const bench = (home.getContents() as Stuff[]).find(
    (c) => c.getTemplatePath() === benchPath,
  );
  if (!bench) return [];

  // A bench is a surface if it is one, and a container otherwise —
  // whichever it is, what a hauler put down is what comes off it.
  const landed: Stuff[] = MixinApi.isPlacing(bench)
    ? [...bench.getPlaced()]
    : MixinApi.isContainer(bench)
      ? (bench.getContents() as Stuff[])
      : [];

  const taken: Stuff[] = [];
  for (const item of landed.slice(0, batch)) {
    if (!MixinApi.isContainable(item)) continue;
    const kw = keywordOf(item);
    if (!kw) continue;
    await keeper.forceCommand(`get 1 ${kw}`);
    if (item.getContainer() !== (keeper as unknown as Stuff)) continue;
    taken.push(item);
  }
  return taken;
}


/**
 * A unit of this line already on the rail — what `job post` names.
 *
 * ⚠⚠ **The same matcher the SHEET uses**, via `EmploymentApi.goodsFor`,
 * and that is the whole point: a par category is a MATERIAL tag (`gin`)
 * for a bulk line and a vessel kind (`coupe`) for a count line. This
 * scanned `getCategory()` alone until the post path got its first test —
 * which reads the vessel kind off a bottle (`bottle`), matches no bulk
 * line ever, and so ordered nothing for the flagship line while
 * reporting no error at all. Read the sheet with the sheet's own eyes.
 */
function exemplarFor(keeper: Keeper, line: StockSheetLine): Stuff | null {
  for (const good of EmploymentApi.goodsFor(keeper, line.line.category)) {
    if (MixinApi.isContainable(good) && keywordOf(good)) return good;
  }
  return null;
}
