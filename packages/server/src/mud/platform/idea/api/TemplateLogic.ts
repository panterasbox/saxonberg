// TemplateLogic — the hot-reloadable logic singleton behind TemplateApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { Collections } from '../../../lib/persistence/Collections';
import { PersistApi } from '../../../api/persist';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { ZoneApi } from '../../../api/zone';
import { Template, type TemplateSpec } from '../../../lib/stuff/Template';
import { ZoneTemplate } from '../../../lib/stuff/ZoneTemplate';
import { LeafTemplate } from '../../../lib/stuff/LeafTemplate';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import { TemplateError } from '../../../lib/stuff/TemplateError';
import { ReservedTemplatePrefixes } from '../../../lib/paths';
import { ProvenanceApi } from '../../../api/provenance';
import { AccessApi } from '../../../api/access';
import { ExecutionContextApi } from '../../../api/execution-context';
import { CodeNamingFields } from '../../../lib/stuff/CodeNamingFields';
import Avatar from '../../agent/Avatar';
import type { Stuff } from '../../../lib/stuff/Stuff';
import PersistentHydrator from '../persistence/PersistentHydrator';

const TemplateApiCallers = SecurityPolicies.FromModule('/api/template#TemplateApi'
);

/**
 * TemplateLogic — the hot-reloadable logic singleton behind
 * {@link TemplateApi}.
 *
 * Lives at `/platform/idea/api/template` (a stateless `Stuff` singleton, no
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
export class TemplateLogic extends ApiLogic {
  /** See {@link TemplateApi.saveTemplate}. */
  @CallSecurity(TemplateApiCallers)
  public async saveTemplate(
    path: string,
    spec: TemplateSpec,
  ): Promise<string> {
    const existing = await Template.findByPath(path);
    const classPath = spec.class;
    const data = spec.data;
    const hydratorClassPath = spec.hydratorClass;

    // A row states a class or names a parent; neither is a row that
    // clones into nothing.
    if (classPath === undefined && spec.extends === undefined) {
      throw new TemplateError(
        `Template '${path}' must state a 'class' or name a parent with ` +
          `'extends'.`,
      );
    }
    // The chain is validated HERE, at the authoring door, rather than at
    // the first clone: a dangling or cyclic parent authored now is a
    // failure somebody else meets later, somewhere else.
    if (spec.extends !== undefined) {
      if (spec.extends === path) {
        throw new TemplateError(
          `Template '${path}' cannot extend itself.`,
        );
      }
      const parent = await Template.findByPath(spec.extends);
      if (!parent) {
        throw new TemplateError(
          `Template '${path}' extends '${spec.extends}', which does not ` +
            `exist.`,
        );
      }
      if (parent.chain.includes(path)) {
        throw new TemplateError(
          `Template '${path}' cannot extend '${spec.extends}': that would ` +
            `close a cycle (${[spec.extends, ...parent.chain].join(' -> ')}).`,
        );
      }
      if ((classPath ?? parent.class) === '') {
        throw new TemplateError(
          `Template '${path}' extends '${spec.extends}', but no row in that ` +
            `chain states a 'class'.`,
        );
      }
    }

    // Code-trust lockdown: a non-wizard author (a protowizard) may not
    // introduce or change a direct code-naming field
    // (`class` / `hydratorClass` / `behaviors[].brain`). The actor is
    // derived from the execution context (never caller-supplied); the
    // `existing` doc is the diff baseline. See access.md § The
    // code-trust lockdown.
    await this.enforceCodeFieldGate(
      classPath,
      data,
      hydratorClassPath,
      existing,
    );

    // The folder/leaf subclass follows the EFFECTIVE class — a child
    // that states none is the folder (or leaf) its parent is.
    const effectiveClass =
      classPath ??
      (spec.extends !== undefined
        ? ((await Template.findByPath(spec.extends))?.class ?? '')
        : '');
    const tpl =
      existing ??
      ((await ZoneApi.isFolderClass(effectiveClass))
        ? new ZoneTemplate()
        : new LeafTemplate());
    tpl.path = path;
    tpl.setOwn(spec);
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

  /**
   * The code-field gate (wizard-authority). Enforces that a non-wizard
   * content author cannot set or change any **direct code-naming field**
   * — `class`, `hydratorClass`, or any `behaviors[].brain` — on a
   * content template, since each resolves to executable code at clone /
   * hydrate / behavior-fire time. The transitive reference fields close
   * by construction (every referenced template passed this same gate).
   *
   * Allow ladder (gated-api-actor-from-context rule):
   *  1. no attributable Avatar author (system / bootstrap / forced /
   *     cross-actor / pre-Avatar login + char-gen + guest provisioning)
   *     → ALLOW;
   *  2. a wizard (`AccessApi.isWizard`) → ALLOW;
   *  3. else (a protowizard) → enforce the delta rule below.
   *
   * The delta rule rejects a write that **introduces or changes** a
   * code-naming field vs. the `existing` doc: `class` / `hydratorClass`
   * inequality, or an incoming brain multiset that is not a subset of
   * the existing one. A pure cosmetic edit (same class/hydrator, brain
   * set unchanged-or-reduced) passes — the protowizard authoring path.
   *
   * Structural carve-out (D4): a `mkdir`-shaped write — a Zone/folder
   * `class` with no behaviors and the standard (or absent) hydrator —
   * is exempt. A folder class is engine code by construction, carries no
   * author-chosen executable strategy, and is constrained by the
   * folder/leaf invariant. The carve-out admits *any* `isFolderClass`
   * value (broader than the single `FolderZone` that `mkdir` emits); the
   * no-behaviors + standard-hydrator clauses keep it from smuggling an
   * executable strategy. It is not a code-execution escape (every folder
   * class is wizard-authored engine code), though it does let a
   * protowizard turn a leaf template into a folder — a content-integrity
   * edge gated by ordinary content-write access, not a code-trust one.
   *
   * Placement (D6): this gate is enforced at `saveTemplate`, the *authoring*
   * chokepoint where the acting author and the in-world/CMS intent live —
   * deliberately, not at the universal `DomainHook.aroundSave` where the
   * folder/leaf invariant sits. The trade-off: a future path that mutates a
   * `Template` and calls `tpl.save()` directly would bypass *this* gate while
   * still tripping folder/leaf validation, and the drift-guard watches
   * resolver call-sites, not template-write sites. No protowizard-reachable
   * path does that today (the only non-`saveTemplate` authoring writer,
   * `PackLogic`, is wizard-gated at the `pack` verb); if one is ever added,
   * the gate moves to `aroundSave` beside `validateFolderLeafSave`.
   */
  private async enforceCodeFieldGate(
    classPath: string | undefined,
    data: Record<string, unknown>,
    hydratorClassPath: string | undefined,
    existing: Template | null,
  ): Promise<void> {
    const actor = ExecutionContextApi.getActingAuthor();
    if (!(actor instanceof Avatar)) return; // provisioning / system → allow
    if (await AccessApi.isWizard(actor)) return; // code trust → allow

    // ⭐ The baseline is the RAW row, never the effective one. A
    // protowizard editing a class-less child must not be refused for
    // "changing" a class the row never stated.
    const incomingBrains = CodeNamingFields.extractBrains(data);
    const existingBrains = CodeNamingFields.extractBrains(existing?.own.data);

    // A structural folder scaffold (mkdir / lounge seed) carries no
    // author-chosen executable strategy — exempt its class + standard
    // hydrator. Requiring no behaviors + the standard hydrator prevents
    // smuggling a brain/hydrator in under a folder class.
    const standardHydrator =
      hydratorClassPath === undefined ||
      hydratorClassPath === PersistentHydrator.templatePath;
    const folderScaffold =
      incomingBrains.length === 0 &&
      standardHydrator &&
      classPath !== undefined &&
      (await ZoneApi.isFolderClass(classPath));

    const violations: string[] = [];

    if (classPath !== (existing?.own.class ?? undefined) && !folderScaffold) {
      violations.push('class');
    }
    if (
      (hydratorClassPath ?? undefined) !==
        (existing?.own.hydratorClass ?? undefined) &&
      !folderScaffold
    ) {
      violations.push('hydratorClass');
    }
    if (!CodeNamingFields.isMultisetSubset(incomingBrains, existingBrains)) {
      violations.push('behaviors[].brain');
    }

    if (violations.length > 0) {
      throw new TemplateError(
        `only a wizard may set executable code-naming field(s) ` +
          `[${violations.join(', ')}] on a content template; protowizards ` +
          `author by cloning/customizing wizard-made templates`,
      );
    }
  }

  /** See {@link TemplateApi.distinctClasses}. */
  @CallSecurity(TemplateApiCallers)
  public async distinctClasses(): Promise<string[]> {
    const raw = await PersistApi.distinct(Collections.Content, 'class');
    return raw.filter((c): c is string => typeof c === 'string' && c.length > 0);
  }

  /** See {@link TemplateApi.validateFolderLeafSave}. */
  @CallSecurity(TemplateApiCallers)
  public async validateFolderLeafSave(
    doc: Record<string, unknown>
  ): Promise<void> {
    const path = doc.path;
    if (typeof path !== 'string') {
      throw new TemplateError(
        `Domain template must have a string 'path' field`
      );
    }
    // ⭐ A row states a class OR names a parent. The invariant below is
    // about the EFFECTIVE class, because that is what the row clones
    // into — a child that states nothing is the folder its parent is.
    const classPath = await this.effectiveClassOfDoc(doc);
    if (classPath === null) {
      throw new TemplateError(
        `Domain template at '${String(path)}' must have a string 'class' ` +
          `field or name a parent with 'extends'`
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
    const sourceClass = await this.effectiveClassOfDoc(doc);
    if (sourceClass === null || sourceClass === '') return; // folder-leaf validator handles
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

  /**
   * The EFFECTIVE class a candidate stored doc resolves to: its own
   * `class` when stated, else the class its parent chain supplies.
   * `null` when the doc names neither.
   */
  private async effectiveClassOfDoc(
    doc: Record<string, unknown>,
  ): Promise<string | null> {
    if (typeof doc.class === 'string' && doc.class.length > 0) {
      return doc.class;
    }
    if (typeof doc.extends === 'string' && doc.extends.length > 0) {
      const parent = await Template.findByPath(doc.extends);
      if (!parent) {
        throw new TemplateError(
          `Template '${String(doc.path)}' extends '${doc.extends}', which ` +
            `does not exist.`,
        );
      }
      return parent.class;
    }
    return null;
  }

  /** See {@link TemplateApi.findExtenders}. */
  @CallSecurity(TemplateApiCallers)
  public async findExtenders(path: string): Promise<string[]> {
    return this._extendersOf(path);
  }

  /**
   * The ungated read behind {@link findExtenders}. Separate because the
   * delete validator needs the same answer and this singleton is
   * 0-self-call by construction — a gated method calling another gated
   * method on the same proxy is denied.
   */
  private async _extendersOf(path: string): Promise<string[]> {
    const docs = (await PersistApi.find(Collections.Content, {
      extends: path,
    })) as Record<string, unknown>[];
    return docs
      .map((d) => d.path)
      .filter((p): p is string => typeof p === 'string');
  }

  /** See {@link TemplateApi.validateFolderLeafDelete}. */
  @CallSecurity(TemplateApiCallers)
  public async validateFolderLeafDelete(id: string): Promise<void> {
    const tpl = await Template.loadById(id);
    if (!tpl) return;
    // ⭐⭐ A parent may not be deleted out from under its children. Fires
    // at the PM chokepoint, so it holds for EVERY writer — `rm`, `mv`,
    // the CMS and `pack sync` alike — rather than at one verb.
    const extenders = await this._extendersOf(tpl.path);
    if (extenders.length > 0) {
      throw new TemplateError(
        `Cannot delete '${tpl.path}'; it is extended by ` +
          `${extenders.slice(0, 5).map((p) => `'${p}'`).join(', ')}` +
          `${extenders.length > 5 ? ` and ${extenders.length - 5} more` : ''}` +
          ` — delete or re-parent them first.`,
      );
    }
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
