/**
 * Archetype — the authored residue of a venue archetype (content-packs
 * A13/A14; libations D11): what a venue of an industry needs, stated in
 * **capabilities the kernel already checks**, never furniture. Each
 * capability slot carries a **default binding** (a template path) so the
 * scaffold and the derived test venue can materialize it, while the
 * checker checks only the capability — the volcano-vent smithy satisfies
 * the contract without an exemption.
 *
 * Most of the floor is DERIVED on read from the industry's recipes
 * ({@link Archetype.describe}); this document is only what mechanics
 * cannot express. **Nothing at runtime gates on it**: a bar with no ice
 * bin is a legal, visible state (D11 — "no runtime enforcement").
 *
 * ⭐ **There is no `ArchetypeApi`.** An archetype describes and
 * materializes itself. The first cut shipped a four-method
 * `ArchetypeApi` + `ArchetypeLogic` pair whose every caller was a test —
 * the two production paths that touch archetypes (the pack installer's
 * validator, and the go-live re-warm) reach {@link Archetype.fromData}
 * and the catalogue directly, and always did. An Api exists to
 * ORCHESTRATE; this was a façade over a value-object and a catalogue
 * that were already the natural homes.
 *
 * The one concept this module defines — the value-object, its validation
 * and its two derived reads. Installed as the `archetype` document kind
 * (`content/archetypes/<id>.yaml`, natural key `archetypeId`); the
 * runtime index is `ArchetypeCatalogue`.
 */

import type { StoredDocument } from '../document/StoredDocument';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type RecipeCatalogue from '../../platform/idea/RecipeCatalogue';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';

const RECIPES_PATH = '/platform/idea/RecipeCatalogue';
/** The platform's bare venue row {@link Archetype.materialize} clones. */
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

/**
 * What a capability slot needs — one predicate the kernel can evaluate
 * over a venue's contents:
 *
 * - `tool` — a `Tooled` fixture affording the capability (`tap`, `still`).
 * - `heatK` — a furnace whose held temperature reaches `n` K.
 * - `bulkSource` — a bulk holder of the material (a tag, keyword or
 *   path): an unbounded source (a tap) or a stocked holder.
 * - `surface` — a `Surfaced` work surface.
 * - `seating` — at least `n` posture-bearing fixtures.
 * - `coldStorage` — somewhere cold: the VENUE itself when it is cool
 *   (a cellar, a walk-in — cold storage is a property of a SPACE), or an
 *   insulated, sealable holder in it (`Thermal` + `Sealable`).
 */
export type CapabilityNeed =
  | { tool: string }
  | { heatK: number }
  | { bulkSource: string }
  | { surface: true }
  | { seating: number }
  | { coldStorage: true };

export interface CapabilitySlot {
  /** The slot's name in the archetype (`water`, `dispensing`, `cold`). */
  key: string;
  needs: CapabilityNeed;
  /** The template path the scaffold materializes for this slot. */
  default: string | null;
}

export interface ArchetypeData {
  archetypeId: string;
  label: string;
  /** The `Recipe.discipline` whose recipes derive the rest of the floor. */
  industry: string;
  capabilities: CapabilitySlot[];
}

const NEED_KEYS = ['tool', 'heatK', 'bulkSource', 'surface', 'seating', 'coldStorage'] as const;

function fail(archetypeId: string, msg: string): never {
  throw new Error(`archetype '${archetypeId}': ${msg}`);
}

function needOf(archetypeId: string, key: string, raw: unknown): CapabilityNeed {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail(archetypeId, `capability '${key}' needs an object under \`needs\``);
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length !== 1) {
    fail(archetypeId, `capability '${key}' must state exactly ONE need (${NEED_KEYS.join(' | ')})`);
  }
  const [k, v] = entries[0]!;
  switch (k) {
    case 'tool':
    case 'bulkSource':
      if (typeof v !== 'string' || v.length === 0) fail(archetypeId, `capability '${key}': \`${k}\` must be a non-empty string`);
      return { [k]: v } as CapabilityNeed;
    case 'heatK':
    case 'seating':
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) fail(archetypeId, `capability '${key}': \`${k}\` must be a positive number`);
      return { [k]: v } as CapabilityNeed;
    case 'surface':
    case 'coldStorage':
      if (v !== true) fail(archetypeId, `capability '${key}': \`${k}\` must be \`true\``);
      return { [k]: true } as CapabilityNeed;
    default:
      return fail(archetypeId, `capability '${key}': unknown need '${k}' (${NEED_KEYS.join(' | ')})`);
  }
}

export class Archetype {
  private constructor(private readonly data: ArchetypeData) {}

  static fromDocument(doc: StoredDocument): Archetype {
    return Archetype.fromData(doc.getData());
  }

  /** The same validation over a bare `data` object (the pack reader's use). */
  static fromData(data: Record<string, unknown>): Archetype {
    const id = data.archetypeId;
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error("archetype: 'archetypeId' must be a non-empty string");
    }
    const label = typeof data.label === 'string' && data.label.length > 0 ? data.label : id;
    const industry = data.industry;
    if (typeof industry !== 'string' || industry.length === 0) {
      fail(id, "'industry' must name the discipline whose recipes derive the floor");
    }
    const rawCaps = data.capabilities ?? [];
    if (!Array.isArray(rawCaps)) fail(id, "'capabilities' must be a list");
    const seen = new Set<string>();
    const capabilities: CapabilitySlot[] = rawCaps.map((raw, i) => {
      if (!raw || typeof raw !== 'object') fail(id, `capabilities[${i}] must be an object`);
      const c = raw as Record<string, unknown>;
      const key = c.key;
      if (typeof key !== 'string' || key.length === 0) fail(id, `capabilities[${i}] needs a 'key'`);
      if (seen.has(key)) fail(id, `capability '${key}' is declared twice`);
      seen.add(key);
      const dflt = c.default;
      if (dflt !== undefined && dflt !== null && (typeof dflt !== 'string' || !dflt.startsWith('/'))) {
        fail(id, `capability '${key}': 'default' must be a template path`);
      }
      return { key, needs: needOf(id, key, c.needs), default: typeof dflt === 'string' ? dflt : null };
    });
    return new Archetype({ archetypeId: id, label, industry, capabilities });
  }

  getArchetypeId(): string { return this.data.archetypeId; }
  getLabel(): string { return this.data.label; }
  getIndustry(): string { return this.data.industry; }
  getCapabilities(): readonly CapabilitySlot[] { return this.data.capabilities; }

  /** A stable identity for a need, so a derived row merges with an authored one. */
  static needKey(need: CapabilityNeed): string {
    if ('tool' in need) return `tool:${need.tool}`;
    if ('heatK' in need) return 'heatK';
    if ('bulkSource' in need) return `bulkSource:${need.bulkSource}`;
    if ('surface' in need) return 'surface';
    if ('seating' in need) return 'seating';
    return 'coldStorage';
  }

  toData(): ArchetypeData {
    return {
      ...this.data,
      capabilities: this.data.capabilities.map((c) => ({ ...c, needs: { ...c.needs } })),
    };
  }

  // ---- the two derived reads ------------------------------------------

  /**
   * The EFFECTIVE floor: this archetype's authored residue plus every
   * tool capability and heat requirement across its industry's recipes.
   *
   * A derived need that an authored slot already states merges into that
   * slot (keeping its key and default); a need no slot states becomes a
   * row of its own with no default — the archetype's completeness check
   * is exactly the list of those rows.
   */
  describe(): ArchetypeDescription {
    return {
      archetypeId: this.getArchetypeId(),
      label: this.getLabel(),
      industry: this.getIndustry(),
      rows: this.effectiveRows(),
    };
  }

  private effectiveRows(): EffectiveRow[] {
    const rows = new Map<string, EffectiveRow>();
    const order: string[] = [];
    for (const slot of this.getCapabilities()) {
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
    const recipes = StuffApi.findByTemplatePath<RecipeCatalogue>(RECIPES_PATH) ?? null;
    for (const r of recipes?.allRecipes() ?? []) {
      if (r.getDiscipline() !== this.getIndustry()) continue;
      for (const cap of r.getToolCapabilities()) add({ tool: cap }, r.getRecipeId());
      const heat = r.getRequiresHeatK();
      if (heat > 0) add({ heatK: heat }, r.getRecipeId());
    }
    return order.map((k) => rows.get(k)!);
  }

  /**
   * The derived venue (A13.5, D11's *"the bar's own test venue is derived
   * from it"*): a bare venue room with each authored slot's default
   * binding cloned into it. Slots with no default are the archetype's own
   * honesty — a reader of {@link describe} names them.
   */
  async materialize(): Promise<Stuff & Container> {
    const venue = (await StuffApi.clone(VENUE_PATH)) as Stuff & Container;
    for (const slot of this.getCapabilities()) {
      if (!slot.default) continue;
      const item = await StuffApi.clone(slot.default);
      if (MixinApi.isContainable(item) && item.getContainer() !== venue) {
        ContainmentApi.move(item as never, venue as never);
      }
    }
    return venue;
  }
}
