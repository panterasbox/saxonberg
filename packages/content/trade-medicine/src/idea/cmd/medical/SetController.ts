/**
 * SetController — `splint <patient> with <splint>` (trade-medicine). The
 * verb is `splint`, not `set` (`set` is a scripting builtin).
 *
 * A broken bone wants SETTING, not a bandage — `treat` says so and names
 * the splint. This is the splint: it applies the fracture's treatment
 * through the ONE body primitive (`Vitals.applyTreatment`), so a set
 * fracture knits at the treated rate. How well it is set is the setter's
 * medicine competence; the splint itself is the instrument that affords
 * the verb (the Whetstone rule — carried, anywhere).
 *
 * ⚠ Anyone with a splint can set a bone — the tool does the work, and a
 * clumsy set is still a set. What competence buys is how WELL, which
 * `careQuality` carries into the heal rate.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Vitals } from '@saxonberg/server/mud/lib/vitals/Vitals';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import type { Difficulty, Outcome } from '@saxonberg/server/mud/lib/advancement/ActSignature';

const TOPIC = 'act.deed';
const NURSING = 'nursing';
const MEDICINE = 'medicine';

interface SetModel extends CommandModel {
  patient?: MqlOneResult;
  splint?: MqlOneResult;
}

/** Band rank (0..4) → treatment efficacy (0.4..1.0). */
const efficacyFor = (band: string): number =>
  0.4 + 0.15 * CompetenceBand.rank(band as never);

export default class SetController extends CommandController<SetModel> {
  async execute(model: SetModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;

    if (!MixinApi.isVitals(target)) {
      return this.fail(context, 'There is nothing there to set.', 'no-body');
    }
    if (!model.splint?.stuff) {
      return this.fail(
        context,
        'You need a splint in hand to set a bone.',
        'no-splint',
      );
    }

    const body = target as Stuff & Vitals;
    const fracture = body
      .getConditions()
      .filter(
        (c): c is Trauma =>
          c.kind === 'trauma' &&
          c.type === 'fracture' &&
          c.dressed !== true &&
          c.severity > 0,
      )
      .sort((a, b) => b.severity - a.severity)[0];
    if (!fracture) {
      const who = self ? 'You have' : 'They have';
      return this.fail(
        context,
        `${who} no broken bone to set.`,
        'nothing-to-set',
      );
    }

    const band = MixinApi.isAdvancing(giver)
      ? await giver.bestBandFor([NURSING, MEDICINE])
      : CompetenceBand.FLOOR;
    body.applyTreatment(fracture, {
      by: 'setting',
      efficacy: efficacyFor(band),
      treater: giver as unknown as Stuff,
    });

    if (MixinApi.isAdvancing(giver)) {
      const difficulty: Difficulty = 'hard';
      const outcome: Outcome =
        CompetenceBand.rank(band) >= 2 ? 'success' : 'partial';
      await giver.creditDeed({ discipline: NURSING, difficulty, outcome });
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You splint the break, working the bone straight and binding it fast.`
          : Mml.compose`You splint ${Mml.thing(target)}'s break, working the bone straight and binding it fast.`,
      )
      .toPeers(
        self
          ? Mml.compose`${Mml.actor(giver)} splints a broken bone.`
          : Mml.compose`${Mml.actor(giver)} splints ${Mml.thing(target)}'s broken bone.`,
      )
      .send();
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
