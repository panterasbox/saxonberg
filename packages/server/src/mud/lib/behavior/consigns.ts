/**
 * `consigns` brain — a producer's floor hand carries the floor stock to a
 * distributor's counter and consigns it **as the business**.
 *
 * The back half of the bar's supply chain (libations D4, decision g):
 * a producer pack ships an *outfit* — a Business, a `Stock` its floor
 * product stands in (the spawn sweep fills it to target through the
 * rows' own `container:`), and a hand NPC running this brain whose config
 * names the **host** shelf. The annex names the host; the distributor
 * names nobody. Each beat, up to `batch` goods that sit in the outfit's
 * stock are taken, carried to the shelf's room, and put up at the ask the
 * config keys by census key.
 *
 * ⭐ **Nothing here is unavailable to a player.** The hand drives the
 * literal verbs through `forceCommand` (the giver's own method since the OO sweep) — `get`, `wallet use
 * house`, `consign … --ask` — so the whole loop is the seat's: the hand
 * holds a `purchases` position and carries the house card dealt at hire
 * (`EmploymentLogic`, 3d), `wallet use house` makes the outfit's
 * operating account the one it trades as, and `consign` then records the
 * business as consignor and pays its account on resale. Movement between
 * the floor and the counter is a `teleport` (the `shifts` shape — a walk
 * is the locomotion slate's).
 *
 * Not presence-gated and not ambient: the floor runs unwatched, and the
 * cadence is the authored one.
 *
 * config: `{ stock: string, shelf: string, ask: Record<string, number>,
 * defaultAsk?: number, batch?: number }` — `stock` the outfit's own
 * `Stock` (template path), `shelf` the host counter (template path,
 * materialized on demand), `ask` minor units by census key, `defaultAsk`
 * for a good whose key the table lacks (default 10), `batch` goods per
 * beat (default 6).
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { CommandApi } from '../../api/command';
import { AppApi } from '../../api/app';
import { EmploymentApi } from '../../api/employment';
import { AppSettingKeys } from '../config/AppSettings';
import type { CommandGiver } from '../command/CommandGiver';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { BrainContext, BrainStatics } from './brain';

const DEFAULT_BATCH = 6;
const DEFAULT_ASK = 10;

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

export const brain = class {
  static label = 'consigns';
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
    const hand = host as Hand;
    const stockPath = ctx.config.stock;
    const shelfPath = ctx.config.shelf;
    if (typeof stockPath !== 'string' || typeof shelfPath !== 'string') return;

    // The outfit's floor stock — live only (the sweep fills it; nothing to
    // carry until it has).
    const stock = StuffApi.findByTemplatePath(stockPath);
    if (!stock || !MixinApi.isContainer(stock)) return;
    // The host's counter, and the room it stands in.
    const shelf =
      StuffApi.findByTemplatePath(shelfPath) ??
      (await StuffApi.singletonOrClone(shelfPath));
    if (!shelf || !MixinApi.isConsignmentShelf(shelf) || !MixinApi.isContainable(shelf)) return;

    // The hand consigns AS its outfit, so the shelf's per-consignor cap
    // (`retail.consignment.listingCap`) is the outfit's headroom — an NPC
    // executes the rule, it never runs at a decline. Nothing is lifted
    // off the floor that could not go up this beat.
    const outfits = await EmploymentApi.buysFor(hand);
    const outfit = outfits[0];
    if (!outfit) return;
    const cap = listingCap();
    const headroom =
      cap > 0
        ? Math.max(0, cap - shelf.activeListingCount(outfit.getTemplatePath() ?? ''))
        : Number.POSITIVE_INFINITY;
    if (headroom <= 0) return;
    const batch = Math.min(positiveInt(ctx.config.batch, DEFAULT_BATCH), headroom);
    const goods = (stock.getContents() as Stuff[])
      .filter((g) => MixinApi.isChattel(g) && MixinApi.isPerceptible(g))
      .slice(0, batch);
    if (goods.length === 0) return;
    const counterRoom = shelf.getContainer();
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
    // Home is the floor the stock stands on — never "wherever the hand is
    // now": a hand captured mid-beat at the counter (a persistable room)
    // restores THERE, and must still walk back to its own floor.
    const home = MixinApi.isContainable(stock) ? stock.getContainer() : null;
    if (!home || !MixinApi.isContainer(home)) return;
    if (hand.getContainer() !== home) hand.teleport(home as Stuff & Container);

    // Take the goods off the floor — `get` reaches into the open stock.
    //
    // ⚠⚠ `get 1 <kw>`, never a bare `get <kw>`. `get` binds its targets
    // GREEDILY, and a floor stock holds many goods sharing one keyword,
    // so a bare `get grapefruit` takes EVERY grapefruit on the floor —
    // the `batch` cap above then bounds nothing at all. A live drive
    // watched a player's `get coupe` empty a whole rack (twelve), and
    // the hands did the same to their floors every beat: the shelf's
    // per-consignor cap let only a few up, the rest stayed in hand, and
    // the next beat piled more on top.
    //
    // That is not just untidy — it is quadratic. Every `consign` asks
    // `BankingApi.activeCredential`, which resolves `person` scope over
    // everything the hand carries to find its house card, so an
    // inventory that grows without bound makes each consign slower than
    // the last. A profile of the running server put 54% of the process
    // in `ConsignController → activeHouse → activeCredential`.
    const before = new Set(hand.getContents().map((c) => c.stuffId));
    for (const good of goods) {
      const kw = keywordOf(good);
      if (!kw) continue;
      await hand.forceCommand(`get 1 ${kw}`);
      // A lift that declined (too heavy, not there) leaves the good where
      // it was — stop rather than grind through the rest; the next beat
      // starts from what the hand can carry.
      if (!MixinApi.isContainable(good) || good.getContainer() !== hand) break;
    }
    // Everything chattel the hand now carries goes up — not only what
    // this beat took. A beat whose `consign` failed leaves last beat's
    // goods in hand; they are still the outfit's, and the next beat
    // carries them to the board rather than stranding them.
    void before;
    const carried = (hand.getContents() as Stuff[])
      .filter((c) => MixinApi.isChattel(c) && !MixinApi.isCredentialWallet(c)) // the house card is chattel too — not for sale
      .slice(0, Number.isFinite(headroom) ? headroom : undefined);
    if (carried.length === 0) return;

    // To the counter; trade as the house once; put each good up.
    hand.teleport(counterRoom as Stuff & Container);
    try {
      // Every beat, not once: a forced command reports no outcome here,
      // and a hand dealt its card AFTER a failed first attempt must still
      // trade as the house.
      await hand.forceCommand('wallet use house');
      for (const good of carried) {
        const kw = keywordOf(good);
        if (!kw) continue;
        const ask = askFor(ctx.config, good);
        await hand.forceCommand(`consign ${kw} --ask ${ask}`);
      }
    } finally {
      hand.teleport(home as Stuff & Container);
    }
  }
} satisfies BrainStatics;

function keywordOf(good: Stuff): string | null {
  if (!MixinApi.isPerceptible(good)) return null;
  const primary = good.getPrimaryKeyword();
  if (primary) return primary;
  return good.getKeywords()[0] ?? null;
}

/** The ask for a good: its census key in the table, else the default. */
function askFor(config: Record<string, unknown>, good: Stuff): number {
  const table = config.ask;
  const key = MixinApi.isCirculating(good) ? good.getCensusKey() : '';
  if (table && typeof table === 'object' && key) {
    const v = (table as Record<string, unknown>)[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.floor(v);
  }
  return positiveInt(config.defaultAsk, DEFAULT_ASK);
}

/** `retail.consignment.listingCap` — the shelf's per-consignor guard (0 = none). */
function listingCap(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.retailConsignmentListingCap);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
  } catch {
    return 5;
  }
}

function positiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}
