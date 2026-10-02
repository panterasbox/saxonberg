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
import type {
  FillDescription,
  FillField,
} from '../../../api/template';
import { MixinApi, type AnyConstructor } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import { TemplateError } from '../../../lib/stuff/TemplateError';
import { ReservedTemplatePrefixes } from '../../../lib/paths';
import { ProvenanceApi } from '../../../api/provenance';
import { AccessApi } from '../../../api/access';
import { ExecutionContextApi } from '../../../api/execution-context';
import { CodeNamingFields } from '../../../lib/stuff/CodeNamingFields';
import Avatar from '../../../lib/character/Avatar';
import type { Stuff } from '../../../lib/stuff/Stuff';
import TemplateApplier from '../TemplateApplier';

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
 * Stateless by construction (no `onCreate` override). 0-self-call:
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
    // (`class` / `behaviors[].brain`). The actor is derived from the
    // execution context (never caller-supplied); the `existing` doc is
    // the diff baseline. See access.md § The code-trust lockdown.
    await this.enforceCodeFieldGate(classPath, data, existing);

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
   * — `class` or any `behaviors[].brain` — on a
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
   * code-naming field vs. the `existing` doc: `class`
   * inequality, or an incoming brain multiset that is not a subset of
   * the existing one. A pure cosmetic edit (same class, brain set
   * unchanged-or-reduced) passes — the protowizard authoring path.
   *
   * Structural carve-out (D4): a `mkdir`-shaped write — a Zone/folder
   * `class` with no behaviors —
   * is exempt. A folder class is engine code by construction, carries no
   * author-chosen executable strategy, and is constrained by the
   * folder/leaf invariant. The carve-out admits *any* `isFolderClass`
   * value (broader than the single `FolderZone` that `mkdir` emits); the
   * no-behaviors clause keeps it from smuggling an
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
  // ⚠⚠ **This gate's name is a claim its `class` arm cannot support, and
  // the claim is recorded as wrong rather than quietly kept.**
  //
  // Reviewer, 2026-10-02: *"naming a class isn't code trust. PUBLISHING a
  // class is. the act of publishing means 'you can use this' — there's no
  // 'only x templates may use my code', it's an open source project."*
  // Three things in this file and its neighbours agree:
  //
  //   1. ⛔ on a create `existing` is null, so ANY `classPath` violates —
  //      the gate refuses a class five hundred rows already name, so it
  //      is not guarding a decision to bring code into play;
  //   2. ⛔ a protowizard reaches the identical instance through
  //      `extends` (a class-less child of a row naming that class) — same
  //      constructor, same `onCreate`, same mixins. A hop, not a boundary;
  //   3. ⛔ `lint:instanceable` ALREADY declares which classes content may
  //      name, structurally and author-independently (not `/lib/`,
  //      resolves, under a branch segment). That is
  //      publishing-for-content; a per-author gate on top is redundant.
  //
  // What the `class` arm actually does is stop a non-wizard being
  // author-of-record for a row that STATES a class — bookkeeping.
  //
  // ⭐ `behaviors[].brain` survives, under a different name: a brain is
  // data the engine runs BY ITSELF, on a timer, with no player act. That
  // is autonomy and shared-world resource, not code provenance.
  //
  // ⭐⭐ And the distinction the gate was groping for lives elsewhere
  // entirely: **a row is a RECORD; CLONING is execution.** Authoring is
  // inert — cloning is what runs the class's initialization. If instancing
  // a class should be privileged, that is the CLASS's question, asked of
  // whoever is instancing, and neither the row's business nor hydration's.
  // ⚠ It is also not a call-security question: inside the clone pipeline
  // the caller is always `StuffApi` by design, so `@CallSecurity` answers
  // *which code*, where the question is *which person* — `AccessApi`'s
  // axis. See access.md § The code-trust lockdown for the shape (a static
  // veto seam, the `canDestruct` pattern) and for why it is a non-issue
  // today.
  private async enforceCodeFieldGate(
    classPath: string | undefined,
    data: Record<string, unknown>,
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
    // author-chosen executable strategy — exempt its class. Requiring no
    // behaviors prevents smuggling a brain in under a folder class.
    // ⭐ The `hydratorClass` arm went with the field (2026-10-01), not
    // with an exemption: there is no applier for a scaffold to smuggle.
    const folderScaffold =
      incomingBrains.length === 0 &&
      classPath !== undefined &&
      (await ZoneApi.isFolderClass(classPath));

    const violations: string[] = [];

    if (classPath !== (existing?.own.class ?? undefined) && !folderScaffold) {
      violations.push('class');
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

  /** See {@link TemplateApi.describeFill}. */
  @CallSecurity(TemplateApiCallers)
  public async describeFill(spec: {
    path?: string;
    class?: string;
    extends?: string;
    data?: Record<string, unknown>;
  }): Promise<FillDescription> {
    // The EFFECTIVE class and data: a child states only what differs, so
    // asking a class-less row what fills it has to follow the chain.
    let cls = spec.class;
    let data = spec.data ?? {};
    if (spec.path !== undefined && (cls === undefined || spec.data === undefined)) {
      const tpl = await Template.findByPath(spec.path);
      if (tpl) {
        cls = cls ?? (tpl.class || undefined);
        data = spec.data ?? (tpl.data ?? {});
      }
    }
    if (cls === undefined && spec.extends !== undefined) {
      const parent = await Template.findByPath(spec.extends);
      cls = parent?.class || undefined;
    }
    if (!cls) {
      return { applies: [], unapplied: Object.keys(data), remembers: [] };
    }

    let ctor: AnyConstructor;
    try {
      ctor = (await StuffApi.loadClassByPath(cls)) as AnyConstructor;
    } catch {
      // An unresolvable class is the clone pipeline's error to raise, with
      // its own message. Here it only means we cannot say what applies —
      // and saying nothing is better than saying "nothing applies", which
      // would read as a finding about the row.
      return { applies: [], unapplied: [], remembers: [] };
    }

    const meta = MixinApi.getAllFieldMeta(ctor) as Record<
      string,
      { persistent?: true; instruction?: true; seed?: true; birthOnly?: true }
    >;
    const applies: FillField[] = [];
    const unapplied: string[] = [];
    for (const key of Object.keys(data)) {
      const entry = meta[key];
      if (entry?.persistent) {
        applies.push({
          field: key,
          phase: entry.seed ? 'seed' : 'property',
          birthOnly: entry.birthOnly === true,
        });
      } else if (entry?.instruction) {
        applies.push({ field: key, phase: 'instruction', birthOnly: false });
      } else if (entry?.seed) {
        applies.push({ field: key, phase: 'seed', birthOnly: false });
      } else {
        unapplied.push(key);
      }
    }

    // ⭐ What the world will REMEMBER about an instance of this row, as
    // its composition declares it — the other half of "what fills this
    // in", and the half an author had no way to see at all.
    const remembers = MixinApi.getPersistenceContributors(ctor)
      .filter((c) => c.source !== undefined)
      .map((c) => ({ mixin: c.key, source: c.source!.name }));

    return { applies, unapplied, remembers };
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
    const applier = await StuffApi.singleton<TemplateApplier>(
      TemplateApplier.templatePath
    );
    // ⚠⚠ GO-LIVE, not mint. This re-applies an edited row to objects
    // that are ALREADY IN THE WORLD, so it must not push a `birthOnly`
    // field (a stack's `quantity`) and must not re-seed an authored
    // history. Going live on the coin row used to reset every coin
    // stack in the game to its authored `quantity: 1` — minting and
    // burning outside the conservation chokepoint, invisibly.
    await applier.apply(stuff, tpl.data ?? {}, { mode: 'go-live' });
  }
}
