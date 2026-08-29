// ArchetypeLogic — the HMR-able logic singleton behind ArchetypeApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { Archetype, type CapabilityNeed, type CapabilitySlot } from '../../../lib/archetype/Archetype';
import type ArchetypeCatalogue from '../ArchetypeCatalogue';
import type RecipeCatalogue from '../RecipeCatalogue';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import type { Container } from '../../../lib/spatial/Container';

const ArchetypeApiCallers = SecurityPolicies.FromModule('/api/archetype#ArchetypeApi');

const CATALOGUE_PATH = '/platform/idea/ArchetypeCatalogue';
const RECIPES_PATH = '/platform/idea/RecipeCatalogue';
/** The platform's bare venue row `materialize` clones. */
const VENUE_PATH = '/platform/location/venue';

/**
 * One row of the EFFECTIVE floor: an authored slot, a derived one, or an
 * authored slot that a recipe also derives (then `derivedFrom` names the
 * recipes and `default` is the authored binding).
 */
export interface EffectiveRow {
  key: string;
  needs: CapabilityNeed;
  default: string | null;
  /** Recipe ids that derive this need; empty for pure residue. */
  derivedFrom: string[];
}

export interface ArchetypeDescription {
  archetypeId: string;
  label: string;
  industry: string;
  rows: EffectiveRow[];
}

export interface ChecklistRow extends EffectiveRow {
  satisfied: boolean;
  /** What in the venue satisfies it (presentation), when anything does. */
  by: string | null;
}

function catalogue(): ArchetypeCatalogue | null {
  return StuffApi.findByTemplatePath<ArchetypeCatalogue>(CATALOGUE_PATH) ?? null;
}

function recipes(): RecipeCatalogue | null {
  return StuffApi.findByTemplatePath<RecipeCatalogue>(RECIPES_PATH) ?? null;
}

function describeImpl(archetypeId: string): ArchetypeDescription | null {
  const a = catalogue()?.getArchetype(archetypeId) ?? null;
  if (!a) return null;
  return {
    archetypeId: a.getArchetypeId(),
    label: a.getLabel(),
    industry: a.getIndustry(),
    rows: effectiveRows(a),
  };
}

/**
 * The effective floor: the residue plus every tool capability and heat
 * requirement across the industry's recipes. A derived need that an
 * authored slot already states merges into that slot (keeping its key +
 * default); a need no slot states becomes a row of its own with no
 * default — the archetype's completeness check is exactly the list of
 * those rows.
 */
function effectiveRows(a: Archetype): EffectiveRow[] {
  const rows = new Map<string, EffectiveRow>();
  const order: string[] = [];
  for (const slot of a.getCapabilities()) {
    const k = Archetype.needKey(slot.needs);
    rows.set(k, { key: slot.key, needs: slot.needs, default: slot.default, derivedFrom: [] });
    order.push(k);
  }
  const add = (need: CapabilityNeed, recipeId: string): void => {
    const k = Archetype.needKey(need);
    const existing = rows.get(k);
    if (existing) {
      if ('heatK' in need && 'heatK' in existing.needs && need.heatK > existing.needs.heatK) {
        existing.needs = { heatK: need.heatK };
      }
      if (!existing.derivedFrom.includes(recipeId)) existing.derivedFrom.push(recipeId);
      return;
    }
    rows.set(k, { key: k, needs: need, default: null, derivedFrom: [recipeId] });
    order.push(k);
  };
  for (const r of recipes()?.allRecipes() ?? []) {
    if (r.getDiscipline() !== a.getIndustry()) continue;
    for (const cap of r.getToolCapabilities()) add({ tool: cap }, r.getRecipeId());
    const heat = r.getRequiresHeatK();
    if (heat > 0) add({ heatK: heat }, r.getRecipeId());
  }
  return order.map((k) => rows.get(k)!);
}

/** The venue's contents, one level down plus open containers (the gather walk's reach). */
function occupantsOf(venue: Stuff & Container): Stuff[] {
  const out: Stuff[] = [];
  for (const occ of venue.getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed()) continue;
    out.push(s);
    if (MixinApi.isContainer(s) && (!MixinApi.isSealable(s) || s.isOpen())) {
      for (const inner of s.getContents()) {
        const i = inner as unknown as Stuff;
        if (!i.isDestroyed()) out.push(i);
      }
    }
  }
  return out;
}

function materialMatches(s: Stuff & { getBulkMaterialPath(a: 'interior'): string | null; getBulkMaterial(a: 'interior'): { getTags(): readonly string[]; getPrimaryKeyword(): string | undefined; getName(): string } | null }, want: string): boolean {
  const path = s.getBulkMaterialPath('interior');
  if (path === want) return true;
  const m = s.getBulkMaterial('interior');
  if (!m) return false;
  const w = want.toLowerCase();
  return (
    m.getTags().some((t) => t.toLowerCase() === w) ||
    m.getPrimaryKeyword()?.toLowerCase() === w ||
    m.getName().toLowerCase() === w
  );
}

/**
 * A space at or below this is cold storage in its own right — a cellar,
 * a walk-in. 288 K ≈ 15 °C: cool enough that kegs, cases and wine keep.
 */
const COLD_STORAGE_MAX_K = 288;

/**
 * What satisfies `need` — an occupant, or (for `coldStorage`) the VENUE
 * ITSELF. Cold storage is a property of a SPACE, not a kind of
 * appliance: a cellar is cool because it is underground, a walk-in
 * because a chiller holds it there, and anything carried into either
 * drifts to that temperature through the shipped thermal resolver
 * (`ThermalMixin.restamp` → `BiomeApi.resolveTemperatureFor`). An
 * insulated holder still counts — a box of ice is cold storage too.
 *
 * The venue's temperature is read from its own authored override rather
 * than resolved outward, because the checklist is synchronous and
 * *reported, never enforced*: a room that is cold only because its
 * biome is cold is not a claim this venue gets to make.
 */
function satisfiedBy(
  need: CapabilityNeed,
  occupants: Stuff[],
  venue: Stuff,
): Stuff | null {
  if ('tool' in need) {
    return occupants.find((s) => MixinApi.isTool(s) && s.hasCapability(need.tool)) ?? null;
  }
  if ('heatK' in need) {
    // A capability, not a state: a furnace that CAN hold the heat
    // counts, lit or not.
    return occupants.find((s) => MixinApi.isFurnace(s) && s.getHeldTemperatureK() >= need.heatK) ?? null;
  }
  if ('bulkSource' in need) {
    return (
      occupants.find((s) => {
        if (!MixinApi.isBulkable(s)) return false;
        if (!materialMatches(s as never, need.bulkSource)) return false;
        return MixinApi.hasMixin(s, 'UnboundedSourceMixin') || !s.isBulkEmpty('interior');
      }) ?? null
    );
  }
  if ('surface' in need) {
    return occupants.find((s) => MixinApi.isSurfaced(s)) ?? null;
  }
  if ('seating' in need) {
    const seats = occupants.filter((s) => MixinApi.isPostured(s));
    return seats.length >= need.seating ? seats[0]! : null;
  }
  const holder = occupants.find(
    (s) => MixinApi.isThermal(s) && MixinApi.isSealable(s),
  );
  if (holder) return holder;
  if (MixinApi.isAtmospheric(venue)) {
    const t = venue._temperature;
    if (t !== null && t.rawValue() <= COLD_STORAGE_MAX_K) return venue;
  }
  return null;
}

function checklistImpl(archetypeId: string, venue: Stuff): ChecklistRow[] | null {
  const desc = describeImpl(archetypeId);
  if (!desc) return null;
  const occupants = MixinApi.isContainer(venue) ? occupantsOf(venue) : [];
  return desc.rows.map((row) => {
    const by = satisfiedBy(row.needs, occupants, venue);
    return { ...row, satisfied: by !== null, by: by ? by.getPresentation() : null };
  });
}

/**
 * The derived venue (A13.5): a bare venue room plus each authored slot's
 * default binding cloned into it. Slots with no default are the
 * archetype's own honesty — a checklist over the result names them.
 */
async function materializeImpl(archetypeId: string): Promise<Stuff & Container> {
  const a = catalogue()?.getArchetype(archetypeId) ?? null;
  if (!a) throw new Error(`ArchetypeApi.materialize: no archetype '${archetypeId}'`);
  const venue = (await StuffApi.clone(VENUE_PATH)) as Stuff & Container;
  for (const slot of a.getCapabilities()) {
    if (!slot.default) continue;
    const item = await StuffApi.clone(slot.default);
    if (MixinApi.isContainable(item) && item.getContainer() !== venue) {
      ContainmentApi.move(item as never, venue as never);
    }
  }
  return venue;
}

/**
 * The stateless logic singleton behind ArchetypeApi: describe (the
 * effective floor), checklist (what a venue satisfies — reported, never
 * enforced) and materialize (the derived test venue).
 * @internal
 */
export class ArchetypeLogic extends ApiLogic {
  /** See {@link ArchetypeApi.describe}. */
  @CallSecurity(ArchetypeApiCallers)
  public describe(archetypeId: string): ArchetypeDescription | null {
    return describeImpl(archetypeId);
  }

  /** See {@link ArchetypeApi.checklist}. */
  @CallSecurity(ArchetypeApiCallers)
  public checklist(archetypeId: string, venue: Stuff): ChecklistRow[] | null {
    return checklistImpl(archetypeId, venue);
  }

  /** See {@link ArchetypeApi.materialize}. */
  @CallSecurity(ArchetypeApiCallers)
  public materialize(archetypeId: string): Promise<Stuff & Container> {
    return materializeImpl(archetypeId);
  }

  /** See {@link ArchetypeApi.all}. */
  @CallSecurity(ArchetypeApiCallers)
  public all(): readonly Archetype[] {
    return catalogue()?.allArchetypes() ?? [];
  }
}

export type { CapabilitySlot };
