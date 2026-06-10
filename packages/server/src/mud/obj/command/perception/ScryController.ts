/**
 * ScryController — perceive a remote object via privilege bit (v1
 * deferred), an explicit `--with <instrument>`, or an
 * auto-resolved `Scryable` from the avatar's accessible objects.
 *
 * Renders a description of the target as if the avatar were
 * colocated. v1 leans on the existing description Apis; the
 * full perception-framework integration (viewer-aware shadows,
 * line-of-sight gating) lands as the perception system grows.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { DescribeApi } from '../../../api/describe';
import { ContainmentApi } from '../../../api/containment';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Scryable } from '../../../lib/perception/Scryable';

interface ScryModel extends CommandModel {
  target?: MqlOneResult;
  with?: MqlOneResult;
}

export default class ScryController extends CommandController<ScryModel> {
  execute(model: ScryModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for ${target?.raw ?? '?'}`);
    }
    const tgt = target.stuff;

    // Capability resolution: privilege (deferred — always false v1),
    // then `--with <instrument>`, then auto-resolve from accessible
    // Scryable instruments. v1's "no privilege framework yet" stance
    // means the absence of a Scryable surfaces as a clear refusal.
    const instrument = this.resolveInstrument(model.with, giver, tgt);
    if (!instrument) {
      return this.fail(
        context,
        'you have no means to scry from here',
      );
    }
    const veto = instrument.canScryFor(tgt);
    if (!veto.ok) {
      return this.fail(
        context,
        `the ${DescribeApi.getDisplayName(instrument as unknown as Stuff)} won't scry that: ${veto.reason}`,
      );
    }

    const name = DescribeApi.getDisplayName(tgt);
    const lines = [`\n${name}`];
    if (MixinApi.isVisible(tgt)) {
      lines.push('', tgt.getLong());
    } else {
      lines.push('', '(no visible description)');
    }
    const env = MixinApi.isContainable(tgt) ? tgt.getContainer() : null;
    if (env) {
      lines.push('', `(in ${DescribeApi.getDisplayName(env)})`);
    }
    this.tell(context, lines.join('\n') + '\n');
    return;
  }

  private resolveInstrument(
    withResolved: MqlOneResult | undefined,
    giver: Stuff,
    target: Stuff,
  ): Scryable | null {
    if (withResolved) {
      const stuff = withResolved.stuff;
      if (stuff && MixinApi.isScryable(stuff)) return stuff;
      return null;
    }
    // Auto-resolve: walk the avatar's environment for any Scryable.
    const env = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (env && MixinApi.isContainer(env)) {
      for (const item of ContainmentApi.getContents(env)) {
        if (MixinApi.isScryable(item)) {
          if (item.canScryFor(target).ok) return item;
        }
      }
    }
    if (MixinApi.isContainer(giver)) {
      for (const item of ContainmentApi.getContents(giver)) {
        if (MixinApi.isScryable(item)) {
          if (item.canScryFor(target).ok) return item;
        }
      }
    }
    return null;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('world.perception.sense.scry')
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

