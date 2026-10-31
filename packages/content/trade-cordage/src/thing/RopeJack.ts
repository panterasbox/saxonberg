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
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
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

const TWIST = ['trade/cordage/cmd/cordage/twist.yaml'];

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

/** Walking a meter of yarn out and back, game-ms. */
const MS_PER_M = 1_000;

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

export default class RopeJack extends Tool {
  static commandContributions: CommandContributions = {
    environment: TWIST,
    peers: TWIST,
  };

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
  public twistPlan(actor: Stuff, stock: readonly Stuff[], opts: TwistOptions): ActPlan | ActRefusal {
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
    if (strands.length === stock.length) return this.layRope(actor, strands, want);
    const yarn = stock.find((s): s is TextileStock => s instanceof TextileStock && s.getYarnCount() > 0);
    if (yarn !== undefined && stock.every((s) => s instanceof TextileStock)) {
      return this.layStrand(actor, yarn, walk, want, opts);
    }
    return { ok: false, reason: 'not-twistable', line: Mml.compose`You twist yarn into strands, and strands into rope — not that.` };
  }

  /** Yarn → a strand: `n` yarns walked out and twisted together. */
  private layStrand(actor: Stuff, yarn: TextileStock, walk: number, want: number | null, opts: TwistOptions): ActPlan | ActRefusal {
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
    const self = this as unknown as Stuff;
    return {
      ok: true,
      durationMs: Math.max(10_000, length * MS_PER_M),
      effortW: 150,
      beginSelf: Mml.compose`You hook ${n} yarns to the whirls of ${Mml.thing(self)} and walk them out ${round(length)} m down the walk, the jack's wheel turning them together.`,
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
  private layRope(actor: Stuff, strands: Rope[], want: number | null): ActPlan | ActRefusal {
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
    const self = this as unknown as Stuff;
    return {
      ok: true,
      durationMs: Math.max(10_000, length * MS_PER_M),
      effortW: 200,
      beginSelf: Mml.compose`You hook ${strands.length} strands to ${Mml.thing(self)} and walk the top down between them as the jack turns them the other way.`,
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

  /** Laying rope is ropework. */
  private credit(actor: Stuff): void {
    if (MixinApi.isAdvancing(actor)) {
      void actor.creditSignature({ discipline: [{ discipline: 'ropework', difficulty: 'standard', outcome: 'success' }] }).catch(() => {});
    }
  }

  /** Into the layer's hands, else where they stand. */
  private deliver(actor: Stuff, made: Rope): void {
    const into = MixinApi.isContainer(actor) ? actor : (MixinApi.isContainable(actor) ? (actor.getContainer() as Stuff | null) : null);
    if (into !== null && MixinApi.isContainer(into)) ContainmentApi.move(made as unknown as Stuff & Rope, into as Stuff & Container);
  }
}
