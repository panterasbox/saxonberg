/**
 * TemplateApi — authoritative write-path for the `domain` collection.
 *
 * Phase 7 Decision 12 pins down the "folder/leaf invariant":
 *   - Folders = Zone templates. MAY have descendant templates.
 *   - Leaves  = any non-Zone template. MUST NOT have descendant templates.
 *
 * This module rejects saves that would break the invariant, so the path
 * tree under `domain` stays consistent with the zone-inheritance semantics
 * used by `ZoneApi.resolveZoneForPath`.
 *
 * All writes to the `domain` collection should route through
 * `saveTemplate()`. Reads still go straight through PersistenceManager.
 */

import { PersistenceManager, Collections } from '../../backend/PersistenceManager';
import { ZONE_CLASS_PATHS } from './zone';
import type { DomainTemplate } from './stuff';

/**
 * Thrown when a template save would violate the folder/leaf invariant.
 */
export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class TemplateApi {
  /**
   * Save a template, enforcing the folder/leaf invariant.
   *
   * Rejects:
   *   1. Leaf save with existing children — "Cannot save leaf template at
   *      `P`; child templates already exist beneath it."
   *   2. Any save under a non-Zone ancestor — "Ancestor `A` is a leaf
   *      template, not a zone folder."
   *
   * Zone classification uses the runtime `class` field (matched against
   * `ZONE_CLASS_PATHS`); `hydratorClass` is orthogonal to zonehood.
   *
   * @param path - Template path (e.g. `/narnia/castle/foyer`)
   * @param classPath - Runtime backing class (e.g. `/lib/spatial/CartesianLocation`)
   * @param data - Raw hydration payload
   * @param hydratorClassPath - Optional Hydrator class (omit for default
   *   mixin-field copy via the base `Hydrator`)
   * @returns The saved template's MongoDB `_id`.
   */
  public static async saveTemplate(
    path: string,
    classPath: string,
    data: Record<string, unknown>,
    hydratorClassPath?: string
  ): Promise<string> {
    if (!path.startsWith('/')) {
      throw new TemplateError(`Template path must start with '/': ${path}`);
    }

    const isZone = ZONE_CLASS_PATHS.has(classPath);

    // (2) Walk ancestors: no ancestor may be a non-Zone leaf.
    for (const ancestor of this.#ancestorPaths(path)) {
      const ancestorTpl = await this.#findTemplate(ancestor);
      if (ancestorTpl && !ZONE_CLASS_PATHS.has(ancestorTpl.class)) {
        throw new TemplateError(
          `Ancestor '${ancestor}' is a leaf template, not a zone folder; cannot place children under it.`
        );
      }
    }

    // (1) Leaf with children: rejected.
    if (!isZone) {
      const children = await this.#findDescendants(path);
      if (children.length > 0) {
        throw new TemplateError(
          `Cannot save leaf template at '${path}'; ${children.length} child template(s) already exist beneath it.`
        );
      }
    }

    // Existing template at this path: overwrite via _id; else insert.
    const existing = await this.#findTemplate(path);
    const doc: DomainTemplate & { _id?: string; __bypassTemplateCheck?: boolean } = {
      path,
      class: classPath,
      data,
      __bypassTemplateCheck: true,
    };
    if (hydratorClassPath) doc.hydratorClass = hydratorClassPath;
    if (existing?._id) doc._id = existing._id;

    return PersistenceManager.get().save(Collections.Domain, doc);
  }

  /** Read-through helper — returns `null` when no template exists at `path`. */
  static async #findTemplate(path: string): Promise<DomainTemplate | null> {
    const docs = await PersistenceManager.get().find(Collections.Domain, { path });
    return (docs[0] as unknown as DomainTemplate) ?? null;
  }

  /**
   * All templates whose path begins with `basePath + '/'` — i.e. strict
   * descendants (excludes `basePath` itself).
   */
  static async #findDescendants(basePath: string): Promise<DomainTemplate[]> {
    const prefix = basePath.endsWith('/') ? basePath : basePath + '/';
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docs = await PersistenceManager.get().find(Collections.Domain, {
      path: { $regex: `^${escaped}` },
    });
    return docs as unknown as DomainTemplate[];
  }

  /**
   * Generate ancestor paths, nearest first: `/a/b/c` → `['/a/b', '/a']`.
   * Root `/` excluded.
   */
  static #ancestorPaths(path: string): string[] {
    const segments = path.split('/').filter((s) => s.length > 0);
    const ancestors: string[] = [];
    for (let i = segments.length - 1; i > 0; i--) {
      ancestors.push('/' + segments.slice(0, i).join('/'));
    }
    return ancestors;
  }
}
