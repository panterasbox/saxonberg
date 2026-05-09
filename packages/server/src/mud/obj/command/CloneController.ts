/**
 * CloneController — instantiate a fresh Stuff from a template path.
 *
 * Resolves the template path (positional `<template>` or
 * `--mql <expr>`) cwd-relative against the avatar's template tree.
 * Dispatches to `StuffApi.clone` (default) or `StuffApi.forceClone`
 * when `-f` is set.
 *
 * v1 fires no `canClone` witness at this layer — `forceClone` is the
 * admin-gated bypass for whatever per-target veto a future witness
 * lands. Today its body is identical to `clone()`; tomorrow it
 * carries the witness invocation but skips the assertion.
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
import { StuffApi } from '../../api/stuff';
import { SourceTreeApi } from '../../api/source-tree';
import { MqlApi } from '../../api/mql';
import { resolveSetting } from '../../lib/shell/Environment';
import { DescribeApi } from '../../api/describe';

interface CloneModel extends CommandModel {
  template?: string;
  mql?: string;
  force?: boolean;
}

export class CloneController extends CommandController<CloneModel> {
  async execute(model: CloneModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    let path: string | null = null;

    if (model.mql) {
      const r = MqlApi.resolveOne(model.mql, {
        commandGiver: giver,
        scope: 'reachable',
      });
      if (!r.stuff) return this.fail(context, `no match for --mql ${model.mql}`);
      path =
        (r.stuff as unknown as { path?: string }).path ??
        (r.stuff as unknown as { templatePath?: string }).templatePath ??
        null;
    } else if (model.template) {
      if (MixinApi.isWorkspace(giver)) {
        const home = resolveSetting<string>(giver, 'workspace.home') ?? '/';
        path = SourceTreeApi.joinLogical(
          giver.getCwd('content'),
          model.template,
          { home },
        );
      } else {
        path = model.template;
      }
    } else {
      return this.fail(context, 'clone needs a <template>');
    }
    if (!path) return this.fail(context, 'no template path');

    try {
      const fn = model.force ? StuffApi.forceClone : StuffApi.clone;
      const cloned = await fn(path);
      const name = DescribeApi.getDisplayName(cloned, '?');
      this.tell(context, `\ncloned ${path} → ${name} (${cloned.stuffId})\n`);
      return { success: true, summary: `cloned ${path}` };
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
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
