/**
 * HygieneMixin — **how a body is kept clean**: where an act's dirt lands on
 * it, how clean its hands are, washing them, a bath, and what taking a
 * dirty thing off does to your hands (cleanliness D4, D5, D7, D28).
 *
 * ⭐ Split out of `AttiredMixin` in review: *a module about clothes had a
 * buncha stuff about washing hands*. The dependency runs ONE way —
 * cleanliness reads the covering stack (`outermostAt`, `coveringAt`: the
 * apron takes the blood, not the shirt under it), and clothing knows
 * nothing about dirt. So this composes OUTSIDE both `AttiredMixin` (the
 * layers) and `SoilableMixin` (the body's own soil by part), and
 * `Creature` is its one composer.
 *
 * ⚠ Not the retired `HygieneMixin`, which was a six-hour clock that let
 * clean hands go dirty by themselves. Nothing here has a clock: a clean
 * hand stays clean until it touches something.
 *
 * Operational reference: `docs/subsystems/cleanliness.md`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from '../slot/Slotted';
import type { Attired } from '../slot/Attired';
import { SOIL_BANDS } from './Soilable';
import type { Soilable, WashSpec } from './Soilable';
import type { SoilSpec } from './SoilSpec';
import { CleanserUse } from './CleanserUse';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/** What a body that is kept clean can be asked. */
export interface Hygiene {
  /**
   * ⭐ How clean this body's hands are, `[0, 1]` — DERIVED, never stored:
   * `1 − min(1, worst load)` over each hand, read off the outermost layer
   * there when it is Soilable (a glove) and off the bare hand otherwise.
   * Replaces the retired six-hour hands clock: a clean hand stays clean
   * until it touches something.
   */
  handCleanliness(): number;
  /**
   * Wash the layer at each hand — a glove when one is worn (the gloves
   * come clean, the hands under them untouched, D5), else the bare hand —
   * by the wash's chemistry (`spec`), or plainly clean with none.
   */
  washHands(spec?: WashSpec): void;
  /**
   * ⭐ Land a row's `soils:` (a recipe's, a tap's) on this body and the
   * floor it stands on — `hands`, `apron` (whatever covers the trunk),
   * `feet`, `floor`. The act names the dirt; this says where it goes.
   */
  soilFrom(specs: readonly SoilSpec[], by?: Stuff | null): void;
  /**
   * ⭐ A bath (cleanliness D28): every part of the BODY is washed by the
   * bath's chemistry (soap, the water's heat and hardness — the head site
   * is the hair), then the body goes in (`immerse`) — so a bather who
   * kept their clothes on soaks them, which is the bather's problem — and
   * the water's heat is exchanged with the body by the one law
   * (`exchangeWithWater`): a copper-fed tub warms, a winter river chills.
   */
  bathe(spec: WashSpec, durationS: number): void;
  /**
   * ⭐ The doffing problem (cleanliness D5): a garment came off. Taken off
   * in a hurry, a dirty one leaves `cleanliness.doff.transfer` of what is
   * on it on the hands that pulled it — the bare hands once the gloves
   * are off. Taken off `careful`ly, nothing.
   */
  doff(garment: Stuff, opts?: { careful?: boolean }): void;
  /** Soil both hands on the layer the act reaches (a glove, else skin). */
  soilHands(kind: string, amount: number, by?: Stuff | null): void;
  /**
   * Soil one body part on the layer an act reaches: the outermost
   * covering (`outer`, the default — the apron over the shirt), the
   * innermost (`inner` — sweat lands on the shirt, not the coat), or the
   * skin when the part is bare or nothing there is Soilable.
   */
  soilBodyPart(
    partKey: string,
    kind: string,
    amount: number,
    by?: Stuff | null,
    layer?: 'outer' | 'inner',
  ): void;
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function HygieneMixin<
  TBase extends MixinConstructor<Stuff & Slotted & Attired>,
>(Base: TBase) {
  return class HygieneMixin extends Base {
    // ⚠ Widened to `string` — a pinned literal collapses the chain (see
    // `AttiredMixin`).
    static _mixinName = 'HygieneMixin';
    static fieldMeta: FieldMeta = {};

    // ⭐ What an act soils is the layer it REACHES: the outermost covering
    // at a part (`outermostAt` — the soiling seam), the bare part only when
    // nothing covers it. So a gloved butcher's gloves are bloodied and their
    // hands are not, and taking the gloves off carelessly is what moves
    // the blood (D5). The bare part is the host's own Soilable site.

    public handCleanliness(this: Stuff & Slotted & Attired & Hygiene): number {
      const self = this as unknown as Stuff;
      const skin = MixinApi.isSoilable(self) ? self : null;
      const hands = this.handSites();
      if (hands.length === 0) return 1 - Math.min(1, skin?.soilAt() ?? 0);
      let worst = 0;
      for (const hand of hands) {
        const layer = this.outermostAt(hand);
        const load =
          layer && MixinApi.isSoilable(layer)
            ? layer.soilAt('')
            : (skin?.soilAt(hand) ?? 0);
        worst = Math.max(worst, load);
      }
      return 1 - Math.min(1, worst);
    }

    public washHands(this: Stuff & Slotted & Attired & Hygiene, spec?: WashSpec): void {
      const self = this as unknown as Stuff;
      const wash = (target: Stuff, site: string): void => {
        if (!MixinApi.isSoilable(target)) return;
        if (spec) {
          target.washSite(spec, site);
          return;
        }
        for (const kind of target.soilKinds(site)) target.removeSoil(kind, 1, site);
      };
      if (this.handSites().length === 0) {
        wash(self, '');
        return;
      }
      const done = new Set<Stuff>();
      for (const hand of this.handSites()) {
        const layer = this.outermostAt(hand);
        if (layer) {
          if (done.has(layer)) continue;
          done.add(layer);
          wash(layer, '');
        } else {
          wash(self, hand);
        }
      }
    }

    public soilFrom(
      this: Stuff & Slotted & Attired & Hygiene,
      specs: readonly SoilSpec[],
      by: Stuff | null = null,
    ): void {
      const self = this as unknown as Stuff;
      for (const spec of specs) {
        switch (spec.where) {
          case 'hands':
            this.soilHands(spec.kind, spec.amount, by);
            break;
          case 'apron': {
            const trunk = this.trunkSite();
            if (trunk) this.soilBodyPart(trunk, spec.kind, spec.amount, by);
            else if (MixinApi.isSoilable(self)) self.soil(spec.kind, spec.amount, by, '');
            break;
          }
          case 'feet':
            for (const foot of this.footSites()) {
              this.soilBodyPart(foot, spec.kind, spec.amount, by);
            }
            break;
          case 'floor': {
            const room = MixinApi.isContainable(self) ? self.getContainer() : null;
            const floor =
              room && MixinApi.isAdornable(room) ? room.getFloor() : null;
            if (floor && MixinApi.isSoilable(floor as unknown as Stuff)) {
              (floor as unknown as Stuff & Soilable).soil(spec.kind, spec.amount, by, '');
            }
            break;
          }
        }
      }
    }

    public bathe(
      this: Stuff & Slotted & Attired & Hygiene,
      spec: WashSpec,
      durationS: number,
    ): void {
      const self = this as unknown as Stuff;
      if (MixinApi.isSoilable(self)) {
        const keys = this.leafParts();
        // The bath washes the body, not what it has on: a covered part's
        // soap goes on the cloth over it (immerse below soaks it).
        for (const key of ['', ...keys]) self.washSite(spec, key);
      }
      this.immerse(undefined, spec.waterK);
      if (MixinApi.isThermalRegulation(self)) {
        self.exchangeWithWater(spec.waterK, durationS);
      }
      // ⭐ A bath spends its soap (B12) — the act's, so any controller for
      // it (or the attendant's paid bath) spends alike.
      new CleanserUse(spec.cleansers).spend(1);
    }

    public doff(
      this: Stuff & Slotted & Attired & Hygiene,
      garment: Stuff,
      opts: { careful?: boolean } = {},
    ): void {
      if (opts.careful || !MixinApi.isSoilable(garment)) return;
      if (SOIL_BANDS.indexOf(garment.soilBand('')) < SOIL_BANDS.indexOf('marked')) return;
      const share = dial(AppSettingKeys.cleanlinessDoffTransfer, 0.5);
      for (const kind of garment.soilKinds('')) {
        const load = garment.soilLoad(kind, '');
        if (load > 0) this.soilHands(kind, load * share, null);
      }
    }

    public soilHands(
      this: Stuff & Slotted & Attired & Hygiene,
      kind: string,
      amount: number,
      by: Stuff | null = null,
    ): void {
      const hands = this.handSites();
      if (hands.length === 0) {
        // A body with no hands (or none resolved) takes it on the whole.
        const self = this as unknown as Stuff;
        if (MixinApi.isSoilable(self)) self.soil(kind, amount, by, '');
        return;
      }
      // ⭐ One deposit per LAYER reached: a pair of gloves covers both
      // hands and is one garment, so it takes the act once, not twice.
      const reached = new Set<Stuff>();
      for (const hand of hands) {
        const layer = this.outermostAt(hand);
        if (layer && MixinApi.isSoilable(layer)) {
          if (reached.has(layer)) continue;
          reached.add(layer);
        }
        this.soilBodyPart(hand, kind, amount, by);
      }
    }

    public soilBodyPart(
      this: Stuff & Slotted & Attired & Hygiene,
      partKey: string,
      kind: string,
      amount: number,
      by: Stuff | null = null,
      layer: 'outer' | 'inner' = 'outer',
    ): void {
      const stack = this.coveringAt(partKey);
      const reached = layer === 'outer' ? stack[0] : stack[stack.length - 1];
      if (reached && MixinApi.isSoilable(reached)) {
        reached.soil(kind, amount, by, '');
        return;
      }
      const self = this as unknown as Stuff;
      if (MixinApi.isSoilable(self)) self.soil(kind, amount, by, partKey);
    }

    /**
     * ⭐ Into water, and RINSED (cleanliness D7): Attired soaks the body and
     * what it has on; each soaked Soilable site then takes a water-only wash
     * at the water's temperature — climbing out of a river you are wet, not
     * still caked in mud; grease and a set stain stay.
     */
    public immerse(
      this: Stuff & Slotted & Attired & Hygiene,
      parts?: (partKey: string) => boolean,
      waterK = 283,
    ): void {
      super.immerse(parts, waterK);
      const self = this as unknown as Stuff;
      const rinse: WashSpec = { waterK, hardnessDgh: 8, cleansers: [], effort: 0 };
      for (const layer of this.immersedLayers(parts)) {
        if (MixinApi.isSoilable(layer)) layer.washSite(rinse, '');
      }
      if (!MixinApi.isSoilable(self)) return;
      for (const key of this.leafParts()) {
        if (!parts || parts(key)) self.washSite(rinse, key);
      }
    }
  };
}
