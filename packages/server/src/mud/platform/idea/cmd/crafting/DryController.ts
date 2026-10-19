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
 * clock (`WaterActivityMixin`, reconcile-on-read) against the air the weather
 * makes. The recipe row is deleted; the act narrates a **prospect** in
 * words, because the answer is a rate and the player is entitled to know
 * roughly what they are in for before they wait a week for it.
 *
 * ⚠ The drying hurdle still multiplies with salting (`a_w = a_w(material) ·
 * moisture · (1 − solute)`), so a cut that is both keeps better than one
 * that is either — that arithmetic is unchanged and lives in `WaterActivity`.
 *
 * ⭐ The rack is a **declared instrument arg**, and it earns its keep now:
 * a support carries an `airExposure` fraction, so a ham on a slatted rack
 * dries about three times as fast as one dropped on the floor of the same
 * room. Before the lens pass the rack was decoration — a placement
 * moves an item into the *host's* container, so racked and dropped were
 * the same air and the same arithmetic.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { BiomeApi } from '../../../../api/biome';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';
const DISCIPLINE = 'cooking';

export interface DryModel extends CommandModel {
  target?: MqlOneResult;
  rack?: MqlOneResult;
  cloth?: MqlOneResult;
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
    const wetThing =
      !MixinApi.isWaterActive(target) &&
      MixinApi.isWet(target) &&
      target.getWetness() > 0.01;
    if (!MixinApi.isWaterActive(target) && !wetThing) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`There is no water in ${Mml.thing(target)} to take out.`,
        )
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-dryable' });
      return;
    }

    // ⭐ `dry <thing> with <cloth>` — rub it dry (B56): the cloth's act.
    const cloth = model.cloth?.stuff ?? null;
    if (cloth !== null) {
      await this.rubDry(target, cloth, context);
      return;
    }

    const rack = model.rack?.stuff ?? null;
    if (rack !== null && !MixinApi.isPlacing(rack)) {
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
      rack === null ? null : rack.resolvePlacement(model.rack?.prep);
    if (rack !== null && member === null) {
      const takes = rack.getPlacements().join(' or ');
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You can't hang things ${model.rack?.prep ?? ''} ${Mml.thing(rack)} — it takes ${takes}.`,
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
      const veto = rack.canPlace(target, member!);
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
      ContainmentApi.move(target, rack, member!);
    }

    const scope = this.scopeOf(target);
    const prospect =
      scope === null
        ? null
        : wetThing && MixinApi.isWet(target)
          ? this.wetLine(target.dryingHours())
          : this.prospectFor(target, scope);

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
    const tail = prospect === null ? '' : ` ${prospect}`;
    // ⭐ The sentence uses the MEMBER's own word: *on the rack*, *from
    // the hook*. A player never has to be told which; they read it.
    const word =
      member === null
        ? ''
        : (ContainmentApi.placement(member)?.getPrimaryWord() ?? member);
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

  /** The room the target is now exposed in, or `null` if it is enclosed. */
  protected scopeOf(target: Stuff): (Stuff & Container) | null {
    if (!MixinApi.isContainable(target)) return null;
    const where = target.getContainer();
    if (where === null || !MixinApi.isContainer(where)) return null;
    return where as Stuff & Container;
  }

  /**
   * ⭐ **How long, in words.** The time to reach the `dried` band at the
   * air's current factor — never a number, because the air will change and
   * a figure would read as a promise. Three sentences: *nothing will dry
   * here*, *about <span>*, and the silence when the thing is dry already.
   *
   * ⚠ Honest about being a forecast: it says *in this air*, because a
   * rainy week makes it wrong and that is the lesson rather than a bug.
   */
  protected prospectFor(target: Stuff, scope: Stuff & Container): string | null {
    if (!MixinApi.isWaterActive(target)) return null;
    const driedAt = this.dial(AppSettingKeys.cureBandDriedAt, 0.5);
    const moisture = target.getMoisture();
    if (moisture <= driedAt) return 'It is dry already.';

    const air = BiomeApi.airFor(scope);
    const factor = air.evaporationFactor();
    const equilibrium = air.humidityPct / 100;
    if (factor <= 0 || equilibrium >= driedAt) {
      return 'Nothing will dry in this air.';
    }

    const exposure = this.exposureOf(target);
    if (exposure <= 0) return 'Nothing will dry shut away like that.';
    const k =
      this.dial(AppSettingKeys.cureDryingPerHour, 0.04) * exposure * factor;
    if (!(k > 0)) return 'Nothing will dry in this air.';

    // Closed form of the same exponential the clock integrates.
    const hours =
      Math.log((moisture - equilibrium) / (driedAt - equilibrium)) / k;
    if (!Number.isFinite(hours) || hours <= 0) return 'It is dry already.';
    return `In this air it will take about ${this.span(hours)}.`;
  }

  /** Rub `target` with `cloth` (`Wet.soakUp`) and word what it did. */
  private async rubDry(
    target: Stuff,
    cloth: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWet(cloth)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(cloth)} will not take up water.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-absorbent' });
      return;
    }
    const outcome = cloth.soakUp(target);
    if (!outcome.ok) {
      const line =
        outcome.reason === 'cloth-sodden'
          ? Mml.compose`${Mml.thing(cloth)} is sodden — it will take up no more.`
          : Mml.compose`${Mml.thing(target)} is dry already.`;
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      context.note({ kind: 'controller-rejected', reason: outcome.reason });
      return;
    }
    const self = target === giver;
    const left =
      outcome.left === 'dry'
        ? 'dry'
        : outcome.left === 'damp'
          ? 'only damp'
          : `still ${outcome.left}`;
    const towel = outcome.cloth === 'dry' ? '' : `, and ${outcome.cloth === 'soaked' ? 'it is soaked now' : `it is ${outcome.cloth} now`}`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You rub yourself down with ${Mml.thing(cloth)}: you are ${left}${towel}.`
          : Mml.compose`You rub ${Mml.thing(target)} with ${Mml.thing(cloth)}: it is ${left}${towel}.`,
      )
      .toPeers(
        self
          ? Mml.compose`${Mml.actor(giver)} rubs down with ${Mml.thing(cloth)}.`
          : Mml.compose`${Mml.actor(giver)} rubs ${Mml.thing(target)} with ${Mml.thing(cloth)}.`,
      )
      .send();
  }

  /**
   * ⭐ A wet thing's forecast (`Wet.dryingHours` — the same rate the gauge
   * dries by, so the words cannot disagree with the drying, B56), in words.
   */
  private wetLine(hours: number | null): string {
    if (hours === null) return 'Nothing will dry here.';
    if (hours <= 0) return 'It is dry already.';
    return `In this air it will take about ${this.span(hours)}.`;
  }

  /** How much of the target the air reaches — the support's own claim. */
  private exposureOf(target: Stuff): number {
    if (!MixinApi.isContainable(target)) return 0;
    const support = target.getPlacement()?.host ?? null;
    if (support !== null) return support.getAirExposure();
    return this.dial(AppSettingKeys.cureGroundExposure, 0.35);
  }

  /** A duration as a coarse phrase. Bands, never a figure. */
  protected span(hours: number): string {
    if (hours < 30) return 'a day';
    const days = hours / 24;
    if (days < 3.5) return 'a couple of days';
    if (days < 10) return 'a week or so';
    if (days < 24) return 'a fortnight';
    if (days < 80) return 'a month or two';
    return 'most of a season';
  }

  private dial(key: string, fallback: number): number {
    try {
      const raw = AppApi.setting(key);
      if (raw === '' || raw == null) return fallback;
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }
}
