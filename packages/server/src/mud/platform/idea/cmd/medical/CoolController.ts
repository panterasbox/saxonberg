/**
 * CoolController — ⭐ **cool a burn (or a body running too hot).**
 *
 * A burn wants FLUID, and there are two things you can do with water: DRINK
 * it (which `treat` does, replacing the plasma the burn weeps) or COOL the
 * wound directly, which is this verb. Cooling a burn applies its treatment
 * (`resolve` → the burn reads *cooled*), so it knits at the treated rate
 * instead of the slow natural one. It also relieves a `by: cooling`
 * affliction — a body running too hot (hyperthermia).
 *
 * ⚠ Its own verb, afforded by the `WaterFixture`'s `peers` bucket beside
 * `rinse` — you learn it standing at a basin — for the same reason `rinse`
 * is not a stanza on `wash`: widening an arg would DELETE a check, and a
 * second view claiming `wash` would shadow it silently.
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
import { BulkableApi } from '../../../../api/bulk';

const TOPIC = 'act.deed';
/** Cooling with water is competent, not expert — a middling article. */
const COOL_EFFICACY = 0.7;

interface CoolModel extends CommandModel {
  patient?: MqlOneResult;
  water?: MqlManyResult;
}

export default class CoolController extends CommandController<CoolModel> {
  async execute(model: CoolModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;
    if (!MixinApi.isVitals(target)) {
      return this.fail(context, 'There is nothing there to cool.', 'no-body');
    }

    const water = this.findWater(model.water);
    if (water === null) {
      return this.fail(
        context,
        'There is no water here to cool it with.',
        'no-water',
      );
    }

    const body = target as Stuff & Vitals;
    const burns = body
      .getConditions()
      .filter(
        (c): c is Trauma =>
          c.kind === 'trauma' && c.type === 'burn' && c.dressed !== true,
      );
    const overheated = body
      .getConditions()
      .filter(
        (c): c is AfflictionRecord =>
          c.kind === 'affliction' && this.resolutionOf(c) === 'cooling',
      );

    if (burns.length === 0 && overheated.length === 0) {
      const who = self ? 'You have' : 'They have';
      return this.fail(
        context,
        `${who} nothing that cooling would help.`,
        'nothing-to-cool',
      );
    }

    for (const wound of burns) {
      body.applyTreatment(wound, {
        by: 'cooling',
        efficacy: COOL_EFFICACY,
        treater: giver as unknown as Stuff,
      });
    }
    // A body running too hot is brought back down; if it is still in the
    // heat it will climb again on the next metabolism reconcile.
    for (const a of overheated) body.relieve(a);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You cool it with water. The heat comes out of it, and it settles.`
          : Mml.compose`You cool ${Mml.thing(target)} with water until the heat comes out of it.`,
      )
      .toPeers(
        self
          ? Mml.compose`${Mml.actor(giver)} cools themselves with water.`
          : Mml.compose`${Mml.actor(giver)} cools ${Mml.thing(target)} with water.`,
      )
      .send();
  }

  /** The affliction's authored resolution token, or null. */
  private resolutionOf(a: AfflictionRecord): string | null {
    const row = StuffApi.findByTemplatePath<Condition>(a.templatePath);
    return row?.getResolution()?.by ?? null;
  }

  /** First reachable non-crafted vessel holding water (the `rinse` read). */
  private findWater(bound: MqlManyResult | undefined): Stuff | null {
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isBulkable(c) || MixinApi.isCrafted(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty()) continue;
      const m = slot.getMaterial();
      if (m?.hasTag('water')) return c;
    }
    return null;
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
