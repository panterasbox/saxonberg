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
 * Body delivery — `body` lives in the yaml's `payload:` block,
 * not in `args:` or `options:`. Structured-form-only: clients
 * populate it via
 * `CommandApi.assembleFromStructured({ verb: 'write', fields: {
 * path, body, ... } })`. The text-input path (`msh`) doesn't see
 * the `body` field at all — typing `msh write -s /server/foo`
 * with no structured payload errors with "missing required field:
 * body" because the structured channel never fired.
 *
 * The choice is intentional: code bodies don't ride well through
 * the shell tokenizer (multi-line, embedded quotes, etc.), and
 * the cases where a developer types a literal short body in `msh`
 * are rare enough that pushing the rare case to a different verb
 * (or a quick eval-shaped paste) is fine. Real authoring is
 * always going to be widget / editor-buffer driven; the spec
 * shape reflects that.
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
 * The field is named `body` rather than `content` to keep the
 * `--content` flag free for tree selection per the workspace verb
 * convention.
 *
 * Content tree: writes a `LeafTemplate` at the resolved path via
 * `TemplateApi.saveTemplate`. The backing class and hydrator are
 * customisable per call via `--class` / `--hydrator`; defaults are
 * `/lib/stuff/Idea` and `/lib/persistence/PersistentHydrator` for
 * a generic "data bag" template. Source tree: writes the body to
 * the resolved file via `SourceTreeApi.write`; `--class` /
 * `--hydrator` are ignored.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { SourceTreeApi, SourceTreeSandboxError } from '../../api/source-tree';
import { TemplateApi } from '../../api/template';
import type { MqlOneResult } from '../../api/mql';

interface WriteModel extends CommandModel {
  path?: string;
  body?: string;
  mql?: MqlOneResult;
  content?: boolean;
  source?: boolean;
  class?: string;
  hydrator?: string;
}

const DEFAULT_CONTENT_CLASS = '/lib/stuff/Idea';
const DEFAULT_CONTENT_HYDRATOR = '/lib/persistence/PersistentHydrator';

export class WriteController extends CommandController<WriteModel> {
  async execute(model: WriteModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      return { success: false, summary: 'this character has no workspace' };
    }
    if (!model.path) return this.fail(context, 'write needs a <path>');
    if (model.body === undefined) {
      return this.fail(context, 'write needs <body>');
    }

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
      const target = SourceTreeApi.joinLogical(cwd, model.path, { home });
      const classPath = model.class ?? DEFAULT_CONTENT_CLASS;
      // Empty string explicitly omits the hydrator; undefined uses
      // the default.
      const hydratorPath =
        model.hydrator === undefined
          ? DEFAULT_CONTENT_HYDRATOR
          : model.hydrator.length === 0
            ? undefined
            : model.hydrator;
      try {
        await TemplateApi.saveTemplate(
          target,
          classPath,
          { body: model.body },
          hydratorPath,
        );
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\nwrote ${target}\n`);
      return { success: true, summary: target };
    }

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
    return { success: true, summary: SourceTreeApi.toDisplayPath(abs) };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.system.shell.fs)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
