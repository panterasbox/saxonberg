/**
 * DriveController — `drive <direction>` / `drift <direction>`, the act
 * that makes a mine bigger.
 *
 * The carve price is the ground: **hardness × the volume you are moving**,
 * so a slate heading is roughly half a granite one and the deposit's own
 * stratigraphy is what a player is really budgeting against.
 *
 * ⚠ It refuses on bad ground, and the refusal **names the state**
 * ({@link MiningActController.groundPermits}), because neglect costs you
 * access to your ore and never your life.
 *
 * ⚠ **The verb collides with the shipped vehicle `drive`**, which takes
 * the same arity — and `requires:` is not a shape criterion, so the two
 * are separated by affordance order alone. Nothing in the repo affords
 * the movement view today, and the two shipped `pour` views prove
 * coexistence is intended; `drift` is declared as a full alias so a
 * miner always has an unambiguous word. A tripwire test asserts the
 * chain still reaches here with a `Drivable` in the room.
 */

import { MiningActController, MINING_TOPIC } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import type MineWarren from '../../MineWarren';
import type { WorkingType } from '../../MineWarren';
import type { Cell, Face } from '../../../location/Working';

/** Reference time to cut one cell, in game ms, at reference hardness. */
const DRIVE_MS = 40000;
/** Endurance one heading costs, in percentage points. */
const DRIVE_COST = 12;

interface DriveModel extends CommandModel {
  direction?: string;
}

export default class DriveController extends MiningActController<DriveModel> {
  async execute(model: DriveModel, context: CommandContext): Promise<void> {
    await this.driveIn(context, model.direction ?? '');
  }

  /**
   * The shared body `sink` and `raise` reuse with a fixed direction —
   * the vertical pair is the same act pointed down and up.
   */
  protected async driveIn(context: CommandContext, rawDirection: string): Promise<void> {
    const giver = context.commandGiver;
    const direction = NavigationApi.normalizeDirection(rawDirection);
    if (!direction) {
      this.decline(
        context,
        Mml.compose`Drive which way? Name a direction.`,
        'no-direction',
      );
      return;
    }
    const working = this.workingOf(giver);
    if (!working) {
      this.decline(context, Mml.compose`There is nothing to cut into here.`, 'not-a-working');
      return;
    }
    const warren = (working as unknown as { getWarren?(): unknown }).getWarren?.() as
      | MineWarren
      | null;
    if (!warren || typeof warren.carve !== 'function') {
      // ⭐ The honest static-mine answer: a hand-authored mine is a mine
      // that does not GROW. Every read still works; this one act does not.
      this.decline(
        context,
        Mml.compose`These workings are cut and finished — nobody drives here any more.`,
        'no-warren',
      );
      return;
    }

    const faces = await working.facesOf();
    const face = faces.find((f) => f.direction === direction);
    if (!face) {
      this.decline(context, Mml.compose`You can't cut that way.`, 'no-such-face');
      return;
    }
    if (face.open) {
      this.decline(
        context,
        Mml.compose`That way is already driven.`,
        'already-driven',
      );
      return;
    }

    const stability = await working.stabilityAt();
    if (!this.groundPermits(context, stability, 'drive')) return;

    const cell = face.cell;
    this.engageAct(context, {
      durationMs: this.paceForGround(DRIVE_MS, face.hardnessMPa),
      cost: DRIVE_COST,
      beginSelf: Mml.compose`You start driving a heading ${direction}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts driving a heading ${direction}.`,
      onComplete: () => {
        void this.cut(context, warren, cell, face, direction);
      },
    });
  }

  /** Carve the cell at completion, and say what the new ground is like. */
  private async cut(
    context: CommandContext,
    warren: MineWarren,
    cell: Cell,
    face: Face,
    direction: string,
  ): Promise<void> {
    const giver = context.commandGiver;
    const type = this.typeFor(face);
    const room = await warren.carve(cell, type, ownerKeyOf(giver));
    if (!room) {
      this.decline(context, Mml.compose`The ground will not take a heading there.`, 'carve-failed');
      return;
    }
    MessageApi.scene(giver)
      .topic(MINING_TOPIC)
      .toSelf(
        face.kind === 'seam'
          ? Mml.compose`The heading breaks through into ore — the seam runs on ${direction}.`
          : Mml.compose`The heading is through. Country rock, and no sign of a seam.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} breaks a heading through ${direction}.`)
      .send();
    // ⚠ Provisional: nothing is HELD until it is shored. `shore` is this
    // mine's provisioning act, and it is what writes the record.
    await this.afterCut(room, cell, direction);
  }

  /**
   * A hook the vertical pair overrides: a winze is CLIMBED, not walked,
   * so `sink` and `raise` widen the fresh exit pair's `media` to admit
   * the vertical medium. A level drive leaves it alone — an ordinary
   * heading is ground.
   *
   * @hook Override to adjust the fresh working's edges.
   */
  protected async afterCut(
    _room: Stuff,
    _cell: Cell,
    _direction: string,
  ): Promise<void> {
    /* a level heading needs nothing further. */
  }

  /**
   * Which of the venue's four type rows the new cell clones from —
   * ⭐ decided by the GROUND, not by the verb. A cell in the seam opens
   * out into a stope; barren rock stays a face.
   */
  protected typeFor(face: Face): WorkingType {
    return face.kind === 'seam' ? 'stope' : 'face';
  }
}

/** The chattel/ledger key for whoever cut it. */
function ownerKeyOf(giver: Stuff): string | null {
  return giver.getTemplatePath() ?? null;
}
