/**
 * UndressController — `undress [target]`: remove the dressing from a wound.
 *
 * The clot gate's other half. `undress` (a distinct verb from the
 * wearable-slot `remove` in `cmd/inventory/`; it targets a *wound*, not
 * worn gear) clears the wound's `dressed` state via the trauma behavior's
 * `reopen` — and if the wound is still above `HARM_DEFAULTS.CLOT_SEVERITY`
 * it re-arms `bleeding` (a premature removal reopens the bleed); below the
 * threshold it has clotted and is safe to remove (heals to clear). The
 * bandage is spent, not recovered. Progression resumes on the next read
 * (reconcile-on-read — no tick to re-arm).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Vitals } from '../../../lib/vitals/Vitals';
import { TRAUMA_BEHAVIOR } from '../../Condition';
import type { Trauma } from '../../Condition';

const TOPIC = 'act.deed';

interface UndressModel extends CommandModel {
  target?: MqlOneResult;
}

/** Pick the dressed wound with the highest severity. */
function pickDressed(target: Stuff & Vitals): Trauma | null {
  const dressed = target
    .getConditions()
    .filter((c): c is Trauma => c.kind === 'trauma' && c.dressed === true);
  if (dressed.length === 0) return null;
  return [...dressed].sort((a, b) => b.severity - a.severity)[0]!;
}

export default class UndressController extends CommandController<UndressModel> {
  async execute(model: UndressModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    let target: Stuff | null;
    if (model.target?.stuff) {
      target = model.target.stuff;
    } else if (model.target?.raw) {
      return this.fail(
        context,
        `You don't see any '${model.target.raw}'.`,
        'empty-result'
      );
    } else {
      target = giver;
    }
    const isSelf = target === giver;

    if (!MixinApi.isVitals(target)) {
      return this.fail(
        context,
        `You can't undress a wound on ${Mml.thing(target).toString()}.`,
        'not-a-body'
      );
    }

    const wound = pickDressed(target);
    if (!wound) {
      const who = isSelf ? 'You have' : `${target.getPresentation()} has`;
      return this.fail(context, `${who} no dressed wound.`, 'no-dressing');
    }

    TRAUMA_BEHAVIOR[wound.type].reopen(target, wound);
    // A re-opened bleed drains again on the next read (reconcile-on-read).

    const reopened = wound.bleeding === true;
    const whose = isSelf ? 'your' : `${target.getPresentation()}'s`;
    const line = reopened
      ? Mml.fromMarkup(
          `You peel the dressing off ${Mml.escape(whose)} ${Mml.escape(wound.type)} ` +
            `— it hadn't clotted, and starts to bleed again.`
        )
      : Mml.fromMarkup(
          `You peel the dressing off ${Mml.escape(whose)} ${Mml.escape(wound.type)} ` +
            `— it has clotted and looks safe.`
        );
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: 'controller-rejected', reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
