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
import type Clade from '../lib/species/Clade';
import type { CladeRank } from '../lib/species/Clade';
import type Species from '../lib/species/Species';
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

  /**
   * Ensure the actor's species + every clade ancestor + the body
   * plan are live runtime singletons. v1's `Species` / `Clade` /
   * `BodyPlan` templates are NOT bootstrapped — they lazy-load on
   * first access via `findByTemplatePath`. Callers that need a
   * synchronous walk of `getSpecies()` / `getBodyPlan()` / kingdom
   * resolution preload via this helper first.
   *
   * No-op for non-Organism actors and for Organisms with no
   * `_speciesPath` — the sync downstream surfaces handle those
   * cases (`getSpecies()` returns null; `sensorium` returns []).
   *
   * Consumers today: `requiresAnimate` (kingdom walk),
   * `requires<Sense>` / `requires<ESP>` (sensorium walk),
   * `LocomotionApi.preloadActorAnatomy` (body-plan locomotion gate),
   * `Avatar.installDefaultLoadout` (BodyPlanSlots cranial slot
   * resolution).
   */
  public static async preloadAnatomy(actor: Stuff): Promise<void> {
    if (!MixinApi.isOrganism(actor)) return;
    const speciesPath = (actor as unknown as { _speciesPath: string | null })
      ._speciesPath;
    if (!speciesPath) return;
    // Tolerant ensure: ancestor path segments without a seeded
    // template (e.g. `/lib/species/animalia/chordata/mammalia` —
    // folders without a Clade record) throw `singleton`; we
    // continue so the kingdom walk's `findByTemplatePath`-null
    // branch can surface the gap downstream when needed.
    const ensure = async (path: string): Promise<void> => {
      try {
        await StuffApi.singleton(path);
      } catch {
        /* missing ancestor — skip */
      }
    };
    await ensure(speciesPath);
    await Promise.all(Template.ancestorPaths(speciesPath).map(ensure));

    const species = StuffApi.findByTemplatePath<Species>(speciesPath);
    if (!species) return;
    const bodyPlanPath = species.getBodyPlanPath();
    if (bodyPlanPath) await ensure(bodyPlanPath);
  }
}

SecurityApi.decorateApiClass(SpeciesApi);
