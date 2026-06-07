/**
 * SpeciesApi — kingdom resolution, lifecycle predicates, animacy.
 *
 * The single dispatch point for "what is this Organism, biologically?"
 * questions: which kingdom does it belong to (`getKingdom`,
 * `isInKingdom`), what lifecycle state is it in (`isAlive`, `isDead`,
 * `isUndead`, `isPowered`, `isDestroyed`), and the composed predicate
 * for command-layer gating (`isAnimate`).
 *
 * `isAnimate` is the load-bearing surface — the verb-level
 * `requires-animate` validator (Item 6) reads it to decide whether a
 * given command-giver is currently capable of acting in the world.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Organism } from '../lib/species/Organism';
import type { Clade, CladeRank } from '../lib/species/Clade';
import type { SenseChannel } from '../lib/description/Perceiver';
import { MixinApi } from './mixin';
import { Template } from '../lib/stuff/Template';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';

interface CladeShape {
  getRank?(): CladeRank;
  getName?(): string;
}

export class SpeciesApi {
  /**
   * Resolve a viewer's perceptible sense channels by walking
   * viewer → Organism → Species → BodyPlan → `getModalities()`.
   * Returns `[]` when any step is null — a non-Organism viewer (a
   * test fixture, a sessile fixture), an Organism without a
   * Species, a Species without a BodyPlan, or a sessile BodyPlan
   * with no sensoryPorts.
   *
   * Lives here (not on a Stuff method) so non-Organism callers —
   * the `senseStripAugmenter` and the four `requires*`
   * verb-level validators — can ask the question without first
   * narrowing the host.
   *
   * The result feeds both the augmenter (`filter ∩ sensorium`
   * gates `<sense channel="X">` regions) and the validators
   * (`includes(channel)` decides whether a single-sense verb is
   * even dispatchable for this giver).
   */
  public static deriveSensorium(viewer: Stuff): SenseChannel[] {
    if (!MixinApi.isOrganism(viewer)) return [];
    const organism = viewer as Stuff & Organism;
    const species = organism.getSpecies();
    if (!species) return [];
    const bodyPlan = species.getBodyPlan();
    if (!bodyPlan) return [];
    return bodyPlan.getModalities();
  }

  /**
   * Walk the species' template-path ancestors and return the first
   * Clade whose `rank === 'kingdom'`. Returns `null` if no kingdom
   * Clade is found in the chain (which means the species template was
   * authored outside the canonical taxonomy, or no Clade at that rank
   * is currently registered as a singleton).
   *
   * Walks the species' templatePath ancestors via
   * `Template.ancestorPaths` and looks each one up via
   * `findByTemplatePath`. Avoids needing a `parentClade` chain on the
   * Clade class itself — kingdom-membership is a property of the
   * template-tree position.
   */
  public static getKingdom(o: Stuff & Organism): Clade | null {
    const species = o.getSpecies();
    if (!species) return null;
    const speciesPath = species.getTemplatePath();
    if (!speciesPath) return null;
    for (const ancestor of Template.ancestorPaths(speciesPath)) {
      const stuff = StuffApi.findByTemplatePath<Stuff>(ancestor);
      if (!stuff) continue;
      // Duck-type: the ancestor at this path is only a Clade if the
      // singleton at that path actually carries `getRank()`. Avoids
      // an `instanceof` import cycle.
      const candidate = stuff as unknown as CladeShape;
      if (typeof candidate.getRank !== 'function') continue;
      if (candidate.getRank() === 'kingdom') return stuff as unknown as Clade;
    }
    return null;
  }

  public static isInKingdom(
    o: Stuff & Organism,
    kingdomName: string
  ): boolean {
    const k = SpeciesApi.getKingdom(o);
    if (!k) return false;
    return k.getName() === kingdomName;
  }

  /** Lifecycle predicates — read the Organism's `lifecycleState`. */

  public static isAlive(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'alive';
  }

  public static isDead(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'dead';
  }

  public static isUndead(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'undead';
  }

  public static isPowered(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'powered';
  }

  public static isDestroyed(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'destroyed';
  }

  /**
   * Resolve the body-plan template path for a Stuff. Walks
   * `host → OrganismMixin.getSpecies() → Species._bodyPlanPath`.
   * Returns null when the host isn't an Organism, has no species,
   * or the species has no body plan reference.
   *
   * Used by `Wearable.fitsSlot` / `Wieldable.fitsSlot` to look up the
   * per-body-plan claim on the candidate.
   */
  public static tryGetBodyPlanPath(host: Stuff): string | null {
    if (!MixinApi.isOrganism(host)) return null;
    const species = (host as Stuff & Organism).getSpecies();
    if (!species) return null;
    return species.getBodyPlanPath();
  }

  /**
   * Animate iff the Organism's kingdom + lifecycle state combine to
   * "currently capable of acting in the world." Slate's table:
   *
   * | Kingdom    | Animate when                           |
   * |------------|----------------------------------------|
   * | Animalia   | lifecycleState ∈ {alive, undead}       |
   * | Constructa | lifecycleState === 'powered'           |
   * | Plantae    | never (no Agent surface in v1)         |
   * | Fungi      | never (no Agent surface in v1)         |
   *
   * Non-Organism Stuff is never animate. Used by the verb-level
   * `requires-animate` validator (Item 6).
   */
  public static isAnimate(o: Stuff): boolean {
    if (!MixinApi.isOrganism(o)) return false;
    const kingdom = SpeciesApi.getKingdom(o);
    if (!kingdom) return false;
    const name = kingdom.getName();
    const state = o.getLifecycleState();
    if (name === 'Animalia') return state === 'alive' || state === 'undead';
    if (name === 'Constructa') return state === 'powered';
    return false;
  }
}

SecurityApi.decorateApiClass(SpeciesApi);
