/**
 * stocks — the keeper who STOCKS the counter (economic bootstrap D14): the
 * NPC shop that buys on terms when stock falls below target, sells at an
 * ask derived from its shelf, and repays from inflows — the predictable
 * repayer that builds the banks' capital and the world's credit history
 * before any player asks, and the market-maker a thin market needs.
 *
 * On cadence, for each SUPPLIED line of the host counter short of par
 * (`Stock.shortSuppliedLines`): walk to the supplier's counter, trade as
 * the house (`wallet use house`), `buy` up to the shortfall, carry the
 * goods home and `put <good> on <counter>`. Before buying, if the house
 * balance is short of what the shortfall would cost, walk to the bank
 * and `bank borrow <shortfall> --for stock` — rung 1, the real-bills
 * rung: the loan buys goods, the goods secure the loan, the sale repays
 * it. A refusal there is the ladder working, not a defect; the beat
 * buys what it can afford and tries again next time.
 *
 * ⭐⭐ **The keeper knows her own street.** Every walk is an AUTHORED list
 * of directions on her row (`ways`) — the shipped `patrols` shape — and
 * nothing here searches a graph. It searched one until the pathfinding
 * review: a shop's whole errand is *out the door, one west to the
 * window, one south to the wholesaler*, and running a breadth-first
 * search over a compiled inter-city freight network to cross the road is
 * a category error rather than a route. A shopkeeper knows her
 * neighbourhood; she does not compute it. ⚠ A room no `ways` row names
 * is a room she does not go to — an authoring gap that shows up as a
 * shop that never restocks, and is fixed where it was made. The one
 * honest caller of the lane router is `consigns`, whose errand really is
 * cross-district; whether one pathfinder should serve every consumer is
 * open (docs/slates/builds/pathfinding-slate.md).
 *
 * ⭐ Every step is the LITERAL verb through `forceCommand`, as `consigns`
 * and `restocks` do — an NPC following a rule is still a party posting a
 * price. Nothing here mints, nothing teleports, nothing routes around a
 * blocked door, and the beat is bounded by `batch` (default 6 goods).
 *
 * Config: `{ counter: <the host counter's path>, bank?: <the lender's
 * counter path — the branch of the house's bank when omitted>, batch?,
 * ways?: [{ to: <room path>, go: [<direction>…], back: [<direction>…] }] }`.
 * ⭐ `back` is authored, never derived by reversing `go`: a named exit
 * ("mayfield") and a one-way door do not reverse.
 * The host is a `boot:`-pinned NPC — a brain on an unspawned NPC never
 * fires, and this one must run with nobody online.
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { LocomotionApi } from '../../api/locomotion';
import { EmploymentApi } from '../../api/employment';
import { BankingApi } from '../../api/banking';
import type { CommandGiver } from '../command/CommandGiver';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';
import type { Employed } from '../employment/Employed';
import type { Exitable } from '../boundary/Exitable';
import Stock from '../retail/Stock';

const DEFAULT_BATCH = 6;

type Keeper = Stuff & Mobile & Containable & Container & CommandGiver & Employed;

/** A way the keeper knows: where it goes, and how she walks it either way. */
type Way = { to: string; go: readonly string[]; back: readonly string[] };

export const brain = class {
  static label = 'stocks';
  static presenceGated = false;
  // A functional poller (moves stock and money), not ambient chatter.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isCommandGiver(host) ||
      !MixinApi.isEmployed(host)
    ) {
      return;
    }
    const keeper = host as Keeper;
    const counterPath = ctx.config.counter;
    if (typeof counterPath !== 'string') return;
    const counter = StuffApi.findByTemplatePath(counterPath) ?? (await StuffApi.singletonOrClone(counterPath));
    if (!(counter instanceof Stock) || !MixinApi.isContainable(counter)) return;
    const counterRoom = counter.getContainer();
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
    const homePath = counterRoom.getTemplatePath() ?? '';
    if (homePath === '') return;

    // The house the keeper buys for — the one operating the counter.
    const house = (await keeper.buysFor()).find((b) =>
      b.getOperatingLocations().includes(counterPath),
    );
    if (!house) return;

    // The ways she knows — authored, in order of nothing: looked up by
    // the room a step of this beat needs to reach.
    const ways = waysOf(ctx);
    const wayTo = (path: string): Way | null =>
      ways.find((w) => w.to === path) ?? null;

    // ⚠ Standing somewhere else means last beat's walk home was refused
    // (a shut door, a blocked step). Come back the way she went, and
    // only then trade — a keeper does not shop from a neighbour's floor.
    const standing = keeper.getContainer()?.getTemplatePath() ?? '';
    if (standing !== homePath) {
      const back = wayTo(standing);
      if (!back || !(await walkRoute(keeper, back.back))) return;
      if (keeper.getContainer()?.getTemplatePath() !== homePath) return;
    }

    // ⚠ Anything already in hand goes on the counter FIRST, before any
    // decision to shop: a beat that ended stranded comes home holding
    // goods, and shelving them is not part of the shopping. (It was, and
    // a beat that found nothing short returned with the goods still in
    // her hands — where they stayed.)
    await shelve(keeper, counter, homePath);

    const short = counter.shortSuppliedLines();
    if (short.length === 0) return;
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);

    // What this beat would cost, at the suppliers' asks as they stand.
    let wanted = 0;
    const errands: Array<{ supplierCounter: Stock; supplierRoom: Stuff; template: string; count: number; each: number }> = [];
    let left = batch;
    for (const line of short) {
      if (left <= 0) break;
      const supplierCounter = await supplierCounterOf(line.supplier);
      if (!supplierCounter) continue;
      const room = supplierCounter.getContainer();
      if (!room) continue;
      // ⚠ Before the money is counted, not after: a supplier she has no
      // authored way to is not an errand, and borrowing for goods she
      // cannot go and fetch would put real paper on the book for a trip
      // that never happens.
      if (!wayTo(room.getTemplatePath() ?? '')) continue;
      const each = supplierCounter.priceFor(line.itemTemplatePath) ?? 0;
      const available = supplierCounter.onHand(line.itemTemplatePath);
      const count = Math.min(line.shortfall, left, available);
      if (count <= 0 || each <= 0) continue;
      errands.push({ supplierCounter, supplierRoom: room, template: line.itemTemplatePath, count, each });
      wanted += count * each;
      left -= count;
    }
    if (errands.length === 0) return;

    // Short of the money? Borrow first — rung 1, at the house's bank.
    const account = await EmploymentApi.operatingAccountOf(house);
    const held = BankingApi.balanceOf(account).minor;
    if (held < wanted) {
      const bankCounterPath =
        typeof ctx.config.bank === 'string'
          ? ctx.config.bank
          : BankingApi.branchOf(house.getBanksAt())?.getTemplatePath() ?? '';
      const bankCounter = bankCounterPath ? StuffApi.findByTemplatePath(bankCounterPath) : undefined;
      const bankRoom = bankCounter && MixinApi.isContainable(bankCounter) ? bankCounter.getContainer() : null;
      const way = bankRoom ? wayTo(bankRoom.getTemplatePath() ?? '') : null;
      if (way && (await walkRoute(keeper, way.go)) && atRoom(keeper, way.to)) {
        await keeper.forceCommand('wallet use house');
        await keeper.forceCommand(`bank borrow ${wanted - held} --for stock`);
        // Home before the shopping: out and back, one errand at a time.
        await walkRoute(keeper, way.back);
      }
    }

    // Buy what the house can now afford, supplier by supplier, and carry
    // it home onto the counter.
    try {
      for (const e of errands) {
        // Each errand leaves from home and comes back to it.
        if (!atRoom(keeper, homePath)) break;
        const way = wayTo(e.supplierRoom.getTemplatePath() ?? '');
        if (!way) continue; // unreachable errands were dropped above
        if (!(await walkRoute(keeper, way.go)) || !atRoom(keeper, way.to)) break;
        await keeper.forceCommand('wallet use house');
        const kw = keywordOfTemplate(e.supplierCounter, e.template);
        if (!kw) continue;
        for (let i = 0; i < e.count; i += 1) {
          if (BankingApi.balanceOf(account).minor < (e.supplierCounter.priceFor(e.template) ?? 0)) break;
          const before = keeper.getContents().length;
          await keeper.forceCommand(`buy ${kw}`);
          if (keeper.getContents().length <= before) break; // a refused buy — stop
        }
        await walkRoute(keeper, way.back);
      }
    } finally {
      // The goods onto the counter — if she got home with them. If she
      // did not, they stay in her hands and the guard at the top of the
      // next beat walks her back. ⚠ Blocked means blocked.
      await shelve(keeper, counter, homePath);
    }
  }
} satisfies BrainStatics;

/**
 * Everything in hand onto the counter, if she is standing at it. Goods
 * only — the house card is chattel too and is not for sale.
 */
async function shelve(keeper: Keeper, counter: Stock, homePath: string): Promise<void> {
  if (!atRoom(keeper, homePath)) return;
  const counterKw = keywordOf(counter as unknown as Stuff) ?? 'counter';
  for (const good of [...keeper.getContents()] as Stuff[]) {
    if (!MixinApi.isChattel(good) || MixinApi.isCredentialWallet(good)) continue;
    const kw = keywordOf(good);
    if (!kw) continue;
    await keeper.forceCommand(`put ${kw} in ${counterKw}`);
  }
}

/** Is the keeper standing in this room? */
function atRoom(keeper: Keeper, path: string): boolean {
  return keeper.getContainer()?.getTemplatePath() === path;
}

/**
 * The authored ways on the host's row. A malformed row is simply not a
 * way — the keeper does not go there, which reads as a shop that never
 * restocks and is fixed in the content that got it wrong.
 */
function waysOf(ctx: BrainContext): Way[] {
  const rows = Array.isArray(ctx.config.ways) ? ctx.config.ways : [];
  const dirs = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((d): d is string => typeof d === 'string') : [];
  const out: Way[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as { to?: unknown; go?: unknown; back?: unknown };
    if (typeof r.to !== 'string' || r.to === '') continue;
    const way = { to: r.to, go: dirs(r.go), back: dirs(r.back) };
    if (way.go.length === 0 || way.back.length === 0) continue;
    out.push(way);
  }
  return out;
}

/**
 * Walk an authored list of directions, one door at a time — the
 * `patrols` shape, through `LocomotionApi` so the mode and the
 * engagement bookkeeping are the ones every other walker uses.
 *
 * ⚠ Stops at the first door that refuses and says so. **Blocked means
 * blocked**: nothing re-routes, because a keeper who finds another way
 * round a shut door hides the door.
 */
async function walkRoute(
  keeper: Keeper,
  directions: readonly string[],
): Promise<boolean> {
  for (const direction of directions) {
    const room = keeper.getContainer();
    if (!room || !MixinApi.isExitable(room)) return false;
    const exit = (room as Stuff & Exitable).getExits().get(direction);
    if (!exit) return false;
    try {
      await LocomotionApi.traverseWithDefault(keeper, exit);
    } catch {
      return false;
    }
  }
  return true;
}

/** The supplier's counter: the first Stock among the supplier Business's operating locations. */
async function supplierCounterOf(supplierPath: string): Promise<Stock | null> {
  const supplier = StuffApi.findByTemplatePath(supplierPath) ?? (await StuffApi.singletonOrClone(supplierPath).catch(() => null));
  if (!supplier || !MixinApi.isBusiness(supplier)) return null;
  for (const path of supplier.getOperatingLocations()) {
    const live = StuffApi.findByTemplatePath(path);
    if (live instanceof Stock) return live;
  }
  return null;
}

/**
 * A keyword that BUYS the template at this counter: `buy <kw>` takes the
 * first shelf good carrying it, so the primary keyword alone is not
 * enough — every crate on the cash-and-carry answers to `crate`, and the
 * keeper sent for limes came home with grapes. Pick the first of the
 * good's keywords whose first match on the shelf IS the template.
 */
function keywordOfTemplate(counter: Stock, template: string): string | null {
  const item = counter.offeredItems().find((i) => i.getTemplatePath() === template);
  if (!item || !MixinApi.isPerceptible(item)) return null;
  const primary = item.getPrimaryKeyword();
  const candidates = [...(primary ? [primary] : []), ...item.getKeywords()];
  for (const kw of candidates) {
    if (counter.resolveBuy(kw)?.getTemplatePath() === template) return kw;
  }
  return null;
}

/**
 * A keyword the good ANSWERS TO. ⚠ The primary keyword is not always one:
 * a `Bottle`'s constructor names itself `bottle` and a row that authors
 * `keywords: [coffee, sack, beans]` leaves that primary standing outside
 * its own list — so `get 1 bottle` found nothing, the beat stopped at its
 * first good, and the pantry never delivered a sack. Found by the
 * economic bootstrap's drive.
 */
function keywordOf(good: Stuff): string | null {
  if (!MixinApi.isPerceptible(good)) return null;
  const primary = good.getPrimaryKeyword();
  if (primary && good.hasKeyword(primary)) return primary;
  return good.getKeywords()[0] ?? primary ?? null;
}

function positiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}
