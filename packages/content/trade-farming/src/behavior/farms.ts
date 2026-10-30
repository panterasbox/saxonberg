/**
 * `farms` brain (`/trade/farming/behavior/farms` — the trade ships its
 * own brain; the first pack brain on the capability rung) — the producer beat: a farmer works their own ground and
 * brings the take to the farmers market, all through the literal verbs.
 *
 * The roadmap's production brain, and the `consigns` shape grown a
 * front half. On shift only (a hired hand; the `cuts` rule). Each beat,
 * at home on the farm: read each bed the way a player would
 * (`soilMoistureFraction` / `nutrientFraction`) and — ⭐ when home is a
 * FIELD — read each of its parts through the crop rooted there, at the
 * hand's OWN band with a seeded bracket (`crop.readFor(band,
 * crop.readSeedFor(hand))`, field population D11/D12), so a novice can
 * water the wrong patch and an expert cannot. Then ONE watering (a can
 * is one can) to the lowest read below `waterAt` — `fill can from
 * <from>` at the configured water room, then `water <crop> at <part>` —
 * and one feeding (`feed <crop> at <part> with sack`) likewise; `pick
 * <ground>` for each ripe occupant of a bed (bounded — the ground-target
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
 * number, drawEvery?: number, drawAmount?: number, water?: { room:
 * string, from: string } }` — `home` the grove/fields room (template
 * path), `shelf` the market stall (template path; `''` disables the
 * market leg), `water` where the can is filled (the room's template path
 * and the source's keyword; default a standpipe at home), `ask` minor
 * units by the produce's primary keyword, `batch`
 * picks/consigns per beat (default 6), `waterAt`/`feedAt` the fractions
 * below which the ground gets tended (defaults 0.5 / 0.35),
 * `drawEvery` beats between draws (default 12, 0 disables),
 * `drawAmount` minor units (default 20).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Cultivable } from '@saxonberg/server/mud/lib/husbandry/Cultivable';
import type { Soil } from '@saxonberg/server/mud/lib/husbandry/Soil';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Employed } from '@saxonberg/server/mud/lib/employment/Employed';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

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
  static kind: TaskKind = 'work';
  static summary =
    'Works the farm: waters dry ground, feeds hungry ground, picks what is ripe, and consigns the take at the market.';
  static discipline = 'agriculture';
  static produces: readonly string[] = ['produce'];
  static consumes: readonly string[] = ['water', 'fertilizer'];
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'looks out over the ground and reaches for the can');
  }
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
    // A hired hand works on shift; a smallholder works their own (the
    // `cuts` rule).
    if (
      MixinApi.isEmployed(hand) &&
      hand.getActiveEmployment() &&
      hand.shiftState() !== 'on-shift'
    ) {
      return;
    }
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

    // ── the front half: read, tend and pick, at home ──
    const grounds = (home.getContents() as Stuff[])
      .filter((g): g is Stuff & Cultivable & Soil => MixinApi.isCultivable(g))
      .slice(0, GROUNDS_CAP);
    const tends: Tend[] = [];
    for (const ground of grounds) {
      const kw = keywordOf(ground);
      if (!kw) continue;
      // A bed's own reads: is the soil dry, is the nitrogen down?
      tends.push({
        water: `water ${kw}`,
        feed: `feed ${kw} with sack`,
        moisture: ground.soilMoistureFraction(),
        nutrient: ground.nutrientFraction(),
      });
    }
    // ⭐ A FIELD is read through its crop, part by part, at the hand's OWN
    // band (field population D11/D12): the observed moisture is the truth
    // plus a seeded error inside the band's bracket, so a novice can
    // water the wrong patch and an expert cannot. Never the true figure.
    if (MixinApi.isSoil(home) && !MixinApi.isCultivable(home)) {
      const parts: readonly ((Stuff & Soil) | null)[] =
        home.soilParts().length > 0 ? home.soilParts() : [null];
      for (const bed of parts.slice(0, GROUNDS_CAP)) {
        const crop = home.rootedAreaCrop(bed);
        if (!crop) continue;
        const kw = keywordOf(crop);
        if (!kw) continue;
        const band: CompetenceBandName = MixinApi.isAdvancing(hand)
          ? await hand.competenceBandFor(crop.getDiscipline())
          : 'untrained';
        const read = crop.readFor(band, crop.readSeedFor(hand));
        const part = bed ? bed.presentationPhrase().definite() : null;
        tends.push({
          water: part ? `water ${kw} at ${part}` : `water ${kw}`,
          feed: part ? `feed ${kw} at ${part} with sack` : `feed ${kw} with sack`,
          moisture: read.moisture ?? null,
          nutrient: read.nutrient ?? null,
        });
      }
    }
    // One watering and one feeding a beat at most — a can is one can —
    // each to the LOWEST read below its mark.
    const thirsty = lowest(tends, (t) => t.moisture, waterAt);
    if (thirsty) {
      // Top the can up first, at the configured water (the yard trough)
      // or at home; a fill that declines leaves the can as it was, and
      // the water pours from whatever the hand carries — both verbs' own
      // rules, not the brain's.
      await fillCan(hand, ctx.config.water, home as Stuff & Container);
      await hand.forceCommand(thirsty.water);
    }
    const hungry = lowest(tends, (t) => t.nutrient, feedAt);
    if (hungry) await hand.forceCommand(hungry.feed);

    let picked = 0;
    for (const ground of grounds) {
      const kw = keywordOf(ground);
      if (!kw) continue;
      // Pick the ripe occupants — TARGETING THE GROUND, so the verb's
      // own resolution finds the ripest plant and keyword ambiguity
      // between sibling trees never enters. Bounded twice: by the batch
      // and by a no-progress guard (a pick that declines must not grind).
      let remaining = ripeCount(ground);
      while (remaining > 0 && picked < batch) {
        await hand.forceCommand(`pick ${kw}`);
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
    // `shelf: ''` disables the market leg (a hired hand on the campus
    // farm sells nothing).
    if (carried.length > 0 && shelfPath !== '') {
      // ⚠⚠⚠ **LIVE ONLY — never `singletonOrClone`**, and this line used
      // to end `?? (await StuffApi.singletonOrClone(shelfPath))`.
      //
      // A brain beat that fires BEFORE the shelf's own room has minted
      // its `props:` found nothing live and cloned a second counter at
      // the same template path. From then on every
      // `findByTemplatePath` of that path THREW `expected singleton,
      // found N` — including `BuyController`'s. ⭐ The reachability
      // sweep's drive caught it at the general store, where the count
      // was **THREE** and `buy torch` answered *"Something went wrong
      // in BuyController"* for every player on a fresh boot. Two
      // different brains aimed at that one counter (this one, from the
      // wharfside weaver, and `trade-farming`'s `farms`) and the roster
      // tick made the third.
      //
      // ⭐ A shelf that is not live is **nothing to carry this beat** —
      // which is exactly how this function already treats the floor
      // stock a few lines up. A brain must never mint a fixture that a
      // room's `props:` owns: the room is the authority on what stands
      // in it, and a beat is just a thing that happens later.
      const shelf = StuffApi.findByTemplatePath(shelfPath);
      if (
        !shelf ||
        !MixinApi.isConsignmentShelf(shelf) ||
        !MixinApi.isContainable(shelf)
      ) {
        return;
      }
      const outfits = await (hand as unknown as Stuff & Employed).buysFor();
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
        await hand.forceCommand('wallet use house');
        for (const good of goods) {
          const kw = keywordOf(good);
          if (!kw) continue;
          const ask = askFor(ctx.config, good);
          await hand.forceCommand(`consign ${kw} --ask ${ask}`);
        }
      } finally {
        hand.teleport(home as Stuff & Container);
      }
    }

    // ── the residual, made visible: one beat in N draws the take ──
    const drawEvery =
      ctx.config.drawEvery === 0
        ? 0
        : positiveInt(ctx.config.drawEvery, DEFAULT_DRAW_EVERY);
    const beats = ((ctx.state.beats as number | undefined) ?? 0) + 1;
    ctx.state.beats = beats;
    if (drawEvery > 0 && beats % drawEvery === 0) {
      const amount = positiveInt(ctx.config.drawAmount, DEFAULT_DRAW_AMOUNT);
      await hand.forceCommand(`draw ${amount}`);
    }
  }
} satisfies BrainStatics;

/** One ground or part the beat could tend, as the hand reads it. */
interface Tend {
  water: string;
  feed: string;
  moisture: number | null;
  nutrient: number | null;
}

/** The tend whose read is lowest and below `mark`, or `null`. */
function lowest(
  tends: readonly Tend[],
  of: (t: Tend) => number | null,
  mark: number,
): Tend | null {
  let best: Tend | null = null;
  let bestAt = mark;
  for (const t of tends) {
    const v = of(t);
    if (v !== null && v < bestAt) {
      best = t;
      bestAt = v;
    }
  }
  return best;
}

/**
 * `fill can from <from>` — at the configured water room when there is one
 * (`config.water: { room, from }`), home ALWAYS re-taken in `finally`;
 * else at home from a standpipe. The `shifts`/`consigns` movement shape.
 */
async function fillCan(
  hand: Hand,
  config: unknown,
  home: Stuff & Container,
): Promise<void> {
  const w = (config ?? {}) as { room?: unknown; from?: unknown };
  const from = typeof w.from === 'string' && w.from ? w.from : 'standpipe';
  const room =
    typeof w.room === 'string' && w.room
      ? StuffApi.findByTemplatePath(w.room)
      : null;
  if (!room || !MixinApi.isContainer(room) || room === home) {
    await hand.forceCommand(`fill can from ${from}`);
    return;
  }
  hand.teleport(room as Stuff & Container);
  try {
    await hand.forceCommand(`fill can from ${from}`);
  } finally {
    hand.teleport(home);
  }
}

/** Ripe, growing occupants of a ground — what `pick <ground>` will find. */
function ripeCount(ground: Stuff & Cultivable & Soil): number {
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
