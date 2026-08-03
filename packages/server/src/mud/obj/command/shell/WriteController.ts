/**
 * WriteController — author a content-tree template or source-tree
 * file.
 *
 * Tree pick: honors the player's `workspace.tree` setting when
 * it points at a single tree (`content` or `source`) — same as
 * read-only verbs. Under `mirror` mode the setting doesn't pick
 * a tree, and writing the same body to both trees is nonsensical,
 * so `write` requires explicit `-c` (content) or `-s` (source) in
 * that case. The two flags are mutually exclusive when both supplied.
 *
 * Payload shape — two payload-only fields, one per tree:
 *
 *   - `data` (`type: struct`) — for content-tree writes. **Is** the
 *     template's `data` map (passed straight through to
 *     `TemplateApi.saveTemplate`), not a sub-key. The controller
 *     validates it against the resolved class's static
 *     `dataSchema: Record<string, unknown>` (JSON Schema fragment)
 *     when present; classes with no `dataSchema` accept any object.
 *   - `body` (`type: string`) — for source-tree writes. The raw
 *     file bytes, written verbatim via `SourceTreeApi.write`.
 *
 * Both fields are payload-only: clients populate them via
 * `CommandApi.assembleFromStructured({ verb: 'write', fields: {
 * path, data | body, ... } })`. The text-input path (`msh`) doesn't
 * see them — typing `msh write -s /server/foo` with no structured
 * payload errors with "missing source body" because the structured
 * channel never fired. The choice is intentional: file/code bodies
 * don't ride well through the shell tokenizer (multi-line, embedded
 * quotes); structured `data` maps obviously can't either. Real
 * authoring is widget / editor-buffer driven.
 *
 * Stuff references on this path go through the same machinery as
 * positional MQL: a payload field of `type: object` (or
 * `objects`) is resolved by `resolveAndValidate` to an
 * `MqlOneResult` / `MqlManyResult`. Raw Stuff object references
 * are NOT a valid payload shape — that would bypass MQL's
 * permission/visibility filters and the inter-stuff "address via
 * MQL" contract.
 *
 * Deferred sidecar: a separate `context.payload` channel for
 * non-field metadata (editor cursor position, draft id, binary
 * uploads) was considered and deferred. The structured-fields path
 * covers every v1 use case; if a real need for non-field metadata
 * emerges, the retrofit is additive — add the field on
 * `CommandContext`, opt controllers in.
 *
 * Content tree: writes a `LeafTemplate` at the resolved path via
 * `TemplateApi.saveTemplate`. The backing class and hydrator are
 * customisable per call via `--class` / `--hydrator`; defaults are
 * `/lib/stuff/Idea` and `/obj/persistence/PersistentHydrator` for
 * a generic "data bag" template. Source tree: writes the body to
 * the resolved file via `SourceTreeApi.write`; `--class` /
 * `--hydrator` are ignored.
 */

import { CommandController } from '../../../lib/command/CommandController';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { SourceTreeApi, SourceTreeSandboxError } from '../../../api/source-tree';
import { StuffApi } from '../../../api/stuff';
import { TemplateApi } from '../../../api/template';
import { AccessApi } from '../../../api/access';
import { Zone } from '../../../lib/zone/Zone';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { MqlOneResult } from '../../../api/mql';
import { TemplatePaths } from '../../../lib/paths';

interface WriteModel extends CommandModel {
  path?: string;
  data?: Record<string, unknown>;
  body?: string;
  mql?: MqlOneResult;
  content?: boolean;
  source?: boolean;
  class?: string;
  hydrator?: string;
}

/**
 * Optional schema-bearing shape: a class can declare
 * `static dataSchema: Record<string, unknown>` (JSON Schema fragment)
 * to opt into write-side `data` validation. Classes without it
 * accept any object.
 */
interface SchemaBearingClass {
  dataSchema?: Record<string, unknown>;
}

const DEFAULT_CONTENT_CLASS = TemplatePaths.idea;
const DEFAULT_CONTENT_HYDRATOR = TemplatePaths.persistentHydrator;

export default class WriteController extends CommandController<WriteModel> {
  async execute(model: WriteModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
    }
    if (!model.path) return this.fail(context, 'write needs a <path>');

    if (model.content && model.source) {
      return this.fail(
        context,
        'write: -c and -s are mutually exclusive',
      );
    }
    // Under `mirror` mode the setting doesn't pick a single tree, and
    // writing the same body to both is nonsensical — force the
    // author to pick. In single-tree modes the setting decides.
    if (
      !model.content &&
      !model.source &&
      giver.getTreeMode() === 'mirror'
    ) {
      return this.fail(
        context,
        'write requires -c (content) or -s (source) when workspace.tree is mirror',
      );
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    if (tree === 'content') {
      if (model.data === undefined) {
        return this.fail(context, 'write -c needs payload `data` (struct)');
      }
      const target = SourceTreeApi.joinLogical(cwd, model.path, { home });
      const contentErr = await this._gateContentWrite(giver, target);
      if (contentErr) return this.fail(context, contentErr, 'access-denied');
      const classPath = model.class ?? DEFAULT_CONTENT_CLASS;
      // Empty string explicitly omits the hydrator; undefined uses
      // the default.
      const hydratorPath =
        model.hydrator === undefined
          ? DEFAULT_CONTENT_HYDRATOR
          : model.hydrator.length === 0
            ? undefined
            : model.hydrator;
      // Class-attached schema check: classes opt in by exporting
      // `static dataSchema`. Async load goes through the cache after
      // the first hit, so the typical path is cheap.
      const schemaErr = await this._validateAgainstClassSchema(
        classPath,
        model.data,
      );
      if (schemaErr !== null) return this.fail(context, schemaErr);
      try {
        // The authoring act is attributed inside saveTemplate from the
        // dispatched execution context (this verb's command giver) — the
        // controller passes no author; it can't be spoofed. The access check
        // above already gated this write.
        await TemplateApi.saveTemplate(
          target,
          classPath,
          model.data,
          hydratorPath,
        );
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\nwrote ${target}\n`);
      return;
    }

    if (model.body === undefined) {
      return this.fail(context, 'write -s needs payload `body` (string)');
    }
    const sourceLogical = SourceTreeApi.joinLogical(cwd, model.path, { home });
    const sourceErr = await this._gateSourceWrite(giver, sourceLogical);
    if (sourceErr) return this.fail(context, sourceErr, 'access-denied');
    let abs: string;
    try {
      abs = SourceTreeApi.resolvePath(cwd, model.path, { home });
    } catch (err) {
      if (err instanceof SourceTreeSandboxError) {
        return this.fail(context, err.message);
      }
      throw err;
    }
    await SourceTreeApi.write(abs, model.body);
    this.tell(context, `\nwrote ${SourceTreeApi.toDisplayPath(abs)}\n`);
    return;
  }

  /**
   * Resolve `classPath`, read its optional `static dataSchema`, and
   * validate `data` against it. Returns `null` when the class has
   * no schema or the value satisfies it; a friendly error string
   * otherwise. Class-load errors propagate to the caller's catch
   * and surface through `this.fail`.
   */
  private async _validateAgainstClassSchema(
    classPath: string,
    data: Record<string, unknown>,
  ): Promise<string | null> {
    let cls: unknown;
    try {
      cls = await StuffApi.loadClassByPath(classPath);
    } catch (err) {
      return (err as Error).message;
    }
    const schema = (cls as SchemaBearingClass | undefined)?.dataSchema;
    if (!schema) return null;
    const err = CommandApi.validateAgainstJsonSchema(schema, data);
    return err === null ? null : `data: ${err}`;
  }

  /**
   * Content-tree write gate. If the resolved path corresponds to an
   * extant Zone Template (live FolderZone or live SpatialZone),
   * route to `canMutateZone`. Otherwise consult the slice walk on
   * the target's Stuff (or null when no live instance — the walk
   * then falls through to the `'core'` fallback).
   *
   * Returns null on allow, a human-readable error string on deny.
   */
  private async _gateContentWrite(
    giver: Stuff,
    target: string,
  ): Promise<string | null> {
    const liveAtTarget = StuffApi.findByTemplatePath<Stuff>(target) ?? null;
    if (liveAtTarget instanceof Zone) {
      if (!(await AccessApi.canMutateZone(giver, liveAtTarget))) {
        return "you don't have permission to mutate that zone";
      }
      return null;
    }
    if (!(await AccessApi.can(giver, 'write', liveAtTarget))) {
      return "you don't have permission to write there";
    }
    return null;
  }

  /**
   * Source-tree write gate. Two checks must pass:
   *   1. `isWizard(giver)` — TS escape (code-trust) capability.
   *   2. `can(giver, 'write', resolveSourceFolderZone(path))` — the
   *      slice walk constrains which area of source you can write to.
   */
  private async _gateSourceWrite(
    giver: Stuff,
    sourceLogical: string,
  ): Promise<string | null> {
    if (!(await AccessApi.isWizard(giver))) {
      return "you don't have permission to write source";
    }
    const resource = await AccessApi.resolveSourceFolderZone(sourceLogical);
    if (!(await AccessApi.can(giver, 'write', resource))) {
      return "you don't have permission to write to that source slice";
    }
    return null;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.fs')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}
