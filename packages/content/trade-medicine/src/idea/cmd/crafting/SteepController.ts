/**
 * SteepController — `steep <simple> in <vessel>` (D10). An engaged hands
 * step: the vessel must hold a little water; the simple is consumed and
 * the water becomes the draught the simple `steepsInto` (payload cleared).
 * A narrowing over a bare `any` arg — the binder cannot ask whether a
 * thing is a simple, so the controller reads `getSteepsInto`. Credits
 * `medicine easy`. Pharma's extraction-as-a-process replaces this later.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';

const TOPIC = 'act.deed';
const WATER = '/stuff/idea/material/bulk/water';
const STEEP_MS = 60_000;
const MIN_WATER_L = 0.2;

interface SteepModel extends CommandModel {
  simple?: MqlOneResult;
  vessel?: MqlOneResult;
}

export default class SteepController extends CommandController<SteepModel> {
  async execute(model: SteepModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const simple = model.simple?.stuff as Stuff | undefined;
    const vessel = model.vessel?.stuff as Stuff | undefined;

    // A simple is a thing with a `getSteepsInto` — state the binder cannot ask.
    const steepsInto =
      simple && typeof (simple as unknown as { getSteepsInto?: () => string }).getSteepsInto === 'function'
        ? (simple as unknown as { getSteepsInto(): string }).getSteepsInto()
        : '';
    if (!simple || !steepsInto) {
      return this.fail(context, 'That is not something you can steep.', 'not-a-simple');
    }
    if (!vessel || !MixinApi.isBulkable(vessel)) {
      return this.fail(context, 'You need a vessel of water to steep in.', 'no-vessel');
    }
    const slot = BulkableApi.slotFor(vessel, undefined);
    if (
      !slot ||
      slot.isEmpty() ||
      slot.getMaterial()?.getTemplatePath() !== WATER ||
      slot.getAmount().rawValue() < MIN_WATER_L
    ) {
      return this.fail(context, 'It needs a little water to steep in.', 'no-water');
    }

    const onComplete = (): void => {
      const draught = StuffApi.findByTemplatePath<Material>(steepsInto);
      const litres = slot.getAmount().rawValue();
      if (draught) slot.setMaterial(draught);
      slot.setAmount(Quantity.of(litres, 'L'));
      slot.setPayload(null);
      void StuffApi.destruct(simple);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The water darkens as the herb gives up its virtue. The draught is ready.`)
        .send();
    };

    if (!MixinApi.isEngaged(giver)) {
      onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: STEEP_MS,
      onComplete,
      onAbort: () => {},
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You set ${Mml.thing(simple)} to steep in ${Mml.thing(vessel)}.`)
        .send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your hands are busy just now.`)
      .send();
    context.note({ kind: 'controller-rejected', reason: 'engagement-conflict', detail: 'busy' });
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
