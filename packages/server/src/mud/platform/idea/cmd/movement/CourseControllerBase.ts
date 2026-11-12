/**
 * CourseControllerBase — what the two `course` controllers share
 * (controller-liquidity W7a): the craft the giver is aboard, the
 * navigator's words for a bearing and for a river's line, and the prose.
 *
 *   - bare `course` — {@link CourseReadoutController}: the plot read.
 *   - `course <heading>` — {@link CourseController}: lay a course and get
 *     under way (maritime D11), at sea, on a river, or in a small boat.
 *
 * Two shapes of one verb, each its own view (`course.yaml`,
 * `course-steer.yaml`). Afforded by the instrument of steering — the
 * `Helm` — so a building, which has none, is never offered it.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { ExpanseApi } from '../../../../api/expanse';
import { NavigationApi } from '../../../../api/navigation';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type Place from '../../../../lib/stuff/Place';
import type { Positioned } from '../../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../../lib/expanse/Voyaging';

export interface CourseModel extends CommandModel {
  heading?: string;
  /** `--leaving-them`: sail with her own people in the water, on purpose. */
  leavingThem?: boolean;
}

export type Craft = Stuff & Positioned & Voyaging;

export abstract class CourseControllerBase extends CommandController<CourseModel> {
  /** The words for a river's line, in km — a pilot's, not a navigator's. */
  protected static kmWords(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} meters above the mouth` : `${km.toFixed(1)} km above the mouth`;
  }

  /** `070` — a bearing as a navigator writes it. */
  protected static bearingWords(deg: number): string {
    return String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0');
  }

  /**
   * ⭐ A small boat with a sail (river D20): the boat you sit in sails
   * herself on the river's water (`SmallCraft.sailCourse`) — the answer
   * when the giver is aboard no craft. `heading` is `''` for the readout.
   */
  protected async smallBoat(context: CommandContext, heading: string): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (boat !== null && MixinApi.isSmallCraft(boat)) {
      const out = await boat.sailCourse(heading, giver);
      return out.ok ? this.tell(context, out.line) : this.decline(context, out.line, 'cannot-sail');
    }
    return this.decline(context, 'You are not aboard anything that sails.', 'not-aboard');
  }

  /** The craft the giver is aboard — their root container's craft, at sea or on a river. */
  protected async craftOf(giver: Stuff): Promise<Craft | null> {
    const root = MixinApi.isContainable(giver) ? giver.getRootContainer() ?? giver : giver;
    // ⭐ The place is asked: a keyed room of a ship kind is answered by its warren.
    const place = root.isPlace() ? (root as unknown as Place) : null;
    const path = root.getIdentityPath() ?? '';
    const craft = place !== null ? await place.craftHere() : await ExpanseApi.craftAt(path);
    if (craft && MixinApi.isVoyaging(craft)) return craft;
    const s = place !== null ? await place.structure() : path ? await NavigationApi.structureAt(path) : null;
    return s && MixinApi.isPositioned(s) && MixinApi.isVoyaging(s) && s.getLine() !== null ? s : null;
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
  }

  protected decline(context: CommandContext, text: string, reason: string): void {
    this.tell(context, text);
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
