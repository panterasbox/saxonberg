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
import type BodyPlan from '../lib/species/BodyPlan';
import type Material from '../lib/material/Material';
import type { VisionProfile } from '../lib/perception/Light';
import type { DossierSection, SpeciesDossier } from '@saxonberg/types';
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
    const bpPath = species.getBodyPlanPath();
    const bodyPlan = bpPath ? await StuffApi.singleton<BodyPlan>(bpPath) : null;
    const matPath = species.getDefaultMaterialPath();
    const material = matPath
      ? await StuffApi.singleton<Material>(matPath)
      : null;
    const sections: DossierSection[] = [];

    // Classification — the Linnaean ladder. The species template path IS
    // the taxonomy (/lib/species/animalia/chordata/.../homo/<epithet>),
    // so the ancestor-clade segments map onto the standard major ranks.
    const classRows = buildClassificationRows(speciesPath);
    if (classRows.length) {
      sections.push({ heading: 'Classification', rows: classRows });
    }

    // Biology.
    const bio: DossierSection['rows'] = [];
    const lifespan = species.getLifespanMax();
    if (lifespan > 0) bio.push({ label: 'Lifespan', value: `~${lifespan} years` });
    const circadian = species.getCircadianBand();
    if (circadian) bio.push({ label: 'Active', value: circadian });
    const diet = species.getDiet();
    if (diet) bio.push({ label: 'Diet', value: diet });
    const vision = species.getVisionProfile();
    if (vision) bio.push({ label: 'Vision', value: describeVision(vision) });
    const olfactory = species.getOlfactoryProfile();
    if (olfactory) bio.push({ label: 'Smell', value: `${olfactory.acuity} acuity` });
    const sex = species.getSexDeterminationSystem();
    const repro = species.getReproductiveMode();
    const sexParts = [sex ? sex.toUpperCase() : null, repro].filter(Boolean);
    if (sexParts.length) bio.push({ label: 'Sex', value: sexParts.join(' · ') });
    if (bio.length) sections.push({ heading: 'Biology', rows: bio });

    // Anatomy — from the resolved BodyPlan.
    if (bodyPlan) {
      const anat: DossierSection['rows'] = [
        { label: 'Body plan', value: cap(bodyPlan.getName()) },
      ];
      const ports = bodyPlan.getSensoryPorts();
      if (ports.length) {
        anat.push({
          label: 'Senses',
          value: ports
            .map((p) => `${p.count} ${organNoun(p.modality, p.count)} (${p.position})`)
            .join(' · '),
        });
      }
      const moves = bodyPlan.getLocomotionModes();
      if (moves.length) anat.push({ label: 'Locomotion', value: moves.join(' · ') });
      const slots = bodyPlan.getSlots();
      if (slots.length) {
        anat.push({ label: 'Articulation', value: `${slots.length} equip slots` });
      }
      sections.push({ heading: 'Anatomy', rows: anat });
    }

    // Composition — from the default Material.
    if (material) {
      const comp: DossierSection['rows'] = [
        { label: 'Tissue', value: material.getName() },
      ];
      try {
        const density = Math.round(material.getDensity().rawValue());
        comp.push({ label: 'Density', value: `${density} kg/m³` });
      } catch {
        /* density unset — skip */
      }
      comp.push({ label: 'Edible', value: material.getEdibility() ? 'yes' : 'no' });
      sections.push({ heading: 'Composition', rows: comp });
    }

    return { binomial: species.getBinomial(), sections };
  }
}

// --- dossier derivation helpers -------------------------------------------

const LINNAEAN_RANKS = ['Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus'];
const SPECIES_PATH_PREFIX = '/lib/species/';

/** Map a species template path's clade segments onto Linnaean ranks. */
function buildClassificationRows(speciesPath: string): DossierSection['rows'] {
  if (!speciesPath.startsWith(SPECIES_PATH_PREFIX)) return [];
  const segments = speciesPath.slice(SPECIES_PATH_PREFIX.length).split('/');
  // Drop the species epithet (leaf); the rest are ancestor clades.
  const clades = segments.slice(0, -1);
  return clades.map((taxon, i) => ({
    label: LINNAEAN_RANKS[i] ?? 'Clade',
    value: cap(taxon),
  }));
}

/** Human phrasing of a VisionProfile's adaptation + perceivable range. */
function describeVision(v: VisionProfile): string {
  const adapt =
    v.bandShift < 0 ? 'dark-adapted' : v.bandShift > 0 ? 'light-loving' : 'baseline';
  return `${adapt} (${v.scotopicMin}–${v.photopicMax})`;
}

const ORGAN_NOUNS: Record<string, [string, string]> = {
  vision: ['eye', 'eyes'],
  hearing: ['ear', 'ears'],
  smell: ['nose', 'noses'],
  taste: ['palate', 'palates'],
  touch: ['receptor', 'receptors'],
};

function organNoun(modality: string, count: number): string {
  const pair = ORGAN_NOUNS[modality];
  if (!pair) return modality;
  return count === 1 ? pair[0] : pair[1];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

SecurityApi.decorateApiClass(SpeciesApi);
