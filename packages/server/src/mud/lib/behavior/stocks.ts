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
 * ⭐ Every step is the LITERAL verb through `forceCommand`, as `consigns`
 * and `restocks` do — an NPC following a rule is still a party posting a
 * price. Nothing here mints, nothing teleports (the walk is `NPC.walkTo`),
 * and the beat is bounded by `batch` (default 6 goods).
 *
 * Config: `{ counter: <the host counter's path>, bank?: <the lender's
 * counter path — the branch of the house's bank when omitted>, batch? }`.
 * The host is a `boot:`-pinned NPC — a brain on an unspawned NPC never
 * fires, and this one must run with nobody online.
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { EmploymentApi } from '../../api/employment';
import { BankingApi } from '../../api/banking';
import type { CommandGiver } from '../command/CommandGiver';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';
import type { Employed } from '../employment/Employed';
import NPC from '../npc/NPC';
import Stock from '../../platform/thing/Stock';

const DEFAULT_BATCH = 6;

type Keeper = NPC & Stuff & Mobile & Containable & Container & CommandGiver & Employed;

export const brain = class {
  static label = 'stocks';
  static presenceGated = false;
  // A functional poller (moves stock and money), not ambient chatter.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !(host instanceof NPC) ||
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
      if (bankRoom) {
        const there = await keeper.walkTo(bankRoom.getTemplatePath() ?? '');
        if (there) {
          await keeper.forceCommand('wallet use house');
          await keeper.forceCommand(`bank borrow ${wanted - held} --for stock`);
        }
      }
    }

    // Buy what the house can now afford, supplier by supplier, and carry
    // it home onto the counter.
    try {
      for (const e of errands) {
        const there = await keeper.walkTo(e.supplierRoom.getTemplatePath() ?? '');
        if (!there) break;
        await keeper.forceCommand('wallet use house');
        const kw = keywordOfTemplate(e.supplierCounter, e.template);
        if (!kw) continue;
        for (let i = 0; i < e.count; i += 1) {
          if (BankingApi.balanceOf(account).minor < (e.supplierCounter.priceFor(e.template) ?? 0)) break;
          const before = keeper.getContents().length;
          await keeper.forceCommand(`buy ${kw}`);
          if (keeper.getContents().length <= before) break; // a refused buy — stop
        }
      }
    } finally {
      // Home, on its own feet, and the goods onto the counter.
      const home = await keeper.walkTo(homePath);
      if (home) {
        const counterKw = keywordOf(counter as unknown as Stuff) ?? 'counter';
        for (const good of [...keeper.getContents()] as Stuff[]) {
          if (!MixinApi.isChattel(good) || MixinApi.isCredentialWallet(good)) continue;
          const kw = keywordOf(good);
          if (!kw) continue;
          await keeper.forceCommand(`put ${kw} in ${counterKw}`);
        }
      }
    }
  }
} satisfies BrainStatics;

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
