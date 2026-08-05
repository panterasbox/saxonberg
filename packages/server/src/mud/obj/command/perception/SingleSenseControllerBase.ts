/**
 * SingleSenseControllerBase — abstract base for the four contact-only
 * single-sense verbs (`smell` / `listen` / `feel` / `taste`).
 *
 * Each concrete subclass supplies two abstract properties:
 *   - `senseChannel` — the `SenseChannel` literal this verb consumes
 *     (`'smell'`, `'hearing'`, `'touch'`, `'taste'`). Note: `listen`'s
 *     channel name is `'hearing'`, not `'listen'` — the verb is the
 *     user-facing action, the channel is the sense vocabulary.
 *   - `sceneTopic` — the dotted topic the Scene fires on
 *     (`'world.perception.sense.smell'`, etc.). Mirrors the existing
 *     `world.perception.<verb>` shape from `look` / `scry` / `locate`.
 *
 * Routes through three branches dispatched on the bound `target`:
 *
 *   - **null target** — polite "you don't perceive any '<query>' here."
 *     Same shape as `LookController`'s null-target fallback.
 *
 *   - **detail-via** — `target.via.detailPath` is set. The host carries
 *     `DetailedMixin`; the controller looks up the per-sense slot via
 *     `host.getDetail(dotted, senseChannel)`. A null slot returns the
 *     polite "you don't perceive anything notable about X that way"
 *     fallback. The MQL detail-keyword chain extension fires identically
 *     for all four verbs — `smell bookcase` resolves into the detail
 *     tree the same way `look bookcase` does (no MQL changes required).
 *
 *   - **Location / direct Stuff** — when the resolved target IS the
 *     current location, render JUST the location name + filtered
 *     long (no exits, no occupants — those are vision-side affordances
 *     handled by `look` / `sense`). When the target is a separate
 *     Stuff, render its name + filtered long.
 *
 * Non-Detailed direct targets get the polite "you don't perceive
 * anything notable" refusal — non-vision targets can still have
 * Detail slots, so the narrowing here is on Detailed (not Visible).
 *
 * Verb-level validators (`requiresHearing` / `requiresSmell` /
 * `requiresTouch` / `requiresTaste`) gate the giver-side sensorium
 * check before `execute` runs — by this point the giver is known to
 * have the relevant channel.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { SenseChannel } from '../../../lib/description/Perceiver';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

export interface SingleSenseModel extends CommandModel {
  target?: MqlOneResult;
}

export abstract class SingleSenseControllerBase extends CommandController<SingleSenseModel> {
  /**
   * The `SenseChannel` literal this verb consumes. Determines the
   * augmenter filter (`{ filter: [this.senseChannel] }`) and the
   * `getDetail` slot lookup (`host.getDetail(dotted, this.senseChannel)`).
   */
  protected abstract readonly senseChannel: SenseChannel;

  /**
   * Dotted topic the Scene fires on. Mirrors the existing
   * `world.perception.<verb>` shape used by `look` / `scry` / `locate`.
   */
  protected abstract readonly sceneTopic: string;

  execute(model: SingleSenseModel, context: CommandContext): void {
    const target = model.target;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      MessageApi.scene(context.commandGiver)
        .topic(this.sceneTopic)
        .toSelf(Mml.compose`You don't perceive any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    const detailPath = target.via?.detailPath;
    if (detailPath && detailPath.length > 0) {
      return this.senseDetail(target.stuff, detailPath, context);
    }
    if (target.stuff === context.location) {
      return this.senseLocation(context);
    }
    return this.senseTarget(target.stuff, context);
  }

  private senseDetail(
    host: Stuff,
    detailPath: string[],
    context: CommandContext,
  ): void {
    const dotted = detailPath.join('.');
    if (!MixinApi.isDetailed(host)) {
      MessageApi.scene(context.commandGiver)
        .topic(this.sceneTopic)
        .toSelf(Mml.compose`You don't perceive anything notable there.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-detail-here',
        detail: 'host is not Detailed',
      });
      return;
    }
    const description = host.getDetailFor(
      context.commandGiver,
      dotted,
      this.senseChannel,
    );
    if (description === null) {
      MessageApi.scene(context.commandGiver)
        .topic(this.sceneTopic)
        .toSelf(
          Mml.compose`You don't perceive anything notable about '${dotted}' that way.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'detail-not-found',
        detail: dotted,
      });
      return;
    }
    const tip = detailPath[detailPath.length - 1]!;
    const body = Mml.compose`\n${tip}\n\n${Mml.fromMarkup(description)}\n`;
    MessageApi.scene(context.commandGiver)
      .topic(this.sceneTopic)
      .toSelf(body)
      .send();
  }

  protected senseLocation(context: CommandContext): void {
    const actor = context.commandGiver;
    const location = context.location;
    if (!location) return; // defensive: placeless avatars are blocked at inbound and Login carries no sense verbs, so location is present in practice; degrade to a quiet no-op otherwise
    if (!MixinApi.isVisible(location)) {
      // Bare locations with no Visible composition surface no
      // sense-channel prose; render the indistinct fallback.
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(Mml.compose`You don't perceive anything notable here.`)
        .send();
      return;
    }
    const filtered = location
      .getMarkupLong(actor, { filter: [this.senseChannel] })
      .replace(/\s+$/, '');
    // No tagged regions surviving the filter intersection means the
    // viewer perceives nothing on this channel here — keep the
    // polite refusal so authors get a signal when authoring is
    // incomplete for a sense at this location.
    if (!filtered) {
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(Mml.compose`You don't perceive anything notable here.`)
        .send();
      return;
    }
    const body = MixinApi.isNamed(location)
      ? Mml.compose`${Mml.location(location)}\n${Mml.fromMarkup(filtered)}`
      : Mml.compose`${Mml.fromMarkup(filtered)}`;
    MessageApi.scene(actor)
      .topic(this.sceneTopic)
      .toSelf(body)
      .send();
  }

  private senseTarget(target: Stuff, context: CommandContext): void {
    const actor = context.commandGiver;
    if (!MixinApi.isDetailed(target) && !MixinApi.isVisible(target)) {
      const name = target.getPresentation();
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(
          Mml.compose`You don't perceive anything notable about ${name}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'target-not-perceivable',
        detail: name,
      });
      return;
    }
    // Run the target's long through the filtered augmenter. Untagged
    // prose always survives — vision-only authoring on a non-vision
    // verb falls through to the indistinct refusal when the filtered
    // text is empty (every `<sense>` region got stripped AND there's
    // no untagged prose left).
    const filtered = MixinApi.isVisible(target)
      ? target
          .getMarkupLong(actor, { filter: [this.senseChannel] })
          .replace(/\s+$/, '')
      : '';
    if (!filtered) {
      const name = target.getPresentation();
      MessageApi.scene(actor)
        .topic(this.sceneTopic)
        .toSelf(
          Mml.compose`You don't perceive anything notable about ${name}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-to-perceive',
        detail: name,
      });
      return;
    }
    const body = Mml.compose`\n${Mml.name(target)}\n\n${Mml.fromMarkup(filtered)}\n`;
    MessageApi.scene(actor)
      .topic(this.sceneTopic)
      .toSelf(body)
      .send();
  }
}
