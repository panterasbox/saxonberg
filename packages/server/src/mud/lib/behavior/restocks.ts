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
 * verb through `forceCommand` (the giver's own method since the OO sweep) — `wallet use house`, `buy`,
 * `put … on`, `pour … into`, `get`, `wash` — gated exactly as a typed
 * line is: the seat is the authority, the wallet's active account is the
 * principal, and a `buy` the house cannot afford declines the way it
 * would for anyone (the beat stops there; the sheet keeps saying so and
 * `house pnl` shows why). Movement between the bar and the supplier is a
 * `teleport` (the `shifts` shape — a walk is the locomotion slate's).
 *
 * Not presence-gated and not ambient: the back loop runs unwatched, on
 * the authored cadence.
 *
 * config: `{ shelf: string, rack?: string, bin?: string, batch?: number }`
 * — template paths of the fixtures in the keeper's own room (bottles and
 * crates go ON the shelf, glasses IN the rack, ice is poured INTO the
 * bin); `batch` caps the buys per beat (default 12). The supplier is never
 * config — it comes from each par line.
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

    let bought: Stuff[] = [];
    let budget = batch;
    for (const [supplierPath, lines] of bySupplier) {
      if (budget <= 0) break;
      const counterRoom = counterRoomOf(supplierPath);
      if (!counterRoom) continue;
      keeper.teleport(counterRoom as Stuff & Container);
      try {
        if (!ctx.state.house) {
          await keeper.forceCommand('wallet use house');
          ctx.state.house = true;
        }
        const got = await buyLines(keeper, lines, budget);
        bought = bought.concat(got.items);
        budget -= got.items.length;
        if (got.declined) break; // the house can't pay — the sheet says so
      } finally {
        keeper.teleport(home as Stuff & Container);
      }
    }

    // Shelve what came back: ice into the bin, glasses into the rack,
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
    if (rackKw) {
      for (const item of home.getContents() as Stuff[]) {
        if (!isGlass(item) || !isSoiledEmpty(item) || !MixinApi.isContainable(item)) continue;
        const kw = keywordOf(item);
        if (!kw) continue;
        await keeper.forceCommand(`get ${kw}`);
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

/**
 * Buy against each short line at the counter the keeper now stands at:
 * the perceived goods that match the category, one `buy` per unit until
 * the shortfall is covered or the counter runs out. A `buy` that leaves
 * the good where it was declined — stop.
 */
async function buyLines(
  keeper: Keeper,
  lines: StockSheetLine[],
  budget: number,
): Promise<{ items: Stuff[]; declined: boolean }> {
  const items: Stuff[] = [];
  for (const { line, shortfall } of lines) {
    let need = shortfall;
    const candidates = EmploymentApi.goodsFor(keeper, line.category).filter(
      (g): g is Stuff & Containable =>
        MixinApi.isContainable(g) && g.getContainer() !== keeper && MixinApi.isChattel(g),
    );
    for (const good of candidates) {
      if (need <= 0 || items.length >= budget) break;
      const kw = keywordOf(good);
      if (!kw) continue;
      await keeper.forceCommand(`buy ${kw}`);
      if (good.getContainer() !== keeper) return { items, declined: true };
      items.push(good);
      need -= unitsOf(good, line.unit);
    }
  }
  return { items, declined: false };
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
