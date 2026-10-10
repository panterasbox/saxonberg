/**
 * SawController — `saw <log> [--quarter] [at <saw>]`.
 *
 * Turns wood in the round into boards. What can go on the saw:
 *
 *  - **a bole** — the felled trunk on the ground. The saw takes ONE
 *    length off it per cut (`Bole.takeLength`, the same length `fell
 *    bole` cross-cuts), and the bole goes on lying where it fell;
 *  - **a length or a billet you have** — any piece of wood in reach that
 *    is not already sawn. A stack gives up one of its pieces.
 *
 * ## ⭐⭐ The decision is how you open the log
 *
 * Through-sawn, every board comes off parallel to the last: the most
 * boards a log will give, and the wide ones cup as they dry because the
 * growth rings run across their faces. Quarter-sawn (`--quarter`), the
 * log is quartered first and the boards taken off radially: a third of
 * the log goes to waste in the wedges, and every board that is left
 * stays flat for a century. A cooper and a joiner want the second; a
 * barn wants the first. Same log, two answers, and the price says which.
 *
 * ⚠ A quarter-sawn board is a different ROW, not a flag stamped at the
 * mint (`quartered-board`, `quarterSawn: true` authored): the field has
 * no setter on the seasoning substrate, and a row is the honest home for
 * what a thing IS — two boards that will never merge into one stack.
 *
 * ## ⭐⭐ The two rungs differ in a SLOT, not in a number (the mill's rule)
 *
 *  - a **pit saw** claims your `hands` for the whole cut. Two men and a
 *    long blade, one in the pit; you can do nothing else until it is
 *    through.
 *  - a **water sawmill** claims **nothing of yours**. You dog the log
 *    on the carriage, open the hatch and leave; the race drives the
 *    frame whether you are in the room or not, and the boards are on the
 *    floor of the mill when it is done. Its rate is the river's —
 *    slower in a dry August, which nobody authored.
 *
 * The duration is `mass / rate` either way: kilograms of log over
 * kilograms an hour.
 *
 * ⚠⚠ The completion is a **module-level function**. A controller is one
 * ephemeral clone per execution, destructed the moment `execute`
 * returns, and a cut runs for game-minutes; a completion calling back
 * into `this` would no-op on a dead proxy and the boards would silently
 * never appear.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Bole, { TIMBER_MASS_KG } from '@saxonberg/content-trade-forestry/src/thing/Bole';
import Sawmill from '../../../thing/Sawmill';

const TOPIC = 'act.deed';

/** The through-sawn board row. */
export const BOARD_PATH = '/trade/carpentry/thing/board';
/** The quarter-sawn board row — the same board, opened radially. */
export const QUARTERED_BOARD_PATH = '/trade/carpentry/thing/quartered-board';

/**
 * Kilograms in one board — what both board rows author as their `mass`
 * (a stack's mass is per unit). A test holds the rows to this figure, so
 * the yield arithmetic and the boards on the floor cannot drift apart.
 */
export const BOARD_KG = 6;

/**
 * ⭐ What quartering costs: the wedges between the radial cuts are
 * waste, so a quartered log gives two boards for every three a
 * through-sawn one would.
 */
export const QUARTER_YIELD = 2 / 3;

/**
 * Metabolic watts of working a pit saw — the top sawyer's half of it,
 * heavy and steady. The water rung costs nothing of yours.
 */
const PIT_SAW_EFFORT_W = 650;

interface SawModel extends CommandModel {
  log?: MqlOneResult;
  /** ⭐ The saw, resolved by the BINDER off the view's arg. */
  saw?: MqlOneResult;
  quarter?: boolean;
  through?: boolean;
}

/** What is going on the carriage, resolved before anything is cut. */
interface Charge {
  kg: number;
  material: Material | null;
  /** Seasoned fraction of what went on; a bole and a length are green. */
  seasoned: number;
}

export default class SawController extends ManualBuildController<SawModel> {
  async execute(model: SawModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // ⭐ The saw — bound by the view (`reachable:[capability.sawing]`),
    // never hunted.
    const saw = model.saw?.stuff ?? null;
    if (saw === null) {
      this.turnDown(
        context,
        'no-saw',
        Mml.compose`You have nothing here to saw with. A pit saw will do it with two of you and a long afternoon; a sawmill on a race will do it while you are elsewhere.`,
      );
      return;
    }
    if (!(saw instanceof Sawmill) || !saw.hasCapability('sawing')) {
      this.turnDown(
        context,
        'wrong-tool',
        Mml.compose`${Mml.thing(saw)} will not open a log. That wants a pit saw or a sawmill.`,
      );
      return;
    }
    if (saw.isSawing()) {
      this.turnDown(
        context,
        'already-sawing',
        Mml.compose`${Mml.thing(saw)} already has a log on it. Wait for it.`,
      );
      return;
    }

    const log = model.log?.stuff ?? null;
    if (log === null) {
      this.turnDown(context, 'no-log', Mml.compose`Saw what?`);
      return;
    }
    if (model.quarter && model.through) {
      this.turnDown(
        context,
        'two-cuts',
        Mml.compose`A log is opened one way or the other — quartered or through-sawn, not both.`,
      );
      return;
    }
    const quarter = model.quarter === true;

    const charge = chargeOf(log);
    if (charge === null) {
      this.turnDown(
        context,
        'not-sawable',
        Mml.compose`${Mml.thing(log)} is not wood in the round. A felled bole, a length off one or a billet goes on a saw.`,
      );
      return;
    }
    if (log instanceof Bole && log.getLengthsLeft() <= 0) {
      this.turnDown(
        context,
        'bole-spent',
        Mml.compose`There is nothing left in ${Mml.thing(log)} but the butt.`,
      );
      return;
    }

    // How many boards the log will give — refuse before anything is cut.
    const boardPath = quarter ? QUARTERED_BOARD_PATH : BOARD_PATH;
    const boards = boardsFrom(charge.kg, BOARD_KG, quarter);
    if (boards < 1) {
      this.turnDown(
        context,
        'too-small',
        Mml.compose`${Mml.thing(log)} is too small to give a board${quarter ? ' quartered — try it through-sawn' : ''}.`,
      );
      return;
    }

    // ⚠ A cold water-sawmill answers 0 until its race has been read once,
    // and "will not turn" must be true when it is said.
    await saw.settlePower();
    const sawMs = saw.sawMs(charge.kg);
    if (!Number.isFinite(sawMs)) {
      this.turnDown(
        context,
        'no-power',
        Mml.compose`${Mml.thing(saw)} will not run. There is no water in the race — it wants a flow to drive the frame.`,
      );
      return;
    }

    const job: SawJob = {
      giver,
      saw,
      log,
      charge,
      boardPath,
      boards,
      quarter,
    };

    if (saw.isPowered()) {
      // ⭐⭐ THE SAWMILL HOLDS NOTHING OF YOURS. The game clock carries
      // the cut, so the sawyer may walk out, and the boards are on the
      // mill floor when they come back.
      saw.setSawing(true);
      WorldClockApi.after(
        Quantity.of(sawMs / 1000, 's'),
        () => {
          void finishSaw(job);
        },
        { host: saw as unknown as Stuff, tag: 'saw-log' },
      );
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You dog ${Mml.thing(log)} down on the carriage and open the hatch on the race. The frame takes up its stroke and the log starts to walk into the blades — it does not need you.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} puts a log on the sawmill carriage and lets in the water.`,
        )
        .send();
      return;
    }

    // ⭐⭐ THE PIT SAW HOLDS YOUR HANDS until the cut is through — the
    // shipped `hands` slot rule, so no flag on the saw is needed: the
    // sawyer cannot start a second cut while this one runs.
    this.engageStep(context, {
      durationMs: sawMs,
      effortW: PIT_SAW_EFFORT_W,
      beginSelf: Mml.compose`You chalk a line down ${Mml.thing(log)} and set the long saw to it. It is going to take a while, and both your hands are on the handle.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets a long saw to ${Mml.thing(log)}.`,
      onComplete: () => {
        void finishSaw(job);
      },
    });
  }

  private turnDown(
    context: CommandContext,
    reason: string,
    text: ReturnType<typeof Mml.compose>,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/** Everything the completion needs — closed over, never `this`. */
interface SawJob {
  giver: Stuff;
  saw: Sawmill;
  log: Stuff;
  charge: Charge;
  boardPath: string;
  boards: number;
  quarter: boolean;
}

/**
 * What a piece of wood puts on the carriage, or `null` when it is not
 * sawable. A bole gives one length; anything else is weighed as it is
 * (one piece of a stack). Already-sawn stock is not wood in the round.
 */
function chargeOf(log: Stuff): Charge | null {
  if (!MixinApi.isTangible(log)) return null;
  const material = log.getMaterial();
  if (!material || !material.hasTag('wood')) return null;
  if (log instanceof Bole) {
    // A bole is green wood, lying where it fell.
    return { kg: TIMBER_MASS_KG, material, seasoned: 0 };
  }
  if (MixinApi.isConstructed(log) && log.getConstructionForm() === 'sawn') {
    return null;
  }
  const kg = log.getMass().rawValue();
  if (!(kg > 0)) return null;
  const seasoned = MixinApi.isSeasoning(log) ? log.getSeasonedFraction() : 0;
  return { kg, material, seasoned };
}

/**
 * Boards a log of `kg` gives: its mass over a board's, and two in three
 * of that when it is quartered. Exported for the yield test.
 */
export function boardsFrom(kg: number, unitKg: number, quarter: boolean): number {
  if (!(unitKg > 0) || !(kg > 0)) return 0;
  const through = kg / unitKg;
  return Math.floor(quarter ? through * QUARTER_YIELD : through);
}

/**
 * ⚠⚠ A MODULE function, never a method — see the header.
 *
 * ⭐ The boards land **where the saw is**: at a sawmill the sawyer may
 * be a valley away by now, which is the point of the rung, and a pit
 * saw stands where the log does. They are the sawyer's — stamped to the
 * giver — and the log is consumed first (conservation before creation:
 * a failure leaves the log rather than doubling it).
 */
async function finishSaw(job: SawJob): Promise<void> {
  const { giver, saw, log, charge, boardPath, boards, quarter } = job;
  try {
    if (saw.isDestroyed() || log.isDestroyed()) return;
    // A saw in the sawyer's own hands puts the boards at their feet, not
    // in their arms — a log's worth of boards is not a handful.
    let room = MixinApi.isContainable(saw) ? saw.getContainer() : null;
    if (room === giver && MixinApi.isContainable(giver)) room = giver.getContainer();
    const landing: (Stuff & Container) | null =
      room !== null && MixinApi.isContainer(room) ? room : null;
    if (landing === null) return;

    // Consume first.
    if (log instanceof Bole) {
      const left = log.takeLength();
      if (left <= 0) await StuffApi.destruct(log);
      else await capture(log);
    } else if (MixinApi.isStackable(log) && log.getQuantity() > 1) {
      log.setQuantity(log.getQuantity() - 1);
      await capture(log);
    } else {
      await StuffApi.destruct(log);
    }

    const board = await StuffApi.clone<Stuff & Containable>(boardPath);
    if (charge.material && MixinApi.isTangible(board)) {
      board.setMaterial(charge.material);
    }
    // ⭐ A board is as green as the log it came off: a bole is green, and
    // sawing does not dry anything.
    if (MixinApi.isSeasoning(board)) board.setSeasonedFraction(charge.seasoned);
    if (MixinApi.isStackable(board)) board.setQuantity(boards);
    const maker = giver.isDestroyed() ? '' : (giver.getIdentityPath() ?? '');
    if (maker && MixinApi.isCrafted(board)) board.setMaker(maker);
    await ContainmentApi.land(board, landing, giver.isDestroyed() ? null : giver);

    if (!saw.isDestroyed()) {
      MessageApi.scene(saw as unknown as Stuff)
        .topic(TOPIC)
        .toPeers(
          Mml.compose`The last cut runs out and ${GrammarApi.inWords(boards)} ${quarter ? 'quartered ' : ''}${boards === 1 ? 'board falls' : 'boards fall'} away from the log.`,
        )
        .send();
    }
  } finally {
    saw.setSawing(false);
  }
}

async function capture(host: Stuff): Promise<void> {
  try {
    await PersistableApi.captureHostOf(host);
  } catch (err) {
    console.warn('SawController: capture failed:', err);
  }
}
