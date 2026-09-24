/**
 * WarmController — ⭐ **warm a frozen part (or a body gone cold).**
 *
 * Frostbite is NOT a burn: what it wants is warmth, not fluid. Warming a
 * frozen part applies its treatment (`resolve` → the part reads
 * *rewarmed*), so it knits at the treated rate; it also relieves a
 * `by: warmth` affliction — a body gone too cold (hypothermia, torpor).
 *
 * ⚠ Its own verb, afforded by the `FurnaceMixin`'s `peers` bucket (a
 * hearth, a campfire, a furnace) — you learn it standing by a fire. The
 * fire must actually be BURNING; a cold hearth warms nothing.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult, MqlManyResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Vitals } from '../../../../lib/vitals/Vitals';
import type { Trauma, AfflictionRecord } from '../../Condition';
import type Condition from '../../Condition';

const TOPIC = 'act.deed';
/** A fire warms well — better than a splash of water cools. */
const WARM_EFFICACY = 0.75;

interface WarmModel extends CommandModel {
  patient?: MqlOneResult;
  source?: MqlManyResult;
}

export default class WarmController extends CommandController<WarmModel> {
  async execute(model: WarmModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;
    if (!MixinApi.isVitals(target)) {
      return this.fail(context, 'There is nothing there to warm.', 'no-body');
    }

    const fire = this.findFire(model.source);
    if (fire === null) {
      return this.fail(
        context,
        'There is no fire burning here to warm it by.',
        'no-fire',
      );
    }

    const body = target as Stuff & Vitals;
    const frozen = body
      .getConditions()
      .filter(
        (c): c is Trauma =>
          c.kind === 'trauma' && c.type === 'frostbite' && c.dressed !== true,
      );
    const chilled = body
      .getConditions()
      .filter(
        (c): c is AfflictionRecord =>
          c.kind === 'affliction' && this.resolutionOf(c) === 'warmth',
      );

    if (frozen.length === 0 && chilled.length === 0) {
      const who = self ? 'You have' : 'They have';
      return this.fail(
        context,
        `${who} nothing that warmth would help.`,
        'nothing-to-warm',
      );
    }

    for (const wound of frozen) {
      body.applyTreatment(wound, {
        by: 'warmth',
        efficacy: WARM_EFFICACY,
        treater: giver as unknown as Stuff,
      });
    }
    for (const a of chilled) body.relieve(a);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You warm yourself by the fire until the numbness lifts and the feeling comes back.`
          : Mml.compose`You warm ${Mml.thing(target)} by the fire until the numbness lifts.`,
      )
      .toPeers(
        self
          ? Mml.compose`${Mml.actor(giver)} warms themselves by the fire.`
          : Mml.compose`${Mml.actor(giver)} warms ${Mml.thing(target)} by the fire.`,
      )
      .send();
  }

  /** First reachable source that is a combustible and actually burning. */
  private findFire(bound: MqlManyResult | undefined): Stuff | null {
    for (const c of bound?.stuff ?? []) {
      if (MixinApi.isCombustible(c) && c.isBurning()) return c;
    }
    return null;
  }

  private resolutionOf(a: AfflictionRecord): string | null {
    const row = StuffApi.findByTemplatePath<Condition>(a.templatePath);
    return row?.getResolution()?.by ?? null;
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
