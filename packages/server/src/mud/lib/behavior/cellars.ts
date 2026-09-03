/**
 * `cellars` brain — a fermenting trade's producing beat (fermentation
 * P7, the `farms` shape: literal player verbs, bounded, home in
 * `finally`). The winemaking and brewing hands both run it — which is
 * why it lives in the kernel commons beside `consigns`/`restocks`
 * rather than either trade's pack (a sibling-trade dependency is
 * exactly what the distribution cut removed, D10).
 *
 * One concern per beat, read off the home floor's vats:
 *
 *  - a FINISHED (or turned) vat → the bottling leg: take an empty
 *    vessel, fill it from the vat (the W0 seam stamps the batch's band
 *    and mark), cork it, and consign the take at the distributor as
 *    the outfit;
 *  - an IDLE vat with inputs in reach → the crush leg: `order <recipe>`
 *    off the floor's unpriced work board (the kitchen-menu shape — the
 *    hand is the on-shift maker), pour the bucket into the vat, and
 *    optionally pitch the house culture (`pour jar into vat` — the
 *    transfer seam carries the strain). With a `lagerLeg`, alternate
 *    beats carry the bucket to the cold store and pitch there instead;
 *  - otherwise, every `buyEvery` beats → the buying leg: the house
 *    card at the distributor, inputs home to the floor (the B2B leg,
 *    observable in `bank_ledger`).
 *
 * Every act is a literal player verb; reads (vat phase, held stock)
 * are direct state reads, the `farms` rule. Ferment timing does the
 * rest — the brain never sleeps on a batch, it just reads the vat
 * each beat.
 *
 * config: `{ home: string, counterRoom: string, asks: Record<string,
 * number>, defaultAsk?: number, batch?: number, buyEvery?: number
 * (0 = never buy), buyCount?: number, buyKeyword?: string,
 * buys?: { keyword: string, count?: number }[], inputKeyword?: string,
 * inputMin?: number, crushes?: string[], compounds?: string[],
 * vesselCategory?: string, vesselKeyword?: string, pitchJar?: boolean,
 * lagerLeg?: { recipe: string, room: string },
 * distills?: { recipe: string, runs?: number, igniteKeyword?: string,
 * compounds?: string[] } }`
 */

import type { BrainContext, BrainStatics } from './brain';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Mobile } from '../spatial/Mobile';
import type { CommandGiver } from '../command/CommandGiver';
import type { Fermenting } from '../ferment/Fermenting';
import { CommandApi } from '../../api/command';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';

const DEFAULT_BATCH = 4;
const DEFAULT_ASK = 10;
const DEFAULT_BUY_EVERY = 6;
const DEFAULT_BUY_COUNT = 2;
const DEFAULT_INPUT_MIN = 6;
/** Crush orders per crush beat (each fills one bucket → one pour). */
const CRUSHES_PER_BEAT = 3;

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}
function positiveInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? Math.floor(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** The floor's fermenting vats (category `vat` — never the bottles). */
function vatsIn(room: Stuff & Container): (Stuff & Fermenting)[] {
  const out: (Stuff & Fermenting)[] = [];
  for (const c of room.getContents()) {
    if (!MixinApi.isFermenting(c)) continue;
    if (!MixinApi.isBulkable(c) || c.getCategory() !== 'vat') continue;
    out.push(c);
  }
  return out;
}

/** Empty vessels of the configured kind standing on the floor. */
function emptyVessels(room: Stuff & Container, category: string): Stuff[] {
  const out: Stuff[] = [];
  for (const c of room.getContents()) {
    if (!MixinApi.isBulkable(c)) continue;
    if (c.getCategory() !== category) continue;
    if (!c.isBulkEmpty('interior')) continue;
    out.push(c);
  }
  return out;
}

/** Reachable inputs by primary keyword (crates are open Containers). */
function inputsInReach(room: Stuff & Container, keyword: string): number {
  let n = 0;
  for (const c of room.getContents()) {
    if (MixinApi.isContainer(c)) {
      for (const inner of c.getContents()) {
        if (keywordOf(inner) === keyword) n++;
      }
    }
    if (keywordOf(c) === keyword && !MixinApi.isContainer(c)) n++;
  }
  return n;
}

function keywordOf(s: Stuff): string | null {
  const v = (s as unknown as { getPrimaryKeyword?: () => string | null })
    .getPrimaryKeyword?.();
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** The ask for a filled vessel, by its held material's keyword. */
function askFor(config: Record<string, unknown>, vessel: Stuff): number {
  const asks = (config.asks ?? {}) as Record<string, number>;
  const fallback = positiveInt(config.defaultAsk, DEFAULT_ASK);
  if (!MixinApi.isBulkable(vessel)) return fallback;
  const held = vessel.getBulkMaterial('interior');
  const kw = held?.getPrimaryKeyword() ?? held?.getName() ?? '';
  const ask = asks[kw];
  return typeof ask === 'number' && ask > 0 ? ask : fallback;
}

export const brain = class {
  static label = 'cellars';
  static presenceGated = false;
  // A functional poller (works the cellar, moves stock), not chatter.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const hand = ctx.host as Hand;
    const homePath = str(ctx.config.home);
    const counterRoomPath = str(ctx.config.counterRoom);
    if (!homePath || !counterRoomPath) return;

    // Home is the AUTHORED floor — never "wherever the hand is now".
    const home = StuffApi.findByTemplatePath(homePath);
    if (!home || !MixinApi.isContainer(home)) return;
    if (hand.getContainer() !== home) hand.teleport(home as Stuff & Container);

    const beats = ((ctx.state.beats as number | undefined) ?? 0) + 1;
    ctx.state.beats = beats;

    const vats = vatsIn(home);

    // ── the bottling leg: a finished (or turned) vat pays out ──
    const ready = vats.find((v) => {
      const phase = v.getFermentPhase();
      if (phase !== 'finished' && phase !== 'turned') return false;
      const bulk = v as Stuff &
        Fermenting & { getBulkAvailable(a: 'interior'): number };
      return bulk.getBulkAvailable('interior') > 0.7;
    });
    if (ready) {
      const distills = ctx.config.distills as
        | { recipe?: string; runs?: number; igniteKeyword?: string; compounds?: string[] }
        | undefined;
      if (distills?.recipe) {
        await this.distilAndConsign(ctx, hand, home, counterRoomPath, distills as { recipe: string; runs?: number; igniteKeyword?: string; compounds?: string[] });
      } else {
        await this.bottleAndConsign(ctx, hand, home, counterRoomPath);
      }
      return;
    }

    // ── the crush leg: an idle vat and inputs in reach ──
    const inputKeyword = str(
      ctx.config.inputKeyword,
      str(ctx.config.buyKeyword, 'grapes'),
    );
    const inputMin = positiveInt(ctx.config.inputMin, DEFAULT_INPUT_MIN);
    const idle = vats.find((v) => v.getFermentPhase() === 'idle');
    const lagerLeg = ctx.config.lagerLeg as
      | { recipe?: string; room?: string }
      | undefined;
    if (idle && inputsInReach(home, inputKeyword) >= inputMin) {
      // With a cold-store leg authored, alternate crush beats carry the
      // bucket there and pitch the house culture (the lager line).
      if (lagerLeg?.recipe && lagerLeg.room && beats % 2 === 0) {
        await this.coldStoreLeg(hand, home, lagerLeg as { recipe: string; room: string });
        return;
      }
      const crushes = Array.isArray(ctx.config.crushes)
        ? (ctx.config.crushes as string[])
        : ['crush'];
      if (crushes.length === 0) return;
      const which = crushes[beats % crushes.length] ?? crushes[0]!;
      for (let i = 0; i < CRUSHES_PER_BEAT; i++) {
        if (inputsInReach(home, inputKeyword) < inputMin) break;
        await hand.forceCommand(`order ${which}`);
        await hand.forceCommand(`pour bucket into vat`);
        if (ctx.config.pitchJar === true) {
          await hand.forceCommand(`pour jar into vat`);
        }
      }
      return;
    }

    // ── the compounding leg: board work over bought inputs ──
    const compounds = Array.isArray(ctx.config.compounds)
      ? (ctx.config.compounds as string[])
      : [];
    if (compounds.length > 0) {
      const did = await this.compoundAndConsign(ctx, hand, home, counterRoomPath, compounds);
      if (did) return;
    }

    // ── the buying leg: inputs from the distributor, on the house ──
    const buyEveryRaw = ctx.config.buyEvery;
    if (buyEveryRaw === 0) return; // authored: this binding never buys
    const buyEvery = positiveInt(buyEveryRaw, DEFAULT_BUY_EVERY);
    if (beats % buyEvery === 0) {
      await this.buyInputs(ctx, hand, home, counterRoomPath);
    }
  }

  /** Fill, cork and consign up to `batch` vessels from the ready vat. */
  private static async bottleAndConsign(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
  ): Promise<void> {
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);
    const category = str(ctx.config.vesselCategory, 'wine-bottle');
    const vk = str(ctx.config.vesselKeyword, 'bottle');
    const empties = emptyVessels(home, category).slice(0, batch);
    const filled: Stuff[] = [];
    for (let i = 0; i < empties.length; i++) {
      await hand.forceCommand(`get ${vk}`);
      await hand.forceCommand(`fill ${vk} from vat`);
      await hand.forceCommand(`close ${vk}`);
      // Verify by state, not hope: an empty fill (vat ran dry) stops the leg.
      const held = hand
        .getContents()
        .find(
          (c) =>
            MixinApi.isBulkable(c) &&
            !c.isBulkEmpty('interior') &&
            !filled.includes(c),
        );
      if (!held) break;
      filled.push(held);
    }
    if (filled.length === 0) return;

    const counterRoom = StuffApi.findByTemplatePath(counterRoomPath);
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
    hand.teleport(counterRoom as Stuff & Container);
    try {
      await hand.forceCommand('wallet use house');
      for (const vessel of filled) {
        const ask = askFor(ctx.config, vessel);
        await hand.forceCommand(`consign ${vk} --ask ${ask}`);
      }
    } finally {
      hand.teleport(home);
    }
  }

  /**
   * The cold-store leg (the lager line): order the cold mash, carry the
   * bucket to the cold room, pour it into a vat there and pitch the
   * house culture — the strain rides the pour (D14).
   */
  private static async coldStoreLeg(
    hand: Hand,
    home: Stuff & Container,
    leg: { recipe: string; room: string },
  ): Promise<void> {
    const cold = StuffApi.findByTemplatePath(leg.room);
    if (!cold || !MixinApi.isContainer(cold)) return;
    await hand.forceCommand(`order ${leg.recipe}`);
    hand.teleport(cold as Stuff & Container);
    try {
      await hand.forceCommand(`pour bucket into vat`);
      await hand.forceCommand(`pour jar into vat`);
    } finally {
      hand.teleport(home);
    }
  }

  /**
   * The still leg (W6): light the still (its own furnace — 351 K is
   * the recipe's lesson), run the finished wash through it, compound
   * off the board, and consign the take — spirit included, the
   * intermediate good the vintner's fortification buys (the B2B leg).
   */
  private static async distilAndConsign(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
    distills: { recipe: string; runs?: number; igniteKeyword?: string; compounds?: string[] },
  ): Promise<void> {
    if (distills.igniteKeyword) {
      await hand.forceCommand(`ignite ${distills.igniteKeyword}`);
    }
    const runs = positiveInt(distills.runs, 2);
    for (let i = 0; i < runs; i++) {
      await hand.forceCommand(`order ${distills.recipe}`);
    }
    for (const c of distills.compounds ?? []) {
      await hand.forceCommand(`order ${c}`);
    }
    await this.consignHeld(ctx, hand, home, counterRoomPath);
  }

  /** The compounding leg: order each board line once, consign the take. */
  private static async compoundAndConsign(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
    compounds: string[],
  ): Promise<boolean> {
    for (const c of compounds) {
      await hand.forceCommand(`order ${c}`);
    }
    return this.consignHeld(ctx, hand, home, counterRoomPath);
  }

  /** Consign every filled vessel in hand at the counter; true if any. */
  private static async consignHeld(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
  ): Promise<boolean> {
    const vk = str(ctx.config.vesselKeyword, 'bottle');
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);
    const filled = hand
      .getContents()
      .filter((c) => MixinApi.isBulkable(c) && !c.isBulkEmpty('interior'))
      .slice(0, batch);
    if (filled.length === 0) return false;
    const counterRoom = StuffApi.findByTemplatePath(counterRoomPath);
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return false;
    hand.teleport(counterRoom as Stuff & Container);
    try {
      await hand.forceCommand('wallet use house');
      for (const vessel of filled) {
        const ask = askFor(ctx.config, vessel);
        await hand.forceCommand(`consign ${vk} --ask ${ask}`);
      }
    } finally {
      hand.teleport(home);
    }
    return true;
  }

  /** Buy inputs at the distributor and carry them home. */
  private static async buyInputs(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
  ): Promise<void> {
    const counterRoom = StuffApi.findByTemplatePath(counterRoomPath);
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
    const buys = Array.isArray(ctx.config.buys)
      ? (ctx.config.buys as { keyword?: string; count?: number }[])
      : [
          {
            keyword: str(ctx.config.buyKeyword, 'grapes'),
            count: positiveInt(ctx.config.buyCount, DEFAULT_BUY_COUNT),
          },
        ];
    const keywords = buys
      .map((b) => str(b.keyword))
      .filter((k) => k.length > 0);
    hand.teleport(counterRoom as Stuff & Container);
    try {
      await hand.forceCommand('wallet use house');
      for (const b of buys) {
        const kw = str(b.keyword);
        if (!kw) continue;
        const count = positiveInt(b.count, DEFAULT_BUY_COUNT);
        for (let i = 0; i < count; i++) {
          await hand.forceCommand(`buy ${kw}`);
          await hand.forceCommand(`get ${kw}`);
        }
      }
    } finally {
      hand.teleport(home);
      // Set the goods down where the work can reach them.
      for (const c of [...hand.getContents()]) {
        const kw = keywordOf(c);
        if (kw !== null && keywords.includes(kw)) {
          await hand.forceCommand(`drop ${kw}`);
        }
      }
    }
  }
} satisfies BrainStatics;
