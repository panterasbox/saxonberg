// SpeciesLogic — the hot-reloadable logic singleton behind SpeciesApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Organism } from '../../lib/species/Organism';
import type Clade from '../../lib/species/Clade';
import type { CladeRank } from '../../lib/species/Clade';
import type Species from '../../lib/species/Species';
import type BodyPlan from '../../lib/species/BodyPlan';
import type Material from '../../lib/material/Material';
import type { VisionProfile } from '../../lib/perception/Light';
import type { DossierSection, SpeciesDossier } from '@saxonberg/types';
import { MixinApi } from '../../api/mixin';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import { TemplatePathPrefixes } from '../../lib/paths';

interface CladeShape {
  getRank?(): CladeRank;
  getName?(): string;
}

const SpeciesApiCallers = SecurityPolicies.FromModule('/api/species#SpeciesApi'
);

/**
 * SpeciesLogic — the hot-reloadable logic singleton behind
 * {@link SpeciesApi}.
 *
 * Lives at `/obj/api/species` (a stateless `Stuff` singleton, no
 * backing `Template`); `SpeciesApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). The kingdom
 * resolution shared by `getKingdom`, `isInKingdom`, and `isAnimate`
 * lives in the module-private `resolveKingdom` free function (off-class,
 * ungated, un-callable from outside), so the predicates don't make
 * intra-singleton `this.getKingdom()` self-calls that the gate would
 * deny. The dossier-derivation helpers stay module-private too.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level — see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class SpeciesLogic extends ApiLogic {
  /** See {@link SpeciesApi.getKingdom}. */
  @CallSecurity(SpeciesApiCallers)
  public getKingdom(o: Stuff & Organism): Clade | null {
    return resolveKingdom(o);
  }

  /** See {@link SpeciesApi.isInKingdom}. */
  @CallSecurity(SpeciesApiCallers)
  public isInKingdom(o: Stuff & Organism, kingdomName: string): boolean {
    const k = resolveKingdom(o);
    if (!k) return false;
    return k.getName() === kingdomName;
  }

  /** See {@link SpeciesApi.isAlive}. */
  @CallSecurity(SpeciesApiCallers)
  public isAlive(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'alive';
  }

  /** See {@link SpeciesApi.isDead}. */
  @CallSecurity(SpeciesApiCallers)
  public isDead(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'dead';
  }

  /** See {@link SpeciesApi.isUndead}. */
  @CallSecurity(SpeciesApiCallers)
  public isUndead(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'undead';
  }

  /** See {@link SpeciesApi.isPowered}. */
  @CallSecurity(SpeciesApiCallers)
  public isPowered(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'powered';
  }

  /**
   * See {@link SpeciesApi.isDestroyed}. Named `isDestroyedState` on the
   * logic to avoid colliding with the inherited `Stuff.isDestroyed()`
   * lifecycle method (the Api facade keeps the public `isDestroyed`
   * name); this checks the *Organism* lifecycleState, not whether the
   * logic singleton itself was destroyed.
   */
  @CallSecurity(SpeciesApiCallers)
  public isDestroyedState(o: Stuff & Organism): boolean {
    return o.getLifecycleState() === 'destroyed';
  }

  /** See {@link SpeciesApi.tryGetBodyPlanPath}. */
  @CallSecurity(SpeciesApiCallers)
  public tryGetBodyPlanPath(host: Stuff): string | null {
    if (!MixinApi.isOrganism(host)) return null;
    const species = (host as Stuff & Organism).getSpecies();
    if (!species) return null;
    return species.getBodyPlanPath();
  }

  /** See {@link SpeciesApi.isAnimate}. */
  @CallSecurity(SpeciesApiCallers)
  public isAnimate(o: Stuff): boolean {
    if (!MixinApi.isOrganism(o)) return false;
    const kingdom = resolveKingdom(o);
    if (!kingdom) return false;
    const name = kingdom.getName();
    const state = o.getLifecycleState();
    if (name === 'Animalia') return state === 'alive' || state === 'undead';
    if (name === 'Constructa') return state === 'powered';
    return false;
  }

  /** See {@link SpeciesApi.isSentient}. */
  @CallSecurity(SpeciesApiCallers)
  public isSentient(o: Stuff): boolean {
    if (!MixinApi.isOrganism(o)) return false;
    const species = (o as Stuff & Organism).getSpecies();
    if (!species) return false;
    return species.isSentient();
  }

  /** See {@link SpeciesApi.preloadAnatomy}. */
  @CallSecurity(SpeciesApiCallers)
  public async preloadAnatomy(actor: Stuff): Promise<void> {
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

  /** See {@link SpeciesApi.buildDossier}. */
  @CallSecurity(SpeciesApiCallers)
  public async buildDossier(
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

/**
 * Walk the species' template-path ancestors and return the first Clade
 * whose `rank === 'kingdom'`. Returns `null` if no kingdom Clade is
 * found in the chain. Module-private — shared by `getKingdom`,
 * `isInKingdom`, and `isAnimate` so there are no intra-singleton
 * self-calls.
 */
function resolveKingdom(o: Stuff & Organism): Clade | null {
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

// --- dossier derivation helpers -------------------------------------------

const LINNAEAN_RANKS = ['Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus'];

/** Map a species template path's clade segments onto Linnaean ranks. */
function buildClassificationRows(speciesPath: string): DossierSection['rows'] {
  if (!speciesPath.startsWith(TemplatePathPrefixes.species)) return [];
  const segments = speciesPath.slice(TemplatePathPrefixes.species.length).split('/');
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
