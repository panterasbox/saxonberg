/**
 * HireController — `hire <person>`, ⭐⭐ **the hiring driver this build
 * owes the employment subsystem.**
 *
 * The whole employment spine ships — positions, roster, shifts, wages,
 * arrears, the call, `apply`, `clock on`. What has never shipped is a
 * way for a **player** to take somebody on: `appoint` is the governance
 * verb and its target `scope: "online"` is its documented contract,
 * which means it cannot reach a brainless NPC standing in front of you.
 *
 * ⭐ So this is the trade's word for it, with `scope: [reachable]`:
 * **you hire the person who is standing there.** Which is honest — a
 * nineteenth-century bore crew was hired at the rig, out of whoever had
 * walked up to it.
 *
 * ⚠ Declining to widen `appoint` instead is deliberate. `online` is not
 * an oversight in `appoint`; it is right for appointing somebody to an
 * OFFICE, where the appointee has to be able to accept. A roustabout is
 * not appointed to anything. If a second trade wants the same word,
 * widen it then — one consumer is not a pattern.
 */

import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  DrillingActController,
  ACT_TOPIC,
  type DrillingModel,
} from './DrillingActController';
import DrillingOutfitClass from '../../DrillingOutfit';
import type DrillingOutfit from '../../DrillingOutfit';

/** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
interface HireModel extends DrillingModel {
  target?: MqlOneResult;
}

export default class HireController extends DrillingActController<HireModel> {
  public async execute(
    model: HireModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to hire anybody.`, 'no-place');
      return;
    }
    // ⭐⭐ **Whose outfit, and why this is not simply "the hole in this
    // room".** It was, for one revision, and the drive killed it: a
    // roustabout has no brain on purpose, so he does not walk anywhere.
    // Hiring only at the rig meant hiring was unreachable — the hands
    // wait in the dry, and nothing could bring them out to a hillside.
    //
    // So: the hole here if there is one, else the single outfit this
    // person is the proprietor of. ⚠ Two outfits and it refuses, naming
    // the remedy (go and hire at the rig you mean) rather than guessing
    // which payroll to put somebody on.
    const hole = await this.wellheadOf(model);
    const outfit = hole
      ? StuffApi.findByTemplatePath<DrillingOutfit>(hole.getOutfitPath())
      : await this.soleOutfitOf(giver, context);
    if (!outfit) return;
    const who = (model.target?.stuff ?? null) as Stuff | null;
    if (who === null) {
      this.decline(context, Mml.compose`Hire whom?`, 'no-target');
      return;
    }
    if (!MixinApi.isEmployed(who)) {
      this.decline(
        context,
        Mml.compose`${Mml.actor(who)} is not somebody you can put on a payroll.`,
        'not-employable',
      );
      return;
    }
    if (outfit.employs(who)) {
      this.inform(
        context,
        Mml.compose`${Mml.actor(who)} already works for you.`,
      );
      return;
    }

    const ok = await outfit.startCrew(who);
    if (!ok) {
      this.decline(
        context,
        Mml.compose`${Mml.actor(who)} will not sign on.`,
        'refused',
      );
      return;
    }

    MessageApi.scene(giver)
      .topic(ACT_TOPIC)
      .toSelf(
        hole === null
          ? Mml.compose`${Mml.actor(who)} spits on a palm, shakes, picks his coat off the hook and goes out to the rig without being told twice. The wage runs from now, whether the beam turns or not.`
          : Mml.compose`${Mml.actor(who)} spits on a palm, shakes, and takes hold of the beam. The wage runs from now, whether the beam turns or not.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} takes ${Mml.actor(who)} on.`)
      .send();
  }

  /**
   * The one outfit this person is the proprietor of, or a refusal.
   *
   * ⚠ Enumerated by MIXIN rather than by a template-path scan, which is
   * the shipped way to ask *every live Business* — and then narrowed to
   * this trade's own class, because hiring a roustabout onto a bakery
   * would be a category error the employment spine would happily
   * perform.
   */
  private async soleOutfitOf(
    giver: Stuff,
    context: CommandContext,
  ): Promise<DrillingOutfit | null> {
    const mine: DrillingOutfit[] = [];
    for (const candidate of StuffApi.findByMixin('BusinessMixin')) {
      if (!(candidate instanceof DrillingOutfitClass)) continue;
      if (await candidate.hasProprietor(giver)) mine.push(candidate);
    }
    if (mine.length === 0) {
      this.decline(
        context,
        Mml.compose`You have no rig to put anybody on the books of. Site a hole first — a crew is paid out of an outfit, and an outfit is opened by sinking something.`,
        'no-outfit',
      );
      return null;
    }
    if (mine.length > 1) {
      this.decline(
        context,
        Mml.compose`You are running more than one rig, and this would be guessing which payroll to put them on. Hire at the rig you mean.`,
        'many-outfits',
      );
      return null;
    }
    return mine[0]!;
  }
}
