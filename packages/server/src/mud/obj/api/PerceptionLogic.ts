// PerceptionLogic — the hot-reloadable logic singleton behind
// PerceptionApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Sensor } from '../../lib/message/Sensor';
import type { Organism } from '../../lib/species/Organism';
import { Modality } from '../../lib/perception/Modality';
import type { Signal, Percept } from '../../lib/perception/Modality';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { SpeciesApi } from '../../api/species';
import { TemplatePathPrefixes } from '../../lib/paths';

/** Template-path prefix shared by every modality singleton. */
const MODALITY_PREFIX = TemplatePathPrefixes.perceptionModalities;

const PerceptionApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('api/perception#PerceptionApi'),
  SecurityPolicies.SelfOnly
);

/**
 * Lazily built `Map<modality-name, Modality>`. Built on first access,
 * dropped to `null` by the HMR invalidator. The keys are the modality
 * singletons' own `name` field (`'vision'`, `'smell'`, `'sound'`,
 * `'touch'`, `'taste'`, `'verbal-esp'`, `'emotive-esp'`).
 *
 * A separate `Map<organ-key, Modality>` exists because the sound
 * modality is named `'sound'` but its organ key is `'hearing'`.
 *
 * Module-scope (not instance state): the cache resets with the module on
 * HMR reload, which is exactly the invalidation point.
 */
let modalityByNameCache: Map<string, Modality> | null = null;
let modalityByOrganKeyCache: Map<string, Modality> | null = null;

/**
 * PerceptionLogic — the hot-reloadable logic singleton behind
 * {@link PerceptionApi}.
 *
 * Lives at `/obj/api/perception` (a stateless `Stuff` singleton, no
 * backing `Template`); `PerceptionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`); the modality
 * caches live at module scope. Guts-variant gate
 * (`AnyOf(FromModule, SelfOnly)`): `canPerceive` self-calls
 * `this.sensorium`, and `preloadForSenseGate` self-calls
 * `this.preloadModalities`. The sensorium-walk helpers and cache
 * loaders are module-private free functions (off-class, ungated,
 * un-callable from outside) and resolve modalities through the
 * module-private `resolveByName` / `resolveByOrganKey` free functions
 * rather than the gated methods, so the walk paths make no self-calls.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class PerceptionLogic extends Idea {
  /** See {@link PerceptionApi.modalityByName}. */
  @CallSecurity(PerceptionApiCallers)
  public modalityByName(name: string): Modality {
    return resolveByName(name);
  }

  /** See {@link PerceptionApi.modalityByOrganKey}. */
  @CallSecurity(PerceptionApiCallers)
  public modalityByOrganKey(organKey: string): Modality | null {
    return resolveByOrganKey(organKey);
  }

  /** See {@link PerceptionApi.signalAt}. */
  @CallSecurity(PerceptionApiCallers)
  public signalAt(loc: Stuff & Container, modality: Modality): Signal | null {
    return modality.signalAt(loc);
  }

  /** See {@link PerceptionApi.perceiveAt}. */
  @CallSecurity(PerceptionApiCallers)
  public perceiveAt(
    viewer: Stuff & Sensor,
    loc: Stuff & Container,
    modality: Modality
  ): Percept | null {
    const signal = modality.signalAt(loc);
    if (signal === null) return null;
    return modality.perceiveFor(viewer, loc, signal);
  }

  /** See {@link PerceptionApi.sensorium}. */
  @CallSecurity(PerceptionApiCallers)
  public sensorium(viewer: Stuff): readonly Modality[] {
    const innate = walkInnateModalities(viewer);
    const augmented = walkAugmentedModalities(viewer);
    return dedupe([...innate, ...augmented]);
  }

  /** See {@link PerceptionApi.canPerceive}. */
  @CallSecurity(PerceptionApiCallers)
  public canPerceive(viewer: Stuff, modality: Modality): boolean {
    return this.sensorium(viewer).some((c) => c === modality);
  }

  /** See {@link PerceptionApi.preloadModalities}. */
  @CallSecurity(PerceptionApiCallers)
  public async preloadModalities(): Promise<void> {
    await Promise.all(
      MODALITY_NAMES.map((name) =>
        StuffApi.singleton(`${MODALITY_PREFIX}${name}`).catch(() => null)
      )
    );
    // Drop the lazy cache so the next sync lookup re-reads via
    // `findByPathGlob` and picks up the freshly-cloned singletons.
    invalidateModalityCache();
  }

  /** See {@link PerceptionApi.preloadForSenseGate}. */
  @CallSecurity(PerceptionApiCallers)
  public async preloadForSenseGate(actor: Stuff): Promise<void> {
    await Promise.all([
      SpeciesApi.preloadAnatomy(actor),
      this.preloadModalities(),
    ]);
  }

  /** See {@link PerceptionApi._resetModalityCacheForTest}. */
  @CallSecurity(PerceptionApiCallers)
  public _resetModalityCacheForTest(): void {
    invalidateModalityCache();
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private, off-class, not part of the public surface).
// ---------------------------------------------------------------------------

/**
 * Modality name list — single source of truth for the
 * `preloadModalities` walk. Stays in step with the seed YAMLs
 * under `seeds/lib/perception/modalities/`.
 */
const MODALITY_NAMES: readonly string[] = [
  'vision',
  'smell',
  'sound',
  'touch',
  'taste',
  'verbal-esp',
  'emotive-esp',
];

function loadCaches(): void {
  if (modalityByNameCache !== null && modalityByOrganKeyCache !== null) return;
  // Walk every live Stuff whose templatePath starts with the prefix.
  // `findByPathGlob` returns clones; the bootstrap manifest's
  // `templatePathPrefix` entry guarantees each subclass is cloned at
  // boot. Callers in pre-bootstrap test environments must register
  // singletons explicitly (see `__tests__/test-helpers.ts`).
  const stuffs = StuffApi.findByPathGlob<Modality>(`${MODALITY_PREFIX}*`);
  const byName = new Map<string, Modality>();
  const byOrgan = new Map<string, Modality>();
  for (const stuff of stuffs) {
    if (!(stuff instanceof Modality)) continue;
    const name = stuff.getName();
    const organ = stuff.getModality();
    if (name) byName.set(name, stuff);
    if (organ) byOrgan.set(organ, stuff);
  }
  modalityByNameCache = byName;
  modalityByOrganKeyCache = byOrgan;
}

/**
 * Drop the modality caches. Wired to the HMR event lifecycle (in the
 * facade) so reloading a modality subclass takes effect on next access.
 */
function invalidateModalityCache(): void {
  modalityByNameCache = null;
  modalityByOrganKeyCache = null;
}

/** Cache-backed name resolver (throws on miss). */
function resolveByName(name: string): Modality {
  loadCaches();
  const found = modalityByNameCache!.get(name);
  if (!found) {
    throw new Error(
      `PerceptionApi.modalityByName: no modality '${name}' loaded; ` +
        `check the bootstrap manifest's '${MODALITY_PREFIX}' entry`
    );
  }
  return found;
}

/** Cache-backed organ-key resolver (null on miss). */
function resolveByOrganKey(organKey: string): Modality | null {
  loadCaches();
  return modalityByOrganKeyCache!.get(organKey) ?? null;
}

/**
 * Walk the viewer's BodyPlan and resolve each sensoryPort organ key
 * to its modality singleton. Skips organ keys with no live modality
 * (reserved future-species organs that haven't shipped a modality
 * singleton).
 */
function walkInnateModalities(viewer: Stuff): Modality[] {
  if (!MixinApi.isOrganism(viewer)) return [];
  const organism = viewer as Stuff & Organism;
  const species = organism.getSpecies();
  if (!species) return [];
  const bodyPlan = species.getBodyPlan();
  if (!bodyPlan) return [];
  const organKeys = bodyPlan.getModalities();
  const out: Modality[] = [];
  for (const key of organKeys) {
    const modality = resolveByOrganKey(key);
    if (modality) out.push(modality);
  }
  return out;
}

/**
 * Walk the viewer's active mixin set and collect every
 * `_grantsModalities` declaration via `MixinApi.getActiveMixins` —
 * augment-conferred mixins flow in transparently via the active-mixin
 * set.
 */
function walkAugmentedModalities(viewer: Stuff): Modality[] {
  // Viewers with no active augment-conferring mixins (e.g. test
  // fixtures, or hosts before any augment is installed) get an
  // empty grant set.
  const grants = new Set<string>();
  const addGrants = (
    mixins: ReturnType<typeof MixinApi.getActiveMixins>,
  ): void => {
    for (const mixin of mixins) {
      if (mixin._grantsModalities) {
        for (const name of mixin._grantsModalities) grants.add(name);
      }
    }
  };
  addGrants(MixinApi.getActiveMixins(viewer));
  // Hosted-update modality grants (the single generalization point —
  // the augment-contribution walks include a host's hosted updates
  // alongside its slot occupants). No update grants a modality in v1
  // (comms grants none; attunement does), so this is substrate-only —
  // it proves the symmetry without changing behavior today. `isAether`
  // narrows the viewer to an `AetherHost`, so no cast is needed.
  if (MixinApi.isAether(viewer)) {
    for (const u of viewer.getHostedUpdates()) {
      addGrants(MixinApi.getActiveMixins(u));
    }
  }
  const out: Modality[] = [];
  for (const name of grants) {
    try {
      out.push(resolveByName(name));
    } catch {
      // Unknown modality name — augment declares a modality not in
      // the v1 substrate; silently drop.
    }
  }
  return out;
}

function dedupe(modalities: readonly Modality[]): readonly Modality[] {
  const seen = new Set<Modality>();
  const out: Modality[] = [];
  for (const m of modalities) {
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}
