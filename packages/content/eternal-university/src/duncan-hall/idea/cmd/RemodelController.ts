/**
 * RemodelController — the `remodel` verb (a Duncan Hall *content* verb —
 * content namespace `world/eternal/duncan-hall/`, not a core command
 * category): the tenant's **local** shell-personalization commit. Standing in
 * your own dorm
 * room, `remodel` opens a `PromptApi.choice` wheel of authored styles; picking
 * one applies the theme's prose overlay across the room + its fixtures and
 * seals it into the unit's D1 record ({@link DormThemes.applyTo}).
 *
 * There is **no typed `decorate <theme>` verb** — theme-pick is a MENU, not a
 * command argument. The move-in commit is fronted by Katie (`provision
 * --theme`); this is the local "redo it later" trigger, afforded in-room by
 * the room's `Desk` fixture. Gated by **holding the lease** on the room you're
 * standing in (the D6 write-gate); read is public (a visitor sees the decor).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { PromptApi } from '@saxonberg/server/mud/api/prompt';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import DormWarren from '../DormWarren';
import DormThemes, {
  DormThemeError,
} from '../../DormThemes';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';

const TOPIC = 'act.deed';

export default class RemodelController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const holder = actor.getIdentityPath() ?? '';
    const unit = holder ? await ParcelApi.heldUnitOf(holder) : null;
    if (!unit) {
      return this.fail(context, "You don't hold a dorm lease.", 'no-lease');
    }
    const unitExtent = unit.getExtent();

    // You remodel the room you're STANDING IN (a local commit) — and only
    // your own. Not in it → step inside first.
    const room = (
      MixinApi.isContainable(actor) ? actor.getContainer() : null
    ) as unknown as (Stuff & Container) | null;
    if (!room || !this.isOwnUnit(room, unitExtent)) {
      return this.fail(
        context,
        'Step into your own room to redo it.',
        'not-in-room',
      );
    }

    const interactive = context.interactive;
    if (!interactive) return; // no viewer to prompt

    let pick: string;
    try {
      pick = await interactive.promptChoice(
        'How do you want to redo the room?',
        DormThemes.ids().map((id) => ({
          label: DormThemes.labelOf(id),
          response: id,
        })),
      );
    } catch {
      return; // cancelled / timed out → no-op
    }
    if (!pick) return;

    try {
      await DormThemes.applyTo(room, pick);
    } catch (err) {
      if (err instanceof DormThemeError) {
        return this.fail(context, err.message, 'theme-error');
      }
      throw err;
    }

    this.send(
      context,
      Mml.compose`\nYou redo the room — it takes on ${DormThemes.labelOf(pick)} style.\n`,
    );
  }

  /** Whether `room` is the live `DormRoom` for `unitExtent` (the giver's own). */
  private isOwnUnit(room: Stuff & Container, unitExtent: string): boolean {
    return (
      room.getTemplatePath() === DormWarren.DORMROOM_TEMPLATE &&
      (room as unknown as { getPersistenceKey?: () => string | null })
        .getPersistenceKey?.() === unitExtent
    );
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
