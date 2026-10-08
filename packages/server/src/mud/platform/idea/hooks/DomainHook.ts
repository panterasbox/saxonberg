/**
 * DomainHook — hooks `Collections.Content` save/delete to enforce the
 * folder/leaf invariant (Phase 7 Decision 12) and to keep the
 * **location graph** current. Validation lives in `TemplateApi`; this
 * hook is the binding of the rules to the operation.
 *
 * ⭐⭐ **This is the real template write chokepoint**, not
 * `TemplateApi.saveTemplate` — which has five direct callers and is
 * bypassed by the pack installer (`PersistApi.save(Collections.Content,
 * …)`) and by `Template.save()`. Anything that must be true of *every*
 * row write belongs here.
 *
 * Composes both `AroundSaveHookMixin` and `AroundDeleteHookMixin`. Loaded
 * once at boot from `/platform/idea/hooks/DomainHook` and registered
 * against PM via `loadHooks()`.
 */

import { Idea } from '../../../lib/stuff/Idea';
import { AroundSaveHookMixin } from '../../../lib/persistence/AroundSaveHook';
import { AroundDeleteHookMixin } from '../../../lib/persistence/AroundDeleteHook';
import { TemplateApi } from '../../../api/template';
import { NavigationApi } from '../../../api/navigation';
import { DiagnosticApi } from '../../../api/diagnostics';
import { PersistApi } from '../../../api/persist';
import { Collections } from '../../../lib/persistence/Collections';
import { Template } from '../../../lib/stuff/Template';

const DomainHookBase = AroundSaveHookMixin(AroundDeleteHookMixin(Idea));

/**
 * How deep an `extends:` fan-out this hook will follow. Editing a
 * parent changes every child's effective exits, so the children have to
 * be re-projected too — bounded by the same cap `Template._materialize`
 * puts on the chain it folds.
 */
const EXTENDS_FANOUT_CAP = 32;

export default class DomainHook extends DomainHookBase {
  override async aroundSave(
    _collection: string,
    doc: Record<string, unknown>,
    next: (doc: Record<string, unknown>) => Promise<string>
  ): Promise<string> {
    await TemplateApi.validateReservedPath(doc);
    await TemplateApi.validateFolderLeafSave(doc);
    await TemplateApi.validateSingletonContainerTarget(doc);
    const id = await next(doc);
    await this.keepGraph(doc);
    return id;
  }

  override async aroundDelete(
    _collection: string,
    id: string,
    next: (id: string) => Promise<void>
  ): Promise<void> {
    await TemplateApi.validateFolderLeafDelete(id);
    // ⚠ Resolve the path BEFORE the delete — afterwards there is
    // nothing to resolve it from, and the graph would keep a node for a
    // row that no longer exists.
    let path: string | null = null;
    try {
      path = (await Template.loadById(id))?.path ?? null;
    } catch {
      path = null;
    }
    await next(id);
    if (path && NavigationApi.isGraphWarm()) {
      try {
        await NavigationApi.removeRow(path);
      } catch (err) {
        console.warn(`DomainHook: could not un-project ${path}`, err);
      }
    }
  }

  /**
   * Re-project the saved row and re-check it — **after** the write, and
   * **never fatally**.
   *
   * ⭐⭐ Any throw in here is caught, recorded as a diagnostic against
   * the row, and swallowed. The graph is derived and self-heals at the
   * next rebuild; losing an author's save to a hiccup in a derived
   * store would be the wrong trade, and an author who cannot save
   * because an index is unhappy has no way to understand why.
   *
   * ⚠ Skipped entirely until the graph has warmed. The pack installer
   * writes thousands of rows before the registry boots, and projecting
   * each one would be that many wasted upserts against a graph the
   * rebuild is about to replace wholesale.
   *
   * ⚠⚠ `private`, not `#`-private. Inside a method dispatched through
   * the call-security proxy `this` IS the proxy, and a `#` slot lives
   * only on the raw target — so `this.#keepGraph(...)` throws
   * *Receiver must be an instance of class DomainHook*. The rule is
   * CLAUDE.md § Member Privacy's second hard constraint; domain code
   * defaults to TypeScript modifiers because of it.
   */
  private async keepGraph(doc: Record<string, unknown>): Promise<void> {
    const path = typeof doc.path === 'string' ? doc.path : null;
    if (!path || !NavigationApi.isGraphWarm()) return;
    try {
      await NavigationApi.projectRow(path);
      // Editing a parent changes every child's effective exits.
      const children = (await PersistApi.find(Collections.Content, {
        extends: path,
      })) as Array<Record<string, unknown>>;
      for (const child of children.slice(0, EXTENDS_FANOUT_CAP)) {
        if (typeof child.path === 'string') {
          await NavigationApi.projectRow(child.path);
        }
      }
      for (const finding of await NavigationApi.checkGraph(path)) {
        DiagnosticApi.record({
          path: finding.path,
          severity: finding.severity,
          message: finding.dir
            ? `${finding.dir}: ${finding.detail}`
            : finding.detail,
          channel: 'location-graph',
        });
      }
    } catch (err) {
      DiagnosticApi.record({
        path,
        severity: 'warning',
        message:
          `the location graph could not be updated for this row ` +
          `(${String(err)}). The row SAVED; the graph self-heals at the ` +
          `next rebuild.`,
        channel: 'location-graph',
      });
    }
  }
}
