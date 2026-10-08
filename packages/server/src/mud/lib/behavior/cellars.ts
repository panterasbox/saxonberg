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
 * distills?: { igniteKeyword?: string, chargeKeyword?: string,
 * slopKeyword?: string, vesselKeyword?: string, stepL?: number,
 * maxDraws?: number, compounds?: string[] } }`
 *
 * ⚠⚠ `distills.recipe` is GONE. It named `distil`, retired with
 * `brandy` and `grappa` when the still became a fractionating host: a
 * still does not have ONE output, which is the whole reason those three
 * recipes became four {@link FractionSchedule} rows. The leg runs the
 * still with literal verbs now — see {@link distilAndConsign}.
 */

import type { BrainContext, BrainStatics } from './brain';
import type { Fractionating } from '../fractionation/Fractionating';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Mobile } from '../spatial/Mobile';
import type { CommandGiver } from '../command/CommandGiver';
import type { Maturing } from '../maturation/Maturing';
import { CommandApi } from '../../api/command';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { EngagementSlot } from '../activity/Engaged';
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

const DEFAULT_BATCH = 4;
/**
 * The still leg's configuration. No `recipe` and no `runs`: a still does
 * not have one output and a run is not a recipe. What an author tunes is
 * the VESSELS and the step size — how boldly the hand pours — which
 * together with its `distilling` band decides how good its cut is.
 */
interface DistillsConfig {
  /** Keyword of the finished back to charge from. Default `vat`. */
  chargeKeyword?: string;
  /** Keyword of the still itself. Default `still`. */
  igniteKeyword?: string;
  /** Where the foreshots and heads go. Default `slop bucket`. */
  slopKeyword?: string;
  /** Where the hearts go. Default `bottle`. */
  vesselKeyword?: string;
  /** Litres per draw — the hand's caution. Default 0.5. */
  stepL?: number;
  /**
   * ⭐⭐⭐ **The hand's RULE OF THUMB about its own pot**, as a fraction of
   * the charge: stop collecting hearts once this much of the charge has
   * been drawn, whatever the nose still says.
   *
   * ⚠⚠ Without it the leg can never make a good bottle, and the reason
   * is worth stating because it is a real property of the design rather
   * than a quirk. The loop READS and then POURS, so the step that
   * finally reads `tails` has already crossed the boundary — and a
   * top-up is weakest-link on grade, so that one slug drags the whole
   * bottle to `poor`. **With a nose alone, every cut overshoots.** A
   * real distiller knows this and stops short, sacrificing the last of
   * the hearts rather than risking the tails.
   *
   * ⭐ And this is NOT the oracle the design forbids. Knowing *"on this
   * pot I take about a sixth of the charge"* is knowing your own work;
   * reading the schedule's `upTo` would be knowing the answer. A hand
   * authored with the wrong figure makes bad spirit, which is exactly
   * the dial an author should have.
   */
  takeUpTo?: number;
  /**
   * The other half of the same caution: how many draws to throw away
   * after the nose FIRST says hearts. Default 1.
   *
   * The blur is optimistic in both directions — the hand believes the
   * hearts have started while the heads are still running, exactly as it
   * believes they are still running once the tails begin. `takeUpTo`
   * handles the far end; this handles the near one. A careful distiller
   * starts late and stops early, and pays for both in yield.
   *
   * Set it below the hand's own blur and the bottle catches heads; set
   * it far above and the hand throws good spirit down the drain. That is
   * the dial, and it is the same dial a person has.
   */
  startAfter?: number;
  /** Safety bound on the loop. Default 60. */
  maxDraws?: number;
  /** Board lines to compound once the run is done. */
  compounds?: string[];
}

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
function vatsIn(room: Stuff & Container): (Stuff & Maturing)[] {
  const out: (Stuff & Maturing)[] = [];
  for (const c of room.getContents()) {
    if (!MixinApi.isMaturing(c)) continue;
    if (!MixinApi.isVesselKind(c) || c.getCategory() !== 'vat') continue;
    out.push(c);
  }
  return out;
}

/** Empty vessels of the configured kind standing on the floor. */
function emptyVessels(room: Stuff & Container, category: string): Stuff[] {
  const out: Stuff[] = [];
  for (const c of room.getContents()) {
    if (!MixinApi.isVesselKind(c)) continue;
    if (c.getCategory() !== category) continue;
    if (!MixinApi.isBulkable(c)) continue;
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
  static kind: TaskKind = 'work';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static summary =
    'Works the fermenting floor: bottles and consigns a finished vat, ' +
    'crushes into an idle one, and buys inputs when the floor is clear.';
  static produces: readonly string[] = ['bottled-drink'];
  static consumes: readonly string[] = ['fermentables'];
  // The floor's own state decides WHICH leg; that a floor exists decides
  // that there is work. The hand is paid to be here.
  static urgency(): Urgency {
    return new Urgency('wanted', 'turns to the vats');
  }
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
      const phase = v.getMaturationPhase();
      if (phase !== 'finished' && phase !== 'turned') return false;
      const bulk = v as Stuff &
        Maturing & { getBulkAvailable(a: 'interior'): number };
      return bulk.getBulkAvailable('interior') > 0.7;
    });
    if (ready) {
      const distills = ctx.config.distills as DistillsConfig | undefined;
      if (distills) {
        await this.distilAndConsign(ctx, hand, home, counterRoomPath, distills);
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
    const idle = vats.find((v) => v.getMaturationPhase() === 'idle');
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
   * ⭐⭐ **The still leg — the hand makes the CUT, with the read it has.**
   *
   * It used to be `order distil` three times, and that could never have
   * worked: `distil` named one output, a still has four, and no still in
   * the world could be lit anyway. The leg is literal verbs now, and the
   * shape is the whole point.
   *
   * ⭐⭐⭐ **The hand cuts by `readFraction(hand)` — the SAME banded read a
   * player gets — and may not consult the schedule's true boundary.** A
   * brain that read `drawnL` against `upTo` would cut perfectly every
   * time and the competence model would be decoration: the NPC would be
   * an oracle and the player a guesser at the same still. So the hand's
   * `distilling` band is what makes its cut decent, and ⚠ a `novice`
   * hand really would poison the counter. That is the design, not a
   * defect — the dossier is the dial.
   *
   * The run, in the order a distiller works:
   *   1. charge the pot from the finished back;
   *   2. light it (its own furnace);
   *   3. pour in small steps into the SLOP bucket while the nose says
   *      this is not the hearts yet;
   *   4. switch to a bottle the moment it says hearts, and keep going
   *      while it still does;
   *   5. stop. ⭐ Whatever is left is left — the hand does not drain the
   *      tails into the good spirit to improve the yield, which is
   *      exactly the mistake the band model lets a worse hand make.
   *
   * ⚠ Every step is a `forceCommand`, so the hand is subject to every
   * refusal a player is: an unlit still declines, a wrong vessel
   * declines, and the leg simply ends early rather than asserting its
   * way through.
   */
  private static async distilAndConsign(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
    distills: DistillsConfig,
  ): Promise<void> {
    const charge = str(distills.chargeKeyword, 'vat');
    const stillKey = str(distills.igniteKeyword, 'still');
    const slop = str(distills.slopKeyword, 'slop bucket');
    const vessel = str(distills.vesselKeyword, 'bottle');
    const stepL = Math.max(0.05, Number(distills.stepL) || 0.5);
    const maxDraws = positiveInt(distills.maxDraws, 60);

    // 1–2. Charge the pot and light it. A still that will not take the
    // charge, or will not light, ends the leg here.
    await hand.forceCommand(`pour ${charge} into ${stillKey}`);
    await hand.forceCommand(`ignite ${stillKey}`);

    const still = this.fractionatingIn(home);
    if (!still) {
      await this.consignHeld(ctx, hand, home, counterRoomPath);
      return;
    }

    // 3–4. The cut: the nose says WHEN the hearts start, the rule of
    // thumb says when to stop. Both are needed — see `takeUpTo`.
    const takeUpTo = Math.min(1, Math.max(0, Number(distills.takeUpTo) || 0));
    const startAfter = Math.max(
      0,
      distills.startAfter === undefined ? 1 : Number(distills.startAfter) || 0,
    );
    let intoHearts = false;
    let heartsReads = 0;
    for (let draw = 0; draw < maxDraws; draw++) {
      if (!still.isRunning()) break;
      const here = still.readFraction(hand as unknown as Stuff);
      if (!here) break;
      const hearts =
        here.gradeBand === 'fine' ||
        here.gradeBand === 'exceptional' ||
        here.gradeBand === 'masterful';
      // ⭐ Past the hearts by the nose: stop rather than chase the yield.
      if (!hearts && intoHearts) break;
      // ⭐⭐ Or past them by the rule of thumb, which is what actually
      // saves the bottle: stop a little early and leave the last of the
      // hearts in the pot.
      const charge = still.getChargeL();
      if (
        intoHearts &&
        takeUpTo > 0 &&
        charge > 0 &&
        still.getDrawnL() + stepL > takeUpTo * charge
      ) {
        break;
      }
      if (hearts) heartsReads += 1;
      // Start LATE: the first `startAfter` draws after the nose calls the
      // hearts go to the slops, because an optimistic nose calls them
      // early and those draws are still heads.
      const collecting = hearts && heartsReads > startAfter;
      intoHearts = intoHearts || collecting;
      const target = collecting ? vessel : slop;
      await hand.forceCommand(
        `pour ${stillKey} into ${target} --amount ${stepL}L`,
      );
    }

    // 5. Compound off the board and consign the take — spirit included,
    // the intermediate good the vintner's fortification buys.
    for (const c of distills.compounds ?? []) {
      await hand.forceCommand(`order ${c}`);
    }
    await this.consignHeld(ctx, hand, home, counterRoomPath);
  }

  /** The first fractionating host standing in `home`, or null. */
  private static fractionatingIn(home: Stuff & Container): Fractionating | null {
    for (const item of home.getContents()) {
      if (MixinApi.isFractionating(item)) return item;
    }
    return null;
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
