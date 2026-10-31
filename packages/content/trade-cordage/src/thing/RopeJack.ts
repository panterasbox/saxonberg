/**
 * RopeJack — ⭐⭐ **the ropewalk's jack, and the one verb `twist`**
 * (cordage D5, D18).
 *
 * A rope is laid down the length of a walk: yarns hooked to the jack's
 * whirls and walked out, twisted together into a STRAND; three strands or
 * more hooked up again and twisted the other way into a ROPE. One verb, the
 * stage decided by what you twist — yarn makes a strand, strands make a
 * rope — and the numbers fall out of the yarn (cordage D5):
 *
 *  - a yarn's weight per length is its count (`tex = 1653.5 / count`, the
 *    linen lea); a strand of `n` yarns weighs `n · tex · 1.1` (the twist
 *    takes up 10 %), a rope its strands' sum × 1.15;
 *  - its diameter is what that weight packs into (`d = 2·√(λ / πρφ)`), so
 *    more yarns make a thicker strand and a thicker rope holds the square
 *    of it more;
 *  - ⭐ it is as long as you lay it, and **never longer than the walk** —
 *    the room the jack stands in. That is the whole reason a ropewalk is a
 *    quarter of a mile long.
 *
 * `--mark <color>` lays a colored yarn in the heart of a strand: the
 * rogue's yarn, carried into every rope laid from it and shown at a cut.
 *
 * The alternating lay (yarns one way, strands the other, so the rope does
 * not unwind) is told in the words, never chosen.
 *
 * ⭐⭐ And it is WORK (the review's lens pass): a strand takes its length ×
 * the yarns in it of walking and hardening, a rope its length of laying —
 * hours, at a full walk. The craft is the TWIST: the layer's `ropework`
 * band decides how evenly the strands harden (a green hand's bunch into
 * hockles and the rope keeps less), and the yarn's grade is the rope's
 * (weakest link). And it is a CREW: someone at the wheel (`turn jack` — a
 * second player, or the keeper on her shift) and the layer walks at full
 * pace; alone, they turn it themselves between walks, at half.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { TurnableMixin } from '@saxonberg/server/mud/lib/craft/Turnable';
import type { ActOutcome } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WheelEngagement, WHEEL_TYPE } from '../lib/WheelEngagement';
import Rope from '@saxonberg/server/mud/platform/thing/Rope';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import TextileStock from '@saxonberg/content-trade-textiles/src/thing/TextileStock';

const TWIST = ['trade/cordage/cmd/cordage/twist.yaml', 'platform/cmd/device/turn.yaml'];

const STRAND_ROW = '/trade/cordage/thing/strand';
const ROPE_ROW = '/trade/cordage/thing/rope';

/** The linen lea: tex (g per km) = this ÷ count. */
const TEX_PER_COUNT = 1653.5;

/** A lea is 300 yards: meters of yarn per pound per count. */
const M_PER_LB_PER_COUNT = 274.32;

const LB_PER_KG = 2.20462;

/** The twist takes up this much of a strand's yarn; the lay this much of a rope's strands. */
const STRAND_TAKE_UP = 1.1;
const ROPE_TAKE_UP = 1.15;

/** How fibers pack into a rope's section (as `Rope`'s mass reads it). */
const PACKING = 0.6;

/** A plant fiber's density when the yarn's material has none, kg/m³. */
const FIBER_DENSITY = 1480;

/** Yarns to a strand when nobody says. */
const DEFAULT_YARNS = 40;

/** Walking a strand out, per meter: the walk itself, game-ms… */
const STRAND_MS_PER_M = 20_000;
/** …and per yarn hooked and hardened into it, per meter. */
const STRAND_MS_PER_M_PER_YARN = 500;
/** Laying strands up into rope, per meter, game-ms. */
const ROPE_MS_PER_M = 30_000;
/** Alone, the layer turns the wheel themselves between walks: this much slower. */
const ALONE = 2;

/** ⭐ How evenly a strand hardens, by the layer's `ropework` band. */
const EVENNESS: Record<CompetenceBandName, number> = {
  untrained: 0.8,
  novice: 0.85,
  competent: 0.92,
  proficient: 0.97,
  expert: 1,
};

/** What the player asked of the twist. */
export interface TwistOptions {
  yarns: number | null;
  length: string | null;
  mark: string | null;
}

/** `10`, `10 m`, `10 meters` → 10; anything else → null. */
function parseMeters(text: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*(m|meters?|metres?)?$/i.exec(text.trim());
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The diameter, mm, that `kgPerM` of fiber packs into. */
function diameterMm(kgPerM: number, density: number): number {
  return 2000 * Math.sqrt(kgPerM / (Math.PI * density * PACKING));
}

export default class RopeJack extends TurnableMixin(Tool) {
  static commandContributions: CommandContributions = {
    environment: TWIST,
    peers: TWIST,
  };

  /** Who has the wheel (runtime; the wheel engagement's own link). */
  private _wheelHand: Stuff | null = null;

  /** ⭐ Who is turning the wheel, here and still at it — or null. */
  public getWheelHand(): Stuff | null {
    const hand = this._wheelHand;
    if (hand === null || hand.isDestroyed()) return null;
    const self = this as unknown as Stuff;
    const here = MixinApi.isContainable(self) ? self.getContainer() : null;
    const there = MixinApi.isContainable(hand) ? hand.getContainer() : null;
    return here !== null && there === here ? hand : null;
  }

  /** @internal The wheel engagement's own link (onStart / onAbort). */
  public _setWheelHand(hand: Stuff | null): void {
    this._wheelHand = hand;
  }

  /**
   * ⭐ `turn jack` — take the wheel, and turn it for whoever lays; `turn
   * back jack` — let it go.
   */
  public override async turnBy(actor: Stuff, back: boolean): Promise<ActOutcome | ActRefusal> {
    const self = this as unknown as Stuff;
    const holder = this.getWheelHand();
    if (back) {
      if (holder !== actor) return { ok: false, reason: 'not-turning', line: Mml.compose`You are not turning ${Mml.thing(self)}.` };
      if (MixinApi.isEngaged(actor)) SchedulerApi.cancelByType(actor as Stuff & Engaged, WHEEL_TYPE);
      this._wheelHand = null;
      return { ok: true, line: Mml.compose`You let go of the wheel of ${Mml.thing(self)}.`, peers: Mml.compose`${Mml.actor(actor)} lets go of the jack's wheel.` };
    }
    if (holder === actor) return { ok: false, reason: 'already', line: Mml.compose`You already have the wheel.` };
    if (holder !== null) {
      return { ok: false, reason: 'taken', line: Mml.compose`${Mml.actor(holder)} already has the wheel of ${Mml.thing(self)}.` };
    }
    const here = MixinApi.isContainable(self) ? self.getContainer() : null;
    const at = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    if (here === null || at !== here) return { ok: false, reason: 'out-of-reach', line: Mml.compose`You are not at ${Mml.thing(self)}.` };
    if (!MixinApi.isEngaged(actor)) return { ok: false, reason: 'cannot', line: Mml.compose`You cannot turn a wheel.` };
    const started = SchedulerApi.start(new WheelEngagement(actor as Stuff & Engaged, this));
    if (!started.ok) return { ok: false, reason: 'busy', line: Mml.compose`Your hands are on something else.` };
    return {
      ok: true,
      line: Mml.compose`You take the crank of ${Mml.thing(self)}'s great wheel, ready to turn it for whoever lays.`,
      peers: Mml.compose`${Mml.actor(actor)} takes the crank of the jack's wheel.`,
    };
  }

  /** The layer's evenness — their `ropework` band, credited. */
  private async evenness(actor: Stuff): Promise<number> {
    if (!MixinApi.isAdvancing(actor)) return EVENNESS.untrained;
    const band = await actor.competenceBandFor('ropework').catch(() => 'untrained' as CompetenceBandName);
    return EVENNESS[band];
  }

  /** The pace: someone at the wheel, or the layer alone at half. */
  private pace(actor: Stuff): { factor: number; words: string } {
    const hand = this.getWheelHand();
    if (hand !== null && hand !== actor) {
      return { factor: 1, words: `, ${hand.describeFor(actor)} turning the wheel` };
    }
    return { factor: ALONE, words: ', turning the wheel yourself between walks' };
  }

  /** ⭐ The walk: the room the jack stands in, its length, m. */
  public walkM(): number | null {
    const self = this as unknown as Stuff;
    let at = MixinApi.isContainable(self) ? (self.getContainer() as Stuff | null) : null;
    if (at !== null && at.isAgent?.() && MixinApi.isContainable(at)) at = at.getContainer() as Stuff | null;
    return at instanceof Place ? at.getLinearExtent() : null;
  }

  /**
   * ⭐ `twist <stock>` — yarn into a strand, strands into a rope; the stage
   * is what you twist. Refused in words: no walk, a length longer than the
   * walk, too little yarn, fewer than three strands.
   */
  public async twistPlan(actor: Stuff, stock: readonly Stuff[], opts: TwistOptions): Promise<ActPlan | ActRefusal> {
    const walk = this.walkM();
    if (walk === null) {
      return { ok: false, reason: 'no-walk', line: Mml.compose`A rope is laid down a walk; set the jack up at the head of one.` };
    }
    let want: number | null = null;
    if (opts.length !== null) {
      want = parseMeters(opts.length);
      if (want === null) {
        return { ok: false, reason: 'bad-length', line: Mml.compose`"${opts.length}" is not a length — say it in meters, like \`--length 50\`.` };
      }
      if (want > walk) {
        return {
          ok: false,
          reason: 'longer-than-walk',
          line: Mml.compose`The walk is ${round(walk)} m long; a rope cannot be laid longer than it.`,
        };
      }
    }
    if (stock.length === 0) return { ok: false, reason: 'nothing', line: Mml.compose`Twist what? Yarn makes a strand; strands make a rope.` };
    const strands = stock.filter((s): s is Rope => s instanceof Rope && s.getStage() === 'strand');
    const even = await this.evenness(actor);
    if (strands.length === stock.length) return this.layRope(actor, strands, want, even);
    const yarn = stock.find((s): s is TextileStock => s instanceof TextileStock && s.getYarnCount() > 0);
    if (yarn !== undefined && stock.every((s) => s instanceof TextileStock)) {
      return this.layStrand(actor, yarn, walk, want, opts, even);
    }
    return { ok: false, reason: 'not-twistable', line: Mml.compose`You twist yarn into strands, and strands into rope — not that.` };
  }

  /** Yarn → a strand: `n` yarns walked out and twisted together. */
  private layStrand(actor: Stuff, yarn: TextileStock, walk: number, want: number | null, opts: TwistOptions, even: number): ActPlan | ActRefusal {
    const n = opts.yarns ?? DEFAULT_YARNS;
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, reason: 'bad-yarns', line: Mml.compose`A strand is so many yarns — a whole number of them.` };
    }
    const count = yarn.getYarnCount();
    const skeinKg = yarn.getDryMass().rawValue();
    const skeinM = count * M_PER_LB_PER_COUNT * skeinKg * LB_PER_KG;
    const haveM = yarn.quantityInHand() * skeinM;
    const length = want ?? Math.min(walk, haveM / n);
    if (!(length > 0) || n * length > haveM + 1e-6) {
      return {
        ok: false,
        reason: 'not-enough-yarn',
        line: Mml.compose`${n} yarns ${round(length)} m long want ${Math.ceil((n * length) / skeinM)} skeins; you have ${yarn.quantityInHand()}.`,
      };
    }
    const material = yarn.getMaterial();
    const density = material?.getDensity().rawValue() || FIBER_DENSITY;
    const kgPerM = (n * TEX_PER_COUNT) / count / 1e6 * STRAND_TAKE_UP;
    const mark = opts.mark?.trim().toLowerCase() || null;
    const units = Math.ceil((n * length) / skeinM - 1e-9);
    // ⭐ The weakest yarn sets the strand's grade (the textile chain's rule).
    const grade = yarn.likeStacksInHand().reduce((g, y) => g.min(y.getGrade()), yarn.getGrade());
    const self = this as unknown as Stuff;
    const pace = this.pace(actor);
    return {
      ok: true,
      durationMs: Math.max(10_000, length * (STRAND_MS_PER_M + n * STRAND_MS_PER_M_PER_YARN) * pace.factor),
      effortW: 150,
      beginSelf: Mml.compose`You hook ${n} yarns to the whirls of ${Mml.thing(self)} and walk them out ${round(length)} m down the walk${pace.words}.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} walks yarns out down the ropewalk.`,
      onComplete: async () => {
        if (yarn.isDestroyed() || yarn.quantityInHand() < units) {
          return { ok: false, reason: 'yarn-gone', line: Mml.compose`The yarn is not where it was; the strand comes to nothing.` };
        }
        yarn.drawInHand(units);
        const strand = await StuffApi.clone<Rope>(STRAND_ROW).catch(() => null);
        if (!(strand instanceof Rope)) return { ok: false, reason: 'no-strand', line: Mml.compose`The yarns will not take the twist.` };
        if (material) strand.setMaterial(material);
        strand.setLengthM(round(length));
        strand.setDiameterMm(diameterMm(kgPerM, density));
        if (mark) strand.addMark(mark);
        strand.setLayEvenness(even);
        strand.setGrade(Grade.of(grade.getBand()));
        this.credit(actor);
        this.deliver(actor, strand);
        MessageApi.scene(actor)
          .topic('act.deed')
          .toSelf(Mml.compose`The yarns lie twisted into one strand, ${round(length)} m of it, hard-laid right-handed${mark ? `, a ${mark} yarn in its heart` : ''}.`)
          .send();
        return undefined;
      },
    };
  }

  /** Strands → a rope: three or more, twisted the other way. */
  private layRope(actor: Stuff, strands: Rope[], want: number | null, even: number): ActPlan | ActRefusal {
    if (strands.length < 3) {
      return { ok: false, reason: 'too-few-strands', line: Mml.compose`A rope is laid from three strands or more; you have ${strands.length}.` };
    }
    const shortest = Math.min(...strands.map((s) => s.getLengthM()));
    const length = want ?? shortest;
    if (length > shortest + 1e-6) {
      return { ok: false, reason: 'strands-short', line: Mml.compose`The strands are only ${round(shortest)} m long.` };
    }
    const kgPerM = strands.reduce((sum, s) => sum + s.getDryMass().rawValue() / Math.max(1e-6, s.getLengthM()), 0) * ROPE_TAKE_UP;
    const material = strands[0]!.getMaterial();
    const density = material?.getDensity().rawValue() || FIBER_DENSITY;
    const marks = [...new Set(strands.flatMap((s) => [...s.getMarks()]))];
    // ⭐ A rope is as even as its worst strand and its layer's hand, and its
    // yarn is its weakest strand's.
    const layEven = Math.min(even, ...strands.map((s) => s.getLayEvenness()));
    const grade = strands.reduce((g, s) => g.min(s.getGrade()), strands[0]!.getGrade());
    const self = this as unknown as Stuff;
    const pace = this.pace(actor);
    return {
      ok: true,
      durationMs: Math.max(10_000, length * ROPE_MS_PER_M * pace.factor),
      effortW: 200,
      beginSelf: Mml.compose`You hook ${strands.length} strands to ${Mml.thing(self)} and walk the top down between them as the jack turns them the other way${pace.words}.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} lays a rope down the ropewalk.`,
      onComplete: async () => {
        if (strands.some((s) => s.isDestroyed())) {
          return { ok: false, reason: 'strands-gone', line: Mml.compose`A strand is not where it was; the rope comes to nothing.` };
        }
        const rope = await StuffApi.clone<Rope>(ROPE_ROW).catch(() => null);
        if (!(rope instanceof Rope)) return { ok: false, reason: 'no-rope', line: Mml.compose`The strands will not lay up.` };
        if (material) rope.setMaterial(material);
        rope.setLengthM(round(length));
        rope.setDiameterMm(diameterMm(kgPerM, density));
        for (const m of marks) rope.addMark(m);
        rope.setLayEvenness(layEven);
        rope.setGrade(Grade.of(grade.getBand()));
        for (const s of strands) StuffApi.destruct(s as unknown as Stuff);
        this.credit(actor);
        this.deliver(actor, rope);
        MessageApi.scene(actor)
          .topic('act.deed')
          .toSelf(Mml.compose`The strands close up into a rope, laid left-handed against their own twist so it will never unlay: ${round(length)} m of it.`)
          .send();
        return undefined;
      },
    };
  }

  /** Laying rope is ropework — for the layer, and for the hand at the wheel. */
  private credit(actor: Stuff): void {
    const hand = this.getWheelHand();
    for (const who of hand !== null && hand !== actor ? [actor, hand] : [actor]) {
      if (MixinApi.isAdvancing(who)) {
        void who.creditSignature({ discipline: [{ discipline: 'ropework', difficulty: 'standard', outcome: 'success' }] }).catch(() => {});
      }
    }
  }

  /** Into the layer's hands, else where they stand. */
  private deliver(actor: Stuff, made: Rope): void {
    const into = MixinApi.isContainer(actor) ? actor : (MixinApi.isContainable(actor) ? (actor.getContainer() as Stuff | null) : null);
    if (into !== null && MixinApi.isContainer(into)) ContainmentApi.move(made as unknown as Stuff & Rope, into as Stuff & Container);
  }
}
