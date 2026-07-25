/**
 * CastController — `cast <spell> [at <target>]`: the casting front door.
 *
 * The controller keeps only machinery (the MVC rule): resolve the spell
 * + target, run the prepare gates through `MagicApi.prepareCast`
 * (faculty / band / impairment / suppression — every refusal is the
 * Api's legible prose), then start a {@link CastActivity} holding
 * `hands` + `voice` for the strain-slowed cast time. The whole cast body
 * — spend, effects, provenance, Transcript credit — runs at the
 * activity's *completion* via `MagicApi.resolveCast`; a barge-in or
 * `cancel` mid-cast aborts with nothing spent and nothing fired (the
 * SearchController shape).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { AbortReason } from '@saxonberg/types';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { SchedulerApi } from '../../../api/scheduler';
import { MagicApi } from '../../../api/magic';
import { Mml } from '../../../api/mml';
import { CastActivity } from '../../../lib/magic/CastActivity';

const TOPIC = 'world.magic.cast';

interface CastModel extends CommandModel {
  /** A `type: string` arg parses to a plain string. */
  spell?: string;
  target?: MqlOneResult;
}

export default class CastController extends CommandController<CastModel> {
  async execute(model: CastModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const spellId = (model.spell ?? '').trim().toLowerCase();

    if (!spellId) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`Cast what? (\`spells\` lists your workings.)`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-spell',
        detail: 'no spell named',
      });
      return;
    }
    // A named-but-unresolved target is an honest "you don't see that".
    if (model.target && model.target.stuff === null && model.target.raw) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    const target = model.target?.stuff ?? undefined;

    const prep = await MagicApi.prepareCast(actor, spellId, target);
    if (!prep.ok) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${prep.refusal ?? 'The working will not come.'}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'cast-refused',
        detail: prep.refusal ?? 'refused',
      });
      return;
    }

    // Module-private completion body — the controller instance is a
    // per-dispatch clone destructed when execute returns, so an
    // instance-method closure would no-op as [inert] by the time the
    // activity completes. Free of `this` by construction.
    const onComplete = (): void => {
      void resolveAndRender(actor, spellId, target);
    };

    // No engagement capacity (a bare test fixture) → resolve now (the
    // Search/ManualBuild degenerate-fallback pattern).
    if (!MixinApi.isEngaged(actor)) {
      onComplete();
      return;
    }

    const activity = new CastActivity({
      actor,
      spellId,
      durationMs: (prep.castSeconds ?? 3) * 1000,
      onComplete,
      onAbort: (_reason: AbortReason): void => {
        // Interrupted mid-shaping — nothing spent, nothing fired.
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(Mml.compose`The working collapses, unfinished.`)
          .toPeers(
            Mml.compose`${actor.getPresentation()}'s half-shaped working collapses.`,
          )
          .send();
      },
    });

    const result = SchedulerApi.start(activity);
    if (
      result.ok &&
      (result.status === 'started' || result.status === 'replaced')
    ) {
      context.note(result.note);
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You begin shaping ${prep.spellName ?? spellId}…`)
        .toPeers(
          Mml.compose`${actor.getPresentation()} begins shaping a working, hands and voice committed.`,
        )
        .send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') {
      return; // onComplete already ran (incl. its own render)
    }
    if (!result.ok) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`Your hands and voice are otherwise committed — finish or \`cancel\` first.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'engagement-conflict',
        detail: result.reason ?? 'busy',
      });
    }
  }

}

/** The completion body — resolve through the Api and render. Module-private
 * (NOT an instance method): it runs after the per-dispatch controller
 * clone has been destructed. */
async function resolveAndRender(
  actor: Stuff,
  spellId: string,
  target: Stuff | undefined,
): Promise<void> {
  const outcome = await MagicApi.resolveCast(actor, spellId, target);
  if (!outcome.ok) {
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`${outcome.refusal ?? 'The working slips away at the last moment.'}`,
      )
      .send();
    return;
  }
  const lines = outcome.reports.length
    ? outcome.reports.join(' ')
    : 'The working completes.';
  MessageApi.scene(actor)
    .topic(TOPIC)
    .toSelf(Mml.compose`${lines}`)
    .toPeers(
      Mml.compose`${actor.getPresentation()} completes a working — the air shivers with it.`,
    )
    .send();
}
