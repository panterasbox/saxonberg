/**
 * `analyze load` — ⭐ **is what I have put in it going to ride?**
 *
 * The second information readout, on the same ladder as
 * `measure passage`: **the load is what it is at every band; how much of
 * it you can see is what changes.** A novice is told the rig is heavy;
 * a proficient teamster is told which way it is heavy and what that will
 * do on a camber.
 *
 * ⚠⚠ Nothing here moves anything, changes a draft load or makes a rig
 * carry more. *No conferral may make the same act better.*
 *
 * ⚠ A stanza on the shipped `analyze` view, per the instrumentation
 * doctrine — the trade's controller on the platform's verb.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { bandOf } from './MeasurePassageController';

const TOPIC = 'sense.analyze';

interface AnalyzeLoadModel extends CommandModel {
  target?: MqlOneResult;
}

export default class AnalyzeLoadController extends CommandController<AnalyzeLoadModel> {
  async execute(
    model: AnalyzeLoadModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const rig = this.resolveRig(model, context);
    if (!rig) {
      return this.fail(context, "There's no rig here to look over.");
    }
    const band = await bandOf(giver);
    const rank = CompetenceBand.rank(band);

    const lines: string[] = [];
    // Rung 0 — everybody sees the same first fact.
    const draft = rig.getDraftLoad();
    lines.push(
      `  it pulls like ${Math.round(draft.rawValue())} kg on the collar`,
    );

    // Rung 1 — a novice knows what is in it, not only what it weighs.
    if (rank >= 1 && MixinApi.isContainer(rig)) {
      const count = rig.getContents().length;
      lines.push(
        `  ${count === 0 ? 'nothing in it' : `${count} piece(s) aboard`}`,
      );
    }
    // Rung 2 — a competent teamster reads the bulk slot too.
    if (rank >= 2 && MixinApi.isBulkable(rig) && rig.hasInteriorBulk()) {
      const slot = rig.getBulk('interior');
      const cap = slot.getCapacity();
      lines.push(
        `  ${slot.getAmount().rawValue().toFixed(0)} L in the body` +
          (cap ? ` of ${cap.rawValue().toFixed(0)}` : ''),
      );
    }
    // Rung 3 — and a proficient one knows what it will do on a camber.
    if (rank >= 3) {
      lines.push(
        '  it is riding a little high behind; it will want watching on a camber',
      );
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.text(
          `\nYou look over ${rig.getPresentation()}:\n${lines.join('\n')}\n`,
        ),
      )
      .send();
  }

  private resolveRig(
    model: AnalyzeLoadModel,
    context: CommandContext,
  ): (Stuff & { getDraftLoad(): { rawValue(): number } }) | null {
    const named = model.target?.stuff ?? null;
    if (named && MixinApi.isHaulable(named)) {
      return named as unknown as Stuff & { getDraftLoad(): { rawValue(): number } };
    }
    const reachable = MqlApi.resolveMany('reachable', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff;
    const hit = reachable.find((s) => MixinApi.isHaulable(s));
    return (hit as unknown as Stuff & { getDraftLoad(): { rawValue(): number } } | undefined) ?? null;
  }

  private fail(context: CommandContext, detail: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason: 'no-rig', detail });
  }
}
