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
 * config: `{ shelf: string, rack?: string, bin?: string, batch?: number,
 * board?: string, bench?: string, reward?: number }` — template paths of
 * the fixtures in the keeper's own room (bottles and crates go ON the
 * shelf, glasses IN the rack, ice is poured INTO the bin); `batch` caps
 * the orders per beat (default 12); `board` the works board she posts
 * to, `bench` the receiving bench orders land on, and `reward` what the
 * house pays for one delivered line — **goods plus carriage**, because
 * the hauler fronts the purchase. The supplier is never config: it comes
 * from each par line.
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { EmploymentApi, type Business, type StockSheetLine } from '../../api/employment';
import { ContractApi } from '../../api/contract';
import type { CommandGiver } from '../command/CommandGiver';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';

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
      await order(keeper, bySupplier, {
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
    for (const item of bought) {
      const kw = keywordOf(item);
      if (!kw) continue;
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

/** The room of a supplier's live counter — the first operating location holding a Stock. */
function counterRoomOf(supplierPath: string): (Stuff & Container) | null {
  const supplier = StuffApi.findByTemplatePath(supplierPath);
  if (!supplier || !MixinApi.isBusiness(supplier)) return null;
  for (const locPath of supplier.getOperatingLocations()) {
    const loc = StuffApi.findByTemplatePath(locPath);
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
  bySupplier: Map<string, StockSheetLine[]>,
  opts: { boardPath: string; benchPath: string; reward: number; batch: number },
): Promise<void> {
  let budget = opts.batch;
  let traded = false;
  const pending = await pendingKinds(opts.boardPath, opts.benchPath);
  for (const [supplierPath, lines] of bySupplier) {
    if (budget <= 0) break;
    const counterRoom = counterRoomOf(supplierPath);
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
      if (pending.has(kind)) continue;
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
       * ⭐⭐ ONE gig per short line, for the QUANTITY the line is short.
       *
       * It used to post one single-item bounty per line — twelve of them
       * a beat, twelve escrows — because a contract could not say "six
       * litres of gin": the par sheet is denominated in quantities and
       * the condition vocabulary had only `delivery`, which is one of
       * something. `supply` is that missing sentence, and the keeper is
       * the reason it exists.
       *
       * ⚠ The shortfall is in the LINE's unit (litres, kilos, count) and
       * a gig counts DISCRETE things, so this asks for whole units of
       * the exemplar kind and rounds up — under-ordering leaves the rail
       * short for another whole beat, and one bottle spare is cheaper
       * than that.
       */
      const wanted = Math.max(
        1,
        Math.ceil(line.shortfall / unitsPer(line, onHand)),
      );
      await keeper.forceCommand(
        `job post supply ${wanted} ${naming} to ${opts.benchPath} ` +
          `for ${opts.reward} --bounty --business --from ${fromPath}`,
      );
      pending.add(kind);
      budget -= 1;
    }
  }
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
    if (condition.item.kind === 'template') kinds.add(condition.item.path);
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
  const landed: Stuff[] = MixinApi.isSurfaced(bench)
    ? [...bench.getResting()]
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
 * How much of a line ONE of `exemplar` covers, in the line's own unit —
 * so a shortfall of 6 litres becomes 8 bottles of 0.75 L.
 *
 * ⚠ With NO exemplar (the cold rail, which is every line on a fresh
 * realm) the size is unknowable without cloning one, so it orders by the
 * line's unit and lets the next beat correct. Over-ordering by a bottle
 * costs a bottle; under-ordering costs a whole beat with the rail still
 * short.
 */
function unitsPer(line: StockSheetLine, exemplar: Stuff | null): number {
  if (line.line.unit === 'count') return 1;
  if (!exemplar || !MixinApi.isBulkable(exemplar)) return 1;
  if (!exemplar.hasInteriorBulk()) return 1;
  const litres = exemplar.getBulkAmount('interior').rawValue();
  if (litres <= 0) return 1;
  if (line.line.unit === 'L') return litres;
  const density =
    exemplar.getBulkMaterial('interior')?.getDensity().rawValue() ?? 1000;
  return (litres / 1000) * density;
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
