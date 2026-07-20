/**
 * SpeciesApi — kingdom resolution, animacy, anatomy orchestration.
 *
 * The dispatch point for "what is this Organism, biologically?"
 * questions that need cross-object resolution: which kingdom does it
 * belong to (`getKingdom`, a taxonomy walk), and the composed predicate
 * for command-layer gating (`isAnimate`). Plain lifecycle-state reads
 * live on the organism itself (`OrganismMixin.isAlive()` etc.), not
 * here.
 *
 * `isAnimate` is the load-bearing surface — the verb-level
 * `requires-animate` validator (Item 6) reads it to decide whether a
 * given command-giver is currently capable of acting in the world.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link SpeciesLogic} singleton at `/obj/api/species`,
 * reached synchronously via `StuffApi.singletonSync`.
 * `dest /obj/api/species` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Organism } from '../lib/species/Organism';
import type Clade from '../lib/species/Clade';
import type Species from '../lib/species/Species';
import type { SpeciesDossier } from '@saxonberg/types';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SpeciesLogic } from '../obj/api/SpeciesLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/species';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/SpeciesLogic', import.meta.url)
);

/** Resolve the HMR-able SpeciesLogic singleton (sync). */
function logic(): SpeciesLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SpeciesLogic'
      ) as typeof SpeciesLogic | null) ?? SpeciesLogic)()
  );
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
    return logic().getKingdom(o);
  }

  /* The former lifecycle predicates (`isAlive`/`isDead`/`isUndead`/
   * `isPowered`/`isDestroyed`) and `isInKingdom` were thin restatements
   * of the organism's own state — they now live where they belong: the
   * organism answers for itself (`OrganismMixin.isAlive()` etc.; compare
   * `getLifecycleState()` for the `destroyed` reading). */

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
    return logic().tryGetBodyPlanPath(host);
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
    return logic().isAnimate(o);
  }

  /**
   * Sentient iff the Organism's species declares itself a self-aware
   * moral person (`Species.isSentient`) — a beast is animate but not
   * sentient; a rock is neither. Orthogonal to {@link isAnimate}.
   *
   * The load-bearing consumer is combat's three-case severity keying:
   * killing a non-sentient target is a cull (the winning blow finishes
   * it, no consent/blame), while a sentient target is only *defeated* by
   * it — death is the separate, interruptible coup, and the attack
   * carries consent + blame. Non-Organism Stuff is never sentient.
   */
  public static isSentient(o: Stuff): boolean {
    return logic().isSentient(o);
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
    return logic().preloadAnatomy(actor);
  }

  /**
   * Build a species dossier — a structured readout of the species' modeled
   * facts (taxonomy, biology, anatomy, composition), resolving its own
   * BodyPlan + Material. Every section/row is real data pulled from the
   * `Species` template and its resolved refs / clade chain; nothing is
   * fabricated, and a section is omitted when its data isn't authored
   * (e.g. no resolvable BodyPlan → no Anatomy). The char-gen race picker
   * is the v1 consumer, but this is a species-model readout, not picker
   * logic.
   */
  public static async buildDossier(
    species: Species,
    speciesPath: string,
  ): Promise<SpeciesDossier> {
    return logic().buildDossier(species, speciesPath);
  }
}
