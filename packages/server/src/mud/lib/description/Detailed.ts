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

export const PATH_DELIM = '.';

export type DetailId = string;
export type DetailMap = Map<DetailId, Detail>;

/**
 * Detail entry with hierarchical structure.
 *
 * Aliases (multiple IDs for the same description, e.g. `['handle', 'doorknob']`)
 * are represented by multiple keys in the containing Map pointing to the same
 * `Detail` object. To enumerate aliases for a given Detail, walk the parent
 * Map and filter by identity — there is no per-Detail alias list.
 */
export interface Detail {
  /** Description text */
  description: string;
  /** Nested child details (optional) */
  details: Map<DetailId, Detail> | undefined;
}

/**
 * Top-level examinable detail entry, alias-grouped — multiple keys
 * pointing at the same Detail object render as one entry whose
 * `ids` array carries every alias. `hasChildren` is a hint that
 * nested details exist behind a drill-down query (the wire
 * representation surfaces it; clients decide whether to fetch).
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
  /** Get single detail description */
  getDetail(id: DetailId, parent?: DetailId): string | null;

  /** Get all detail IDs at level */
  getDetailIds(parent?: DetailId): DetailId[] | null;

  /** Get all detail IDs recursively */
  getDeepDetailIds(parent?: DetailId): string[] | null;

  /** Membership test for a single detail id at the given level. */
  hasDetail(id: DetailId, parent?: DetailId): boolean;

  /** Set detail(s) - supports multiple IDs (aliases) */
  setDetail(ids: DetailId[], description: string, parent?: DetailId): number;

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
     * Live-query subscribable fields — projected by
     * `MqlSubscriptionApi.projectFields` (flat) and
     * `MqlSubscriptionApi.projectFocus` (per-detail). The same
     * descriptor carries both layers: `read` enumerates the alias-
     * grouped top-level entries; `perDetailRead` extracts a single
     * entry's slice for focus-mode subscriptions.
     *
     * Re-projection fires on `FieldChangedEvent { field: 'details' }`
     * (from `setDetail` / `removeDetail`) and on `ShadowChangedEvent`
     * targeting this Stuff (so a future visible-detail shadow can
     * override the projected entries).
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
        changes: [
          { on: FieldChangedEvent, by: 'field' },
          { on: ShadowChangedEvent, by: 'target' },
        ],
      },
    ];

    /**
     * Hierarchical detail map. Host-internal storage; external callers
     * go through `getDetail` / `setDetail` / `removeDetail`.
     */
    protected details: DetailMap = new Map();

    /**
     * Get single detail description.
     */
    getDetail(id: DetailId, parent?: DetailId): string | null {
      const resolved = this.resolveParent(parent, id);
      if (!resolved) {
        return null;
      }
      const [details, resolvedId] = resolved;
      if (!resolvedId || !details?.has(resolvedId)) {
        return null;
      }
      const detail = details.get(resolvedId);
      return detail?.description ?? null;
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
     * Cheaper than `getDetailIds(parent)?.includes(id)`.
     */
    hasDetail(id: DetailId, parent?: DetailId): boolean {
      const resolved = this.resolveParent(parent, id);
      if (!resolved) return false;
      const [details, resolvedId] = resolved;
      if (!resolvedId || !details) return false;
      return details.has(resolvedId);
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
     * Set detail(s) - supports multiple IDs (aliases).
     *
     * All IDs in a single call share one Detail object (alias semantics).
     * Separate calls always produce separate Detail objects, even when
     * descriptions match.
     */
    setDetail(ids: DetailId[], description: string, parent?: DetailId): number {
      let result = 0;
      const detail: Detail = { description, details: undefined };

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
          description: detail.description,
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
        description: detail.description,
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
