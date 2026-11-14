/**
 * DryController — `dry <cut> [on <rack>]`: **hang it up and let the air
 * have it.**
 *
 * ⭐⭐ **This act no longer makes anything, and that is the whole change.**
 * It used to resolve a recipe, `air-dry`, whose entire content was
 * `cure: { moisture: 0.35 }` — an instant constant with no time, no air
 * and no weather in it. The same amount of water left a ham in an August
 * wind and in a steamy cellar, which is a lookup table dressed as physics:
 * a player who understands evaporation could not predict it.
 *
 * So `dry` does what hanging a ham actually is — it **puts the cut
 * somewhere the air can get at it** — and the drying is then the cut's own
 * clock (`MoistureMixin`, reconcile-on-read) against the air the weather
 * makes. The recipe row is deleted; the act narrates a **prospect** in
 * words, because the answer is a rate and the player is entitled to know
 * roughly what they are in for before they wait a week for it.
 *
 * ⚠ The drying hurdle still multiplies with salting (`a_w = a_w(material) ·
 * moisture · (1 − solute)`), so a cut that is both keeps better than one
 * that is either — that arithmetic is unchanged and lives in `Moisture`.
 *
 * ⭐ The rack is a **declared instrument arg**, and it earns its keep now:
 * a support carries an `airExposure` fraction, so a ham on a slatted rack
 * dries about three times as fast as one dropped on the floor of the same
 * room. Before the lens pass the rack was decoration — a placement
 * moves an item into the *host's* container, so racked and dropped were
 * the same air and the same arithmetic.
 *
 * ⭐ **Two shapes, two controllers** (controller-liquidity W7c, D13 rung 4 —
 * the `throw` trio's rule): `dry <thing> [on <rack>]` is this one, hanging
 * it up; `dry <thing> with <cloth>` is `DryRubController`, rubbing it dry.
 * The forecast is the THING's — a cut's `Moist.hoursToDry`, a wet shirt's
 * `Wet.dryingHours` — so this file only words the hours it is told.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { Placements } from '../../../../lib/spatial/Placement';

const TOPIC = 'act.deed';
const DISCIPLINE = 'cooking';

export interface DryModel extends CommandModel {
  target?: MqlOneResult;
  rack?: MqlOneResult;
}

export default class DryController extends CommandController<DryModel> {
  async execute(model: DryModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    const target = model.target?.stuff ?? null;
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          model.target
            ? Mml.compose`You don't see any '${model.target.raw}' here.`
            : Mml.compose`Hang what up to dry?`,
        )
        .send();
      context.note(
        model.target
          ? { kind: 'empty-result', field: 'target', query: model.target.raw }
          : { kind: 'controller-rejected', reason: 'no-target' },
      );
      return;
    }

    // ⭐ The refusal names the PROPERTY, not a class list: a thing dries
    // if it has a water state (a cut, a hide, a turf) — or if it is simply
    // WET (cleanliness D11: a washed shirt, a cloak out of the rain). A
    // fish, a hide and a turf all qualify the day somebody ships one.
    const wetThing = DryController.isWetThing(target);
    if (!MixinApi.isMoist(target) && !wetThing) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`There is no water in ${Mml.thing(target)} to take out.`,
        )
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-dryable' });
      return;
    }

    const rack = model.rack?.stuff ?? null;
    // ⭐ A rack you hang ON (a Placing host), or a compartment you put a
    // thing IN — a Container with its own air, the drying loft (size and
    // carrying W9: what is in it is its contents).
    const placing = rack !== null && MixinApi.isPlacing(rack) ? rack : null;
    const holder = rack !== null && placing === null && MixinApi.isContainer(rack) ? rack : null;
    if (rack !== null && placing === null && holder === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You cannot hang anything on ${Mml.thing(rack)}.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-rack' });
      return;
    }

    // ⭐ Which way of sitting the rack offers, and what the player
    // typed. A rack offers `on`; a meat hook offers `from`. The member
    // is the rack's claim and the word is the player's — and `put ham
    // on hook` works because `from`'s row lists `on` as a secondary,
    // which is how the world teaches the word without a tutorial.
    const member =
      placing === null ? null : placing.resolvePlacement(model.rack?.prep);
    if (placing !== null && member === null) {
      const takes = placing.getPlacements().join(' or ');
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You can't hang things ${model.rack?.prep ?? ''} ${Mml.thing(placing)} — it takes ${takes}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'wrong-preposition',
        detail: `rack takes ${takes}`,
      });
      return;
    }

    if (rack !== null) {
      if (!MixinApi.isContainable(target)) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`${Mml.thing(target)} will not go anywhere.`)
          .send();
        context.note({ kind: 'controller-rejected', reason: 'not-movable' });
        return;
      }
      const veto =
        placing !== null
          ? placing.canPlace(target, member!)
          : { ok: holder!.fitRefusal(target) === null };
      if (!veto.ok) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`${Mml.thing(rack)} will not take ${Mml.thing(target)}.`,
          )
          .send();
        context.note({ kind: 'controller-rejected', reason: 'rack-refuses' });
        return;
      }
      if (placing !== null) ContainmentApi.move(target, placing, member!);
      else ContainmentApi.move(target, holder!);
    }

    // ⭐ The thing's own forecast, in words — a cut's water state, else a
    // wet thing's wetness (the same rate the gauge dries by, B56).
    const hours = MixinApi.isMoist(target)
      ? target.hoursToDry()
      : MixinApi.isWet(target)
        ? target.dryingHours()
        : null;
    const prospect = DryController.prospectWords(hours);

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        // A shirt on the line is laundry; a ham on the rack is the larder.
        discipline: wetThing ? 'textiles' : DISCIPLINE,
        difficulty: 'easy',
        outcome: 'success',
      });
    }

    // ⚠ ONE `toSelf` frame — a Scene refuses a second of the same kind, so
    // the prospect rides in the same sentence pair rather than beside it.
    const tail = ` ${prospect}`;
    // ⭐ The sentence uses the MEMBER's own word: *on the rack*, *from
    // the hook*. A player never has to be told which; they read it.
    const word =
      holder !== null
        ? ContainmentApi.placements().need(Placements.IN).getPrimaryWord()
        : member === null || placing === null
          ? ''
          : placing.placementOf(member).getPrimaryWord();
    const self = rack
      ? Mml.compose`You hang ${Mml.thing(target)} up to dry ${word} ${Mml.thing(rack)}.${tail}`
      : Mml.compose`You hang ${Mml.thing(target)} up to dry.${tail}`;
    const peers = rack
      ? Mml.compose`${Mml.actor(giver)} hangs ${Mml.thing(target)} up to dry ${word} ${Mml.thing(rack)}.`
      : Mml.compose`${Mml.actor(giver)} hangs ${Mml.thing(target)} up to dry.`;

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(self)
      .toPeers(peers)
      .send();
  }

  /**
   * ⭐ Wet with no water state of its own — a washed shirt, a cloak out of
   * the rain (cleanliness D11). A thing with a water state (a cut, a hide)
   * is read by that instead.
   */
  protected static isWetThing(target: Stuff): boolean {
    return !MixinApi.isMoist(target) && MixinApi.isWet(target) && target.getWetness() > 0.01;
  }

  /**
   * ⭐ **How long, in words.** Never a number, because the air will change
   * and a figure would read as a promise — it says *in this air*, because a
   * rainy week makes it wrong and that is the lesson rather than a bug.
   */
  protected static prospectWords(hours: number | null): string {
    if (hours === null) return 'Nothing will dry here.';
    if (hours <= 0) return 'It is dry already.';
    return `In this air it will take about ${DryController.span(hours)}.`;
  }

  /** A duration as a coarse phrase. Bands, never a figure. */
  protected static span(hours: number): string {
    if (hours < 30) return 'a day';
    const days = hours / 24;
    if (days < 3.5) return 'a couple of days';
    if (days < 10) return 'a week or so';
    if (days < 24) return 'a fortnight';
    if (days < 80) return 'a month or two';
    return 'most of a season';
  }
}
