/**
 * Bole — **a felled trunk on the ground, and how many lengths are left
 * in it.**
 *
 * A standard oak is tonnes, and a tree is the first Thing whose product
 * exceeds a body. Felling drops ONE bole where the tree stood — mass =
 * the species' wood density × 0.9 m³ (oak ≈ 675 kg; can't-budge is
 * emergent from mass, never a flag) — and cross-cutting is a second act
 * on it: `cut bole` (with a felling axe) takes one length of green
 * timber off per engagement until `lengthsLeft` reaches zero, when the butt and the
 * brash are the wood's again. The bole on the ground IS the seam
 * `trade-sawing` attaches to (boards, not lengths), and it is what the
 * transport pack's sledge and dray exist to move.
 *
 * ⭐ **It affords its own cross-cut** (`commandContributions.peers` — the
 * kernel's `cut`, since controller-liquidity D14 retired `fell bole`), so a
 * bole dragged to the yard one day is still cross-cuttable there with no
 * stand in the room. A bole in a `Wood` room survives a restart in the
 * room's container slice; a bole dragged into a transient room is lost
 * there, as any loose thing is.
 *
 * What composing it claims: a bole is a Thing — Tangible, Containable
 * (it can in principle be loaded: the haulage seam), Chattel (it is
 * somebody's) — and nothing else.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { Final } from '@saxonberg/server/mud/lib/security/decorators';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { CuttableMixin, type CutAnswer, type CutRequest } from '@saxonberg/server/mud/lib/craft/Cuttable';
import {
  RivableMixin,
  type RivePlan,
  type RiveRefusal,
  type RiveRequest,
} from '@saxonberg/server/mud/lib/craft/Rivable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type Material from '@saxonberg/server/mud/lib/material/Material';

/** What a length off the bole puts on the saw carriage, and how green it is. */
export interface SawCharge {
  kg: number;
  /** The wood. */
  material: Material | null;
  /** Seasoned fraction of what went on (a bole is green: 0). */
  seasoned: number;
}

/** What the saw's take left of the bole. */
export interface SawTaken {
  /** Lengths still in it; 0 = the butt, and it is gone. */
  left: number;
}

/** ⭐ Every reason the saw is refused — `SawController` words each. */
export type SawRefusal = ActRefusal<'not-sawable'> | ActRefusal<'bole-spent'>;

/**
 * The saw's plan: the charge, and the take at the moment the cut is
 * through. ⚠ Never engaged by itself — the SAW paces the cut (a sawmill's
 * race, a pit saw's two pairs of hands), so the verb drives the plan and
 * its `onComplete` is the take.
 */
export type SawPlan = ActPlan<SawCharge, SawTaken, SawRefusal>;

/** Kilograms one cross-cut length of timber takes off the bole. */
export const TIMBER_MASS_KG = 24;

/** Cubic metres of trunk a standard yields — what the mint sizes by. */
export const BOLE_M3 = 0.9;

/** Cross-cut lengths a standard's bole carries. */
export const BOLE_LENGTHS = 6;

/** The capability a cross-cut asks of a tool — the felling axe's. */
const FELLING = 'felling';
/** Endurance points a cross-cut costs. */
export const CROSSCUT_COST = 5;
/** Endurance points riving a length costs — a mallet being lighter than a saw. */
export const RIVE_COST = 5;

/** Game-ms one cross-cut takes. */
export const CROSSCUT_MS = 15_000;
/** Metabolic watts of a cross-cut. */
export const CROSSCUT_EFFORT_W = 500;

/** The round timber a cross-cut takes off. */
const TIMBER_PATH = '/trade/forestry/thing/timber';

/** The billet row a bole is riven into. */
export const BILLET_PATH = '/trade/forestry/thing/billet';
/**
 * Kilograms in one billet — what the billet row authors as its `mass` (a
 * stack's mass is per unit); a test holds the two together. One length
 * off a bole is eight of them.
 */
export const BILLET_KG = 3;
/** Game-ms riving one length into billets takes. */
export const RIVE_MS = 20_000;
/** Metabolic watts of riving — a mallet and a froe. */
export const RIVE_EFFORT_W = 550;
/**
 * ⭐ Below this `cleavability` a wood will not open along its grain at
 * all — the fibres interlock (elm) and the froe only bruises it. An
 * author's number, recorded (plan D17).
 */
export const RIVE_FLOOR = 0.3;
/**
 * At or above this `cleavability` a length opens clean into its full
 * count of billets; below it the split wanders out of the piece and the
 * yield falls in proportion — the rest goes to kindling.
 */
export const CLEAN_CLEAVE = 0.8;

// ⭐ It plans its own cuts — one small protocol per act (controller-liquidity
// D14): the cross-cut is a `cut`, the froe asks `Rivable`, and the saw asks
// the bole itself (`sawPlanFor` — the one-host `Sawable` protocol folded into
// its host, W17); each asks the bole what one length off it comes to.
const BoleBase = RivableMixin(CuttableMixin(Good));

/** *"six lengths in it yet"* / *"one length left"* — appended on `look`. */
function lengthsAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof Bole)) return text;
  const left = host.getLengthsLeft();
  const line =
    left <= 0
      ? 'There is nothing left in it but the butt.'
      : left === 1
        ? 'One length left in it.'
        : `${GrammarApi.cap(GrammarApi.inWords(left))} lengths in it yet.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export default class Bole extends BoleBase {
  static fieldMeta: FieldMeta = {
    lengthsLeft: { persistent: true, authorable: true },
  };

  /**
   * ⭐ The bole affords its own cross-cut, wherever it lies — and its own
   * riving: a froe takes a length off it as billets (`rive bole`), the
   * same way the axe takes a length off it as round timber.
   */
  // ⚠ `peers` — to whoever stands beside it. It was `self`, which is read
  // only off a command GIVER (a person's own verbs), so the bole afforded
  // nothing: `rive bole` worked at the sawmill only because the timber
  // yard's billet heap lay in the room (found by the assembly browser
  // walk). Too heavy to carry, so no `environment`.
  static commandContributions: CommandContributions = {
    peers: [
      // ⭐ The cross-cut is the kernel's `cut` (D14) — `fell` is for trees.
      'platform/cmd/crafting/cut.yaml',
      'trade/forestry/cmd/forestry/rive.yaml',
    ],
  };

  static markupAugmenters: MarkupAugmenter[] = [lengthsAugmenter];

  /** Cross-cut lengths of timber still in it. */
  public lengthsLeft = BOLE_LENGTHS;

  public getLengthsLeft(): number {
    return this.lengthsLeft;
  }

  public setLengthsLeft(value: number): void {
    this.lengthsLeft = Math.max(0, Math.floor(Number(value) || 0));
  }

  /**
   * Take one length off: decrement, drop the mass by a length's worth,
   * return what is left. Sealed — the count and the mass move together.
   */
  @Final
  public takeLength(): number {
    if (this.lengthsLeft <= 0) return 0;
    this.lengthsLeft -= 1;
    const mass = this.getMass().rawValue();
    this.setMass(Quantity.of(Math.max(0, mass - TIMBER_MASS_KG), 'kg'));
    return this.lengthsLeft;
  }

  /**
   * ⭐ The bole's cuts (D14) — one length off it, whichever tool takes it:
   *
   *  - `cut` — the cross-cut: a length of round timber, to hand; it wants a
   *    felling axe among the bound tools;
   *  - `rive` — a length split into a stack of green billets, as many as
   *    the wood's grain lets it open clean into; a wood whose fibres
   *    interlock (`cleavability` under {@link RIVE_FLOOR}) will not rive;
   *  - `saw` — the charge on the carriage (one green length of wood); the
   *    SAW paces the cut, so the plan is driven by the verb and its
   *    `onComplete` is the take.
   *
   * Every one refuses a spent bole. ⭐ The endurance a length costs is spent
   * when the work LANDS, never before the engagement could refuse
   * (controller-liquidity C12).
   */
  public override async cutPlan(req: CutRequest): Promise<CutAnswer> {
    if (!req.tools.some((t) => MixinApi.isTool(t) && t.hasCapability(FELLING))) {
      return { ok: false, reason: 'no-felling-axe' };
    }
    return this.crosscutPlan(req.actor);
  }

  public override async rivePlanFor(req: RiveRequest): Promise<RivePlan | RiveRefusal> {
    return this.rivePlan(req.actor);
  }

  /**
   * ⭐ The saw's plan for one length off the bole (controller-liquidity
   * D14): the charge on the carriage and the take when the cut is through.
   * The sawmill asks a `Bole` this by class; any other wood it weighs as it
   * is.
   */
  public async sawPlanFor(_actor: Stuff, _saw: Stuff): Promise<SawPlan | SawRefusal> {
    return this.sawPlan();
  }

  private crosscutPlan(actor: Stuff): CutAnswer {
    if (this.lengthsLeft <= 0) return { ok: false, reason: 'bole-spent' };
    const bole = this as unknown as Stuff;
    return {
      ok: true,
      durationMs: CROSSCUT_MS,
      effortW: CROSSCUT_EFFORT_W,
      facts: { kind: 'length', bole },
      onComplete: async () => {
        if (actor.isDestroyed() || this.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        Bole.spend(actor, CROSSCUT_COST);
        const room = this.getContainer();
        const wood = this.getMaterial();
        const timber = await StuffApi.clone<Stuff & Containable>(TIMBER_PATH, undefined, {
          madeFrom: bole,
        });
        if (wood && MixinApi.isTangible(timber)) timber.setMaterial(wood);
        if (MixinApi.isContainer(actor)) ContainmentApi.move(timber, actor);
        else if (room) ContainmentApi.move(timber, room);
        const boleName = this.getPresentation();
        const left = this.takeLength();
        if (left <= 0) await StuffApi.destruct(bole);
        if (room) await Bole.capture(room);
        await Bole.capture(actor);
        await Bole.credit(actor, 'easy');
        return left <= 0
          ? { ok: true, facts: { kind: 'last-length', boleName } }
          : { ok: true, facts: { kind: 'length', timber, bole, left } };
      },
    };
  }

  private rivePlan(actor: Stuff): RivePlan | RiveRefusal {
    const wood = this.getMaterial();
    if ((wood && MixinApi.hasSolidity(wood) ? wood.getCleavability() : 0) < RIVE_FLOOR) {
      return {
        ok: false,
        reason: 'will-not-rive',
        facts: { woodName: wood?.getName() ?? 'this wood' },
      };
    }
    if (this.lengthsLeft <= 0) return { ok: false, reason: 'bole-spent' };
    const bole = this as unknown as Stuff;
    return {
      ok: true,
      durationMs: RIVE_MS,
      effortW: RIVE_EFFORT_W,
      facts: { kind: 'bole', bole },
      onComplete: async () => {
        // Consume first: a failure leaves the bole, not double the wood.
        if (actor.isDestroyed() || this.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
        const room = this.getContainer();
        if (room === null || !MixinApi.isContainer(room)) return { ok: true, facts: { kind: 'gone' } };
        // The work was done whether or not the wood opened well.
        Bole.spend(actor, RIVE_COST);
        const material = this.getMaterial();
        const boleName = this.getPresentation();
        const left = this.takeLength();
        // ⭐ A straight-grained wood opens clean into the full count; one
        // whose split wanders runs out of the piece, and the rest is kindling.
        const full = Math.floor(TIMBER_MASS_KG / BILLET_KG);
        const clean = Math.min(1, (material && MixinApi.hasSolidity(material) ? material.getCleavability() : 0) / CLEAN_CLEAVE);
        const count = Math.max(1, Math.floor(full * clean));
        const billets = await StuffApi.clone<Stuff & Containable>(BILLET_PATH, undefined, {
          madeFrom: bole,
        });
        if (material && MixinApi.isTangible(billets)) billets.setMaterial(material);
        // ⭐ A bole is green wood, and riving dries nothing.
        if (MixinApi.isSeasoning(billets)) billets.setSeasonedFraction(0);
        if (MixinApi.isStackable(billets)) billets.setQuantity(count);
        const maker = actor.getIdentityPath() ?? '';
        if (maker && MixinApi.isCrafted(billets)) billets.setMaker(maker);
        ContainmentApi.move(billets, room as Stuff & Container);
        if (left <= 0) await StuffApi.destruct(bole);
        else await Bole.capture(bole);
        await Bole.credit(actor, 'easy');
        return { ok: true, facts: { kind: 'billets', count, wandered: count < full, left, bole, boleName } };
      },
    };
  }

  private sawPlan(): SawPlan | SawRefusal {
    const material = this.getMaterial();
    if (!material || !material.hasTag('wood')) return { ok: false, reason: 'not-sawable' };
    if (this.lengthsLeft <= 0) return { ok: false, reason: 'bole-spent' };
    return {
      ok: true,
      // ⚠ Never engaged: the SAW paces the cut (the verb drives this plan).
      durationMs: 0,
      effortW: 0,
      // A bole is green wood, lying where it fell.
      facts: { kg: TIMBER_MASS_KG, material, seasoned: 0 },
      onComplete: async () => {
        const left = this.takeLength();
        if (left <= 0) await StuffApi.destruct(this as unknown as Stuff);
        else await Bole.capture(this as unknown as Stuff);
        return { ok: true, facts: { left } };
      },
    };
  }

  /** Save a host's record now; a failure is said, never thrown into the cut. */
  private static async capture(host: Stuff): Promise<void> {
    try {
      await PersistableApi.captureHostOf(host);
    } catch (err) {
      console.warn('Bole: capture failed:', err);
    }
  }

  /** Spend endurance. A no-op on a body that carries no reserves. */
  private static spend(actor: Stuff, points: number): void {
    if (points <= 0 || !MixinApi.isReserved(actor)) return;
    if (!actor.hasReserve('endurance')) return;
    actor.adjustReserve('endurance', Quantity.of(-points, '%'));
  }

  /** The deed a cut credits, in silviculture. */
  private static async credit(actor: Stuff, difficulty: 'easy' | 'standard'): Promise<void> {
    try {
      if (MixinApi.isAdvancing(actor)) {
        await actor.creditDeed({ discipline: 'silviculture', difficulty, outcome: 'success' });
      }
    } catch (err) {
      console.warn('Bole: recording the deed failed:', err);
    }
  }
}
