/**
 * `eats` brain — ⭐⭐⭐ **somebody who is not the player buys bread and
 * eats it, every morning, unprompted.**
 *
 * ## Why this exists, and why it is not a nicety
 *
 * The build shipped a grower, a miller and a baker and **nobody who
 * needed bread**. Thirty-two brains existed and none of them ate: the
 * whole chain terminated in a shop, and the only demand in the world was
 * a player deciding to be hungry. A trade whose product nobody requires
 * is a crafting minigame with a price tag on the end.
 *
 * Eco's chronic failure is the same shape from the other side — forced
 * specialization is dead weight below a population threshold — and NPC
 * demand is what keeps a specialized economy alive when the server is
 * quiet.
 *
 * ## ⭐⭐ The purse chooses the loaf (D22)
 *
 * Hunger alone gives the baker a customer. It does not give extraction a
 * **meaning**. Anno 1800 gives each population tier its own basket;
 * Victoria 3 models pops by wealth stratum; Against the Storm
 * differentiates by species — all three are aggregate simulations
 * straining toward something we can do per-person.
 *
 * So the buyer reads the counter's prices, reads **their own balance**,
 * and buys the dearest loaf they can reasonably afford. Two people on
 * two wage rates therefore walk in on the same morning and walk out with
 * different bread — and *which* loaf is dear is the baker's pricing
 * decision, not a fact about either person.
 *
 * ⚠⚠ **The engine measures the purse, never the person.** One number
 * compared to prices, at the moment of a purchase. Nothing is written
 * back: no band, no label, no trait, no chronicle entry says "poor". The
 * pattern exists only in what a bystander sees two mornings running, and
 * that is the only honest place for it to exist.
 *
 * ## ⚠ NPC hunger begins existing in this build
 *
 * Satiation is reconcile-on-read and **nothing has ever read an NPC's**
 * (`Metabolic.ts`'s only external `reconcileMetabolism` caller is the
 * caster). So this brain's `eat` is the first read: the elapsed drain is
 * billed at that moment and the loaf restores it. On a long-running
 * world the first morning therefore reads a very hungry clerk, which is
 * honest rather than a bug.
 *
 * ⚠ Only the rows that gain this brain move. Every other NPC in the
 * world is exactly as inert as before, and **nothing about a player's
 * hunger is touched** — no constant, no reserve, no floor effect.
 *
 * ## The doctrine
 *
 * ⭐ Nothing here is unavailable to a player. Every act is a literal verb
 * through `forceCommand` — `teleport`, `buy`, `eat` — gated exactly as a
 * typed line is. The brain reads prices and a balance; it does not move
 * money, and it cannot buy anything a person standing there could not.
 *
 * config: `{ counter: string, fromHour?: number, toHour?: number,
 * spendFraction?: number, hungryLines?: string[] }`.
 */

import type { BrainContext } from './brain';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { CommandGiver } from '../command/CommandGiver';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { BankingApi } from '../../api/banking';
import { CelestialApi } from '../../api/celestial';
import { WorldClockApi } from '../../api/worldclock';

/** The morning window, in local hours. A baker's customers come early. */
const DEFAULT_FROM_HOUR = 6;
const DEFAULT_TO_HOUR = 10;

/**
 * ⭐ What share of everything you have you will spend on one meal.
 *
 * A quarter is what a purse-limited person does at a counter: you do not
 * spend your last coin on bread and you do not buy the cheap loaf when
 * the good one is comfortably within reach. It is deliberately a
 * fraction of the BALANCE and not of the wage — the balance is already
 * the consequence of the wage, and a person spends what they have rather
 * than what they earn.
 */
const DEFAULT_SPEND_FRACTION = 0.25;

/** Said at an empty counter. A person who did not get bread. */
const DEFAULT_HUNGRY_LINES = [
  'looks over the empty shelf, and goes back to work without breakfast.',
  'checks the bread counter twice, as if it might have changed.',
  'stands at the counter a moment, then leaves with nothing.',
];

type Buyer = Stuff & Mobile & Containable & Container & CommandGiver;

export const brain = class {
  static label = 'eats';
  static presenceGated = false;
  /**
   * Not ambient chatter — this moves goods and money, so it is exempt
   * from the global ambient-cadence dial the way `restocks` is.
   */
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isContainable(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    const buyer = host as Buyer;
    const home = buyer.getContainer();
    if (!home || !MixinApi.isContainer(home)) return;

    // ── the beat: once a game-day, inside the morning window ─────────
    //
    // ⚠ `cadence` is REAL time (a jittered timer) and there is no
    // clock-hour trigger anywhere, so the window is read here rather
    // than declared. `ctx.state` is the per-(host, wiring) scratch bag —
    // which is where a brain's memory lives so the module stays
    // stateless.
    const when = await localTime(home);
    if (when === null) return;
    const from = numberOr(ctx.config.fromHour, DEFAULT_FROM_HOUR);
    const to = numberOr(ctx.config.toHour, DEFAULT_TO_HOUR);
    if (when.hour < from || when.hour >= to) return;
    if (ctx.state.lastAteDay === when.day) return;
    ctx.state.lastAteDay = when.day;

    const counterPath = ctx.config.counter;
    if (typeof counterPath !== 'string' || counterPath.length === 0) return;
    const counter = StuffApi.findByTemplatePath<Stuff>(counterPath);
    if (!counter) return;
    const shop = MixinApi.isContainable(counter)
      ? counter.getContainer()
      : null;
    if (!shop || !MixinApi.isContainer(shop)) return;

    try {
      // The `shifts` / `farms` movement shape: a teleport, with home
      // always re-taken in `finally`.
      await buyer.forceCommand(`teleport ${pathOf(shop as unknown as Stuff)}`);

      const choice = await chooseLoaf(buyer, counter, ctx);
      if (choice === null) {
        sayHungry(ctx);
        ctx.state.hungryDays = countUp(ctx.state.hungryDays);
        return;
      }

      await buyer.forceCommand(`buy ${choice.keyword}`);
      // ⚠ A forced command reports no outcome, so the only honest check
      // is whether a loaf is in hand now.
      const held = heldLoaf(buyer, choice.keyword);
      if (held === null) {
        sayHungry(ctx);
        ctx.state.hungryDays = countUp(ctx.state.hungryDays);
        return;
      }
      await buyer.forceCommand(`eat ${choice.keyword}`);
      ctx.state.hungryDays = 0;
    } finally {
      await buyer.forceCommand(`teleport ${pathOf(home as Stuff)}`);
    }
  }
};

/** What is on the counter, and what it costs. */
interface Offer {
  keyword: string;
  price: number;
}

/**
 * ⭐⭐ **The purse chooses.** The dearest loaf whose price is within
 * `spendFraction` of the balance — so a clerk on a good wage takes the
 * white loaf and a pantry hand takes the lean one, on the same morning,
 * at the same counter, with nothing anywhere saying why.
 *
 * ⚠ `primaryAccountIdOf` answers `null` for a person no business has
 * ever paid. That is a real state on a fresh world before the first wage
 * roll, and it must read as **a balance of zero** — a person with no
 * money who wants bread — rather than as silence.
 */
async function chooseLoaf(
  buyer: Buyer,
  counter: Stuff,
  ctx: BrainContext,
): Promise<Offer | null> {
  const offers = offersOn(counter);
  if (offers.length === 0) return null;

  const identity =
    (buyer as unknown as { getIdentityPath?(): string }).getIdentityPath?.() ??
    '';
  let balance = 0;
  if (identity) {
    try {
      const accountId = await BankingApi.primaryAccountIdOf(identity);
      if (accountId) balance = BankingApi.balanceOf(accountId).minor;
    } catch {
      balance = 0;
    }
  }
  const ceiling =
    balance * numberOr(ctx.config.spendFraction, DEFAULT_SPEND_FRACTION);

  let best: Offer | null = null;
  for (const offer of offers) {
    if (offer.price > ceiling) continue;
    if (best === null || offer.price > best.price) best = offer;
  }
  return best;
}

/** Every priced loaf standing on the counter. */
function offersOn(counter: Stuff): Offer[] {
  const priced = counter as unknown as {
    priceFor?(key: string): number | null;
    getContents?(): Stuff[];
  };
  if (typeof priced.getContents !== 'function') return [];
  const out: Offer[] = [];
  const seen = new Set<string>();
  for (const item of priced.getContents()) {
    if (!isLoaf(item)) continue;
    const path = item.getTemplatePath() ?? '';
    if (!path || seen.has(path)) continue;
    const price =
      typeof priced.priceFor === 'function' ? priced.priceFor(path) : null;
    if (price === null || !(price > 0)) continue;
    const keyword = keywordFor(item);
    if (!keyword) continue;
    seen.add(path);
    out.push({ keyword, price });
  }
  return out;
}

/** Bread, by the material's own tag — never by class and never by name. */
function isLoaf(item: Stuff): boolean {
  if (!MixinApi.isTangible(item)) return false;
  const material = item.getMaterial();
  return material !== null && material.hasTag('bread');
}

/** A keyword the buy/eat verbs will resolve this item by. */
function keywordFor(item: Stuff): string | null {
  if (!MixinApi.isPerceptible(item)) return null;
  const keywords = item.getKeywords();
  return keywords.length > 0 ? keywords[0]! : null;
}

/** Is a loaf of that keyword in the buyer's hands now? */
function heldLoaf(buyer: Buyer, keyword: string): Stuff | null {
  for (const item of buyer.getContents()) {
    const s = item as unknown as Stuff;
    if (!isLoaf(s)) continue;
    if (MixinApi.isPerceptible(s) && s.hasKeyword(keyword)) return s;
  }
  return null;
}

/** The local hour and day, off the game clock. */
async function localTime(
  where: Stuff,
): Promise<{ hour: number; day: number } | null> {
  try {
    const profile = await CelestialApi.profileFor(where);
    const t = WorldClockApi.getNow().rawValue();
    return {
      hour: CelestialApi.secondOfDay(profile, t) / 3600,
      day: CelestialApi.dayOfYear(profile, t),
    };
  } catch {
    return null;
  }
}

/** ⭐ A person who did not get bread. Not an error, and not silence. */
function sayHungry(ctx: BrainContext): void {
  const authored = ctx.config.hungryLines;
  const pool =
    Array.isArray(authored) && authored.length > 0
      ? (authored.filter((l): l is string => typeof l === 'string'))
      : DEFAULT_HUNGRY_LINES;
  if (pool.length === 0) return;
  const i = Math.floor(Math.random() * pool.length);
  ctx.emoteFree(pool[i]!);
}

function pathOf(s: Stuff): string {
  return s.getTemplatePath() ?? '';
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function countUp(v: unknown): number {
  return (typeof v === 'number' && Number.isFinite(v) ? v : 0) + 1;
}
