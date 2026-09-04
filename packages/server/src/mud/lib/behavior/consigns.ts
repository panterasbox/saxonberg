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
 * ## ⭐⭐ The hand stopped TRAVELLING (logistics D11)
 *
 * It used to carry the floor stock to the distributor's counter and put
 * it up there, and **movement between the floor and the counter was a
 * `teleport`** — the same magic as the bar's `populates:` bottles, one
 * level up the chain.
 *
 * It does not walk instead. It **crates the goods and posts the work**,
 * and somebody else carries them — a player, or the carrier's own
 * carter as the fallback. That is a better reading of the goal than the
 * literal one: not *"the hand walks four rooms"* but ***"the hand does
 * not travel, because carriage is somebody's job."*** Which is the whole
 * point of the logistics build.
 *
 * ⚠ Two shipped facts made the literal reading impossible anyway: every
 * producer floor was an **exitless island**, and the keeper this brain's
 * sibling runs on stands in the Lounge, which a stated non-goal keeps
 * off the road map.
 *
 * ⭐ The board is **on the floor**, so the hand posts without stepping
 * outside. The floor now has a DOOR — because a hauler has to come and
 * collect — and the hand never uses it.
 *
 * Not presence-gated and not ambient: the floor runs unwatched, and the
 * cadence is the authored one.
 *
 * config: `{ stock: string, shelf: string, ask: Record<string, number>,
 * defaultAsk?: number, batch?: number, board?: string, crate?: string,
 * carriage?: number }` — `stock` the outfit's own `Stock` (template
 * path), `shelf` the host counter the goods are FOR (template path),
 * `ask` minor units by census key, `defaultAsk` for a good whose key the
 * table lacks (default 10), `batch` goods per beat (default 6),
 * `board` the works board on this floor, `crate` the consignment
 * container row, and `carriage` what the house will pay to have a crate
 * moved (default: the NPC rate's minimum).
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
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
import type { Employed } from '../employment/Employed';

const DEFAULT_BATCH = 6;
const DEFAULT_ASK = 10;
/** The consignment container a posted haul is about. */
const DEFAULT_CRATE = '/trade/haulage/thing/supply-crate';
/** What the house pays to have one crate moved, when the row says nothing. */
const DEFAULT_CARRIAGE = 6;

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
    const carried = (hand.getContents() as Stuff[])
      .filter((c) => MixinApi.isChattel(c) && !MixinApi.isCredentialWallet(c)) // the house card is chattel too — not for sale
      .slice(0, Number.isFinite(headroom) ? headroom : undefined);
    if (carried.length === 0) return;

    // ⭐⭐ **Crate it and post the work.** The hand does not travel: it
    // puts the goods in a crate on its own floor and hangs a docket on
    // the works board saying where they have to get to and what the
    // house will pay to have them gone. Somebody else carries them.
    const boardPath = ctx.config.board;
    if (typeof boardPath !== 'string' || boardPath === '') return;
    const cratePath =
      typeof ctx.config.crate === 'string' && ctx.config.crate !== ''
        ? ctx.config.crate
        : DEFAULT_CRATE;

    const crate = await StuffApi.clone(cratePath).catch(() => null);
    if (!crate || !MixinApi.isContainer(crate) || !MixinApi.isContainable(crate)) {
      return;
    }
    ContainmentApi.move(crate, home as Stuff & Container);
    const crateKw = keywordOf(crate);
    if (!crateKw) return;

    // Load it — bounded, and `put` one at a time for the same greedy-
    // binding reason `get 1` exists above.
    let loaded = 0;
    for (const good of carried) {
      const kw = keywordOf(good);
      if (!kw) continue;
      await hand.forceCommand(`put ${kw} in ${crateKw}`);
      if (MixinApi.isContainable(good) && good.getContainer() === crate) loaded += 1;
    }
    if (loaded === 0) {
      // Nothing went in; do not leave an empty crate on the floor to be
      // hauled for nothing.
      await StuffApi.destruct(crate as unknown as Stuff);
      return;
    }

    // ⚠ Stamped to the outfit, so the crate is the house's until it is
    // handed over — custody will move, ownership will not.
    if (MixinApi.isChattel(crate) && !crate.getChattelId()) {
      await crate.stampChattel(outfit as unknown as Stuff);
    }

    // ⚠ `--bounty`: no claim step, escrow held from post, ANYONE may
    // turn it in. That is what makes "a player who takes it is paid and
    // the NPC does not also perform it" fall out — the gig is settled
    // and gone by the time the carter looks.
    //
    // ⚠⚠ And NO `--expires`. If the posting lapsed the escrow would
    // revert and the distributor would go unsupplied, which is the exact
    // regression D11 forbids. The window a hauler waits is the CARTER's
    // patience, not the posting's lifetime.
    const carriage = positiveInt(ctx.config.carriage, DEFAULT_CARRIAGE);
    const homePath = home.getTemplatePath() ?? '';
    const toPath = counterRoom.getTemplatePath() ?? '';
    if (homePath === '' || toPath === '') return;
    await hand.forceCommand('wallet use house');
    await hand.forceCommand(
      `job post ${crateKw} to ${toPath} for ${carriage} --bounty --business --from ${homePath}`,
    );
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
