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
import type { Postured } from '../slot/Postured';
import type { BulkAffordance } from '../bulk/Bulkable';
import type { Quantity } from '../quantity';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { PerceptionApi } from '../../api/perception';

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
  industry: string | null;
  rows: EffectiveRow[];
}

/** One row of {@link Archetype.satisfies}: the need, and what met it. */
export interface SatisfactionRow {
  key: string;
  needs: CapabilityNeed;
  satisfied: boolean;
  /**
   * What satisfied the need, as a presentation phrase — *whatever
   * object* did it. The read is the capability, never the furniture:
   * a hearth and a range both answer `heatK`, and the report names the
   * one that actually did.
   */
  by: string | null;
}

/** {@link Archetype.satisfies}'s answer over one space or one holding. */
export interface Satisfaction {
  archetypeId: string;
  label: string;
  /** Every row satisfied. */
  satisfied: boolean;
  rows: SatisfactionRow[];
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
 * - `rest` — a posture-bearing `lie` slot whose `restQuality` reaches
 *   `n`. What makes a bedroom a bedroom, and it is a real read: a body
 *   that sleeps on it recovers by `posture × restQuality`.
 * - `presence` — a thing answering to `<keyword>` is here. Deliberately
 *   the WEAKEST need in the vocabulary, and the honest one for a
 *   bathroom: a toilet is prose-LOD, it affords nothing the kernel
 *   checks, and claiming otherwise would be inventing a mechanic to
 *   make a checklist tidy.
 * - `lightLux` — the space is illuminated to at least `n` lux. The
 *   `coldStorage` shape: a property of the SPACE, satisfied by whatever
 *   lights it. ⭐ The divergence slot — an archetype says *you need
 *   light underground*; one venue answers with cultivated glowcap and
 *   another with oil lamps, and neither is named here. The read is
 *   `vision.signalAt(space).intensity`, which is what `measure light`
 *   reads, so the archetype and the instrument agree by construction.
 * - `vesselKind` — a bulk holder of the named vessel kind (`category`
 *   on `BulkableMixin` — the term bulk.md, `outputVesselKind` and the
 *   `vessel:` census prefix already use): the vat a ferment needs, a
 *   cooper's cask. An EMPTY one counts — the capability is the vessel,
 *   never its contents (fermentation W8: the defining capital of a
 *   winery is not a tool and not a bulk source). Named `vesselKind`,
 *   not `vessel`, because bare `Vessel` is the enterable-container
 *   CLASS (a boat) — a different thing entirely.
 */
export type CapabilityNeed =
  | { tool: string }
  | { heatK: number }
  | { bulkSource: string }
  | { surface: true }
  | { seating: number }
  | { coldStorage: true }
  | { rest: number }
  | { presence: string }
  | { lightLux: number }
  | { vesselKind: string };

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
  /**
   * The `Recipe.discipline` whose recipes derive the rest of the floor.
   *
   * **Optional.** A venue archetype is mostly derived from an industry's
   * recipes and states only the residue; a ROOM archetype (a bedroom, a
   * bathroom) has no industry at all — it is residue the whole way down,
   * and there is nothing to derive. Absent means "derive nothing", not
   * "derive from everything".
   */
  industry: string | null;
  capabilities: CapabilitySlot[];
}

const NEED_KEYS = [
  'tool',
  'heatK',
  'bulkSource',
  'surface',
  'seating',
  'coldStorage',
  'rest',
  'presence',
  'lightLux',
  'vesselKind',
] as const;

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
    case 'presence':
    case 'vesselKind':
      if (typeof v !== 'string' || v.length === 0) fail(archetypeId, `capability '${key}': \`${k}\` must be a non-empty string`);
      return { [k]: v } as CapabilityNeed;
    case 'heatK':
    case 'seating':
    case 'rest':
    case 'lightLux':
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
    // Optional: a room archetype derives nothing (no recipes make a
    // bedroom). Present-but-empty is an authoring mistake, not a room.
    const rawIndustry = data.industry;
    if (rawIndustry !== undefined && rawIndustry !== null && (typeof rawIndustry !== 'string' || rawIndustry.length === 0)) {
      fail(id, "'industry', when present, must name the discipline whose recipes derive the floor");
    }
    const industry = typeof rawIndustry === 'string' ? rawIndustry : null;
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
  getIndustry(): string | null { return this.data.industry; }
  getCapabilities(): readonly CapabilitySlot[] { return this.data.capabilities; }

  /** A stable identity for a need, so a derived row merges with an authored one. */
  static needKey(need: CapabilityNeed): string {
    if ('tool' in need) return `tool:${need.tool}`;
    if ('heatK' in need) return 'heatK';
    if ('bulkSource' in need) return `bulkSource:${need.bulkSource}`;
    if ('surface' in need) return 'surface';
    if ('seating' in need) return 'seating';
    if ('rest' in need) return 'rest';
    if ('presence' in need) return `presence:${need.presence}`;
    if ('lightLux' in need) return 'lightLux';
    if ('vesselKind' in need) return `vesselKind:${need.vesselKind}`;
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
    // No industry ⇒ nothing to derive. A bedroom is residue all the way
    // down; skipping the walk is the whole of "industry is optional".
    const industry = this.getIndustry();
    if (industry === null) return order.map((k) => rows.get(k)!);
    const recipes = StuffApi.findByTemplatePath<RecipeCatalogue>(RECIPES_PATH) ?? null;
    for (const r of recipes?.allRecipes() ?? []) {
      if (r.getDiscipline() !== industry) continue;
      for (const cap of r.getToolCapabilities()) add({ tool: cap }, r.getRecipeId());
      const heat = r.getRequiresHeatK();
      if (heat > 0) add({ heatK: heat }, r.getRecipeId());
    }
    return order.map((k) => rows.get(k)!);
  }

  /**
   * **Does this space answer the archetype?** — the third derived read,
   * and the one a person asks (`survey`).
   *
   * Evaluated over the union of one or more spaces' direct contents AND
   * their fixtures, so a holding answers as a whole (a kitchen counter
   * in one room and a bed in another are one home) and a sconce on the
   * wall counts as much as a lamp on the floor. Per row: satisfied, and
   * BY WHAT — because the answer is the capability, never the furniture.
   * A studio corner with a hotplate, a board and a cold box reads as a
   * kitchen; the report names the hotplate.
   *
   * ⚠ **Nothing consumes this.** It is reported, never enforced: an
   * unrecognized room provisions, persists and functions identically,
   * and no multiplier anywhere reads a satisfaction. D15's whole point
   * is that a home you like is not a home that scores.
   */
  satisfies(space: (Stuff & Container) | readonly (Stuff & Container)[]): Satisfaction {
    const spaces = Array.isArray(space)
      ? (space as readonly (Stuff & Container)[])
      : [space as Stuff & Container];
    const pool: Stuff[] = [];
    for (const sp of spaces) {
      for (const item of sp.getContents()) pool.push(item);
      if (MixinApi.isAdornable(sp)) for (const f of sp.getFixtures()) pool.push(f);
    }
    const rows = this.effectiveRows().map((row) => {
      const by = satisfyingItem(row.needs, pool, spaces);
      return { key: row.key, needs: row.needs, satisfied: by !== null, by };
    });
    return {
      archetypeId: this.getArchetypeId(),
      label: this.getLabel(),
      satisfied: rows.every((r) => r.satisfied),
      rows,
    };
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

/**
 * **The checker.** One need, one pool of candidate objects (a space's
 * contents + fixtures), and the spaces themselves for the needs that are
 * properties of a SPACE. Returns the presentation of whatever satisfied
 * it, or null.
 *
 * Every clause asks the kernel a question the kernel already answers —
 * that is the archetype contract: the volcano-vent smithy satisfies
 * `heatK` without an exemption, because nothing here knows what a forge
 * is.
 */
function satisfyingItem(
  need: CapabilityNeed,
  pool: readonly Stuff[],
  spaces: readonly (Stuff & Container)[],
): string | null {
  if ('tool' in need) {
    const hit = pool.find((i) => MixinApi.isTool(i) && i.hasCapability(need.tool));
    return hit ? hit.getPresentation() : null;
  }
  if ('heatK' in need) {
    const want = need.heatK;
    const hit = pool.find(
      (i) => MixinApi.isFurnace(i) && i.getHeldTemperatureK() >= want,
    );
    return hit ? hit.getPresentation() : null;
  }
  if ('bulkSource' in need) {
    const hit = pool.find((i) => holdsBulkOf(i, need.bulkSource));
    return hit ? hit.getPresentation() : null;
  }
  if ('surface' in need) {
    const hit = pool.find((i) => MixinApi.isSurfaced(i));
    return hit ? hit.getPresentation() : null;
  }
  if ('seating' in need) {
    const seats = pool.filter((i) => posturedFor(i, 'sit') !== null);
    return seats.length >= need.seating
      ? seats.map((s) => s.getPresentation()).join(', ')
      : null;
  }
  if ('rest' in need) {
    const want = need.rest;
    const hit = pool.find((i) => {
      const slot = posturedFor(i, 'lie');
      return slot !== null && (i as Stuff & Postured).getRestQuality() >= want;
    });
    return hit ? hit.getPresentation() : null;
  }
  if ('presence' in need) {
    const hit = pool.find((i) => answersTo(i, need.presence));
    return hit ? hit.getPresentation() : null;
  }
  if ('lightLux' in need) {
    // A property of the SPACE, like coldStorage. Whatever lights it
    // answers — a glowcap bed, a sconce, a shaft of daylight — and the
    // report names the space, because the illuminance is the space's.
    const want = need.lightLux;
    const vision = PerceptionApi.modalityByName('vision');
    for (const sp of spaces) {
      const light = vision.signalAt(sp) as { intensity: Quantity<'lux'> } | null;
      if (light && light.intensity.rawValue() >= want) return sp.getPresentation();
    }
    return null;
  }
  if ('vesselKind' in need) {
    // The vessel kind, empty or full — the capability is the vessel.
    const hit = pool.find(
      (i) => MixinApi.isBulkable(i) && i.getCategory() === need.vesselKind,
    );
    return hit ? hit.getPresentation() : null;
  }
  // coldStorage — a property of a SPACE first (a cellar, a walk-in), and
  // only then of a holder in it (insulated AND closable).
  for (const sp of spaces) {
    if (MixinApi.isThermal(sp) && sp.getTemperature().rawValue() <= COLD_K) {
      return sp.getPresentation();
    }
  }
  const box = pool.find((i) => MixinApi.isThermal(i) && MixinApi.isSealable(i));
  return box ? box.getPresentation() : null;
}

/** At or below this, a space is cold storage (≈ 10 °C — a cellar). */
const COLD_K = 283;

/** Does `item` hold, or endlessly supply, bulk matter answering `token`? */
function holdsBulkOf(item: Stuff, token: string): boolean {
  if (!MixinApi.isBulkable(item)) return false;
  const affordances: BulkAffordance[] = [];
  if (item.hasInteriorBulk()) affordances.push('interior');
  if (item.hasSurfaceBulk()) affordances.push('surface');
  for (const a of affordances) {
    const slot = item.getBulk(a);
    if (slot.available() <= 0) continue;
    const path = slot.getMaterialPath();
    // Match on the material's LEAF (`…/liquid/water` for `water`), or on
    // the vessel kind (`ice-bin`) — the two ways content names a source.
    if (path && (path === token || path.endsWith(`/${token}`))) return true;
    if (item.getCategory() === token) return true;
  }
  return false;
}

/** The Postured slot on `item` accepting `posture`, or null. */
function posturedFor(item: Stuff, posture: string): string | null {
  if (!MixinApi.isPostured(item)) return null;
  const slots = item.getSlotsAcceptingPosture(posture);
  return slots.length > 0 ? slots[0]! : null;
}

/** Does `item` answer to `keyword` — its name or any of its keywords? */
function answersTo(item: Stuff, keyword: string): boolean {
  const want = keyword.toLowerCase();
  if (!MixinApi.isPerceptible(item)) return false;
  if (item.getPrimaryKeyword()?.toLowerCase() === want) return true;
  return item.getKeywords().some((k) => k.toLowerCase() === want);
}
