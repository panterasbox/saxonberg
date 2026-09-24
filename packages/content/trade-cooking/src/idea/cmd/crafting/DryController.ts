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
 * clock (`CuredMixin`, reconcile-on-read) against the air the weather
 * makes. The recipe row is deleted; the act narrates a **prospect** in
 * words, because the answer is a rate and the player is entitled to know
 * roughly what they are in for before they wait a week for it.
 *
 * ⚠ The drying hurdle still multiplies with salting (`a_w = a_w(material) ·
 * moisture · (1 − solute)`), so a cut that is both keeps better than one
 * that is either — that arithmetic is unchanged and lives in `Cured`.
 *
 * ⭐ The rack is a **declared instrument arg**, and it earns its keep now:
 * a support carries an `airExposure` fraction, so a ham on a slatted rack
 * dries about three times as fast as one dropped on the floor of the same
 * room. Before the lens pass the rack was decoration —
 * `ContainmentApi.placeOn` moves an item into the *surface's* container, so
 * racked and dropped were the same air and the same arithmetic.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { Mml } from '@saxonberg/server/mud/api/mml';

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
    // if it has a water state. A fish, a hide and a turf all qualify the
    // day somebody ships one, with no edit here.
    if (!MixinApi.isCured(target)) {
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
    if (rack !== null && !MixinApi.isSurfaced(rack)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You cannot hang anything on ${Mml.thing(rack)}.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-rack' });
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
      if (!rack.canRest(target)) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`${Mml.thing(rack)} will not take ${Mml.thing(target)}.`,
          )
          .send();
        context.note({ kind: 'controller-rejected', reason: 'rack-refuses' });
        return;
      }
      ContainmentApi.placeOn(target, rack);
    }

    const scope = this.scopeOf(target);
    const prospect = scope === null ? null : this.prospectFor(target, scope);

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: DISCIPLINE,
        difficulty: 'easy',
        outcome: 'success',
      });
    }

    // ⚠ ONE `toSelf` frame — a Scene refuses a second of the same kind, so
    // the prospect rides in the same sentence pair rather than beside it.
    const tail = prospect === null ? '' : ` ${prospect}`;
    const self = rack
      ? Mml.compose`You hang ${Mml.thing(target)} up to dry on ${Mml.thing(rack)}.${tail}`
      : Mml.compose`You hang ${Mml.thing(target)} up to dry.${tail}`;
    const peers = rack
      ? Mml.compose`${Mml.actor(giver)} hangs ${Mml.thing(target)} up to dry on ${Mml.thing(rack)}.`
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
    if (!MixinApi.isCured(target)) return null;
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

  /** How much of the target the air reaches — the support's own claim. */
  private exposureOf(target: Stuff): number {
    if (!MixinApi.isContainable(target)) return 0;
    const support = target.getRestingOn();
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
