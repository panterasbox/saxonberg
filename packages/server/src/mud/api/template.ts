/**
 * TemplateApi — typed convenience wrapper + folder/leaf validation
 * utilities for the `domain` collection.
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
 */

import { ZoneApi } from './zone';
import { Template } from '../lib/stuff/Template';
import { ZoneTemplate } from '../lib/stuff/ZoneTemplate';
import { LeafTemplate } from '../lib/stuff/LeafTemplate';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { MixinApi } from './mixin';
import { Mixins } from '../lib/mixin';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Marshaller } from '../lib/persistence/Marshaller';
import PersistentHydrator from '../lib/persistence/PersistentHydrator';

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
   * the four fields, and saves through `Document.save()`. The
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
      ((await ZoneApi.isFolderClass(classPath))
        ? new ZoneTemplate()
        : new LeafTemplate());
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
   * Zone classification uses the runtime `class` field via
   * `ZoneApi.isFolderClass` — a Zone subclass extends `Zone`,
   * regardless of whether anyone registered it in a central
   * allow-list. `hydratorClass` is orthogonal to zonehood.
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

    const isZone = await ZoneApi.isFolderClass(classPath);

    for (const ancestor of Template.ancestorPaths(path)) {
      const ancestorTpl = await Template.findByPath(ancestor);
      if (ancestorTpl && !(await ZoneApi.isFolderClass(ancestorTpl.class))) {
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
    const data = doc.data as Record<string, unknown> | undefined;
    if (!data || typeof data.container !== 'string') return;
    const targetPath = data.container;
    const sourcePath =
      typeof doc.path === 'string' ? doc.path : '(unknown source)';

    // 1. Source class must compose ContainableMixin.
    const sourceClass = doc.class;
    if (typeof sourceClass !== 'string') return; // folder-leaf validator handles
    const sourceCtor = (await StuffApi.loadClassByPath(sourceClass)) as new (
      ...args: unknown[]
    ) => unknown;
    if (!MixinApi.hasMixin(sourceCtor, Mixins.Containable)) {
      throw new TemplateError(
        `Template '${sourcePath}' declares 'data.container' but its ` +
          `class '${sourceClass}' does not compose ContainableMixin.`
      );
    }

    // 2. Target template must exist.
    const targetTpl = await Template.findByPath(targetPath);
    if (!targetTpl) {
      throw new TemplateError(
        `Template '${sourcePath}' declares 'data.container: ${targetPath}' ` +
          `but no template exists at that path.`
      );
    }

    // 3. Target SHOULD compose SingletonMixin — but recover-and-warn
    //    (not deny). A non-singleton target is resolved at hydrate time
    //    by `StuffApi.resolveOrCloneForPlacement` (warn + fresh clone)
    //    rather than throwing, so this save-time check is a non-blocking
    //    warning, not a hard error.
    const targetCtor = (await StuffApi.loadClassByPath(targetTpl.class)) as new (
      ...args: unknown[]
    ) => unknown;
    if (!MixinApi.hasMixin(targetCtor, Mixins.Singleton)) {
      console.warn(
        `TemplateApi.validateSingletonContainerTarget: '${sourcePath}' ` +
          `declares 'data.container: ${targetPath}' but the target's class ` +
          `'${targetTpl.class}' does not compose SingletonMixin. Hydration ` +
          `will warn and clone a fresh instance (recover-and-warn).`,
      );
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
    const tpl = await Template.loadById(id);
    if (!tpl) return;
    if (!(await ZoneApi.isFolderClass(tpl.class))) return;
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

  /**
   * Snapshot a live Stuff host's `persistentFields` chain back to its
   * backing Template doc's `data` block. Walks the composed mixin
   * chain via `MixinApi.getAllPersistentFields(stuff.constructor)`;
   * marshals values per `MixinApi.getAllFieldMarshallers`; derives
   * `data.container` from the live container ref when the host is
   * Containable; merges over the existing `tpl.data` (preserves
   * non-mixin-managed keys).
   *
   * **Pure capture-state: does NOT call `tpl.save()`.** Returns the
   * mutated Template; the caller decides when to commit. Separating
   * capture from commit lets callers inspect, batch, or short-
   * circuit before persisting. Default usage:
   *
   *     const tpl = await TemplateApi.snapshotToTemplate(host);
   *     await tpl.save();
   *
   * Keyed on `stuff.getTemplatePath()` — the runtime stamp every
   * Stuff carries post-clone — NOT on any class-specific helper.
   * The method is class-shape-agnostic.
   *
   * **Synchronous-prefix-before-first-await ordering.** The
   * persistentFields walk and the container ref read run
   * synchronously, BEFORE `Template.findByPath` yields. This is
   * load-bearing for `onDestruct`-driven fire-and-forget saves:
   * they capture pre-cleanup field values even though the MongoDB
   * write itself is async.
   *
   * Concurrent calls produce equivalent full-state snapshots — no
   * in-process coordination. MongoDB's `replaceOne` resolves
   * ordering as last-write-wins.
   *
   * Throws when the host has no templatePath stamp, when no
   * Template exists at the resolved path, or when a marshalled
   * field references an unregistered marshaller.
   */
  public static async snapshotToTemplate(
    stuff: Stuff
  ): Promise<Template> {
    const path = stuff.getTemplatePath();
    if (!path) {
      throw new Error(
        `TemplateApi.snapshotToTemplate: Stuff has no templatePath stamp`
      );
    }

    // Synchronous snapshot — captures field values + container ref
    // BEFORE any event-loop yield. Load-bearing for onDestruct-
    // driven saves.
    const ctor = stuff.constructor as new (...args: unknown[]) => Stuff;
    const fields = MixinApi.getAllPersistentFields(ctor);
    const marshallerPaths = MixinApi.getAllFieldMarshallers(ctor);
    const self = stuff as unknown as Record<string, unknown>;
    const snapshot: Record<string, unknown> = {};
    for (const field of fields) {
      if (!(field in stuff)) continue;
      snapshot[field] = self[field];
    }
    // Durable-location capture (synchronous, before the first await).
    // Save-delegation: when the live container is a Warren member (a
    // lounge room), the avatar's *durable* spawn/recall reference is the
    // **Warren**, not the transient room clone — so we persist
    // `data.startLocation: <Warren>` and drop `data.container`. The
    // consult rides the existing `WarrenMember.getWarren()` back-ref; no
    // extra capability mixin. Otherwise the host keeps the ordinary
    // `data.container` behavior (byte-identical for non-Warren-member
    // containers). Both keys are reconciled so a session in the lounge
    // followed by one in an ordinary room never leaves a stale key.
    const hostIsContainable = MixinApi.isContainable(stuff);
    const env = hostIsContainable ? stuff.getContainer() : null;
    const warrenPath =
      env && MixinApi.isWarrenMember(env)
        ? env.getWarren()?.getTemplatePath() ?? null
        : null;
    const containerPath = env?.getTemplatePath() ?? null;

    const tpl = await Template.findByPath(path);
    if (!tpl) {
      throw new Error(
        `TemplateApi.snapshotToTemplate: no template at '${path}'`
      );
    }

    const data: Record<string, unknown> = { ...(tpl.data ?? {}) };
    for (const field of fields) {
      if (!(field in snapshot)) continue;
      const value = snapshot[field];
      const mPath = marshallerPaths[field];
      if (mPath) {
        // Lazy-create via singleton: marshaller seeds live at
        // `pathFor(unit)` and are content-style templates rather than
        // bootstrap entries, so the first save touching a unit
        // instantiates its marshaller on demand. Subsequent saves
        // hit the live ref in the byTemplatePath index.
        const m = await StuffApi.singleton<Marshaller<unknown, unknown>>(mPath);
        data[field] = m.toStored(value);
      } else {
        data[field] = value;
      }
    }
    if (hostIsContainable) {
      if (warrenPath !== null) {
        // In a Warren-managed room → persist the durable Warren ref.
        data.startLocation = warrenPath;
        delete data.container;
      } else if (containerPath !== null) {
        data.container = containerPath;
        delete data.startLocation;
      } else {
        delete data.container;
        delete data.startLocation;
      }
    }

    tpl.data = data;
    return tpl; // Caller commits via tpl.save().
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
    const path = stuff.getTemplatePath();
    if (!path) {
      throw new Error(
        `TemplateApi.restoreFromTemplate: Stuff has no templatePath stamp`
      );
    }
    const tpl = await Template.findByPath(path);
    if (!tpl) {
      throw new Error(
        `TemplateApi.restoreFromTemplate: no template at '${path}'`
      );
    }
    const hydrator = await StuffApi.singleton<PersistentHydrator>(
      PersistentHydrator.templatePath
    );
    await hydrator.hydrate(stuff, tpl.data ?? {});
  }
}


SecurityApi.decorateApiClass(TemplateApi);
