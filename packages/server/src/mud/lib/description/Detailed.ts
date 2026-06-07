/**
 * DetailedMixin - Provides hierarchical detail system for objects
 *
 * Allows objects to have examinable sub-parts with full hierarchical recursion.
 * Supports multiple IDs (aliases) per detail and nested parent/child relationships.
 *
 * Features:
 * - Hierarchical Map<DetailId, Detail> structure
 * - Multiple IDs per detail (alias support via Set<DetailId>)
 * - Parent/child relationships with nested details
 * - Dot notation support for path resolution
 * - Recursive queries via getDeepDetailIds()
 *
 * Usage:
 * ```typescript
 * // Add top-level detail with alias
 * door.setDetail(["handle", "doorknob"], "A brass handle, tarnished with age.");
 *
 * // Add nested detail (child of "handle")
 * door.setDetail(["lock", "keyhole"], "A small keyhole beneath the handle.", "handle");
 *
 * // Get details
 * door.getDetail("handle");          // → "A brass handle..."
 * door.getDetail("lock", "handle");  // → "A small keyhole..."
 *
 * // Get all IDs at top level
 * door.getDetailIds();               // → ["handle", "doorknob"]
 *
 * // Get all IDs recursively from "handle"
 * door.getDeepDetailIds("handle");   // → ["lock", "keyhole"]
 * ```
 */

import type { MixinConstructor } from '../mixin';
import { EventApi } from '../../api/event';
import { FieldChangedEvent } from '../events/FieldChangedEvent';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import type { SenseChannel } from '../species/BodyPlan';

export const PATH_DELIM = '.';

export type DetailId = string;
export type DetailMap = Map<DetailId, Detail>;

/**
 * Per-sense slot map used by `setDetail`'s new-shape overload and
 * `applyDetails`' new-shape branch. Each key is optional; at least
 * one slot must be populated, and empty-string slot values are
 * rejected by the per-field invariant on `setDetail`.
 */
export type DetailSlots = Partial<Record<SenseChannel, string>>;

/**
 * Detail entry with hierarchical structure.
 *
 * Aliases (multiple IDs for the same description, e.g. `['handle', 'doorknob']`)
 * are represented by multiple keys in the containing Map pointing to the same
 * `Detail` object. To enumerate aliases for a given Detail, walk the parent
 * Map and filter by identity — there is no per-Detail alias list.
 *
 * Per-sense slot map: each sense channel is an optional string. At
 * least one slot must be populated when the Detail is created (the
 * invariant lives on `setDetail`). The legacy `description` field
 * has been retired; legacy authoring (`{ description: "X" }`) still
 * round-trips by populating the `vision` slot at applier time.
 */
export interface Detail {
  /** Sighted-channel description text. */
  vision?: string;
  /** Hearing-channel description text. */
  hearing?: string;
  /** Smell-channel description text. */
  smell?: string;
  /** Touch-channel description text. */
  touch?: string;
  /** Taste-channel description text. */
  taste?: string;
  /** Nested child details (optional) */
  details: Map<DetailId, Detail> | undefined;
}

/**
 * Top-level examinable detail entry, alias-grouped — multiple keys
 * pointing at the same Detail object render as one entry whose
 * `ids` array carries every alias. `hasChildren` is a hint that
 * nested details exist behind a drill-down query (the wire
 * representation surfaces it; clients decide whether to fetch).
 *
 * The `description` field projects the Detail's `vision` slot for
 * wire back-compat with the inspection-pane subscription substrate
 * (the v1 wire shape stays single-channel; non-vision slots are
 * server-side state only). An entry with no vision slot populated
 * surfaces here with an empty `description` string.
 */
export interface DetailEntry {
  ids: DetailId[];
  description: string;
  hasChildren: boolean;
}

/**
 * Interface for objects with hierarchical details.
 */
export interface Detailed {
  /**
   * Get a detail's per-sense description text.
   *
   * Three argument forms (deduced by the runtime, see the
   * implementation):
   * - `getDetail(id)` — returns the `vision` slot (back-compat).
   * - `getDetail(id, sense)` — returns the named sense slot.
   * - `getDetail(id, sense, parent)` — sense + nested parent path.
   * - `getDetail(id, parent)` — back-compat shape; `parent` is a
   *   string that doesn't match a SenseChannel literal. Returns
   *   the `vision` slot at the nested path.
   *
   * Returns `null` when the detail doesn't exist or the requested
   * sense slot is unpopulated.
   */
  getDetail(id: DetailId): string | null;
  getDetail(id: DetailId, sense: SenseChannel, parent?: DetailId): string | null;
  getDetail(id: DetailId, parent: DetailId): string | null;

  /** Get all detail IDs at level */
  getDetailIds(parent?: DetailId): DetailId[] | null;

  /** Get all detail IDs recursively */
  getDeepDetailIds(parent?: DetailId): string[] | null;

  /** Membership test for a single detail id at the given level. */
  hasDetail(id: DetailId, parent?: DetailId): boolean;

  /**
   * Set detail(s) — supports multiple IDs (aliases). Two shapes:
   * - Legacy: `setDetail(ids, "description string", parent?)` —
   *   populates the `vision` slot. Preserved for older call sites.
   * - New: `setDetail(ids, { vision, hearing, smell, touch, taste },
   *   parent?)` — per-slot population. At least one slot must be
   *   non-empty; the per-field invariant rejects an all-empty map.
   */
  setDetail(ids: DetailId[], description: string, parent?: DetailId): number;
  setDetail(ids: DetailId[], slots: DetailSlots, parent?: DetailId): number;

  /** Remove detail(s) */
  removeDetail(ids: DetailId[], parent?: DetailId): number;

  /**
   * Enumerate top-level (or `parent`-scoped) detail entries, alias-
   * grouped by Detail object identity. Each entry bundles every key
   * that points at the same Detail. Used by the live-query
   * substrate's flat `details` projection.
   */
  getDetailEntries(parent?: DetailId): DetailEntry[];

  /**
   * Declarative-content applier — consumes the YAML/template shape
   * `{ <key>: { keywords?: string[], description: string } }` and
   * (re-)populates `this.details` by calling `setDetail` for each
   * entry. Aliases come from the entry's `keywords` array, with the
   * map key as the first alias. Idempotent: resets the Map up
   * front so re-application during template re-clone replaces, not
   * appends. Quietly skips malformed entries.
   */
  applyDetails(data: Record<string, unknown>): void;

  /**
   * Look up the single alias-grouped entry containing `key`, or
   * `null` if no detail resolves at that key. Used by the live-
   * query substrate's focused-detail projection. Supports dotted
   * paths via the same `resolveParent` rules as `getDetail`.
   */
  getDetailEntry(key: DetailId): DetailEntry | null;
}

/**
 * Mixin that adds hierarchical detail system to objects.
 */
export function DetailedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class DetailedMixin extends Base implements Detailed {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'DetailedMixin';

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['details'];

    /**
     * Instruction-field applier roster. `details` is consumed by
     * `applyDetails` (Phase 2 of PersistentHydrator). The
     * declarative YAML shape (a plain object keyed by detail name)
     * differs from the runtime `Map<DetailId, Detail>` shape, so
     * the applier sits between them — it owns the conversion. The
     * applier runs AFTER the persistent bracket-assign in Phase 1
     * (which would otherwise leave `this.details` as a plain object
     * and break `getDetailEntries`); the applier resets the Map up
     * front to undo that.
     */
    static instructionFields = ['details'];

    /**
     * Markup-augmenter contribution. The wrapper-style augmenter
     * narrows the host to Detailed at runtime, then runs the
     * existing `wrapDetailKeywords` regex pass. Picked up by
     * `VisibleMixin.getMarkupLong(viewer)` via the prototype-chain
     * walker — non-Detailed hosts never see this augmenter; hosts
     * with Detailed-but-empty detail maps no-op cheaply inside the
     * helper.
     */
    static markupAugmenters: MarkupAugmenter[] = [wrapDetailKeysAugmenter];

    /**
     * Live-query subscribable fields. The descriptor's
     * `dependsOnFields` defaults to `['details']` (descriptor name =
     * source field name), so `FieldChangedEvent { field: 'details' }`
     * from `setDetail` / `removeDetail` triggers re-projection
     * automatically. The `ShadowChangedEvent` entry covers future
     * visible-detail shadows that override projected entries
     * without firing a field change.
     *
     * One descriptor carries both projection layers: `read`
     * enumerates the alias-grouped top-level entries (flat mode);
     * `perDetailRead` extracts a single entry's slice for focus-
     * mode subscriptions.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'details',
        read: (stuff) => (stuff as unknown as Detailed).getDetailEntries(),
        perDetailRead: (stuff, detailKey) => {
          const entry = (stuff as unknown as Detailed).getDetailEntry(detailKey);
          if (!entry) return null;
          return {
            ids: entry.ids,
            description: entry.description,
            hasChildren: entry.hasChildren,
          };
        },
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
    ];

    /**
     * Hierarchical detail map. Host-internal storage; external callers
     * go through `getDetail` / `setDetail` / `removeDetail`.
     */
    protected details: DetailMap = new Map();

    /**
     * Get a detail's per-sense slot value.
     *
     * Overload-friendly runtime dispatch:
     * - `getDetail(id)` — returns `vision` slot.
     * - `getDetail(id, sense)` where `sense` is a `SenseChannel`
     *   literal (`'vision' | 'hearing' | 'smell' | 'touch' | 'taste'`)
     *   — returns that slot.
     * - `getDetail(id, sense, parent)` — sense + nested parent.
     * - `getDetail(id, parent)` where the second arg is NOT a known
     *   sense channel — treats it as legacy parent and returns the
     *   `vision` slot at the nested path.
     */
    getDetail(
      id: DetailId,
      senseOrParent?: SenseChannel | DetailId,
      parent?: DetailId,
    ): string | null {
      let sense: SenseChannel = 'vision';
      let resolvedParent: DetailId | undefined = parent;
      if (typeof senseOrParent === 'string') {
        if (isSenseChannel(senseOrParent)) {
          sense = senseOrParent;
        } else {
          resolvedParent = senseOrParent;
        }
      }
      const resolved = this.resolveParent(resolvedParent, id);
      if (!resolved) {
        return null;
      }
      const [details, resolvedId] = resolved;
      if (!resolvedId || !details?.has(resolvedId)) {
        return null;
      }
      const detail = details.get(resolvedId);
      if (!detail) return null;
      const slot = detail[sense];
      return typeof slot === 'string' ? slot : null;
    }

    /**
     * Get all detail IDs at level.
     */
    getDetailIds(parent?: DetailId): DetailId[] | null {
      const resolved = this.resolveParent(parent);
      if (!resolved) {
        return null;
      }
      const [details] = resolved;
      if (!details) {
        return null;
      }
      return Array.from(details.keys());
    }

    /**
     * Membership test for a single detail id at the given level.
     * Returns true iff the detail exists and ANY sense slot is
     * populated (cheaper than walking the slot map externally).
     */
    hasDetail(id: DetailId, parent?: DetailId): boolean {
      const resolved = this.resolveParent(parent, id);
      if (!resolved) return false;
      const [details, resolvedId] = resolved;
      if (!resolvedId || !details) return false;
      const detail = details.get(resolvedId);
      if (!detail) return false;
      return SENSE_CHANNELS.some((ch) => typeof detail[ch] === 'string');
    }

    /**
     * Get all detail IDs recursively.
     */
    getDeepDetailIds(parent?: DetailId): string[] | null {
      const resolved = this.resolveParent(parent);
      if (!resolved) {
        return null;
      }
      const [details] = resolved;
      if (!details) {
        return null;
      }
      return this.resolveChildIds(details, '');
    }

    /**
     * Set detail(s) — supports multiple IDs (aliases). Accepts both
     * the legacy string-description shape and the new per-sense slot
     * map shape:
     *   `setDetail(ids, "A brass handle.")` → populates `vision` slot.
     *   `setDetail(ids, { vision: "...", touch: "..." })` → per-slot.
     *
     * All IDs in a single call share one Detail object (alias
     * semantics). Separate calls always produce separate Detail
     * objects, even when slot values match.
     *
     * Per-field invariants: the slot-map shape must populate at
     * least one channel (empty maps throw); empty-string slot values
     * are rejected. A legacy string-description shape accepts empty
     * string (preserves prior behavior for tests / edge cases).
     */
    setDetail(
      ids: DetailId[],
      descriptionOrSlots: string | DetailSlots,
      parent?: DetailId,
    ): number {
      let result = 0;
      const detail: Detail = buildDetail(descriptionOrSlots);

      for (const id of ids) {
        const resolved = this.resolveParent(parent, id);
        if (!resolved) {
          continue;
        }
        const [details, resolvedId] = resolved;
        if (!resolvedId || !details || details.has(resolvedId)) {
          continue;
        }

        details.set(resolvedId, detail);
        result++;
      }

      if (result > 0) {
        EventApi.fire(
          new FieldChangedEvent({
            target: (this as unknown as { stuffId: string }).stuffId,
            field: 'details',
            oldValue: undefined,
            newValue: undefined,
          }),
        );
      }

      return result;
    }

    /**
     * Remove detail(s).
     */
    removeDetail(ids: DetailId[], parent?: DetailId): number {
      let result = 0;

      for (const id of ids) {
        const resolved = this.resolveParent(parent, id);
        if (!resolved) {
          continue;
        }
        const [details, resolvedId] = resolved;
        if (!resolvedId || !details?.has(resolvedId)) {
          continue;
        }

        details.delete(resolvedId);
        result++;
      }

      if (result > 0) {
        EventApi.fire(
          new FieldChangedEvent({
            target: (this as unknown as { stuffId: string }).stuffId,
            field: 'details',
            oldValue: undefined,
            newValue: undefined,
          }),
        );
      }

      return result;
    }

    /**
     * Declarative applier — wires the template YAML's `details:`
     * map into the runtime `Map<DetailId, Detail>`. Phase 1 of the
     * hydrator bracket-assigned the plain YAML object onto
     * `this.details`, breaking the Map shape; the first thing we
     * do is reset it. Then walk the entries — each shaped either
     * legacy (`{ keywords?, description: string }`) or new
     * (`{ keywords?, vision?, hearing?, smell?, touch?, taste? }`)
     * — and call `setDetail` for each. Aliases are `[key, ...keywords]`
     * with duplicates squashed.
     *
     * Mixed-shape entries (legacy `description` AND any per-sense
     * slot key in the same entry) throw — authors pick one shape per
     * entry. Malformed entries (no recognized shape, non-object
     * payload) are skipped with a warn. Nested children via the
     * `details:` sub-key are deferred to a future revision; v1 is
     * flat.
     */
    applyDetails(data: Record<string, unknown>): void {
      this.details = new Map();
      if (!data || typeof data !== 'object') return;
      for (const [key, raw] of Object.entries(data)) {
        if (!raw || typeof raw !== 'object') {
          console.warn(`applyDetails: malformed entry '${key}' skipped`);
          continue;
        }
        const entry = raw as {
          keywords?: unknown;
          description?: unknown;
        } & Partial<Record<SenseChannel, unknown>>;
        const hasDescription = typeof entry.description === 'string';
        const slotSubset: DetailSlots = {};
        for (const ch of SENSE_CHANNELS) {
          const value = entry[ch];
          if (typeof value === 'string') slotSubset[ch] = value;
        }
        const hasAnySlot = SENSE_CHANNELS.some((ch) => ch in slotSubset);
        if (hasDescription && hasAnySlot) {
          throw new Error(
            `applyDetails: entry '${key}' mixes legacy 'description' ` +
              `with per-sense slot key(s); pick one shape per entry`,
          );
        }
        if (!hasDescription && !hasAnySlot) {
          console.warn(
            `applyDetails: entry '${key}' missing description or ` +
              `any sense slot, skipped`,
          );
          continue;
        }
        const aliases: DetailId[] = [key];
        if (Array.isArray(entry.keywords)) {
          for (const kw of entry.keywords) {
            if (typeof kw === 'string' && kw && !aliases.includes(kw)) {
              aliases.push(kw);
            }
          }
        }
        if (hasDescription) {
          this.setDetail(aliases, entry.description as string);
        } else {
          this.setDetail(aliases, slotSubset);
        }
      }
    }

    /**
     * Alias-grouped enumeration of top-level (or `parent`-scoped)
     * details. Walks the DetailMap at the requested level grouping
     * keys by Detail-object identity, so aliases (multiple keys
     * pointing at the same Detail object) bundle into one entry.
     * `hasChildren` reflects whether the entry's Detail has its own
     * nested DetailMap.
     */
    getDetailEntries(parent?: DetailId): DetailEntry[] {
      const resolved = this.resolveParent(parent);
      if (!resolved) return [];
      const [details] = resolved;
      if (!details || details.size === 0) return [];
      const grouped = new Map<Detail, DetailId[]>();
      const order: Detail[] = [];
      for (const [id, detail] of details) {
        const existing = grouped.get(detail);
        if (existing) {
          existing.push(id);
        } else {
          grouped.set(detail, [id]);
          order.push(detail);
        }
      }
      const out: DetailEntry[] = [];
      for (const detail of order) {
        const ids = grouped.get(detail)!;
        out.push({
          ids,
          description: detail.vision ?? '',
          hasChildren: !!detail.details && detail.details.size > 0,
        });
      }
      return out;
    }

    /**
     * Look up the single alias-grouped entry whose Detail covers
     * `key`. Supports the same dotted-path resolution that
     * `getDetail` uses. Returns `null` when no detail exists at the
     * requested key.
     */
    getDetailEntry(key: DetailId): DetailEntry | null {
      const resolved = this.resolveParent(undefined, key);
      if (!resolved) return null;
      const [details, resolvedId] = resolved;
      if (!resolvedId || !details) return null;
      const detail = details.get(resolvedId);
      if (!detail) return null;
      // Re-walk the level to collect aliases for this Detail object.
      const ids: DetailId[] = [];
      for (const [id, d] of details) {
        if (d === detail) ids.push(id);
      }
      return {
        ids,
        description: detail.vision ?? '',
        hasChildren: !!detail.details && detail.details.size > 0,
      };
    }

    /**
     * Internal: Get parent details by path.
     * Returns the Map that CONTAINS the last element of the path.
     * For example, getParentDetails(["a", "b"]) returns the details Map
     * inside "a", which contains "b".
     */
    private getParentDetails(path: DetailId[]): DetailMap | undefined {
      let details: DetailMap | undefined = this.details;
      // Navigate to path.length - 1 (the parent of the last element)
      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (!details || !segment) {
          return undefined;
        }
        const detail = details.get(segment);
        if (!detail) {
          return undefined;
        }
        if (!detail.details) {
          detail.details = new Map();
        }
        details = detail.details;
      }
      return details;
    }

    /**
     * Internal: Resolve parent context and ID.
     * Supports dot notation: "parent.child" → parent="parent", id="child"
     */
    private resolveParent(
      parent?: DetailId,
      id?: DetailId,
    ): [DetailMap?, DetailId?] | undefined {
      let details: DetailMap | undefined = this.details;

      if (id) {
        const pos = id.lastIndexOf(PATH_DELIM);
        if (pos >= 0) {
          if (parent && parent.length) {
            parent = parent + PATH_DELIM + id.substring(0, pos);
          } else {
            parent = id.substring(0, pos);
          }
          id = id.substring(pos + 1);
        }
      }

      if (parent && parent.length) {
        const path = parent.split(PATH_DELIM);
        details = this.getParentDetails(path);
        if (!details) {
          return undefined;
        }

        const lastSegment = path[path.length - 1];
        if (!lastSegment) {
          return undefined;
        }
        const parentDetail = details.get(lastSegment);
        if (!parentDetail) {
          return undefined;
        }

        if (!parentDetail.details) {
          parentDetail.details = new Map();
        }

        details = parentDetail.details;
      }

      return [details, id];
    }

    /**
     * Internal: Recursively collect all child IDs.
     */
    private resolveChildIds(details: DetailMap, parent: DetailId): DetailId[] {
      const result: string[] = [];

      details.forEach((detail, id) => {
        result.push(id);
        const path = parent + (parent.length ? PATH_DELIM : '') + id;
        if (detail.details) {
          result.push(...this.resolveChildIds(detail.details, path));
        }
      });

      return result;
    }
  };
}

/**
 * Canonical sense-channel set used by the slot-map machinery. Kept
 * in sync with the `SenseChannel` union exported from
 * `lib/species/BodyPlan.ts` — adding a channel requires touching
 * both (the union for type-level checking, this constant for the
 * runtime walk).
 */
const SENSE_CHANNELS: readonly SenseChannel[] = [
  'vision',
  'hearing',
  'smell',
  'touch',
  'taste',
];

/**
 * Runtime guard for the SenseChannel union. Used by `getDetail`'s
 * 2-arg overload dispatch to distinguish `getDetail(id, sense)` from
 * `getDetail(id, parent)` — only the five known channel literals
 * route to the sense-arg branch; any other string is treated as a
 * legacy parent path.
 */
function isSenseChannel(value: string): value is SenseChannel {
  return (SENSE_CHANNELS as readonly string[]).includes(value);
}

/**
 * Build a fresh Detail object from a `setDetail` payload. Accepts
 * either the legacy string-description form (populates `vision`) or
 * a `DetailSlots` map (per-slot population). Enforces the
 * per-field invariants: slot-map shape must populate at least one
 * channel and every populated slot must be a string.
 */
function buildDetail(input: string | DetailSlots): Detail {
  const detail: Detail = { details: undefined };
  if (typeof input === 'string') {
    detail.vision = input;
    return detail;
  }
  if (!input || typeof input !== 'object') {
    throw new TypeError(
      'Detailed.setDetail: slot-map arg must be an object with at ' +
        'least one populated sense slot',
    );
  }
  let populated = 0;
  for (const ch of SENSE_CHANNELS) {
    const value = input[ch];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      throw new TypeError(
        `Detailed.setDetail: slot '${ch}' must be a string, ` +
          `got ${typeof value}`,
      );
    }
    detail[ch] = value;
    populated++;
  }
  if (populated === 0) {
    throw new TypeError(
      'Detailed.setDetail: slot-map arg must populate at least one ' +
        'sense channel (vision/hearing/smell/touch/taste)',
    );
  }
  return detail;
}

/**
 * Escape a literal string for use inside a `RegExp` source. Mirrors
 * the standard "escape regex special chars" idiom.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Walk the alias-grouped detail entries on a Detailed host and wrap
 * every occurrence of a canonical detail key (the first id in each
 * entry's `ids` array) in a `<detail key="...">word</detail>` MML
 * tag. Case-insensitive, word-boundary-anchored — matches preserve
 * their original case so the prose reads naturally.
 *
 * Single pass over the text using one combined regex (alternation
 * over all canonical keys, longest first) so a key that wraps a
 * prior key's text never re-enters the matcher. Yields no recursion
 * and stable left-to-right ordering.
 *
 * Non-Detailed hosts get the raw text back unchanged. Hosts with no
 * details (Detailed but empty) also get raw — no work, no regex.
 *
 * Detail aliases beyond the canonical key are deliberately NOT
 * wrapped: every alias still resolves on `look <alias>` for the
 * command bus, but the prose carries one canonical anchor per
 * detail instead of a paragraph full of overlapping spans.
 */
function wrapDetailKeywords(
  text: string,
  host: Detailed & { getLong?: () => string },
): string {
  if (!text) return text;
  const entries = host.getDetailEntries?.();
  if (!entries || entries.length === 0) return text;
  const canonicalKeys: string[] = [];
  for (const entry of entries) {
    const key = entry.ids[0];
    if (typeof key === 'string' && key.length > 0) {
      canonicalKeys.push(key);
    }
  }
  if (canonicalKeys.length === 0) return text;
  canonicalKeys.sort((a, b) => b.length - a.length);
  const pattern = canonicalKeys.map(escapeRegExp).join('|');
  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
  return text.replace(regex, (match) => {
    const key = canonicalKeys.find(
      (k) => k.toLowerCase() === match.toLowerCase(),
    );
    return key ? `<detail key="${key}">${match}</detail>` : match;
  });
}

/**
 * `MarkupAugmenter` adapter for the detail-key wrap pass. Narrows
 * the host to Detailed and delegates to `wrapDetailKeywords`. Lives
 * here (not inline as an arrow) so the static-array declaration
 * stays terse and the augmenter is easy to identify by name in
 * stack traces.
 */
function wrapDetailKeysAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!MixinApi.isDetailed(host)) return text;
  return wrapDetailKeywords(
    text,
    host as Detailed & { getLong?: () => string },
  );
}
