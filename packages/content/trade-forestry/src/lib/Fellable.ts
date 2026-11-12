/**
 * Fellable — ⭐⭐ **a tree answers the axe** (controller-liquidity W11,
 * Appendix A: `fell` is one act on two hosts).
 *
 * Two things can be felled and they share nothing else:
 *
 *  - **the stand** — a `Wood` is the room, and a standard comes down out
 *    of its count (the species named, or the thickest);
 *  - **a planted standard** — a `Standard` in a panel slot, felled where it
 *    stands: mature → the same bole, logs and seed as a stand's; young or
 *    established → one whole carryable tree; a seedling refuses.
 *
 * `FellController` hands the bound axe (and the player's word) to
 * {@link Fellable.fellPlanFor} and words the plan; it no longer asks what
 * kind of thing it is holding. The axe is the tree's to judge (`felling`,
 * or `no-felling-axe`), and the endurance a felling costs is spent at
 * COMPLETION, when the tree comes down (C12).
 *
 * ⭐ A pack mixin, not kernel (a deliberate departure from the plan's
 * `$L/husbandry/Fellable.ts`): the plan placed it in the kernel because a
 * planted tree was a kernel `Plant`; once the planted standard is the
 * forestry pack's own `Standard` class, both hosts have a common pack
 * ancestor, and the kernel test (*composers with no common pack ancestor*)
 * no longer fires. `Plant` stays honest — wheat does not answer the axe.
 *
 * ⭐ What comes down — bole, logs, bark, brash, seed — is one routine both
 * hosts inherit ({@link FellableMixin.dropStandard}).
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type Bole from '../thing/Bole';

/** The marker `MixinApi.isActive` reads. */
export const FELLABLE_MIXIN = 'FellableMixin';

/** Game-ms a felling takes — 2.5 real seconds at the default 12×. */
export const FELL_MS = 30_000;
/** Endurance points a felling costs. */
export const FELL_COST = 10;
/** Metabolic watts of felling a standard out of a stand. */
export const FELL_EFFORT_W = 700;
/** Metabolic watts of felling a planted standard where it stands. */
export const PLANTED_FELL_EFFORT_W = 400;
/** Logs off the crown of a standard. */
export const LOGS_PER_STANDARD = 4;

/**
 * ⭐⭐ **Bark, and it is a FOURTH yield off a felling rather than a verb.**
 * A bark-bearing standard drops four bundles summing to 8 % of the bole's
 * mass — roughly the real share of a trunk that is bark. ⚠ Per-species,
 * because **oak tans and ash does not**.
 */
export const BARK_BUNDLES_PER_STANDARD = 4;
export const BARK_FRACTION_OF_BOLE = 0.08;
/**
 * ⭐⭐ **Brash, the felling's fifth yield and the wood's waste** (potash
 * D18): the crown's twigs and lop, trimmed off where the tree lies. Ten
 * bundles summing to a fifth of the bole's mass.
 */
export const BRASH_BUNDLES_PER_STANDARD = 10;
export const BRASH_FRACTION_OF_BOLE = 0.2;
/** Mass of a whole felled tree, by stage — the carryable case. */
export const FELLED_TREE_KG: Record<string, number> = { young: 8, established: 30 };

/** The capability a felling asks of the tool. */
const FELLING = 'felling';
const BOLE_PATH = '/trade/forestry/thing/bole';
const LOG_PATH = '/trade/forestry/thing/log';
const BRASH_PATH = '/trade/forestry/thing/brash';
/** Cubic metres of trunk a standard yields — what the mint sizes by. */
const BOLE_M3 = 0.9;
/** Cross-cut lengths a standard's bole carries. */
const BOLE_LENGTHS = 6;

/** ⭐ Every reason a felling is refused — `FellController` words each. */
export type FellRefusal =
  /** The bound tool does not fell: a billhook takes a stool, not an oak. */
  | ActRefusal<'wrong-tool'>
  /** The stand does not know the word. */
  | ActRefusal<'no-such-species', { word: string }>
  /** Nothing left standing worth the axe (of the species, when named). */
  | ActRefusal<'stand-empty', { name: string | null }>
  /** A planted standard too young to be a tree. */
  | ActRefusal<'not-yet-a-tree'>;

/** The begin words' facts. */
export interface FellBegin {
  /** The species name (a stand) or the tree's presentation (a planted one). */
  name: string;
  planted: boolean;
}

/** What came down. */
export type FellDone =
  /** A standard: a bole on the floor, logs off the crown, perhaps a seed. */
  | { kind: 'standard'; name: string; planted: boolean; bole: Stuff | null; logs: number; seed: Stuff | null }
  /** A young or established planted tree, whole, taken up. */
  | { kind: 'whole'; name: string }
  /** The actor or the tree went while the axe was swinging. */
  | { kind: 'gone' };

/** A felling plan. */
export type FellPlan = ActPlan<FellBegin, FellDone, FellRefusal>;

/** What a felled standard is made of. */
export interface FelledSpec {
  woodMaterialPath: string;
  seedPath: string | null;
  barkPath: string | null;
  brashMaterialPath: string | null;
}

/** A thing that answers the axe. */
export interface Fellable {
  /**
   * Fell this with `axe`; `word` is the player's species word (a stand
   * reads it; a planted tree ignores it). The plan, or why not.
   */
  fellPlanFor(actor: Stuff, axe: Stuff, word: string): Promise<FellPlan | FellRefusal>;
}

export function FellableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class FellableMixin extends Base implements Fellable {
    static _mixinName: string = FELLABLE_MIXIN;
    static _mixinKind = 'protocol' as const;

    /** @hook The felling plan; a host overrides. The default fells nothing. */
    public async fellPlanFor(_actor: Stuff, _axe: Stuff, _word: string): Promise<FellPlan | FellRefusal> {
      return { ok: false, reason: 'stand-empty', facts: { name: null } };
    }

    /** Whether `axe` fells — the axe is the tree's to judge. */
    protected fellsWith(axe: Stuff): boolean {
      return MixinApi.isTool(axe) && axe.hasCapability(FELLING);
    }

    // ⚠ The helpers below are STATIC: a planted standard is destructed as
    // it comes down, and a destructed Stuff's proxy no-ops every call.

    /** Spend endurance — when the tree comes down, never before (C12). */
    protected static spendOn(actor: Stuff, points: number): void {
      if (points <= 0 || !MixinApi.isReserved(actor)) return;
      if (!actor.hasReserve('endurance')) return;
      actor.adjustReserve('endurance', Quantity.of(-points, '%'));
    }

    /** Save a host's record now; a failure is said, never thrown into the act. */
    protected static async captureNow(host: Stuff): Promise<void> {
      try {
        await PersistableApi.captureHostOf(host);
      } catch (err) {
        console.warn('Fellable: capture failed:', err);
      }
    }

    /** The deed a felling credits, in silviculture. */
    protected static async creditFelling(actor: Stuff, difficulty: 'easy' | 'standard'): Promise<void> {
      try {
        if (MixinApi.isAdvancing(actor)) {
          await actor.creditDeed({ discipline: 'silviculture', difficulty, outcome: 'success' });
        }
      } catch (err) {
        console.warn('Fellable: recording the deed failed:', err);
      }
    }

    /**
     * Mint what a standard drops: one bole of the species' wood and mass on
     * the floor, the crown's logs beside it, the bark (when the species
     * gives it) and the brash, and a seed in the feller's hand.
     */
    protected static async dropStandard(
      giver: Stuff,
      room: Stuff & Container,
      spec: FelledSpec,
    ): Promise<{ bole: Bole | null; seed: Stuff | null }> {
      const wood = await FellableMixin.materialAt(spec.woodMaterialPath);
      const density = wood ? wood.getDensity().rawValue() : 750;

      const bole = await StuffApi.clone<Bole>(BOLE_PATH);
      if (wood) bole.setMaterial(wood);
      bole.setMass(Quantity.of(Math.round(density * BOLE_M3), 'kg'));
      bole.setLengthsLeft(BOLE_LENGTHS);
      ContainmentApi.move(bole, room);

      for (let i = 0; i < LOGS_PER_STANDARD; i += 1) {
        const log = await StuffApi.clone<Stuff & Containable>(LOG_PATH);
        if (wood && MixinApi.isTangible(log)) log.setMaterial(wood);
        ContainmentApi.move(log, room);
      }

      const boleKg = bole.getMass().rawValue();
      // ⭐ The bark comes off onto the ground beside the trunk, not into
      // your arms: a bundle of oak bark is 13 kg.
      if (spec.barkPath) {
        const each = (boleKg * BARK_FRACTION_OF_BOLE) / BARK_BUNDLES_PER_STANDARD;
        for (let i = 0; i < BARK_BUNDLES_PER_STANDARD; i += 1) {
          try {
            const bundle = await StuffApi.clone<Stuff & Containable>(spec.barkPath);
            if (MixinApi.isTangible(bundle)) {
              bundle.setMass(Quantity.of(Math.round(each * 100) / 100, 'kg'));
            }
            ContainmentApi.move(bundle, room);
          } catch (err) {
            // ⚠ A missing bark row is a content gap, not a reason to lose
            // the timber — the bole and the logs are already down.
            console.warn(`Fellable: no bark at '${spec.barkPath}':`, err);
            break;
          }
        }
      }

      // ⭐ The brash, of the species' own brash material when the stand
      // names one, else of the wood — and named for its wood.
      {
        const each = (boleKg * BRASH_FRACTION_OF_BOLE) / BRASH_BUNDLES_PER_STANDARD;
        const brashMaterial =
          (spec.brashMaterialPath ? await FellableMixin.materialAt(spec.brashMaterialPath) : null) ??
          wood;
        const woodName = brashMaterial?.getName() ?? '';
        for (let i = 0; i < BRASH_BUNDLES_PER_STANDARD; i += 1) {
          try {
            const bundle = await StuffApi.clone<Stuff & Containable>(BRASH_PATH);
            if (MixinApi.isTangible(bundle)) {
              if (brashMaterial) bundle.setMaterial(brashMaterial);
              bundle.setMass(Quantity.of(Math.round(each * 100) / 100, 'kg'));
            }
            if (woodName && MixinApi.isVisible(bundle)) {
              bundle.setShortDescription(`bundle of ${woodName}`);
            }
            // The whole name only: a bare `beech` stays the TREE's word.
            if (woodName && MixinApi.isPerceptible(bundle)) {
              bundle.setKeywords([...bundle.getKeywords(), woodName]);
            }
            ContainmentApi.move(bundle, room);
          } catch (err) {
            console.warn(`Fellable: no brash at '${BRASH_PATH}':`, err);
            break;
          }
        }
      }

      let seed: Stuff | null = null;
      if (spec.seedPath && MixinApi.isContainer(giver)) {
        try {
          const s = await StuffApi.clone<Stuff & Containable>(spec.seedPath);
          if (MixinApi.isCarrying(giver)) giver.receive(s);
          else ContainmentApi.move(s, giver);
          seed = s;
        } catch (err) {
          console.warn(`Fellable: no seed at '${spec.seedPath}':`, err);
        }
      }
      return { bole, seed };
    }

    private static async materialAt(path: string): Promise<Material | null> {
      if (!path) return null;
      try {
        return await StuffApi.singleton<Material>(path);
      } catch {
        return null;
      }
    }
  };
}
