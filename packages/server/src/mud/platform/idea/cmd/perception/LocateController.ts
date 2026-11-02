/**
 * LocateController — report the containment chain of `<target>`,
 * outermost zone last (read inside-out, like a path).
 *
 * ⭐ At sea there is no chain worth the name, so it answers with the
 * RECKONING — and says that is what it is (maritime D11). `locate` is a
 * perception verb: reporting what you perceive rather than the truth is
 * already its contract, so the true position is never printed.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ExpanseApi } from '../../../../api/expanse';
import { StuffApi } from '../../../../api/stuff';
import type Place from '../../../../lib/stuff/Place';
import Ship from '../../Ship';

interface LocateModel extends CommandModel {
  target?: MqlOneResult;
}

export default class LocateController extends CommandController<LocateModel> {
  async execute(model: LocateModel, context: CommandContext): Promise<void> {
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for ${target?.raw ?? '?'}`);
    }
    const chain: string[] = [];
    let cursor: Stuff | null = target.stuff;
    while (cursor) {
      chain.push(cursor.getPresentation());
      const next: Stuff | null = MixinApi.isContainable(cursor)
        ? cursor.getContainer()
        : null;
      const prior = cursor;
      cursor = next;
      if (cursor === null) {
        const zone = prior.getZone();
        if (zone && !chain.includes(zone.getPresentation())) {
          chain.push(zone.getPresentation());
        }
      }
    }
    const display =
      chain.length > 1
        ? `in: ${chain.slice(1).join(' > ')}`
        : '(no containing context)';
    const atSea = await this.reckoningOf(target.stuff, context.commandGiver);
    const lies = atSea === null ? await LocateController.whereSheLies(target.stuff) : null;
    const extra = atSea ?? lies;
    this.tell(
      context,
      `\n${chain[0]}\n${display}\n${extra ? `${extra}\n` : ''}`,
    );
    return;
  }

  /**
   * The reckoning of the craft `target` is aboard, in the reader's words,
   * or `null` ashore. Never the true position.
   */
  private async reckoningOf(target: Stuff, reader: Stuff): Promise<string | null> {
    const root = MixinApi.isContainable(target) ? target.getRootContainer() ?? target : target;
    // ⭐ In the water beside a stopped ship (river D30): her reckoning is
    // yours — the room beside her names the craft it lies alongside. Asked
    // at every level up from you (a boat in the room, you in the boat): the
    // root is the room's zone, which names nothing (the drive found it).
    let beside: Stuff | null = null;
    for (let at: Stuff | null = target, i = 0; at !== null && beside === null && i < 6; i++) {
      beside = MixinApi.isMovingPlace(at) ? at.alongsideCraft() : null;
      at = MixinApi.isContainable(at) ? (at.getContainer() as Stuff | null) : null;
    }
    // ⭐ The place is asked (harbors review 1): a ship of a kind's room is
    // keyed `(room row, <serial>/<leaf>)` and its row is every smack's, so
    // only the room's warren can say which ship it is.
    const craft =
      beside ??
      (root.isPlace()
        ? await (root as unknown as Place).craftHere()
        : await ExpanseApi.craftAt(root.getIdentityPath() ?? ''));
    if (!craft || !MixinApi.isVoyaging(craft)) return null;
    const reckoned = craft.reckonedNow();
    const plot = craft.getPlot();
    if (reckoned === null) return null;
    const band = MixinApi.isAdvancing(reader)
      ? await reader.competenceBandFor('navigation')
      : 'untrained';
    const bracket = plot ? plot.statedBracket(craft.reckoningUncertaintyNm(), band) : 'exactly';
    return `at sea, by reckoning: ${reckoned.toString()} — ${bracket}.`;
  }

  /**
   * ⭐ Where the ship `target` is aboard lies, when she is not at sea
   * (harbors review 1): made fast at a landing, its name; else under way.
   * `null` ashore. One answer for an authored ship and a ship of a kind —
   * the room is asked which ship it is, never its row. Her rooms are on no
   * map (a kind's are kinds), so this line is what tells you where the
   * chain above sits.
   */
  private static async whereSheLies(target: Stuff): Promise<string | null> {
    const root = MixinApi.isContainable(target) ? target.getRootContainer() ?? target : target;
    if (!root.isPlace()) return null;
    const ship = await (root as unknown as Place).structure().catch(() => null);
    if (!(ship instanceof Ship)) return null;
    const berth = ship.getBerth();
    if (berth === null) return `aboard ${ship.getName()}, under way.`;
    const landing = StuffApi.findByIdentityPath<Stuff>(berth).find((s) => !s.isDestroyed()) ?? null;
    return landing !== null
      ? `aboard ${ship.getName()}, made fast alongside ${landing.getPresentation()}.`
      : `aboard ${ship.getName()}, made fast alongside.`;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
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
