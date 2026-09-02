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
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
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

    // Resolved at DISPATCH time, while the controller is alive.
    const cell = face.cell;
    const type = this.typeFor(face);
    const medium = this.edgeMedium();
    this.engageAct(context, {
      durationMs: this.paceForGround(DRIVE_MS, face.hardnessMPa),
      cost: DRIVE_COST,
      beginSelf: Mml.compose`You start driving a heading ${direction}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts driving a heading ${direction}.`,
      // ⚠⚠ **Nothing in here touches `this`.** The controller is
      // ephemeral — one clone per execution, destructed the moment
      // `execute` returns — and an engaged act completes long after
      // that, so a completion reaching back into it runs on a DESTROYED
      // Stuff and the proxy answers with a silent no-op: the swing
      // lands, the prose prints, and nothing happens. Found by driving.
      //
      // ⭐ Which is also why the vertical pair passes a VALUE rather than
      // overriding a hook the completion would have to call: `medium`
      // was `afterCut()`, and a bound method is still a method on a
      // corpse. A subclass that has to be consulted AFTER the act is a
      // subclass that cannot be consulted at all.
      onComplete: () => {
        void cutHeading(context, warren, cell, face, direction, type, medium);
      },
    });
  }

  /**
   * The locomotion medium the fresh exit pair admits, or `null` for an
   * ordinary ground heading.
   *
   * ⭐ The vertical pair overrides this to `'vertical'` — a winze is
   * CLIMBED, not walked. It is a VALUE and it is read at dispatch time
   * on purpose: a hook the completion had to call back into would be a
   * call on a destroyed controller.
   *
   * @hook Override to say what the fresh edges admit.
   */
  protected edgeMedium(): string | null {
    return null;
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

/** Carve the cell at completion, and say what the new ground is like. */
async function cutHeading(
  context: CommandContext,
  warren: MineWarren,
  cell: Cell,
  face: Face,
  direction: string,
  type: WorkingType,
  medium: string | null,
): Promise<void> {
  const giver = context.commandGiver;
  const room = await warren.carve(cell, type, ownerKeyOf(giver));
  if (!room) {
    MessageApi.scene(giver)
      .topic(MINING_TOPIC)
      .toSelf(Mml.compose`The ground will not take a heading there.`)
      .send();
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
  // ⭐ A winze is climbed. `climb` and `ClimbableMixin` already ship, so
  // the vertical needed no new locomotion — only an edge that declares
  // what it is, on BOTH sides of the pair.
  if (medium !== null) widenEdge(room as unknown as Stuff, direction, medium);
}

/** Let the fresh exit pair admit `medium`, both sides. */
function widenEdge(room: Stuff, direction: string, medium: string): void {
  if (!MixinApi.isExitable(room)) return;
  const back = NavigationApi.invertDirection(direction);
  for (const [dir, exit] of room.getExits()) {
    if (dir !== back) continue;
    exit.setMedia([...new Set([...exit.getMedia(), medium])]);
    const other = exit.getDestination();
    if (other && MixinApi.isExitable(other)) {
      const inverse = other.getExit(direction);
      if (inverse) inverse.setMedia([...new Set([...inverse.getMedia(), medium])]);
    }
  }
}

/** The chattel/ledger key for whoever cut it. */
function ownerKeyOf(giver: Stuff): string | null {
  return giver.getTemplatePath() ?? null;
}
