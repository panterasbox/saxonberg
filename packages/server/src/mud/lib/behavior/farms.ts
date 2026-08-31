/**
 * `farms` brain — the producer beat: a farmer works their own ground and
 * brings the take to the farmers market, all through the literal verbs.
 *
 * The roadmap's production brain, and the `consigns` shape grown a
 * front half. Each beat, at home on the farm: read each ground the way
 * a player would (`soilMoistureFraction` / `nutrientFraction` — the
 * mixin's own reads), `fill can from standpipe` + `water <ground>` when
 * it runs dry, `feed <ground> with sack` when the nitrogen is down,
 * `pick <ground>` for each ripe occupant (bounded — the ground-target
 * resolves its ripest plant, so the beat never fights keyword
 * ambiguity); then carry the take to the market stall, `wallet use
 * house`, and `consign <fruit> --ask <n>` per item, bounded by the
 * stall's cap headroom (the shelf's authored `listingCapOverride` when
 * present — the A6 seam — else the global dial). Every Nth beat,
 * `draw <n>` — the proprietor's residual made visible.
 *
 * ⭐ **Nothing here is unavailable to a player.** Every act is a forced
 * literal verb; the hand trades as its outfit through the house card
 * dealt at hire (the `consigns` precedent, verbatim). Movement is a
 * `teleport` (the `shifts` shape), and home is ALWAYS re-taken in
 * `finally` — a beat that dies mid-market must not strand the farmer at
 * the stall.
 *
 * Unlike `consigns` there is no `get` at all: a pick lands the fruit
 * straight in the farmer's hands (`HarvestController` moves it to the
 * giver), so the greedy-`get` hazard that bounded that brain never
 * arises. The basket is set-dressing on the farmer row, not a step.
 *
 * config: `{ home: string, shelf: string, ask: Record<string, number>,
 * defaultAsk?: number, batch?: number, waterAt?: number, feedAt?:
 * number, drawEvery?: number, drawAmount?: number }` — `home` the
 * grove/fields room (template path), `shelf` the market stall (template
 * path), `ask` minor units by the produce's primary keyword, `batch`
 * picks/consigns per beat (default 6), `waterAt`/`feedAt` the fractions
 * below which the ground gets tended (defaults 0.5 / 0.35),
 * `drawEvery` beats between draws (default 12, 0 disables),
 * `drawAmount` minor units (default 20).
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { CommandApi } from '../../api/command';
import { AppApi } from '../../api/app';
import { EmploymentApi } from '../../api/employment';
import { AppSettingKeys } from '../config/AppSettings';
import type { CommandGiver } from '../command/CommandGiver';
import type { Cultivable } from '../husbandry/Cultivable';
import type { Stuff } from '../stuff/Stuff';
import type { Mobile } from '../spatial/Mobile';
import type { Containable } from '../spatial/Containable';
import type { Container } from '../spatial/Container';
import type { BrainContext, BrainStatics } from './brain';

const DEFAULT_BATCH = 6;
const DEFAULT_ASK = 5;
const DEFAULT_WATER_AT = 0.5;
const DEFAULT_FEED_AT = 0.35;
const DEFAULT_DRAW_EVERY = 12;
const DEFAULT_DRAW_AMOUNT = 20;
/** Grounds worked per beat — a bound, like every loop here. */
const GROUNDS_CAP = 12;

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

export const brain = class {
  static label = 'farms';
  static presenceGated = false;
  // A functional poller (grows food, moves stock), not ambient chatter.
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
    const homePath = ctx.config.home;
    const shelfPath = ctx.config.shelf;
    if (typeof homePath !== 'string' || typeof shelfPath !== 'string') return;

    // Home is the AUTHORED farm room — never "wherever the hand is now"
    // (the consigns rule: a hand captured mid-beat at the market restores
    // there and must still walk back to its own ground).
    const home = StuffApi.findByTemplatePath(homePath);
    if (!home || !MixinApi.isContainer(home)) return;
    if (hand.getContainer() !== home) hand.teleport(home as Stuff & Container);

    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);
    const waterAt = fraction(ctx.config.waterAt, DEFAULT_WATER_AT);
    const feedAt = fraction(ctx.config.feedAt, DEFAULT_FEED_AT);

    // ── the front half: tend and pick, at home ──
    const grounds = (home.getContents() as Stuff[])
      .filter((g): g is Stuff & Cultivable => MixinApi.isCultivable(g))
      .slice(0, GROUNDS_CAP);
    let picked = 0;
    for (const ground of grounds) {
      const kw = keywordOf(ground);
      if (!kw) continue;
      // The player's own reads: is the soil dry, is the nitrogen down?
      const moisture = ground.soilMoistureFraction();
      if (moisture !== null && moisture < waterAt) {
        // Top the can up first; a ground with no standpipe near simply
        // declines the fill, and the water pours from whatever the hand
        // carries — both verbs' own rules, not the brain's.
        await CommandApi.forceCommand(hand, 'fill can from standpipe');
        await CommandApi.forceCommand(hand, `water ${kw}`);
      }
      const nutrient = ground.nutrientFraction();
      if (nutrient !== null && nutrient < feedAt) {
        await CommandApi.forceCommand(hand, `feed ${kw} with sack`);
      }
      // Pick the ripe occupants — TARGETING THE GROUND, so the verb's
      // own resolution finds the ripest plant and keyword ambiguity
      // between sibling trees never enters. Bounded twice: by the batch
      // and by a no-progress guard (a pick that declines must not grind).
      let remaining = ripeCount(ground);
      while (remaining > 0 && picked < batch) {
        await CommandApi.forceCommand(hand, `pick ${kw}`);
        picked += 1;
        const now = ripeCount(ground);
        if (now >= remaining) break; // declined — stop, next beat retries
        remaining = now;
      }
    }

    // ── the back half: the consigns tail, verbatim guards ──
    const carried = (hand.getContents() as Stuff[]).filter(
      (c) =>
        MixinApi.isChattel(c) &&
        MixinApi.isPerceptible(c) &&
        !MixinApi.isCredentialWallet(c) && // the house card is chattel too
        MixinApi.isCrafted(c) && // the take carries the grower's mark…
        !MixinApi.isTool(c) &&
        !MixinApi.isBulkable(c) && // …the can and the sacks stay home
        !MixinApi.isContainer(c),
    );
    if (carried.length > 0) {
      const shelf =
        StuffApi.findByTemplatePath(shelfPath) ??
        (await StuffApi.singletonOrClone(shelfPath));
      if (
        !shelf ||
        !MixinApi.isConsignmentShelf(shelf) ||
        !MixinApi.isContainable(shelf)
      ) {
        return;
      }
      const outfits = await EmploymentApi.buysFor(hand);
      const outfit = outfits[0];
      if (!outfit) return;
      // The stall's authored cap when present (A6), else the global dial
      // — the hand executes the rule, it never runs at a decline.
      const cap = shelf.getListingCapOverride() ?? listingCap();
      const headroom =
        cap > 0
          ? Math.max(
              0,
              cap - shelf.activeListingCount(outfit.getTemplatePath() ?? ''),
            )
          : Number.POSITIVE_INFINITY;
      if (headroom <= 0) return;
      const counterRoom = shelf.getContainer();
      if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
      const goods = carried.slice(
        0,
        Number.isFinite(headroom) ? (headroom as number) : undefined,
      );
      hand.teleport(counterRoom as Stuff & Container);
      try {
        await CommandApi.forceCommand(hand, 'wallet use house');
        for (const good of goods) {
          const kw = keywordOf(good);
          if (!kw) continue;
          const ask = askFor(ctx.config, good);
          await CommandApi.forceCommand(hand, `consign ${kw} --ask ${ask}`);
        }
      } finally {
        hand.teleport(home as Stuff & Container);
      }
    }

    // ── the residual, made visible: one beat in N draws the take ──
    const drawEvery = positiveInt(ctx.config.drawEvery, DEFAULT_DRAW_EVERY);
    const beats = ((ctx.state.beats as number | undefined) ?? 0) + 1;
    ctx.state.beats = beats;
    if (drawEvery > 0 && beats % drawEvery === 0) {
      const amount = positiveInt(ctx.config.drawAmount, DEFAULT_DRAW_AMOUNT);
      await CommandApi.forceCommand(hand, `draw ${amount}`);
    }
  }
} satisfies BrainStatics;

/** Ripe, growing occupants of a ground — what `pick <ground>` will find. */
function ripeCount(ground: Stuff & Cultivable): number {
  return (ground.getPlants() as Stuff[]).filter(
    (p) => MixinApi.isGrowing(p) && p.isHarvestable(),
  ).length;
}

function keywordOf(thing: Stuff): string | null {
  if (!MixinApi.isPerceptible(thing)) return null;
  const primary = thing.getPrimaryKeyword();
  if (primary) return primary;
  return thing.getKeywords()[0] ?? null;
}

/** The ask for a good: its primary keyword in the table, else the default. */
function askFor(config: Record<string, unknown>, good: Stuff): number {
  const table = config.ask;
  const key = keywordOf(good) ?? '';
  if (table && typeof table === 'object' && key) {
    const v = (table as Record<string, unknown>)[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      return Math.floor(v);
    }
  }
  return positiveInt(config.defaultAsk, DEFAULT_ASK);
}

/** `retail.consignment.listingCap` — the global dial (0 = none). */
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
  return typeof v === 'number' && Number.isFinite(v) && v > 0
    ? Math.floor(v)
    : fallback;
}

function fraction(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
    ? v
    : fallback;
}
