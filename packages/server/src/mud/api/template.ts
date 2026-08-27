/**
 * TemplateApi — typed convenience wrapper + folder/leaf validation
 * utilities for the `content` collection.
 *
 * Templates themselves are modelled as `Template extends Document`
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
 *
 * Thin, security-gated forwarding shell: the upsert + validation +
 * snapshot/restore logic lives in the hot-reloadable {@link TemplateLogic}
 * singleton at `/platform/idea/api/template`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/template` reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import { TemplateLogic } from '../platform/idea/api/TemplateLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export { TemplateError } from '../lib/stuff/TemplateError';

const LOGIC_PATH = '/platform/idea/api/template';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/TemplateLogic', import.meta.url)
);

/** Resolve the HMR-able TemplateLogic singleton (sync). */
function logic(): TemplateLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'TemplateLogic'
      ) as typeof TemplateLogic | null) ?? TemplateLogic)()
  );
}

export class TemplateApi {
  /**
   * Upsert a Template at `path`. Looks up an existing Template at the
   * same path (so the underlying upsert reuses its `_id`), populates
   * the four fields, and saves through `Document.save()`. The
   * folder/leaf invariant fires through `DomainHook` against the PM
   * chokepoint — direct `template.save()` is equivalent.
   *
   * Records one append-only `AuthoringEvent` for `path` after the save
   * commits — the authorship ledger the producer stock reads. The author is
   * **derived from the dispatched execution context**, not a parameter (so
   * it can't be spoofed); an unattributable context (programmatic / system
   * save) records nothing. This is the single chokepoint both the in-world
   * authoring verbs and the REST CMS funnel through, so it is the one
   * centralized writer of provenance. See {@link ProvenanceApi}.
   *
   * @returns The saved Template's MongoDB `_id`.
   */
  public static async saveTemplate(
    path: string,
    classPath: string,
    data: Record<string, unknown>,
    hydratorClassPath?: string
  ): Promise<string> {
    return logic().saveTemplate(path, classPath, data, hydratorClassPath);
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
   * Zone classification uses the runtime `class` field via
   * `ZoneApi.isFolderClass` — a Zone subclass extends `Zone`,
   * regardless of whether anyone registered it in a central
   * allow-list. `hydratorClass` is orthogonal to zonehood.
   */
  public static async validateFolderLeafSave(
    doc: Record<string, unknown>
  ): Promise<void> {
    return logic().validateFolderLeafSave(doc);
  }

  /**
   * Reject saving a `domain`-collection Template under an engine-
   * reserved template-path prefix (see `ReservedTemplatePrefixes` in
   * `lib/paths.ts`). `/platform/idea/api/` is owned by the surface-architecture
   * logic singletons (`StuffApi.singletonSync`); a Template authored
   * there would be mis-returned by the singleton lookup as the
   * wrong-class logic instance, so the namespace must stay DB-free.
   *
   * Used by `DomainHook.aroundSave` alongside `validateFolderLeafSave`
   * and `validateSingletonContainerTarget`.
   */
  public static async validateReservedPath(
    doc: Record<string, unknown>
  ): Promise<void> {
    return logic().validateReservedPath(doc);
  }

  /**
   * Validate a candidate domain-template doc's `data.container`
   * against the singleton-target constraint:
   *
   *   - Skip when `data.container` is absent or non-string.
   *   - Resolve the source class; throw if it doesn't compose
   *     `ContainableMixin` (a non-Containable declaring `container`
   *     is a config bug; Phase 2 would fail loudly at hydrate time,
   *     but template-save is the earlier surface).
   *   - Resolve the target template at the declared path; throw if
   *     it doesn't exist.
   *   - Resolve the target's backing class; throw if the class does
   *     NOT compose `SingletonMixin`.
   *
   * Used by `DomainHook.aroundSave` alongside
   * `validateFolderLeafSave`. Per declarative-content-slate
   * § container: on Template — singleton-target constraint.
   */
  public static async validateSingletonContainerTarget(
    doc: Record<string, unknown>
  ): Promise<void> {
    return logic().validateSingletonContainerTarget(doc);
  }

  /**
   * Validate a candidate delete against the folder/leaf invariant: a Zone
   * template cannot be deleted while descendants still reference it as a
   * folder.
   *
   * Used by `DomainHook.aroundDelete`. Looks up the doc by `_id` to
   * discover its path and class — the delete primitive only carries an id.
   */
  /**
   * Every distinct backing `class` path across the templates collection —
   * the blueprint catalogue's derive input (one structural blueprint per
   * class). Strings only; a malformed row's `class` is dropped.
   */
  public static async distinctClasses(): Promise<string[]> {
    return logic().distinctClasses();
  }

  public static async validateFolderLeafDelete(id: string): Promise<void> {
    return logic().validateFolderLeafDelete(id);
  }

  /**
   * Generate ancestor paths, nearest first: `/a/b/c` → `['/a/b', '/a']`.
   * Root `/` excluded. Re-exported from `Template.ancestorPaths` for
   * symmetry with the validators that use it.
   */
  static ancestorPaths(path: string): string[] {
    return logic().ancestorPaths(path);
  }


  /**
   * Re-hydrate a live Stuff host's in-memory state from its current
   * Template doc. Operates on the existing instance; preserves
   * identity / stuffId / wired Interactives. Phase 1 setters
   * overwrite field values; Phase 2 appliers re-fire (e.g.
   * `applyContainer` moves the host via compare-and-move).
   *
   * v1 coordination: developer/admin operation; does NOT
   * synchronize against multiplexed observers.
   *
   * Throws on missing templatePath, missing Template doc, or
   * hydration failure.
   */
  public static async restoreFromTemplate(stuff: Stuff): Promise<void> {
    return logic().restoreFromTemplate(stuff);
  }
}

SecurityApi.decorateApiClass(TemplateApi);
