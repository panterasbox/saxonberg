/**
 * DomainHook — hooks `Collections.Content` save/delete to enforce the
 * folder/leaf invariant (Phase 7 Decision 12). Validation lives in
 * `TemplateApi`; this hook is the binding of the rule to the operation.
 *
 * Composes both `AroundSaveHookMixin` and `AroundDeleteHookMixin`. Loaded
 * once at boot from `/platform/idea/hooks/DomainHook` and registered
 * against PM via `loadHooks()`.
 */

import { Idea } from '../../../lib/stuff/Idea';
import { AroundSaveHookMixin } from '../../../lib/persistence/AroundSaveHook';
import { AroundDeleteHookMixin } from '../../../lib/persistence/AroundDeleteHook';
import { TemplateApi } from '../../../api/template';

const DomainHookBase = AroundSaveHookMixin(AroundDeleteHookMixin(Idea));

export default class DomainHook extends DomainHookBase {
  override async aroundSave(
    _collection: string,
    doc: Record<string, unknown>,
    next: (doc: Record<string, unknown>) => Promise<string>
  ): Promise<string> {
    await TemplateApi.validateReservedPath(doc);
    await TemplateApi.validateFolderLeafSave(doc);
    await TemplateApi.validateSingletonContainerTarget(doc);
    return next(doc);
  }

  override async aroundDelete(
    _collection: string,
    id: string,
    next: (id: string) => Promise<void>
  ): Promise<void> {
    await TemplateApi.validateFolderLeafDelete(id);
    return next(id);
  }
}
