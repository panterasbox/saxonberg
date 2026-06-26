// TemplateLogic — the hot-reloadable logic singleton behind TemplateApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ZoneApi } from '../../api/zone';
import { Template } from '../../lib/stuff/Template';
import { ZoneTemplate } from '../../lib/stuff/ZoneTemplate';
import { LeafTemplate } from '../../lib/stuff/LeafTemplate';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import { TemplateError } from '../../lib/stuff/TemplateError';
import { ReservedTemplatePrefixes } from '../../lib/paths';
import { ProvenanceApi } from '../../api/provenance';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Marshaller } from '../../lib/persistence/Marshaller';
import PersistentHydrator from '../../lib/persistence/PersistentHydrator';

const TemplateApiCallers = SecurityPolicies.FromModule(
  'mud/api/template#TemplateApi'
);

/**
 * TemplateLogic — the hot-reloadable logic singleton behind
 * {@link TemplateApi}.
 *
 * Lives at `/obj/api/template` (a stateless `Stuff` singleton, no
 * backing `Template`); `TemplateApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). 0-self-call:
 * the validators thread through `Template.*` / `ZoneApi.*` helpers and
 * never call another `TemplateApi` method, so the plain `FromModule`
 * gate suffices per method. `TemplateError` was relocated to
 * `lib/stuff/TemplateError` (DP.2) so the facade declares only
 * `TemplateApi`.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class TemplateLogic extends Idea {
  /** See {@link TemplateApi.saveTemplate}. */
  @CallSecurity(TemplateApiCallers)
  public async saveTemplate(
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
    // Authorship ledger — this is the single centralized writer of
    // provenance (`recordAuthoring` is gated to this module). The author is
    // NOT passed: `ProvenanceLogic` derives it from the dispatched execution
    // context (`getActingAuthor`), so it can't be spoofed and is never the
    // client-controlled `data` blob. An unattributable context (programmatic
    // / system save, forced, non-avatar principal) records nothing.
    await ProvenanceApi.recordAuthoring({ path });
    return tpl._id!;
  }

  /** See {@link TemplateApi.validateFolderLeafSave}. */
  @CallSecurity(TemplateApiCallers)
  public async validateFolderLeafSave(
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

  /** See {@link TemplateApi.validateReservedPath}. */
  @CallSecurity(TemplateApiCallers)
  public async validateReservedPath(
    doc: Record<string, unknown>
  ): Promise<void> {
    const path = doc.path;
    if (typeof path !== 'string') return;
    for (const prefix of ReservedTemplatePrefixes) {
      if (path === prefix.replace(/\/$/, '') || path.startsWith(prefix)) {
        throw new TemplateError(
          `Template path '${path}' is reserved: '${prefix}' is the engine ` +
            `runtime namespace (Api logic singletons created via ` +
            `StuffApi.singletonSync); no authored template may live there.`
        );
      }
    }
  }

  /** See {@link TemplateApi.validateSingletonContainerTarget}. */
  @CallSecurity(TemplateApiCallers)
  public async validateSingletonContainerTarget(
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

    // 3. Target class must compose SingletonMixin.
    const targetCtor = (await StuffApi.loadClassByPath(targetTpl.class)) as new (
      ...args: unknown[]
    ) => unknown;
    if (!MixinApi.hasMixin(targetCtor, Mixins.Singleton)) {
      throw new TemplateError(
        `Template '${sourcePath}' declares 'data.container: ${targetPath}' ` +
          `but the target's class '${targetTpl.class}' does not compose ` +
          `SingletonMixin. The container: target must be singleton-shaped ` +
          `(see declarative-content-slate § container:).`
      );
    }
  }

  /** See {@link TemplateApi.validateFolderLeafDelete}. */
  @CallSecurity(TemplateApiCallers)
  public async validateFolderLeafDelete(id: string): Promise<void> {
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

  /** See {@link TemplateApi.ancestorPaths}. */
  @CallSecurity(TemplateApiCallers)
  public ancestorPaths(path: string): string[] {
    return Template.ancestorPaths(path);
  }

  /** See {@link TemplateApi.snapshotToTemplate}. */
  @CallSecurity(TemplateApiCallers)
  public async snapshotToTemplate(stuff: Stuff): Promise<Template> {
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

  /** See {@link TemplateApi.restoreFromTemplate}. */
  @CallSecurity(TemplateApiCallers)
  public async restoreFromTemplate(stuff: Stuff): Promise<void> {
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
