/**
 * JourneyControllerBase — what the two `journey` controllers share
 * (controller-liquidity W7a): the prose, and a place's name read off its
 * path.
 *
 *   - bare `journey` — {@link JourneyStatusController}: the readout of the
 *     trip you are on.
 *   - `journey to <place> [via <lane>]` — {@link JourneyController}: plan a
 *     route and set off.
 *
 * Two shapes of one verb, each its own view (`journey.yaml`,
 * `journey-to.yaml`).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';

export const TOPIC = 'act.move';

export interface JourneyModel extends CommandModel {
  /** `journey to <place>` — a place name, or a durable path. */
  destination?: string;
  /** `via <lane>` — a lane key. */
  via?: string;
}

export abstract class JourneyControllerBase extends CommandController<JourneyModel> {
  /** The last path segment, for prose. */
  protected static leafOf(path: string): string {
    const leaf = path.split('/').filter(Boolean).pop() ?? path;
    return leaf.replace(/-/g, ' ');
  }

  protected tell(who: Stuff & Engaged, text: string): void {
    MessageApi.scene(who as unknown as Stuff)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${text}\n`))
      .send();
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
