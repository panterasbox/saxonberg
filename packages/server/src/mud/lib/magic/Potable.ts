/**
 * PotableMixin — a **liquid that carries a working**. The potion leg.
 *
 * The decision worth understanding here is *what a potion is*
 * (requirements D4). The slate had `Consumable` as orthogonal to
 * `Bulkable`; composing them instead — for potions only — buys four
 * behaviours that would otherwise be invented mechanics:
 *
 * - **dose** — half a flask is half a dose, and what that means is
 *   `Dose`'s job.
 * - **dilution** — water in the flask is water in the dose.
 * - **splitting** — pour half into a second flask and you have two.
 * - **spilling** — it lands on the floor and is gone.
 *
 * **The mixin composes onto the `Material`, not the flask**, and that is
 * the load-bearing half of the decision. The magic is in the *liquid*,
 * so it travels with the liquid: decant a potion into a different vial
 * and it is still a potion, because the substance moved. Put it on the
 * flask and pouring would strip the magic — which is not what anyone
 * means by a potion.
 *
 * It also lands identity in the right place for free: a potion's
 * **class** IS its material, so "which potion is this" (wave 5's
 * identification) keys on the same singleton that carries the effect,
 * and every flask of healing draught in the world is the same class
 * without anything having to say so.
 *
 * The concrete subclass is `obj/material/PotionMaterial` — the
 * `RadioactiveMaterial` capability-subclass pattern.
 *
 * ⚠ **Route is declared here; delivery is not.** Every potion says
 * whether it acts orally, on contact, or as vapour. The *delivery* half
 * — throwing, vessel breakage, splash — defers whole to the ranged
 * build (D17), because there is no `throw` verb and no delivery model to
 * hang it on. Route lands now because retrofitting it across every
 * potion later is expensive, and because it is the thing that kills the
 * throw-everything case without needing a rule: an ingestion-only potion
 * is a wasted flask.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MagicApi } from '../../api/magic';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { Dose } from './Dose';
import type { DoseSpec } from './Dose';

/** Where a working's own prose rides. */
const POTION_TOPIC = 'act.deed';

/** How a potion gets in. The delivery model for the latter two defers. */
export const POTION_ROUTES = ['oral', 'contact', 'vapour'] as const;

/** A route of administration — one of {@link POTION_ROUTES}. */
export type PotionRoute = (typeof POTION_ROUTES)[number];

export interface Potable {
  /** How this substance acts (`oral` · `contact` · `vapour`). */
  getRoute(): PotionRoute;
  setRoute(route: string): void;
  /** The authored dose curve. */
  getDose(): DoseSpec;
  setDoseSpec(raw: unknown): void;

  /**
   * **Fire this substance's working into whoever took it**, scaled by
   * the volume consumed.
   *
   * The one seam `drink` / `sip` reach through — invoked duck-typed
   * from the bulk ingest bridge, exactly as the *drinker's* own
   * `ingest` is, so the bulk subsystem never has to import magic.
   *
   * Returns the reports the working produced, or an empty list when the
   * dose did nothing (a sub-threshold sip) or the substance carries no
   * working at all (ordinary water goes through this path too).
   */
  dischargeInto(
    drinker: Stuff,
    litres: number,
    opts?: { readonly origin?: Stuff },
  ): Promise<string[]>;

  // ---------- storage (public for the Hydrator) ----------
  route: string;
  dose: Record<string, unknown>;
}

export function PotableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class PotableMixin extends Base implements Potable {
    static _mixinName = 'PotableMixin';

    static fieldMeta: FieldMeta = {
      route: { persistent: true, authorable: true },
      dose: { persistent: true, authorable: true },
    };

    /** Swallowing it is the ordinary case. */
    public route: string = 'oral';

    /** The authored dose curve; `{}` reads as `Dose.DEFAULT`. */
    public dose: Record<string, unknown> = {};

    public getRoute(): PotionRoute {
      return (POTION_ROUTES as readonly string[]).includes(this.route)
        ? (this.route as PotionRoute)
        : 'oral';
    }

    public setRoute(route: string): void {
      if (!(POTION_ROUTES as readonly string[]).includes(route)) {
        throw new RangeError(
          `route: unknown route '${route}' (expected ${POTION_ROUTES.join(' | ')})`,
        );
      }
      this.route = route;
    }

    public getDose(): DoseSpec {
      return Dose.validate(this.dose);
    }

    public setDoseSpec(raw: unknown): void {
      // Validate eagerly so a malformed dose fails at authoring time
      // rather than at the bottom of a flask.
      Dose.validate(raw);
      this.dose = (raw ?? {}) as Record<string, unknown>;
    }

    public async dischargeInto(
      drinker: Stuff,
      litres: number,
      opts?: { readonly origin?: Stuff },
    ): Promise<string[]> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isArcane(self)) return []; // a mundane liquid
      if (self.getCarriedSpellPath().length === 0) return [];

      const spec = this.getDose();
      const scale = Dose.scaleFor(spec, litres);
      if (scale <= 0) {
        // A sub-threshold sip. Legible, not silent: the caller reports
        // that nothing happened rather than a quiet success.
        return [];
      }

      // Dose scales potency, which is already the effect layer's own
      // magnitude parameter — so a partial dose needs no special path,
      // exactly as a maker's efficiency needs none. The two multiply:
      // half a dose of a master's draught is half a master's dose.
      //
      // The drinker is the target: it is inside them. The origin (a
      // Material singleton) has no place of its own, so the effect
      // context falls back to issuing from wherever the actor is —
      // which is right for DRINKING and wrong for a thrown flask, whose
      // contact payload acts at the point of impact. A caller that
      // delivered this across a gap passes the victim as the origin;
      // absent that, behaviour is byte-identical to before.
      const out = await MagicApi.discharge(self, drinker, {
        potencyScale: scale,
        origin: opts?.origin,
      });
      const reports = out.ok
        ? out.reports
        : out.refusal
          ? [out.refusal]
          : [];
      // The ingest bridge returns void, so the working narrates itself
      // rather than handing prose back up through a seam that has
      // nowhere to put it. Self-only: what a draught does inside you is
      // not a spectacle, and wave 5 depends on a watcher not learning
      // your potion's class by standing nearby.
      if (reports.length > 0) {
        MessageApi.scene(drinker)
          .topic(POTION_TOPIC)
          .toSelf(Mml.text(reports.join(' ')))
          .send();
      }
      return reports;
    }
  };
}
