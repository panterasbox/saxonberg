/**
 * Surveyed — ⭐ **it can be taken stock of** (controller-liquidity W7c):
 * the `survey` verb's one protocol.
 *
 * `survey` asked four questions in its controller — what the room is FOR
 * (the room archetypes, met *by what*), what shape its building is in,
 * who owes the upkeep, how its floor is kept — and, given a building from
 * its landing, read the outside instead; it picked which by testing the
 * target's class. What is there to take stock of is the THING's, so it
 * answers in facts and the controller words them:
 *
 *  - the mixin's default is a STRUCTURE's outside (`lib/structure/
 *    Structure` composes it): the top coat, the fabric's condition band
 *    and its cause, and the job (area to the weather, litres of paint one
 *    coat takes). A bare structure with no faces says `not-a-building`.
 *  - `Place` overrides with the PLACE read (residences D15/D4, paint D13,
 *    cleanliness D15): the archetypes, the building it is part of (asked
 *    of that structure), the holding's tenure term, the floor.
 *
 * Read-only: nothing is enforced anywhere — no multiplier reads this.
 * ⚠ The survey mutates nothing but the lazy settle reads already make
 * (`standUpLandings`, the floor's `reconcileStalls`).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';
import type { CoatLayer } from '../material/Faced';
import type { Satisfaction } from '../archetype/Archetype';
import type Material from '../material/Material';
import type StructureBase from '../structure/Structure';
import { Paint } from '../material/Paint';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/** A structure's outside, as facts (paint D13). */
export interface OutsideSurvey {
  kind: 'outside';
  structure: Stuff;
  /** The outermost coat, if any is left. */
  top: CoatLayer | null;
  /** The top coat's paint, when it is one. */
  paint: Paint | null;
  /** The top coat's material. */
  material: Material | null;
  /** The fabric's condition word, and why (`null` — nothing to say). */
  band: string;
  cause: string | null;
  /** Area to the weather, m², and the litres one coat of paint takes. */
  areaM2: number;
  paintLitres: number;
  /** What the weather meets — *wall and roof*, a ship's *hull*. */
  surface: string;
}

/** A place, as facts (residences D15/D4; paint D13; cleanliness D15). */
export interface PlaceSurvey {
  kind: 'place';
  /** The place as a whole (a holding's every room), or the one room. */
  whole: boolean;
  /** Each reported room archetype's verdict, met by what. */
  reports: Satisfaction[];
  /** The building this place is part of, read from outside. */
  outside: OutsideSurvey | null;
  /** The holding's tenure term — who owes the upkeep. */
  upkeepTerm: string | null;
  /** How the floor is kept: its band and the method that sees to it. */
  floor: { band: string; method: string } | null;
}

/** What a survey found. */
export type SurveyFacts = OutsideSurvey | PlaceSurvey;

/**
 * Why there is nothing to take stock of — closed. `not-a-building` — a
 * structure (or thing) with no outside to read; `not-here` — a place the
 * viewer is not standing in; `nowhere` — nothing that holds anything.
 */
export type SurveyRefusal = ActRefusal<'not-a-building'> | ActRefusal<'not-here'> | ActRefusal<'nowhere'>;

/** What `surveyFor` answers. */
export type SurveyAnswer = ActOutcome<SurveyFacts> | SurveyRefusal;

/** A thing that can be taken stock of. */
export interface Surveyed {
  /** Take stock of this for `viewer` — facts, or why not. */
  surveyFor(viewer: Stuff): Promise<SurveyAnswer>;
}

/**
 * ⭐ **`SurveyedMixin` — the `survey` protocol, as a mixin.** The default
 * reads a STRUCTURE's outside; `Place` overrides with the place read.
 */
export function SurveyedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SurveyedMixin extends Base implements Surveyed {
    static _mixinName: string = 'SurveyedMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Take stock of this. Default: a structure's outside, read from a landing. */
    public async surveyFor(_viewer: Stuff): Promise<SurveyAnswer> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isFaced(self) || !MixinApi.isDurable(self)) return { ok: false, reason: 'not-a-building' };
      await (self as unknown as StructureBase).standUpLandings();
      const top = self.getCoats('outside')[0] ?? null;
      const paint = top?.paint ? new Paint(top.paint) : null;
      const material = top ? (StuffApi.findByTemplatePath<Material>(top.material) ?? null) : null;
      const areaM2 = self.coatAreaM2();
      const film = SurveyedMixin.dial(AppSettingKeys.structurePaintCoatThicknessM, 0.00005);
      return {
        ok: true,
        facts: {
          kind: 'outside',
          structure: self,
          top,
          paint,
          material,
          band: self.getConditionWord(),
          cause: self.weatherCause(),
          areaM2,
          paintLitres: areaM2 * film * 1000,
          surface: this.weatherSurface(),
        },
      };
    }

    /** @hook What the weather meets on this structure. Default: *wall and roof*; a ship says *hull*. */
    public weatherSurface(): string {
      return 'wall and roof';
    }

    /** A positive numeric dial, or the fallback. */
    protected static dial(key: string, fallback: number): number {
      try {
        const n = Number.parseFloat(AppApi.setting(key) ?? '');
        return Number.isFinite(n) && n > 0 ? n : fallback;
      } catch {
        return fallback;
      }
    }
  };
}
