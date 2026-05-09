/**
 * WriteController — author a content-tree template (default) or
 * source-tree file.
 *
 * The body lands on `model.body` via either input path:
 *
 *   - **Text input** (`msh write /path "content"`) — the yaml
 *     declares `body` as a greedy positional, so `msh`'s tokenizer
 *     consumes everything after the path. Fine for short bodies;
 *     multi-line content with embedded quotes is awkward through
 *     the shell tokenizer.
 *   - **Structured input** — clients that hold a code-editor buffer
 *     (or any non-textual UI) reach the same model via
 *     `CommandApi.assembleFromStructured({ verb: 'write', fields: {
 *     path, body, ... } })`. The buffer ships as a structured field
 *     with no command-line parsing in the way — quoting and
 *     escaping are non-issues. This is the path real authoring UIs
 *     use, and it is the slate's "command payload" channel — no
 *     separate accessor needed; the structured-form fields ARE the
 *     payload.
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
 * `TemplateApi.saveTemplate`. The class field defaults to a
 * generic `/lib/persistence/PersistentHydrator`-shaped leaf; real
 * authoring will likely want a richer compose verb, but this gets
 * the wire working.
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

interface WriteModel extends CommandModel {
  path?: string;
  body?: string;
  mql?: string;
  content?: boolean;
  source?: boolean;
}

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
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    if (tree === 'content') {
      const target = SourceTreeApi.joinLogical(cwd, model.path, { home });
      try {
        await TemplateApi.saveTemplate(
          target,
          '/lib/stuff/Idea',
          { body: model.body },
          '/lib/persistence/PersistentHydrator',
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
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
