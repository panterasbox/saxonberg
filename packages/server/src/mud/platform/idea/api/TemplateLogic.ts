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
  TemplateWrite,
} from '../../../api/template';
import { Zone } from '../../../lib/zone/Zone';
import { ExecutionContextApi } from '../../../api/execution-context';
import { MixinApi, type AnyConstructor } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import { TemplateError } from '../../../lib/stuff/TemplateError';
import { ReservedTemplatePrefixes } from '../../../lib/paths';
import { ProvenanceApi } from '../../../api/provenance';
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
    return this._save(path, spec);
  }

  /**
   * See {@link TemplateApi.writeTemplate}. ⭐ The title gate is the
   * write's own, on the acting principal (controller-liquidity D9): the in-world authoring verbs
   * (`write`, `cp`, `mkdir`) reach the tree only through here.
   */
  @CallSecurity(TemplateApiCallers)
  public async writeTemplate(
    path: string,
    spec: TemplateSpec,
  ): Promise<TemplateWrite> {
    if (!(await this._mayWrite(path))) {
      return { ok: false, reason: 'access-denied', path };
    }
    await this._save(path, spec);
    return { ok: true, paths: [path] };
  }

  /**
   * See {@link TemplateApi.move}. Every refusal before the first write
   * (controller-liquidity D10, C66): title over both ends, the source
   * exists, and the source is not a parent (a folder with descendants or a
   * row others extend) — the delete that would refuse is asked FIRST, so a
   * refused move leaves no stray copy at the destination.
   */
  @CallSecurity(TemplateApiCallers)
  public async move(
    src: string,
    dst: string,
  ): Promise<TemplateWrite> {
    if (!(await this._mayWrite(src))) {
      return { ok: false, reason: 'access-denied', path: src };
    }
    if (!(await this._mayWrite(dst))) {
      return { ok: false, reason: 'access-denied', path: dst };
    }
    const tpl = await Template.findByPath(src);
    if (!tpl) return { ok: false, reason: 'no-template', path: src };
    if ((await Template.findDescendants(src)).length > 0) {
      return { ok: false, reason: 'has-descendants', path: src };
    }
    if ((await this._extendersOf(src)).length > 0) {
      return { ok: false, reason: 'extended', path: src };
    }
    // ⭐ The RAW row travels, never the effective one: a moved child is a
    // child, and flattening the chain would fork it away from its parent.
    await this._save(dst, {
      class: tpl.own.class,
      extends: tpl.extends,
      data: tpl.own.data ?? {},
    });
    await tpl.delete();
    return { ok: true, paths: [dst] };
  }

  /**
   * See {@link TemplateApi.deleteSubtree}. Title is asked of EVERY row it
   * would delete (C65 — a nested parcel is somebody else's), and a row
   * outside the subtree that extends one inside refuses, all before the
   * first delete. Deepest first, so leaves go before their folders.
   */
  @CallSecurity(TemplateApiCallers)
  public async deleteSubtree(
    path: string,
    recursive: boolean,
  ): Promise<TemplateWrite> {
    const tpl = await Template.findByPath(path);
    if (!tpl) return { ok: false, reason: 'no-template', path };
    const descendants = recursive ? await Template.findDescendants(path) : [];
    const doomed = [tpl, ...descendants];
    const doomedPaths = new Set(doomed.map((t) => t.path));
    for (const t of doomed) {
      if (!(await this._mayWrite(t.path))) {
        return { ok: false, reason: 'access-denied', path: t.path };
      }
    }
    for (const t of doomed) {
      const outside = (await this._extendersOf(t.path)).filter(
        (p) => !doomedPaths.has(p),
      );
      if (outside.length > 0) {
        return { ok: false, reason: 'extended', path: t.path };
      }
    }
    if (!recursive && (await Template.findDescendants(path)).length > 0) {
      return { ok: false, reason: 'has-descendants', path };
    }
    doomed.sort(
      (a, b) => b.path.split('/').length - a.path.split('/').length,
    );
    for (const t of doomed) await t.delete();
    return { ok: true, paths: doomed.map((t) => t.path) };
  }

  /**
   * May the acting principal write the row at `path`? Derived from the
   * dispatched context, never passed — the document store's gate
   * (`DocumentLogic`) — so it cannot be spoofed; a forced chain is
   * unattributable and refused. A live Zone there asks for the
   * zone-mutation role (`canMutateZone`); anything else the covering
   * title (`canAtPath`). Untitled is nobody's.
   */
  private async _mayWrite(path: string): Promise<boolean> {
    const giver = (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
    if (!giver) return false;
    // Lazy: the access layer reaches templates; a static import is a cycle risk.
    const { AccessApi } = await import('../../../api/access');
    const live = StuffApi.findByTemplatePath<Stuff>(path) ?? null;
    if (live instanceof Zone) return AccessApi.canMutateZone(giver, live);
    return AccessApi.canAtPath(giver, 'write-template', path);
  }

  /** The save itself — shared by `saveTemplate` and the gated writers (no self-calls through the gate). */
  private async _save(path: string, spec: TemplateSpec): Promise<string> {
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

    // ⛔ No code-naming gate (wizard-axis D5, owner 2026-11-05): a row that
    // NAMES code — `class:`, `behaviors[].brain` — is content, decided by
    // title like any other field. What bounds `class:` is
    // `lint:instanceable`; what bounds `brain:` is the brain module
    // category (only a brain module exports `brain`).

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

  /** See {@link TemplateApi.validateNoAuthoredContainer}. */
  @CallSecurity(TemplateApiCallers)
  public async validateNoAuthoredContainer(
    doc: Record<string, unknown>
  ): Promise<void> {
    const data = doc.data as Record<string, unknown> | undefined;
    if (!data || !('container' in data)) return;
    throw new TemplateError(
      `Template '${String(doc.path ?? '(unknown source)')}' authors ` +
        `'data.container'. Where a thing is is runtime state, set by ` +
        `whoever places it: a place's props: / cast:, a seat (seatIn:), ` +
        `or its creator. A producer names its goods as stock lines.`
    );
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
