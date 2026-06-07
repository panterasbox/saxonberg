/**
 * SenseController — the gestalt perception verb. Bare form renders
 * the current location with the augmenter's filter set to the
 * viewer's full `BodyPlan.getModalities()`; targeted form renders
 * a Visible target with the same gestalt filter. Detail lookup
 * uses `'vision'` (the dominant verb default — the slate's
 * "click = look" rule).
 *
 * The gestalt is the dominant room-presentation verb post-this-build.
 * `Avatar.enter` and `Mobile.traverse`/`teleport`/`Goto -l` fire
 * `sense` (not `look`) on arrival so a player perceives a new room
 * across every channel they possess without typing five commands.
 *
 * Three rendering branches mirror `LookController`'s structure but
 * each runs the augmenter with the viewer's full sensorium filter:
 *
 *   - **Detail-via** — `target.via.detailPath` set. Detail lookup
 *     uses sense `'vision'` per AC #27 (the gestalt's detail-drill
 *     default; smell/touch/etc. require the verb-specific single-
 *     sense form).
 *
 *   - **Location** — render name + filtered long + exits + occupants.
 *     The vision-bound affordances (exits, occupant list) stay because
 *     this verb IS the room presentation now.
 *
 *   - **Direct target** — name + filtered long, same shape as
 *     `LookController.lookAtTarget`.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
import { SpeciesApi } from '../../api/species';
import type { Exit } from '../../lib/boundary/Exit';

interface SenseModel extends CommandModel {
  target?: MqlOneResult;
}

/**
 * Default perception topic — used when the frame's body carries no
 * channel attribution (polite refusals, no-target paths, legacy
 * untagged prose). Matches the slate's "untagged prose is
 * vision-implicit" rule.
 */
const DEFAULT_TOPIC = 'world.perception.vision';

/**
 * Topic when the body genuinely spans more than one channel — only
 * the multi-channel `sense` verb can reach this state, and only
 * when the room's authored content actually has surviving regions
 * on multiple channels after the filter intersection.
 */
const GESTALT_TOPIC = 'world.perception.gestalt';

/**
 * Resolve the perception topic for a frame whose body is
 * `filteredText` (the augmented, sense-stripped prose the viewer
 * will actually see). Walks the body's surviving
 * `<sense channel="X">` and `<detail sense="X">` regions:
 *
 *   - Empty channel set → `DEFAULT_TOPIC` (vision; untagged prose
 *     default).
 *   - Singleton `{X}` → `world.perception.X` (the body lives
 *     exclusively on that channel — could be sense-on-vision-only-
 *     room collapsing to vision, sense-on-smell-only-room
 *     collapsing to smell, etc.).
 *   - Multi → `GESTALT_TOPIC` (genuine multi-channel content).
 *
 * The principle: the topic describes the content the frame
 * carries, not the verb that produced it. A `sense` invocation
 * whose filtered body lands on only vision fires the same topic
 * as a `look` would.
 */
function resolveTopic(filteredText: string): string {
  const channels = Mml.collectSenseChannels(filteredText);
  if (channels.size === 0) return DEFAULT_TOPIC;
  if (channels.size === 1) {
    return `world.perception.${channels.values().next().value}`;
  }
  return GESTALT_TOPIC;
}

export class SenseController extends CommandController<SenseModel> {
  execute(model: SenseModel, context: CommandContext): void {
    const target = model.target;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      MessageApi.scene(context.commandGiver)
        .topic(DEFAULT_TOPIC)
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
    const actor = context.commandGiver;
    if (!MixinApi.isDetailed(host)) {
      MessageApi.scene(actor)
        .topic(DEFAULT_TOPIC)
        .toSelf(Mml.compose`You don't perceive anything notable there.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-detail-here',
        detail: 'host is not Detailed',
      });
      return;
    }
    // Detail lookup uses sense='vision' — AC #27 / the slate's
    // "click = look" rule. The single-sense verbs are the path for
    // smell/touch/etc. detail prose.
    const dotted = detailPath.join('.');
    const description = host.getDetail(dotted, 'vision');
    if (description === null) {
      MessageApi.scene(actor)
        .topic(DEFAULT_TOPIC)
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
    MessageApi.scene(actor)
      .topic(resolveTopic(description))
      .toSelf(body)
      .send();
  }

  private senseLocation(context: CommandContext): void {
    const actor = context.commandGiver;
    const location = context.location;
    const sensorium = SpeciesApi.deriveSensorium(actor);
    const hasVisible = MixinApi.isVisible(location);
    const hasExits = MixinApi.isExitable(location);
    const hasName = MixinApi.isNamed(location);

    const visibleContents = location
      .getContents()
      .filter((item) => {
        if (item.stuffId === actor.stuffId) return false;
        if (MixinApi.isAdornment(item)) return false;
        if (!MixinApi.isVisible(item)) return false;
        return true;
      });

    if (
      !hasVisible &&
      !hasExits &&
      !hasName &&
      visibleContents.length === 0
    ) {
      MessageApi.scene(actor)
        .topic(DEFAULT_TOPIC)
        .toSelf(Mml.compose`Your surroundings are indistinct.`)
        .send();
      return;
    }

    // `getMarkupLong(viewer, { filter: sensorium })` runs the
    // augmenter with the viewer's full perceptible-channels set.
    // The augmenter's filter ∩ sensorium = sensorium, so every
    // <sense> region whose channel the viewer perceives survives;
    // channels they can't perceive (a sightless viewer's vision
    // regions) strip. Untagged prose always survives.
    const longText = MixinApi.isVisible(location)
      ? location
          .getMarkupLong(actor, { filter: sensorium })
          .replace(/\s+$/, '')
      : '';
    let body = Mml.compose`${Mml.location(location)}`;
    if (hasVisible) {
      body = Mml.compose`${body}\n${Mml.fromMarkup(longText)}`;
    }
    if (hasExits) {
      const exitsLine = this.formatExits(location.getObviousExits());
      if (exitsLine) {
        body = Mml.compose`${body}\n${exitsLine}`;
      }
    }
    if (visibleContents.length > 0) {
      const items = visibleContents.map((item) => Mml.item(item));
      const list = Mml.list(items);
      body = Mml.compose`${body}\n── You also see: ${list}.`;
    }

    // Topic comes from the filtered prose (where channel attribution
    // lives) — not the verb name. A vision-only-authored room makes
    // sense fire at vision, same as look would.
    MessageApi.scene(actor)
      .topic(resolveTopic(longText))
      .toSelf(body)
      .send();
  }

  private senseTarget(target: Stuff, context: CommandContext): void {
    const actor = context.commandGiver;
    const sensorium = SpeciesApi.deriveSensorium(actor);
    if (!MixinApi.isVisible(target)) {
      const name = DescribeApi.getDisplayName(target);
      MessageApi.scene(actor)
        .topic(DEFAULT_TOPIC)
        .toSelf(Mml.compose`You can't perceive ${name}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'target-not-visible',
        detail: name,
      });
      return;
    }
    const filteredText = target.getMarkupLong(actor, { filter: sensorium });
    const body = Mml.compose`\n${Mml.name(target)}\n\n${Mml.fromMarkup(filteredText)}\n`;
    MessageApi.scene(actor)
      .topic(resolveTopic(filteredText))
      .toSelf(body)
      .send();
  }

  private formatExits(exits: Exit[]): Mml | null {
    if (exits.length === 0) return null;
    const parts = exits.map((exit) => {
      const tagged = Mml.exit(exit);
      const door = exit.getDoor();
      if (!door) return tagged;
      const state = door.isOpen() ? 'open' : 'closed';
      const doorLink = Mml.item(door);
      return Mml.compose`${tagged} (${doorLink}, ${state})`;
    });
    const joined = Mml.list(parts);
    return Mml.compose`── Obvious exits: ${joined}.`;
  }
}
