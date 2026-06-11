/**
 * SpeciesPresenter — turns a `Species` into the display data the char-gen
 * race picker shows: its dossier (the "how deeply is this modeled"
 * showcase) and its illustration key. This is the **presentation layer**
 * for species choices, lifted out of `EnrollController` so the controller
 * stays about draft state (read the choices, write the picks) and not
 * about how a species is rendered.
 *
 * Derivation needs the async-materialized `Species` / `BodyPlan` /
 * `Material` singletons, which the sync option builder can't await — so
 * the presenter pre-warms (`ensure`) once and serves cards from a cache
 * (`cardFor`). Idempotent; `reset` clears it on a config reload.
 */

import { StuffApi } from '../../../api/stuff';
import type Species from '../../../lib/species/Species';
import type BodyPlan from '../../../lib/species/BodyPlan';
import type Material from '../../../lib/material/Material';
import type { VisionProfile } from '../../../lib/perception/Light';
import type { DossierSection, SpeciesDossier } from '@saxonberg/types';

/** The char-gen-facing presentation of a species: dossier + illustration. */
export interface SpeciesCard {
  dossier?: SpeciesDossier;
  illustration?: string;
}

export class SpeciesPresenter {
  static #cards: Map<string, SpeciesCard> | null = null;

  /**
   * Resolve each rostered species (+ its BodyPlan / Material) once and
   * cache its card. Idempotent. Tolerant of unresolved refs — a missing
   * BodyPlan / Material just drops that dossier section.
   */
  static async ensure(speciesPaths: string[]): Promise<void> {
    if (SpeciesPresenter.#cards) return;
    const cards = new Map<string, SpeciesCard>();
    for (const path of speciesPaths) {
      try {
        const species = await StuffApi.singleton<Species>(path);
        if (!species) continue;
        const bpPath = species.getBodyPlanPath();
        const bodyPlan = bpPath
          ? await StuffApi.singleton<BodyPlan>(bpPath)
          : null;
        const matPath = species.getDefaultMaterialPath();
        const material = matPath
          ? await StuffApi.singleton<Material>(matPath)
          : null;
        cards.set(path, {
          dossier: buildDossier(species, bodyPlan, material, path),
          illustration: species.getIllustration() ?? undefined,
        });
      } catch {
        /* unresolved species → no card (graceful) */
      }
    }
    SpeciesPresenter.#cards = cards;
  }

  /** The cached card for a species path, if pre-warmed. */
  static cardFor(path: string): SpeciesCard | undefined {
    return SpeciesPresenter.#cards?.get(path);
  }

  /** Drop the cache (on a config reload). */
  static reset(): void {
    SpeciesPresenter.#cards = null;
  }
}

// --- dossier derivation (was inline in EnrollController) -------------------

/**
 * Build the species dossier — the char-gen showcase of how deeply the
 * species is modeled. Every section/row is real data pulled from the
 * `Species` template and its resolved `BodyPlan` / `Material` / clade
 * chain; nothing is fabricated, and a section is omitted entirely when
 * its data isn't authored (e.g. no resolvable BodyPlan → no Anatomy).
 */
function buildDossier(
  species: Species,
  bodyPlan: BodyPlan | null,
  material: Material | null,
  speciesPath: string,
): SpeciesDossier {
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

/** Standard Linnaean major ranks, in path-segment order. */
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
