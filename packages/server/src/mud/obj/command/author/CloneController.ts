/**
 * CloneController — instantiate a fresh Stuff from a template path
 * and place it somewhere in the world.
 *
 * Resolves the template path (positional `<template>` or
 * `--mql <expr>`) cwd-relative against the avatar's content tree.
 * Dispatches to `StuffApi.clone`.
 *
 * Destination resolution (precedence):
 *
 *   1. `--into <dest>`             — explicit Container.
 *   2. `--here`                    — sugar for the avatar's environment.
 *   3. Hydration self-placement    — `applyContainer` ran during clone
 *                                    and placed the instance somewhere.
 *   4. Fallback                    — the giver's inventory.
 *
 * Step 3 is implicit: the clone runs first and observes where the
 * instance landed. Steps 1 + 2 (when present) override step 3 AFTER
 * the clone, via `ContainmentApi.move`. Step 4 fires only when the
 * post-clone container is still null.
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

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { SourceTreeApi } from '../../../api/source-tree';
import { ContainmentApi } from '../../../api/containment';
import type { MqlOneResult } from '../../../api/mql';
import { DescribeApi } from '../../../api/describe';
import { AccessApi } from '../../../api/access';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { Template } from '../../../lib/stuff/Template';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';

interface CloneModel extends CommandModel {
  template?: string;
  mql?: MqlOneResult;
  into?: MqlOneResult;
  here?: boolean;
}

export default class CloneController extends CommandController<CloneModel> {
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

    // Access check — slice walk on the SOURCE template. The clone
    // instantiates an existing class; the slice for the source path
    // decides authority. We look up the live Stuff (if any) at the
    // source path; the AccessApi walk handles a null resource by
    // falling through to the `'core'` fallback. (See open question
    // #6 in the plan: class-allowlist for non-core authors is a
    // follow-up build.)
    const sourceResource: Stuff | null =
      StuffApi.findByTemplatePath(path) ?? null;
    if (!(await AccessApi.can(giver, 'clone', sourceResource))) {
      return this.fail(
        context,
        "you don't have permission to clone that",
        'access-denied',
      );
    }

    // 2. Clone. Phase 2 hydration may fire `applyContainer` if the
    // template declares `data.container`; the instance may
    // self-place during this step.
    let cloned: Stuff;
    try {
      cloned = await StuffApi.clone(path);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    const name = DescribeApi.getDisplayName(cloned);

    if (!MixinApi.isContainable(cloned)) {
      // Can't be placed at all. Surface but don't fail the clone —
      // the instance exists; the admin can address it via stuffId.
      this.tell(
        context,
        `\ncloned ${path} → ${name} (${cloned.stuffId}); not Containable, left unplaced\n`,
      );
      return;
    }
    const item = cloned as Stuff & Containable;

    // 3. Apply destination precedence post-clone.
    const placement = this.resolvePlacement(model, giver, item, context);
    if ('error' in placement) {
      // The instance exists; surface the destination error but
      // don't fail the clone itself.
      this.tell(
        context,
        `\ncloned ${path} → ${name} (${cloned.stuffId}); destination resolution failed: ${placement.error}\n`,
      );
      return;
    }
    if (placement.dest === null) {
      // Layer 3 hit (hydration placed it); no move needed.
      const where = item.getContainer();
      const destName = where
        ? DescribeApi.getDisplayName(where)
        : 'somewhere';
      this.tell(
        context,
        `\ncloned ${path} → ${name} (${cloned.stuffId}); placed by template into ${destName}\n`,
      );
      return;
    }

    // Move to the resolved destination. May override hydration's
    // self-placement (Layer 1/2 explicit overrides Layer 3 implicit).
    const priorContainer = item.getContainer();
    const movingFromHydration =
      priorContainer !== null && priorContainer !== placement.dest;
    try {
      ContainmentApi.move(item, placement.dest);
    } catch (err) {
      this.tell(
        context,
        `\ncloned ${path} → ${name} (${cloned.stuffId}); placement failed: ${(err as Error).message}\n`,
      );
      return;
    }
    const destName = DescribeApi.getDisplayName(placement.dest);
    const overrideNote = movingFromHydration
      ? ` (overrode template's container)`
      : '';
    this.tell(
      context,
      `\ncloned ${path} → ${name} (${cloned.stuffId}) into ${destName}${overrideNote}\n`,
    );
    return;
  }

  /**
   * Apply the destination-resolution precedence. See file header
   * for the full chain.
   *
   *   - `{ dest: <container> }` — move into this Container after clone.
   *   - `{ dest: null }`        — Layer 3 hit; hydration placed the
   *                                instance; no further move.
   *   - `{ error: <reason> }`   — none of the layers resolved.
   */
  private resolvePlacement(
    model: CloneModel,
    giver: Stuff,
    item: Stuff & Containable,
    context: CommandContext,
  ):
    | { dest: (Stuff & Container) | null }
    | { error: string } {
    // Layer 1: --into <dest>.
    if (model.into) {
      const stuff = model.into.stuff;
      if (!stuff) {
        return { error: `no match for --into ${model.into.raw ?? ''}` };
      }
      if (!MixinApi.isContainer(stuff)) {
        return {
          error: `${DescribeApi.getDisplayName(stuff)} is not a container`,
        };
      }
      return { dest: stuff };
    }

    // Layer 2: --here → avatar's environment (the location they're in).
    if (model.here) {
      const env = context.location;
      if (!env || !MixinApi.isContainer(env)) {
        return { error: 'no environment to place into' };
      }
      return { dest: env };
    }

    // Layer 3: hydration self-placement. If the instance already has
    // a container, accept it — no additional move.
    if (item.getContainer() !== null) {
      return { dest: null };
    }

    // Layer 4: Fallback — the giver themselves (inventory). Avatars
    // compose Container, so this normally works; non-Container
    // givers can't catch the fallback and fail explicitly.
    if (!MixinApi.isContainer(giver)) {
      return { error: 'no destination — pass --into or --here' };
    }
    return { dest: giver };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.author')
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
