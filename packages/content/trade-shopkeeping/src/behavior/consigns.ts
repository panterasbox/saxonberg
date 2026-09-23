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
 * literal verbs through `forceCommand` (the giver's own method since the OO sweep) — `get`, `put … in`,
 * `job post … --bounty --from` — so the whole loop is the seat's: the
 * hand holds a `purchases` position and carries the house card dealt at
 * hire (`EmploymentLogic`, 3d).
 *
 * ## ⭐⭐ The hand WALKS (logistics D11)
 *
 * Movement between the floor and the counter used to be a `teleport` —
 * the same magic as the bar's `populates:` bottles, one level up the
 * chain. It is now a `journey` over the city lane, through the back door
 * this build gave the floor, on the road this build authored.
 *
 * ⚠⚠ **The plan expected it to post the work instead**, because every
 * producer floor was an **exitless island** and walking was therefore
 * impossible. This build removed that reason: the floors have doors now.
 * With the island gone the honest answer is the plain one.
 *
 * ⭐ And the reason it matters WHICH one ships is the money.
 * Consignment is sale-or-return: the producer is paid **on resale**, out
 * of its own listing. A crate hauled to the counter by somebody else is
 * a crate nobody has listed, and no shipped mechanism lets a carrier —
 * or the distributor's clerk — list goods on the producer's behalf. So
 * posting this leg would have quietly stopped paying six producers,
 * which is a regression rather than a lesson. The **wholesale
 * purchase** that would make a posted version honest is a real missing
 * seam, named in [docs/subsystems/logistics.md].
 *
 * ⚠ The sibling `restocks` genuinely cannot walk — its host is the
 * Saxonberg Lounge bar, and *"Saxonberg and the Lounge joining the
 * map"* is a stated non-goal — so that one posts and a hauler buys and
 * is reimbursed. Two brains, two shapes, and the difference is a fact
 * about the map rather than a preference.
 *
 * ⭐ The floor still carries a works board: what the house wants moved
 * that it cannot move itself hangs there, and the door is how a hauler
 * gets to it.
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
 *
 * ⭐ The listing's BASIS is the counter's policy, not this config's
 * (economic bootstrap D11): at a `purchasing: terms` counter the `--ask`
 * is the supplier's price — what the outfit is owed at sale — and the
 * shop prices the good itself; at a consignment counter it is the ask.
 * A counter that carries a stock LINE for the good takes only to par.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Employed } from '@saxonberg/server/mud/lib/employment/Employed';
import Stock from '@saxonberg/server/mud/lib/retail/Stock';

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
    const outfits = await (hand as unknown as Stuff & Employed).buysFor();
    const outfit = outfits[0];
    if (!outfit) return;
    // The shelf's own cap where it authors one (the cash-and-carry, the
    // produce stalls), else the global dial — the same rule `consign`
    // itself applies, or the hand stops carrying under a ceiling the
    // counter does not have.
    const cap = shelf.getListingCapOverride() ?? listingCap();
    const headroom =
      cap > 0
        ? Math.max(0, cap - shelf.activeListingCount(outfit.getTemplatePath() ?? ''))
        : Number.POSITIVE_INFINITY;
    if (headroom <= 0) return;
    const batch = Math.min(positiveInt(ctx.config.batch, DEFAULT_BATCH), headroom);
    // ⭐ A shelf that carries a LINE for the good (economic bootstrap
    // D11/D14: a `terms` counter with a par) takes only up to par — the
    // supplier fills the shortfall, never the shop's back room. A good
    // with no line on the shelf is a brokerage listing as before.
    const room = shelfHeadroom(shelf);
    const goods = (stock.getContents() as Stuff[])
      .filter((g) => MixinApi.isChattel(g) && MixinApi.isPerceptible(g) && room.take(g))
      .slice(0, batch);
    if (goods.length === 0) return;
    const counterRoom = shelf.getContainer();
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
    // Home is the floor the stock stands on.
    //
    // ⚠ It used to be re-taken here with a `teleport`, because the hand
    // travelled to the counter and a beat captured mid-trip restored it
    // THERE. It does not travel any more, so there is nothing to come
    // back from — and a hand that has somehow ended up elsewhere simply
    // does nothing this beat rather than teleporting home, because
    // **there is no `teleport` in this brain at all** and that is the
    // whole of D11.
    const home = MixinApi.isContainable(stock) ? stock.getContainer() : null;
    if (!home || !MixinApi.isContainer(home)) return;
    if (hand.getContainer() !== home) return;

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
    const room2 = shelfHeadroom(shelf);
    const carried = (hand.getContents() as Stuff[])
      .filter((c) => MixinApi.isChattel(c) && !MixinApi.isCredentialWallet(c) && room2.take(c)) // the house card is chattel too — not for sale
      .slice(0, Number.isFinite(headroom) ? headroom : undefined);
    if (carried.length === 0) return;

    // ⭐⭐ **It WALKS.** The hand goes to the counter, consigns as the
    // house, and walks home — over the road this build authored, on the
    // same `journey` a player drives, through the back door the floor
    // now has.
    //
    // ⚠⚠ This is the LITERAL reading of D11's *"stop teleporting"*, and
    // it is available only because the build removed the reason it was
    // ruled out. The plan's P2 chose *"post the work and let a hauler
    // carry it"* because **every producer floor was an exitless
    // island** — and this build gave each of them a door onto the goods
    // yards. The island is gone, so the honest answer is the plain one.
    //
    // ⭐ The reason it MATTERS which one ships is the money. Consignment
    // is sale-or-return: the producer is paid **on resale**, out of its
    // own listing. A crate hauled to the counter by somebody else is a
    // crate nobody has listed — and no shipped mechanism lets a carrier,
    // or the distributor's clerk, list goods on the producer's behalf.
    // Posting the leg would therefore have quietly stopped paying six
    // producers, which is a regression rather than a lesson. The
    // wholesale purchase that would make the posted version honest is a
    // real missing seam, and it is named in the subsystem doc.
    //
    // ⚠ `restocks` cannot do this: its host is the Lounge bar, which a
    // stated non-goal keeps off the road map. That leg posts, and the
    // hauler buys and is reimbursed — which is why the two brains ended
    // up different shapes.
    const counterPath = counterRoom.getTemplatePath() ?? '';
    const homePath = home.getTemplatePath() ?? '';
    if (counterPath === '' || homePath === '') return;

    await walkTo(hand, counterPath);
    if (hand.getContainer() !== counterRoom) {
      // ⚠ Blocked means blocked. The goods stay in hand and the next
      // beat tries again; nothing teleports around the problem, which is
      // the entire point.
      return;
    }
    try {
      // Every beat, not once: a forced command reports no outcome here,
      // and a hand dealt its card AFTER a failed first attempt must
      // still trade as the house.
      await hand.forceCommand('wallet use house');
      for (const good of carried) {
        const kw = keywordOf(good);
        if (!kw) continue;
        const ask = askFor(ctx.config, good);
        await hand.forceCommand(`consign ${kw} --ask ${ask}`);
      }
    } finally {
      // Home again, on its own feet. ⚠ In a `finally` for the reason the
      // teleport was: a beat that dies at the counter must not leave the
      // hand standing in somebody else's shop forever.
      await walkTo(hand, homePath);
    }
  }
} satisfies BrainStatics;

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

/**
 * The shelf's per-line headroom (`par − onHand`) for goods the shelf
 * carries a stock line for, counted down as goods are taken; a good with
 * no line is unbounded here (the per-consignor cap still applies).
 */
function shelfHeadroom(shelf: Stuff): { take: (good: Stuff) => boolean } {
  const left = new Map<string, number>();
  return {
    take: (good: Stuff): boolean => {
      if (!(shelf instanceof Stock)) return true;
      const path = good.getTemplatePath() ?? '';
      const line = shelf.lineFor(path);
      if (!line) return true;
      const n = left.get(path) ?? Math.max(0, line.par - shelf.onHand(path));
      if (n <= 0) return false;
      left.set(path, n - 1);
      return true;
    },
  };
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

/**
 * Walk to a room, one `go <direction>` at a time.
 *
 * ⚠ **`go`, not `journey`.** `journey` is afforded by a VEHICLE — content
 * affords content — and a floor hand pushing goods by hand has none. So
 * the hand walks the way a person without a cart walks, which is also
 * the way a player would.
 *
 * ⭐ The route comes from the transport pack's `LaneCatalogue`, reached
 * **by shape** and never by import (the `TravelNode` /
 * `AnalyzeWaterController` idiom — the mudlib does not import packs). An
 * install with no roads has a hand that simply does not travel, which is
 * the honest degradation: without the pack there is nowhere to walk.
 *
 * ⚠ Bounded, and it stops on the first refused step. **Blocked means
 * blocked**: the goods stay in hand and the next beat tries again.
 * Nothing here routes around anything, because auto-routing would hide
 * the geography the road was built to make real.
 *
 * ⚠⚠ **This is the ONE non-vehicle caller of the lane router, and it is
 * deliberately not shared.** Its errand is genuinely cross-district (a
 * producer's yard to a city counter); a shop's keeper crossing its own
 * street walks AUTHORED directions instead (`stocks`), because a search
 * over a freight network to reach the building opposite is not a route,
 * it is a category error. Whether one pathfinder should serve every
 * consumer is open — docs/slates/builds/pathfinding-slate.md — and until
 * it is answered nothing promotes this out of the brain that needs it.
 */
async function walkTo(hand: Hand, targetPath: string): Promise<void> {
  const here = hand.getContainer()?.getTemplatePath() ?? '';
  if (here === '' || here === targetPath) return;

  const catalogue = await StuffApi.singleton<Stuff>(
    '/system/transport/idea/LaneCatalogue',
  ).catch(() => null);
  const planner = catalogue as unknown as {
    planRoute?: (
      from: string,
      to: string,
      lane: string,
    ) => Promise<{ nodes: readonly string[] } | null>;
  } | null;
  if (!planner || typeof planner.planRoute !== 'function') return;

  const route = await planner.planRoute(here, targetPath, 'city');
  if (!route) return;

  for (let i = 0; i + 1 < route.nodes.length; i += 1) {
    const room = hand.getContainer();
    if (!room || !MixinApi.isExitable(room)) return;
    const next = route.nodes[i + 1]!;
    let direction = '';
    for (const [dir, exit] of room.getExits().entries()) {
      if (exit.getDestinationTemplatePath() === next) {
        direction = dir;
        break;
      }
    }
    if (direction === '') return;
    await hand.forceCommand(`go ${direction}`);
    if (hand.getContainer()?.getTemplatePath() !== next) return;
  }
}
