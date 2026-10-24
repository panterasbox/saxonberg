/**
 * Propulsion — ⭐ **what moves a small boat** (river D20, D21): a paddle, an
 * oar, a pole; later a sail or a screw.
 *
 * One verb, `paddle`, moves every small craft by its people's own effort;
 * the PART decides the physics and the words. A paddle digs anywhere; oars
 * pull harder for the same effort; a pole needs a bottom it can reach and
 * is the strongest thing in shallow water there is. A part that is not
 * crew-powered (a sail, a screw) is steered, not paddled (a tiller's
 * `course`).
 *
 * In this build a part is carried IN the boat — a canoe's row brings its
 * paddles as props — rather than fitted to a joint of an assembly bill
 * (D20's `fit paddle in canoe`): the boat reads what is in it.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** What a part needs from the water to work. */
export type PropulsionNeeds = 'water' | 'bottom' | 'wind' | 'air';

export default class Propulsion extends Good {
  static fieldMeta: FieldMeta = {
    propulsionKind: { persistent: true, authorable: true },
    needs: { persistent: true, authorable: true },
    crewPowered: { persistent: true, authorable: true },
    efficiency: { persistent: true, authorable: true },
    reachM: { persistent: true, authorable: true },
  };

  /** `paddle`, `oar`, `pole`, `sail` … — the word the prose uses. */
  public propulsionKind = 'paddle';
  /** What it pushes against. */
  public needs: PropulsionNeeds = 'water';
  /** Driven by the people in the boat (a paddle), or not (a sail). */
  public crewPowered = true;
  /** How much of a paddler's effort becomes way on the boat. */
  public efficiency = 0.5;
  /** How deep it reaches, m — a pole finds no bottom past this. */
  public reachM = 0;

  public getPropulsionKind(): string {
    return this.propulsionKind;
  }
  public getNeeds(): PropulsionNeeds {
    return this.needs;
  }
  public isCrewPowered(): boolean {
    return this.crewPowered;
  }
  public getEfficiency(): number {
    return this.efficiency;
  }
  public getReachM(): number {
    return this.reachM;
  }
}
