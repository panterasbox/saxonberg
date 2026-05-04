/**
 * TemplateApi — typed convenience wrapper + folder/leaf validation
 * utilities for the `domain` collection.
 *
 * Templates themselves are modelled as `Template extends Persistable`
 * (`lib/stuff/Template`) — the standard CRUD surface
 * (`save`/`findById`/`find`/`delete`) lives there, alongside the
 * `findByPath` and `findDescendants` helpers. This Api class layers on:
 *
 *   - `saveTemplate(...)` — typed factory that upserts by path
 *   - `validateFolderLeafSave` / `validateFolderLeafDelete` — invariant
 *     enforcement consumed by `DomainHook` (the chokepoint for both
 *     direct PM writes and `Template.save()` — both flow through PM
 *     dispatch and trip the hook either way).
 *
 * Phase 7 Decision 12 — folder/leaf invariant:
 *   - Folders = Zone templates. MAY have descendant templates.
 *   - Leaves  = any non-Zone template. MUST NOT have descendant templates.
 */

import { ZONE_CLASS_PATHS } from './zone';
import { Template } from '../lib/stuff/Template';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';

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

export class TemplateApi {
  /**
   * Upsert a Template at `path`. Looks up an existing Template at the
   * same path (so the underlying upsert reuses its `_id`), populates
   * the four fields, and saves through `Persistable.save()`. The
   * folder/leaf invariant fires through `DomainHook` against the PM
   * chokepoint — direct `template.save()` is equivalent.
   *
   * @returns The saved Template's MongoDB `_id`.
   */
  public static async saveTemplate(
    path: string,
    classPath: string,
    data: Record<string, unknown>,
    hydratorClassPath?: string
  ): Promise<string> {
    const tpl =
      (await Template.findByPath(path)) ??
      (await StuffApi.create(() => new Template()));
    tpl.path = path;
    tpl.class = classPath;
    tpl.data = data;
    if (hydratorClassPath !== undefined) {
      tpl.hydratorClass = hydratorClassPath;
    } else {
      // Explicitly clear so updates can drop a previously-set hydrator.
      delete tpl.hydratorClass;
    }
    await tpl.save();
    return tpl._id!;
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

    for (const ancestor of Template.ancestorPaths(path)) {
      const ancestorTpl = await Template.findByPath(ancestor);
      if (ancestorTpl && !ZONE_CLASS_PATHS.has(ancestorTpl.class)) {
        throw new TemplateError(
          `Ancestor '${ancestor}' is a leaf template, not a zone folder; cannot place children under it.`
        );
      }
    }

    if (!isZone) {
      const children = await Template.findDescendants(path);
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
   * Used by `DomainHook.aroundDelete`. Looks up the doc by `_id` to
   * discover its path and class — the delete primitive only carries an id.
   */
  public static async validateFolderLeafDelete(id: string): Promise<void> {
    const tpl = await Template.findById(id);
    if (!tpl) return;
    if (!ZONE_CLASS_PATHS.has(tpl.class)) return;
    const children = await Template.findDescendants(tpl.path);
    if (children.length > 0) {
      throw new TemplateError(
        `Cannot delete zone template at '${tpl.path}'; ${children.length} descendant template(s) still reference it.`
      );
    }
  }

  /**
   * Generate ancestor paths, nearest first: `/a/b/c` → `['/a/b', '/a']`.
   * Root `/` excluded. Re-exported from `Template.ancestorPaths` for
   * symmetry with the validators that use it.
   */
  static ancestorPaths(path: string): string[] {
    return Template.ancestorPaths(path);
  }
}


SecurityApi.decorateApiClass(TemplateApi);
