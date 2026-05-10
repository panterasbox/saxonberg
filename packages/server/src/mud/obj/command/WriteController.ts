/**
 * WriteController — author a content-tree template or source-tree
 * file.
 *
 * Tree pick: `write` requires explicit `-c` (content) or `-s`
 * (source). Unlike read-only verbs (cd / ls / cat) the
 * `workspace.tree` setting is NOT consulted as a fallback —
 * content templates and source files diverge by purpose, and
 * silently defaulting to the wrong tree is the kind of mistake
 * that's hard to undo. Spell it out per call.
 *
 * Body delivery — two input paths landing on `model.body`:
 *
 *   - **Text input** (`msh write -s /server/foo "content"`) — the
 *     yaml declares `body` as a greedy positional, so `msh`'s
 *     tokenizer consumes everything after the path. Fine for
 *     short bodies; multi-line content with embedded quotes is
 *     awkward through the shell tokenizer.
 *   - **Structured input** — clients that hold a code-editor buffer
 *     (or any non-textual UI) reach the same model via
 *     `CommandApi.assembleFromStructured({ verb: 'write', fields: {
 *     path, body, ... } })`. The buffer ships as a structured field
 *     with no command-line parsing in the way — quoting and
 *     escaping are non-issues. This is the path real authoring UIs
 *     use, and it is the slate's "command payload" channel — no
 *     separate accessor needed; the structured-form fields ARE the
 *     payload. The matcher's `coerceStructuredValue` accepts a
 *     string for `type: string` fields, so the same `body` field
 *     handles both paths.
 *
 * Stuff references on this path go through the same machinery as
 * text input: a string field carrying an MQL expression
 * (`'#abc123'`, `'/obj/Avatar/foo'`, etc.) is resolved by
 * `resolveAndValidate` for `type: object` fields. Raw Stuff object
 * references are NOT a valid payload shape — that would bypass
 * MQL's permission/visibility filters and the inter-stuff
 * "address via MQL" contract.
 *
 * Deferred sidecar: a separate `context.payload` channel for
 * non-field metadata (editor cursor position, draft id, binary
 * uploads) was considered and deferred. The structured-fields path
 * covers every v1 use case; if a real need for non-field metadata
 * emerges, the retrofit is additive — add the field on
 * `CommandContext`, opt controllers in. Don't reach for it
 * speculatively.
 *
 * The arg is named `body` rather than `content` to leave the
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

    // Require explicit -c or -s. write doesn't honor the
    // workspace.tree fallback because content / source diverge by
    // purpose and silently defaulting is too easy to mis-author.
    if (!model.content && !model.source) {
      return this.fail(
        context,
        'write requires -c (content) or -s (source)',
      );
    }
    if (model.content && model.source) {
      return this.fail(
        context,
        'write: -c and -s are mutually exclusive',
      );
    }
    const tree = model.source ? 'source' : 'content';
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
