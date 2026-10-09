/**
 * TravelProfile — who is travelling, as plain data, and the one place
 * the admission rule is written.
 *
 * ⭐⭐ **Why this exists as data rather than as a method on a mover.**
 * `Exit.canTraverse(mover, mode?)` takes the whole mover and answers
 * fourteen different refusals about a LIVE exit: is it locked, is the
 * door shut, is the far side unpublished, is this body too encumbered.
 * That is the right question at the threshold and the wrong one for a
 * search, which reasons over a projection of authored rows and must
 * not resolve a thousand live exits to answer *which way is there*.
 *
 * So the search asks a smaller question — *may a traveller of this
 * kind use a way of this kind* — of plain data on both sides. The
 * answer mirrors `Exit.allowsMode` + `isWheelPassable` exactly, and
 * ⚠ the mirroring is the hazard: this is a second copy of a rule, and
 * the only defence is that there is exactly one copy of the copy.
 * `world/__tests__/logistics-corridors.test.ts` used to carry a THIRD
 * — three predicates it described in its own comment as *"mirrored
 * from `Exit.allowsMode`"* — and it reads this instead now.
 *
 * ⛔ **`blocked` is not admission.** A blocked authored edge is
 * projected as NO EDGE at all (`LocationGraphRegistry.edgesOf`): a way
 * that is not there, rather than a way the traveller is refused.
 * ⛔ And `published` is not admission either — it is a **knowledge**
 * fact about the far node, so the search declines to enter an
 * unpublished place rather than declining the edge.
 */

/**
 * ⚠⚠ **The two fields the admission rule needs — declared HERE, not
 * imported.** `StoredEdge` satisfies this structurally, so the rule
 * reads a projected edge with no import at all. That is not a
 * stylistic choice: `lint:graph-walks`' second check REFUSED a
 * `import type { StoredEdge } from './PlaceNode'` on this file, and it
 * was right to. `PlaceNode` is a `Document` — importing it for a type
 * puts the collection one property access away from the module that
 * must never consult the index, and the firewall is structural or it
 * is nothing.
 *
 * ⭐ It also says something true: admission needs two fields, not a
 * database row.
 */
export interface AdmissibleWay {
  media?: string[];
  wheelPassable?: boolean;
}

/** The ground pace family — what an empty `media` list admits. */
const GROUND_PACES: readonly string[] = ['walk', 'sneak', 'run'];

/**
 * A declared traveller. ⚠ `medium` is resolved by the CALLER (through
 * `LocomotionApi`) and passed in, because the mode roster is a live
 * registry and this is a value object that must stay reachable from a
 * context with no world — including, eventually, a client holding a
 * cached map.
 */
export interface TravelProfileSpec {
  /** `walk` · `wheeled` · `sailed` · … */
  mode: string;
  /** The mode's medium, or `null` when the caller could not resolve one. */
  medium: string | null;
  /**
   * Does this traveller roll? ⭐ The one residue `media` cannot
   * express: a stair, a stile and a turnstile are all `media:
   * ['ground']` and all refuse wheels.
   */
  wheeled?: boolean;
}

export class TravelProfile {
  public readonly mode: string;
  public readonly medium: string | null;
  public readonly wheeled: boolean;

  constructor(spec: TravelProfileSpec) {
    this.mode = spec.mode;
    this.medium = spec.medium;
    this.wheeled = spec.wheeled ?? false;
  }

  /**
   * May this traveller use this way?
   *
   * Mirrors `Exit.allowsMode`: an **empty or absent** `media` list
   * admits the ground pace family and nothing else (that is what an
   * unauthored corridor means), otherwise the traveller's medium must
   * be in the list. Then the wheel residue: a wheeled traveller is
   * refused by `wheelPassable: false`.
   */
  public admits(edge: AdmissibleWay): boolean {
    const media = edge.media ?? [];
    if (media.length === 0) {
      if (!GROUND_PACES.includes(this.mode)) return false;
    } else if (this.medium === null || !media.includes(this.medium)) {
      return false;
    }
    if (this.wheeled && edge.wheelPassable === false) return false;
    return true;
  }

  /** The plain-data shape, for an Api return value or the wire. */
  public toSpec(): TravelProfileSpec {
    return { mode: this.mode, medium: this.medium, wheeled: this.wheeled };
  }
}

/**
 * Admits every way, for the **mode break** second pass: when a
 * mode-admitted search finds no way, the same search with nothing
 * refused tells us whether a way exists at all — and therefore
 * whether the honest answer is *there is no way* or *the way stops at
 * the quay; north needs water*.
 *
 * ⚠⚠ It admits ways no real traveller could use, so it must NEVER be
 * handed to anything that walks a route: a plan built with it would
 * send a wagon into a river. Its one legitimate caller is the second
 * pass, which throws the plan away and keeps only the first refused
 * leg.
 *
 * ⭐ A class rather than a `TravelProfile.anyMedium()` static, and the
 * reason is worth recording: `lint:lib-statics` has **zero headroom**,
 * and the caller audit the gate asks for comes back with one caller in
 * `platform/idea/api/` and none anywhere an author can reach — so it
 * is not author surface, and the compliant answer is to not add a
 * static rather than to raise a ceiling.
 *
 * @internal
 */
export class OmnivorousTravelProfile extends TravelProfile {
  constructor() {
    super({ mode: 'walk', medium: null, wheeled: false });
  }

  public override admits(_edge: AdmissibleWay): boolean {
    return true;
  }
}
