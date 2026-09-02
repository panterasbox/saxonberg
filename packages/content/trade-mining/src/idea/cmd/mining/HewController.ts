/**
 * HewController — `hew [<face>]`, the act that wins ore.
 *
 * An engagement over game time against endurance, priced by the host
 * material's hardness, minting an {@link Ore} lump whose grade is
 * **exactly `sampleAt`'s figure** — ⭐ *competence never multiplies
 * yield.* Two miners of different bands cutting the same face get the
 * same number; what the better one has is the knowledge of where to
 * point, and that is `analyze ground`'s business, not this verb's.
 *
 * The lump is stamped with its owner at the face (chattel): the co-op
 * when the hewer is on its roster (**tutwork** — *"the business keeps the
 * ground and the ore"*), the actor when the claim covering the cell
 * resolves to them. A lump carries its owner from the face to the assay
 * scale, which is what makes ore theft meaningful later.
 *
 * The face is decremented on the ROOM, so a face runs out and a static
 * hand-authored mine has depletion too.
 *
 * ⚠ **No deed gate.** Hewing is labour.
 */

import { MiningActController, MINING_TOPIC } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ChattelApi } from '@saxonberg/server/mud/api/chattel';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import type Ore from '../../../thing/Ore';
import type { Face, Working } from '../../../location/Working';
import type { Chattel } from '@saxonberg/server/mud/lib/chattel/Chattel';

/** Reference time for one cut, in game ms, at reference hardness. */
const HEW_MS = 9000;
/** Endurance one cut costs, in percentage points. */
const HEW_COST = 4;
/** Lumps one cut wins. */
const HEW_LUMPS = 1;
/**
 * The energy a running face delivers, in joules — a bruise, and
 * deliberately far below anything the harm system treats as serious.
 * ⚠ Ground CANNOT kill in this build; air can, and only air.
 */
const BRUISE_J = 40;

interface HewModel extends CommandModel {
  face?: string;
}

export default class HewController extends MiningActController<HewModel> {
  async execute(model: HewModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const working = this.workingOf(giver);
    if (!working) {
      this.decline(context, Mml.compose`There is no face to cut here.`, 'not-a-working');
      return;
    }

    const faces = await working.facesOf();
    const chosen = pickFace(faces, model.face);
    if (!chosen) {
      const named = model.face ? `'${model.face}'` : 'anything';
      this.decline(
        context,
        Mml.compose`You can't cut ${named} here. Try a direction — the ground on that side.`,
        'no-such-face',
      );
      return;
    }
    if (chosen.open) {
      this.decline(
        context,
        Mml.compose`That way is already driven — there is no face there, only a way on.`,
        'face-is-open',
      );
      return;
    }
    if (chosen.kind !== 'seam' || chosen.remaining === null) {
      this.decline(
        context,
        Mml.compose`Nothing but country rock that way — you can drive it, but there is no ore in it.`,
        'barren-face',
      );
      return;
    }
    if (chosen.remaining <= 0) {
      this.decline(
        context,
        Mml.compose`That face is worked out. Drive on.`,
        'face-worked-out',
      );
      return;
    }

    const stability = await working.stabilityAt();
    if (!this.groundPermits(context, stability, 'cut')) return;

    // ⚠ A blocked face is cleared before it is worked — the same swing,
    // spent on the wrong rock. Neglect costs you a shift, not a life.
    if (chosen.blocked) {
      this.engageAct(context, {
        durationMs: this.paceForGround(HEW_MS, chosen.hardnessMPa),
        cost: HEW_COST,
        beginSelf: Mml.compose`You start barring the loose ground out of the ${chosen.direction} face.`,
        beginPeers: Mml.compose`${Mml.actor(giver)} starts clearing a fall.`,
        onComplete: () => {
          working.clearFace(chosen.direction);
          // ⚠ The actor may be gone; the fall is still cleared, because
          // the rock does not care who barred it down.
          if (giver.isDestroyed()) return;
          MessageApi.scene(giver)
            .topic(MINING_TOPIC)
            .toSelf(Mml.compose`The fall is barred down. The face is workable again.`)
            .send();
        },
      });
      return;
    }

    const oreRow = working.getOreRow();
    if (oreRow.length === 0) {
      this.decline(
        context,
        Mml.compose`There is nothing here worth the swing.`,
        'no-ore-row',
      );
      return;
    }

    // ⭐ The grade is the deposit's figure, resolved once, here. Nothing
    // downstream may reach past `sampleAt` for it.
    const grade = chosen.grade;
    const room = working as unknown as Stuff & Container;

    this.engageAct(context, {
      durationMs: this.paceForGround(HEW_MS, chosen.hardnessMPa),
      cost: HEW_COST,
      beginSelf: Mml.compose`You set the pick to the ${chosen.direction} face and start cutting.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets to the ${chosen.direction} face.`,
      // ⚠⚠ Free functions, NEVER `this.<method>`. A controller is
      // EPHEMERAL — one clone per execution, destructed the moment
      // `execute` returns — and an engaged act completes long after
      // that. `this.win(...)` on the completion ran on a destroyed Stuff
      // and the proxy answered with a silent no-op: the swing landed,
      // the prose printed, and no ore ever appeared. Found by driving;
      // the shipped `HammerController` closes over locals for exactly
      // this reason.
      onComplete: () => {
        void winOre(context, working, room, chosen, oreRow, grade);
      },
    });
  }

}

/**
 * Mint the lump, stamp its owner, record the face, credit the
 * Discipline. Runs at COMPLETION, so a barge-in leaves the rock standing
 * and nothing partial exists.
 *
 * ⚠⚠ A module function rather than a method, because by the time it runs
 * the controller that scheduled it has been destructed.
 */
async function winOre(
    context: CommandContext,
  working: Working,
  room: Stuff & Container,
  face: Face,
  oreRow: string,
  grade: number,
): Promise<void> {
  // ⚠⚠ **The actor may be GONE.** An engaged act completes long after
  // dispatch, and a player can log out mid-swing — at which point
  // `Mml.actor(giver)` renders `undefined` and the scene composer throws
  // an UNHANDLED REJECTION that takes the process down. (It did.) A
  // completion is the one place in a controller where the actor is not
  // guaranteed, so it is the one place that has to check.
  //
  // ⭐ Returning is the honest answer, not narrating to nobody: the
  // engagement was the actor's, and *a barge-in leaves the rock
  // standing* is already the rule for an interrupted cut.
  if (context.commandGiver.isDestroyed()) return;
    const giver = context.commandGiver;
  const lump = (await StuffApi.clone(oreRow)) as unknown as Ore;
    lump.setGrade(grade);
    ContainmentApi.move(lump as unknown as Stuff & Containable, room as never);
    working.recordWinning(face.direction, HEW_LUMPS);
  await maybeRun(context, working, face);

    // ⭐ Who owns it. On tutwork the business keeps the ore; on your own
    // claim it is yours. Title is the parcel's answer, never the ledger's.
  const owner = await ownerFor(giver, working);
    if (owner && MixinApi.isChattel(lump as unknown as Stuff)) {
      await (lump as unknown as Stuff & Chattel).stampChattel(owner);
    }

    MessageApi.scene(giver)
      .topic(MINING_TOPIC)
      .toSelf(Mml.compose`You break ${Mml.thing(lump as unknown as Stuff)} out of the face.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} breaks ore out of the face.`)
      .send();

    // World-derived difficulty: the rock decides how hard the cut was,
    // not the verb. Nothing gates on the band.
    if (MixinApi.isAdvancing(giver))
      await giver.creditDeed({
      discipline: 'geology',
      difficulty: face.hardnessMPa >= 250 ? 'hard' : face.hardnessMPa >= 150 ? 'standard' : 'easy',
      outcome: 'success',
    });
  }

  /**
   * ⭐ **Loose falling, and it is a THRESHOLD rather than a roll.**
   *
   * A face runs when two things are both true, and both are things the
   * player can see: the ground is already telling you it is working
   * (the free telegraph, off the same number), and the face has been
   * undercut past half its ore. An undercut face in unquiet ground is
   * what runs, in a mine and here.
   *
   * ⚠⚠ **It blocks the FACE, never the room.** Every exit stays open,
   * nothing cascades, nobody is buried. The cost is a shift's work and a
   * bruise — *neglecting ground support costs you access to your ore,
   * not your life* — and an attentive player is never hurt at all,
   * because the telegraph fired first.
   */
async function maybeRun(
  context: CommandContext,
  working: Working,
  face: Face,
): Promise<void> {
  // ⚠⚠ **The actor may be GONE.** An engaged act completes long after
  // dispatch, and a player can log out mid-swing — at which point
  // `Mml.actor(giver)` renders `undefined` and the scene composer throws
  // an UNHANDLED REJECTION that takes the process down. (It did.) A
  // completion is the one place in a controller where the actor is not
  // guaranteed, so it is the one place that has to check.
  //
  // ⭐ Returning is the honest answer, not narrating to nobody: the
  // engagement was the actor's, and *a barge-in leaves the rock
  // standing* is already the rule for an interrupted cut.
  if (context.commandGiver.isDestroyed()) return;
    const giver = context.commandGiver;
    const stability = await working.stabilityAt();
    if (stability.state === 'sound') return;
    // The LAST cut off a face is the one that runs: by then it is
    // undercut, which is the state that lets go in a mine and here.
    if ((face.remaining ?? 0) > HEW_LUMPS) return;

    working.blockFace(face.direction);
    MessageApi.scene(giver)
      .topic(MINING_TOPIC)
      .toSelf(
        Mml.compose`The undercut face lets go. Rock runs into the ${face.direction} heading and catches you across the shoulder — the way out is clear, but the face is not.`,
      )
      .toPeers(Mml.compose`A face runs where ${Mml.actor(giver)} was cutting.`)
      .send();
    if (MixinApi.isVitals(giver)) {
      // A bruise, through the shipped harm system — the same channel a
      // dropped rock uses anywhere else. Ground cannot kill.
      ConditionApi.inflict(giver, { mechanism: 'blunt', site: 'body.torso', energy: BRUISE_J });
    }
  }

/**
 * Who the lump belongs to. The business the hewer is on shift for wins —
 * that is what tutwork MEANS — otherwise the actor.
 */
async function ownerFor(giver: Stuff, working: Working): Promise<Stuff | null> {
    const warren = (working as unknown as { getWarren?(): Stuff | null }).getWarren?.() ?? null;
    if (warren && EmploymentApi.shiftStateOf(giver) === 'on-shift') {
      const business = EmploymentApi.businessAt(
        (working as unknown as Stuff).getTemplatePath() ?? '',
      );
      if (business) return business as unknown as Stuff;
    }
  return giver;
}

/** The named face, or the richest unopened seam when none is named. */
function pickFace(faces: readonly Face[], named?: string): Face | null {
  if (named) {
    const dir = NavigationApi.normalizeDirection(named);
    return faces.find((f) => f.direction === dir) ?? null;
  }
  const workable = faces
    .filter((f) => !f.open && f.kind === 'seam' && (f.remaining ?? 0) > 0)
    .sort((a, b) => b.grade - a.grade);
  return workable[0] ?? null;
}
