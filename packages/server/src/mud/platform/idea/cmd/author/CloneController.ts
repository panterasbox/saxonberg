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

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { SourceTreeApi } from '../../../../api/source-tree';
import { ContainmentApi } from '../../../../api/containment';
import type { MqlOneResult } from '../../../../api/mql';
import { AccessApi } from '../../../../api/access';
import { SandboxApi } from '../../../../api/sandbox';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../../api/execution-context';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { Template } from '../../../../lib/stuff/Template';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';

interface CloneModel extends CommandModel {
  template?: string;
  mql?: MqlOneResult;
  into?: MqlOneResult;
  here?: boolean;
  /** Mint N copies in one act (sandbox QoL, Decision L1). */
  count?: number;
  /** Explicit disambiguation for the dual-source resolution. */
  instance?: boolean;
  /** Force template-source resolution even for a live match. */
  templateSource?: boolean;
}

/** The `--count` cap — a modest rig, not a fork bomb. */
const COUNT_CAP = 20;

export default class CloneController extends CommandController<CloneModel> {
  async execute(model: CloneModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Sanctioned QoL opts (sandbox Decision L1): a bounded --count.
    const count = model.count ?? 1;
    if (!Number.isInteger(count) || count < 1) {
      return this.fail(context, 'clone --count needs a positive integer');
    }
    if (count > COUNT_CAP) {
      return this.fail(
        context,
        `clone --count caps at ${COUNT_CAP} (mint in batches)`,
        'count-capped',
      );
    }

    // Instance-source branch (the sandbox seeding aperture, Decision L):
    // when the resolved source is a LIVE object, the context carries
    // circle scope, and the actor owns it, route to seedCopy — the copy
    // carries the original's instance state and is circle-born. Default
    // stays inference (live object in-circle → seed; path → template);
    // `--instance` / `--template` disambiguate the ambiguous name.
    if (!model.templateSource && model.mql?.stuff) {
      const live = model.mql.stuff;
      const inCircle =
        ExecutionContextApi.getCircleScope() !== null &&
        ExecutionContextApi.getCircleScope() !== OMNI_SCOPE;
      if (!(live instanceof Template) && (model.instance || inCircle)) {
        if (!inCircle) {
          return this.fail(
            context,
            'clone --instance (seeding a live copy) only works inside ' +
              'your circle — enter through a wardrobe first',
            'not-in-circle',
          );
        }
        return this.seedCopies(live, count, model, context);
      }
      if (model.instance && live instanceof Template) {
        return this.fail(
          context,
          'that resolved to a template, not a live thing — drop --instance',
        );
      }
    }

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
    // fails closed on untitled ground. (See open question
    // #6 in the plan: class-allowlist for non-core authors is a
    // follow-up build.)
    // `findAllByTemplatePath`, not the singleton lookup: a live
    // instance here is only a REPRESENTATIVE for the slice walk, and
    // any of them answers the same. The singular form throws once two
    // instances share the path — which is the normal state after
    // cloning the same template twice, so the third `clone` of
    // anything died on its own access check (found live in the
    // circle, cloning a wardrobe).
    const sourceResource: Stuff | null =
      StuffApi.findAllByTemplatePath(path)[0] ?? null;
    if (!(await AccessApi.can(giver, 'clone', sourceResource))) {
      return this.fail(
        context,
        "you don't have permission to clone that",
        'access-denied',
      );
    }

    // 2. Clone (× count). Phase 2 hydration may fire `applyContainer`
    // if the template declares `data.container`; the instance may
    // self-place during this step.
    for (let i = 1; i < count; i++) {
      // Copies 2..N: clone + place, compactly reported; the first copy
      // below keeps the full reporting shape.
      try {
        const extra = await StuffApi.clone(path);
        if (MixinApi.isContainable(extra)) {
          const placement = this.resolvePlacement(
            model,
            giver,
            extra as Stuff & Containable,
            context,
          );
          if (!('error' in placement) && placement.dest !== null) {
            ContainmentApi.move(extra as Stuff & Containable, placement.dest);
          }
        }
      } catch (err) {
        return this.fail(
          context,
          `stopped at copy ${i + 1}/${count}: ${(err as Error).message}`,
        );
      }
    }
    if (count > 1) {
      this.tell(context, `\nminted ${count - 1} additional cop${count - 1 === 1 ? 'y' : 'ies'} of ${path}\n`);
    }
    let cloned: Stuff;
    try {
      cloned = await StuffApi.clone(path);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    const name = cloned.getPresentation();

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
        ? where.getPresentation()
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
    const destName = placement.dest.getPresentation();
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
          error: `${stuff.getPresentation()} is not a container`,
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

  /**
   * The seeding aperture's verb surface (sandbox Decision L): mint
   * `count` circle-born copies of a live owned object via
   * `SandboxApi.seedCopy`, then land them through the ordinary
   * `--into`/`--here`/inventory precedence. Ownership and
   * out-of-circle failures are ordinary rejection notes.
   */
  private async seedCopies(
    live: Stuff,
    count: number,
    model: CloneModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const minted: Stuff[] = [];
    for (let i = 0; i < count; i++) {
      let copy: Stuff;
      try {
        copy = await SandboxApi.seedCopy(
          giver as unknown as Parameters<typeof SandboxApi.seedCopy>[0],
          live,
        );
      } catch (err) {
        return this.fail(context, (err as Error).message, 'seed-refused');
      }
      minted.push(copy);
      if (MixinApi.isContainable(copy)) {
        const placement = this.resolvePlacement(
          model,
          giver,
          copy as Stuff & Containable,
          context,
        );
        if (!('error' in placement) && placement.dest !== null) {
          try {
            ContainmentApi.move(copy as Stuff & Containable, placement.dest);
          } catch {
            // the copy exists; placement failure is surfaced below
          }
        }
      }
    }
    const name = live.getPresentation();
    this.tell(
      context,
      count === 1
        ? `\nseeded a copy of ${name} (${minted[0]!.stuffId}) — circle-born; it dies with the circle\n`
        : `\nseeded ${count} copies of ${name} — circle-born; they die with the circle\n`,
    );
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
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
