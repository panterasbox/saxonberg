/**
 * TemplateApi — typed convenience wrapper + folder/leaf validation utilities
 * for the `domain` collection.
 *
 * Phase 7 Decision 12 pins down the "folder/leaf invariant":
 *   - Folders = Zone templates. MAY have descendant templates.
 *   - Leaves  = any non-Zone template. MUST NOT have descendant templates.
 *
 * The invariant is enforced by `DomainHook` (an `AroundSaveHook` /
 * `AroundDeleteHook` registered against `Collections.Domain`) using the
 * `validateFolderLeafSave` / `validateFolderLeafDelete` utilities below.
 * `saveTemplate` is a typed wrapper around `PM.save(Collections.Domain, …)`;
 * the rule fires either way the doc is written, because the hook sits at
 * the chokepoint.
 */

import { PersistenceManager, Collections } from '../../backend/PersistenceManager';
import { ZONE_CLASS_PATHS } from './zone';
import type { DomainTemplate } from './stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';

/**
 * Thrown when a domain-collection write would violate the folder/leaf
 * invariant.
 */
export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

@CallSecurity(SecurityPolicies.Public)
export class TemplateApi {
  /**
   * Save a domain template via the typed convenience signature. Builds the
   * doc, looks up `_id` for upsert, and delegates to PM. The folder/leaf
   * invariant fires through the registered `DomainHook`, not here — calling
   * `PM.save(Collections.Domain, doc)` directly is equivalent.
   *
   * @param path - Template path (e.g. `/narnia/castle/foyer`)
   * @param classPath - Runtime backing class (e.g. `/lib/spatial/CartesianLocation`)
   * @param data - Raw hydration payload
   * @param hydratorClassPath - Optional `Hydrator` class path (omit to
   *   skip hydration; pass `'/lib/persistence/PersistentHydrator'` for
   *   generic mixin-field copy)
   * @returns The saved template's MongoDB `_id`.
   */
  public static async saveTemplate(
    path: string,
    classPath: string,
    data: Record<string, unknown>,
    hydratorClassPath?: string
  ): Promise<string> {
    const existing = await this.findTemplate(path);
    const doc: DomainTemplate & { _id?: string } = {
      path,
      class: classPath,
      data,
    };
    if (hydratorClassPath) doc.hydratorClass = hydratorClassPath;
    if (existing?._id) doc._id = existing._id;

    return PersistenceManager.get().save(Collections.Domain, doc);
  }

  /**
   * Validate a candidate domain-template doc against the folder/leaf
   * invariant. Used by `DomainHook.aroundSave`.
   *
   * Rejects:
   *   1. Path doesn't start with `/`.
   *   2. Doc shape isn't a template (missing `path` or `class`).
   *   3. Leaf save with existing children — "Cannot save leaf template at
   *      `P`; child templates already exist beneath it."
   *   4. Any save under a non-Zone ancestor — "Ancestor `A` is a leaf
   *      template, not a zone folder."
   *
   * Zone classification uses the runtime `class` field (matched against
   * `ZONE_CLASS_PATHS`); `hydratorClass` is orthogonal to zonehood.
   */
  public static async validateFolderLeafSave(
    doc: Record<string, unknown>
  ): Promise<void> {
    const path = doc.path;
    const classPath = doc.class;
    if (typeof path !== 'string' || typeof classPath !== 'string') {
      throw new TemplateError(
        `Domain template must have string 'path' and 'class' fields`
      );
    }
    if (!path.startsWith('/')) {
      throw new TemplateError(`Template path must start with '/': ${path}`);
    }

    const isZone = ZONE_CLASS_PATHS.has(classPath);

    for (const ancestor of this.ancestorPaths(path)) {
      const ancestorTpl = await this.findTemplate(ancestor);
      if (ancestorTpl && !ZONE_CLASS_PATHS.has(ancestorTpl.class)) {
        throw new TemplateError(
          `Ancestor '${ancestor}' is a leaf template, not a zone folder; cannot place children under it.`
        );
      }
    }

    if (!isZone) {
      const children = await this.findDescendants(path);
      if (children.length > 0) {
        throw new TemplateError(
          `Cannot save leaf template at '${path}'; ${children.length} child template(s) already exist beneath it.`
        );
      }
    }
  }

  /**
   * Validate a candidate delete against the folder/leaf invariant: a Zone
   * template cannot be deleted while descendants still reference it as a
   * folder.
   *
   * Used by `DomainHook.aroundDelete`. Looks up the doc by `_id` to discover
   * its path and class — the delete primitive only carries an id.
   */
  public static async validateFolderLeafDelete(id: string): Promise<void> {
    const tpl = (await PersistenceManager.get().findById(
      Collections.Domain,
      id
    )) as DomainTemplate | null;
    if (!tpl) return;
    if (!ZONE_CLASS_PATHS.has(tpl.class)) return;
    const children = await this.findDescendants(tpl.path);
    if (children.length > 0) {
      throw new TemplateError(
        `Cannot delete zone template at '${tpl.path}'; ${children.length} descendant template(s) still reference it.`
      );
    }
  }

  /** Read-through helper — returns `null` when no template exists at `path`. */
  static async findTemplate(path: string): Promise<DomainTemplate | null> {
    const docs = await PersistenceManager.get().find(Collections.Domain, { path });
    return (docs[0] as unknown as DomainTemplate) ?? null;
  }

  /**
   * All templates whose path begins with `basePath + '/'` — i.e. strict
   * descendants (excludes `basePath` itself).
   */
  static async findDescendants(basePath: string): Promise<DomainTemplate[]> {
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
  static ancestorPaths(path: string): string[] {
    const segments = path.split('/').filter((s) => s.length > 0);
    const ancestors: string[] = [];
    for (let i = segments.length - 1; i > 0; i--) {
      ancestors.push('/' + segments.slice(0, i).join('/'));
    }
    return ancestors;
  }
}

