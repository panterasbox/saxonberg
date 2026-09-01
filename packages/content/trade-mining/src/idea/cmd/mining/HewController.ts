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
import { AdvancementApi } from '@saxonberg/server/mud/api/advancement';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import type Ore from '../../../thing/Ore';
import type { Face } from '../../../location/Working';

/** Reference time for one cut, in game ms, at reference hardness. */
const HEW_MS = 9000;
/** Endurance one cut costs, in percentage points. */
const HEW_COST = 4;
/** Lumps one cut wins. */
const HEW_LUMPS = 1;

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
    const chosen = this.pickFace(faces, model.face);
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
      onComplete: () => {
        void this.win(context, working, room, chosen, oreRow, grade);
      },
    });
  }

  /**
   * Mint the lump, stamp its owner, record the face, credit the
   * Discipline. Runs at COMPLETION, so a barge-in leaves the rock
   * standing and nothing partial exists.
   */
  private async win(
    context: CommandContext,
    working: ReturnType<HewController['workingOf']> & object,
    room: Stuff & Container,
    face: Face,
    oreRow: string,
    grade: number,
  ): Promise<void> {
    const giver = context.commandGiver;
    const lump = (await StuffApi.clone(oreRow)) as unknown as Ore;
    lump.setGrade(grade);
    ContainmentApi.move(lump as unknown as Stuff & Containable, room as never);
    working.recordWinning(face.direction, HEW_LUMPS);

    // ⭐ Who owns it. On tutwork the business keeps the ore; on your own
    // claim it is yours. Title is the parcel's answer, never the ledger's.
    const owner = await this.ownerFor(giver, working);
    if (owner) await ChattelApi.stamp(lump as unknown as Stuff, owner);

    MessageApi.scene(giver)
      .topic(MINING_TOPIC)
      .toSelf(Mml.compose`You break ${Mml.thing(lump as unknown as Stuff)} out of the face.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} breaks ore out of the face.`)
      .send();

    // World-derived difficulty: the rock decides how hard the cut was,
    // not the verb. Nothing gates on the band.
    await AdvancementApi.recordDeed(giver, {
      discipline: 'geology',
      difficulty: face.hardnessMPa >= 250 ? 'hard' : face.hardnessMPa >= 150 ? 'standard' : 'easy',
      outcome: 'success',
    });
  }

  /**
   * Who the lump belongs to. The business the hewer is on shift for wins
   * — that is what tutwork MEANS — otherwise the actor.
   */
  private async ownerFor(
    giver: Stuff,
    working: ReturnType<HewController['workingOf']> & object,
  ): Promise<Stuff | null> {
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
  private pickFace(faces: readonly Face[], named?: string): Face | null {
    if (named) {
      const dir = NavigationApi.normalizeDirection(named);
      return faces.find((f) => f.direction === dir) ?? null;
    }
    const workable = faces
      .filter((f) => !f.open && f.kind === 'seam' && (f.remaining ?? 0) > 0)
      .sort((a, b) => b.grade - a.grade);
    return workable[0] ?? null;
  }
}
