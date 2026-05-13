/**
 * CloneController — instantiate a fresh Stuff from a template path
 * and place it somewhere in the world.
 *
 * Resolves the template path (positional `<template>` or
 * `--mql <expr>`) cwd-relative against the avatar's content tree.
 * Dispatches to `StuffApi.clone`.
 *
 * Destination resolution (precedence — explicit caller intent
 * wins over template defaults):
 *
 *   1. `--into <dest>`         — explicit Container.
 *   2. `--here`                — sugar for "the avatar's environment."
 *   3. `template.environment`  — TBD; lands when the field + the
 *                                singleton-resolution wiring ship.
 *      See `docs/slates/spawn-shape-slate.md`.
 *   4. fallback                — the avatar itself (inventory).
 *
 * No `-f` / `forceClone`: clone is "willing something new into
 * existence" — there's no per-target witness to bypass; permissions
 * are the only gate (future). See `call-security.md § AdminOnly and
 * the force-bypass shape` for the broader pattern (only destruct
 * and move qualify).
 *
 * If placement fails (destination isn't a Container, the move
 * vetoes), the verb still reports success on the *clone* itself but
 * notes the placement failure so the admin can recover the dangling
 * Stuff via stuffId.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { SourceTreeApi } from '../../api/source-tree';
import { ContainmentApi } from '../../api/containment';
import type { MqlOneResult } from '../../api/mql';
import { DescribeApi } from '../../api/describe';
import type { Stuff } from '../../lib/stuff/Stuff';
import { Template } from '../../lib/stuff/Template';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';

interface CloneModel extends CommandModel {
  template?: string;
  mql?: MqlOneResult;
  into?: MqlOneResult;
  here?: boolean;
}

export class CloneController extends CommandController<CloneModel> {
  async execute(model: CloneModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // 1. Resolve the template path.
    let path: string | null = null;
    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
      }
      // Live clone → templatePath stamp; Template doc → .path
      // identity field. Two distinct lookups, hence the
      // explicit split.
      path = stuff instanceof Template ? stuff.path : stuff.getTemplatePath();
    } else if (model.template) {
      if (MixinApi.isWorkspace(giver)) {
        const home = giver.getHome();
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

    // 2. Resolve the destination Container before cloning. If the
    // destination shape is invalid, fail before producing a
    // dangling instance.
    const destResult = this.resolveDestination(model, giver, context);
    if ('error' in destResult) {
      return this.fail(context, destResult.error);
    }
    const dest = destResult.dest;

    // 3. Clone, then place. Two phases — placement failure leaves
    // the cloned Stuff alive but unplaced; the admin gets the
    // stuffId to recover.
    let cloned: Stuff;
    try {
      cloned = await StuffApi.clone(path);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    const name = DescribeApi.getDisplayName(cloned, '?');

    if (!MixinApi.isContainable(cloned)) {
      // Can't be placed at all. Surface but don't fail the clone —
      // the instance exists; the admin can address it via stuffId.
      this.tell(
        context,
        `\ncloned ${path} → ${name} (${cloned.stuffId}); not Containable, left unplaced\n`,
      );
      return;
    }

    try {
      ContainmentApi.move(cloned as Stuff & Containable, dest);
    } catch (err) {
      this.tell(
        context,
        `\ncloned ${path} → ${name} (${cloned.stuffId}); placement failed: ${(err as Error).message}\n`,
      );
      return;
    }

    const destName = DescribeApi.getDisplayName(dest, 'somewhere');
    this.tell(
      context,
      `\ncloned ${path} → ${name} (${cloned.stuffId}) into ${destName}\n`,
    );
    return;
  }

  /**
   * Apply the destination-resolution precedence. See file header
   * for the full chain. Returns either the resolved Container or
   * an error describing why none could be picked.
   */
  private resolveDestination(
    model: CloneModel,
    giver: Stuff,
    context: CommandContext,
  ):
    | { dest: Stuff & Container }
    | { error: string } {
    // 1. --into <dest>.
    if (model.into) {
      const stuff = model.into.stuff;
      if (!stuff) {
        return { error: `no match for --into ${model.into.raw ?? ''}` };
      }
      if (!MixinApi.isContainer(stuff)) {
        return {
          error: `${DescribeApi.getDisplayName(stuff, 'that')} is not a container`,
        };
      }
      return { dest: stuff };
    }

    // 2. --here → avatar's environment (the location they're in).
    if (model.here) {
      const env = context.location;
      if (!env || !MixinApi.isContainer(env)) {
        return { error: 'no environment to place into' };
      }
      return { dest: env };
    }

    // 3. template.environment — TBD; see slates/spawn-shape-slate.md.
    //    Slot reserved between (2) and (4) so the future addition is
    //    a single insertion, no reordering.

    // 4. Fallback — the giver themselves (inventory). Avatars
    // compose Container, so this normally works; non-Container
    // givers can't catch the fallback and fail explicitly.
    if (!MixinApi.isContainer(giver)) {
      return { error: 'no destination — pass --into or --here' };
    }
    return { dest: giver };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.system.shell.author)
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
