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
 * (`ArchetypeApi.describe`); this document is only what mechanics cannot
 * express. It carries ZERO logic and nothing at runtime gates on it: a
 * bar with no ice bin is a legal, visible state.
 *
 * The one concept this module defines — the value-object + its
 * validation. Installed as the `archetype` document kind
 * (`content/archetypes/<id>.yaml`, natural key `archetypeId`).
 */

import type { StoredDocument } from '../document/StoredDocument';

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
 * - `coldStorage` — an insulated, sealable holder (`Thermal` + `Sealable`).
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
}
