/**
 * ArmController — `arm <kit>`: deploy a carried trap into the current room.
 *
 * The player-trapper's one verb (the `disarm` sibling; `device` category —
 * operating a built mechanism). It clones the kit's `trapTemplate` (a
 * `/obj/traps/` generic), sets the deployed trap's concealment from the
 * placer's own `stealth` competence via `PerceptionApi.hideLevelFor` (the
 * shared spine with self-hiding), stamps the placer on it
 * (`HazardMixin.placedBy` — so a spring is attributable through the unified
 * accountability ledger), and consumes the kit (one trap per kit, v1).
 *
 * **Anti-grief ships inline** (not a follow-up):
 *   - the **property gate** — free on ground you hold or public/`core`
 *     ground; refused on another owner's property (the parcel substrate);
 *   - **crime-marking is inherent** — the deployed trap's `placedBy` makes a
 *     spring on a non-consenting sentient derive `crime` at the harm site
 *     (`HazardMixin.deliverHarm`), no flag needed.
 *
 * Narration lives here (the controller), never on the gated Api.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { AdvancementApi } from '../../../api/advancement';
import { AccessApi } from '../../../api/access';
import { ParcelApi } from '../../../api/parcel';
import { StuffApi } from '../../../api/stuff';
import { CompetenceBand } from '../../../lib/advancement/CompetenceBand';
import { Mml } from '../../../api/mml';
import TrapKit from '../../TrapKit';

const TOPIC = 'act.deed';

/** The Discipline that grades a placed trap's concealment (as for `hide`). */
const STEALTH_DISCIPLINE = 'stealth';

interface ArmModel extends CommandModel {
  target?: MqlOneResult;
}

export default class ArmController extends CommandController<ArmModel> {
  async execute(model: ArmModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const kit = model.target?.stuff ?? null;

    if (!(kit instanceof TrapKit)) {
      return this.reject(
        context,
        giver,
        Mml.compose`That isn't a trap kit you can arm.`,
        'not-a-kit',
      );
    }

    const room = MixinApi.isContainable(giver)
      ? giver.getContainer()
      : null;
    if (!room || !MixinApi.isContainer(room)) {
      return this.reject(
        context,
        giver,
        Mml.compose`There's nowhere here to set a trap.`,
        'no-room',
      );
    }

    // Property gate: free on ground you hold or public/`core` ground;
    // refused on another owner's property.
    if (!(await this.mayPlaceIn(giver, room))) {
      return this.reject(
        context,
        giver,
        Mml.compose`This isn't your ground to rig — someone else holds it.`,
        'not-your-property',
      );
    }

    // Concealment = the placer's stealth-derived hide level (the shared
    // spine). Snapshot the band at command time; a failed hide still tucks
    // the trap to at least `subtle`.
    await PerceptionApi.preloadForSenseGate(giver);
    const band = await AdvancementApi.bandFor(giver, STEALTH_DISCIPLINE).catch(
      () => CompetenceBand.FLOOR,
    );
    let level = PerceptionApi.hideLevelFor(giver, band);
    if (level === 'obvious') level = 'subtle';

    // Deploy: clone the generic, conceal + attribute it, place it, spend
    // the kit.
    const trap = await StuffApi.clone<Stuff>(kit.getTrapTemplate());
    if (
      !MixinApi.isHazard(trap) ||
      !MixinApi.isConcealable(trap) ||
      !MixinApi.isContainable(trap)
    ) {
      StuffApi.destruct(trap);
      return this.reject(
        context,
        giver,
        Mml.compose`The kit is broken — it won't arm.`,
        'bad-kit-template',
      );
    }
    trap.setConcealment(level);
    trap.setPlacedBy(giver.getTemplatePath() ?? '');
    ContainmentApi.move(trap, room as Stuff & Container);
    StuffApi.destruct(kit);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You set ${Mml.item(trap)} and work it into the surroundings.`,
      )
      .send();
  }

  /**
   * The parcel property gate: you may place on ground you control (own /
   * self-home / a group you're in — the shipped `AccessApi.can` write test)
   * OR on public `core` ground (allowed, but a spring is crime-marked).
   * Refused only on another principal's owned property.
   */
  private async mayPlaceIn(giver: Stuff, room: Stuff): Promise<boolean> {
    if (await AccessApi.can(giver, 'write', room)) return true;
    const owner = await ParcelApi.ownerOf(room.getTemplatePath() ?? '');
    return owner.kind === 'group' && owner.name === 'core';
  }

  private reject(
    context: CommandContext,
    giver: Stuff,
    line: Mml,
    reason: string,
  ): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
