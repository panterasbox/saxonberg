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
 * supplier, goes to the supplier's counter, trades as the house, buys a
 * unit at a time until the line is covered, comes back and shelves what
 * she bought. Then the bussing beat: any soiled, empty glass in the room
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
import { CommandApi } from '../../api/command';
import { EmploymentApi, type Business, type StockSheetLine } from '../../api/employment';
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
      await order(keeper, home, bySupplier, {
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


/** How much of a par line one good covers, in the line's unit. */
function unitsOf(good: Stuff, unit: 'L' | 'count' | 'kg'): number {
  if (unit === 'count') {
    return MixinApi.isGlobbable(good) ? good.getQuantity() : 1;
  }
  if (!MixinApi.isBulkable(good) || !good.hasInteriorBulk()) return 1;
  const litres = good.getBulkAmount('interior').rawValue();
  if (unit === 'L') return litres;
  const density = good.getBulkMaterial('interior')?.getDensity().rawValue() ?? 1000;
  return (litres / 1000) * density;
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
 * ⚠ **The exemplar is a unit already on the shelf**, because `job post`
 * takes an object the poster can REACH and a keeper cannot reach the
 * supplier's stock. That also means a line at literal zero cannot be
 * ordered — which is why the par levels are set so a line goes short
 * long before it goes empty, and why the retune was part of this
 * decision rather than left to discovery.
 *
 * ⚠⚠ `--bounty` and NO `--expires`. A bounty escrows at post and has no
 * claim step, so **anyone may turn it in and the first to do so is
 * paid** — which is how "a player who takes it is paid and the NPC does
 * not also perform it" falls out for free. And a posting that lapsed
 * would revert the escrow and leave the bar unstocked, which is the
 * exact regression D11 forbids: the window a hauler waits is the
 * CARTER's patience, not the posting's lifetime.
 */
async function order(
  keeper: Keeper,
  home: Stuff & Container,
  bySupplier: Map<string, StockSheetLine[]>,
  opts: { benchPath: string; reward: number; batch: number },
): Promise<void> {
  let budget = opts.batch;
  let traded = false;
  for (const [supplierPath, lines] of bySupplier) {
    if (budget <= 0) break;
    const counterRoom = counterRoomOf(supplierPath);
    if (!counterRoom) continue;
    const fromPath = counterRoom.getTemplatePath() ?? '';
    if (fromPath === '') continue;

    for (const line of lines) {
      if (budget <= 0) break;
      const exemplar = exemplarFor(home, line);
      if (!exemplar) continue;
      const kw = keywordOf(exemplar);
      if (!kw) continue;
      if (!traded) {
        // Every beat, not once: a forced command reports no outcome, and
        // a keeper dealt her card after a failed first attempt must still
        // trade as the house.
        await keeper.forceCommand('wallet use house');
        traded = true;
      }
      await keeper.forceCommand(
        `job post ${kw} to ${opts.benchPath} for ${opts.reward} ` +
          `--bounty --business --from ${fromPath}`,
      );
      budget -= 1;
    }
  }
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

/** A unit of this line already on the shelf — what `job post` names. */
function exemplarFor(
  home: Stuff & Container,
  line: StockSheetLine,
): Stuff | null {
  const category = line.line.category;
  for (const item of home.getContents() as Stuff[]) {
    if (!MixinApi.isContainer(item)) continue;
    for (const good of item.getContents() as Stuff[]) {
      if (categoryOf(good) === category) return good;
    }
  }
  return null;
}

/** A good's par category, if it declares one. */
function categoryOf(good: Stuff): string {
  const asked = good as unknown as { getCategory?: () => string };
  return typeof asked.getCategory === 'function' ? asked.getCategory() : '';
}
