/**
 * CharController — `char [<draught>]`, the burn.
 *
 * A **watched engagement over game time**: the clamp is lit, the collier
 * sets the draught, and three days later it is opened. Re-issuing `char`
 * while a burn is running RE-SETS the draught rather than starting a
 * second one — which is what watching a burn actually consists of.
 *
 * ⭐⭐ The outcome is decided by the draught at the moment the burn
 * COMPLETES, not at the moment it started. That is the whole reason the
 * engagement is watched rather than fire-and-forget: a collier who sets
 * it and walks away gets whatever the initial guess deserved; one who
 * comes back and adjusts gets what they earned.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { AdvancementApi } from '@saxonberg/server/mud/api/advancement';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import CharcoalPit from '../../../thing/CharcoalPit';

const TOPIC = 'act.deed';
/** The Discipline a burn credits. Fuel is its own trade. */
const COLLIERY = 'colliery';
/**
 * Three days, compressed. ⚠ It is long ON PURPOSE: a burn you can watch
 * to the end in one sitting is not a burn you can lose track of, and
 * losing track of it is the failure the craft is about.
 */
const BURN_MS = 3 * 24 * 60 * 60 * 1000;

interface CharModel extends CommandModel {
  draught?: number;
}

export default class CharController extends CommandController<CharModel> {
  async execute(model: CharModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    const pit = room && MixinApi.isContainer(room)
      ? (room.getContents().find((c) => c instanceof CharcoalPit) as CharcoalPit | undefined)
      : undefined;
    if (!pit) {
      this.decline(context, Mml.compose`There is no clamp here to burn.`, 'no-clamp');
      return;
    }

    if (model.draught !== undefined) pit.setDraught(model.draught);

    // ⭐ Re-issuing while a burn runs is ADJUSTING it, which is what
    // watching a burn consists of. It is not a second burn and it is not
    // an error.
    if (
      MixinApi.isEngaged(giver) &&
      giver.getEngagements().some((e) => e.slots.has('attention'))
    ) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You work along the clamp, opening and stopping vents. The draught is ${pit.getDraught().toFixed(2)} now.`,
        )
        .send();
      return;
    }

    const charge = (pit.getContents() as Stuff[]).filter((c) => isCordwood(c));
    if (charge.length === 0) {
      this.decline(
        context,
        Mml.compose`The clamp is empty. Fill it with cordwood before you light it.`,
        'empty-clamp',
      );
      return;
    }

    const lengths = charge.length;
    this.engage(context, pit, () => {
      void this.open(context, pit, charge, lengths);
    });
  }

  /** Light it and hand the clock the rest. */
  private engage(context: CommandContext, pit: CharcoalPit, onDone: () => void): void {
    const giver = context.commandGiver;
    if (!MixinApi.isEngaged(giver)) {
      onDone();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      // ⚠ The `attention` slot, not `hands`: a burn is WATCHED, not held.
      // A collier can eat, cut more wood and walk to the yard while it
      // runs — the craft is attention over three days rather than
      // occupation for three days, and the slot says which.
      slots: ['attention'],
      durationMs: BURN_MS,
      onComplete: onDone,
      host: pit as unknown as Stuff,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && result.status !== 'completed-sync') context.note(result.note);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You fire the clamp and turf it over. Smoke finds its way out in a dozen places. Draught set at ${pit.getDraught().toFixed(2)}; now it is three days of watching.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} fires the clamp.`)
      .send();
  }

  /**
   * Open the clamp. ⭐ The draught read HERE — at completion — is what
   * decides, so an adjustment made on day two is the one that counts.
   */
  private async open(
    context: CommandContext,
    pit: CharcoalPit,
    charge: Stuff[],
    lengths: number,
  ): Promise<void> {
    const giver = context.commandGiver;
    const outcome = pit.outcomeFor();
    for (const wood of charge) StuffApi.destruct(wood);

    const row =
      outcome === 'charcoal'
        ? pit.getCharcoalTemplate()
        : outcome === 'brands'
          ? pit.getBrandsTemplate()
          : pit.getAshTemplate();
    const count = outcome === 'charcoal' ? pit.yieldFor(lengths) : 1;

    const made: Stuff[] = [];
    if (row) {
      for (let i = 0; i < Math.max(count, 0); i++) {
        const item = await StuffApi.clone<Stuff>(row);
        ContainmentApi.move(item as unknown as Stuff & Containable, pit as unknown as Stuff & Container);
        made.push(item);
      }
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        outcome === 'charcoal'
          ? Mml.compose`You break the clamp open. Black, light, and it rings when you knock two lumps together — ${String(made.length)} baskets off ${String(lengths)} lengths.`
          : outcome === 'brands'
            ? Mml.compose`You break the clamp open on half-burnt brands. Brown at the heart, heavy in the hand. You drew it too tight, and a week's cutting is worth a fraction of what it should be.`
            : Mml.compose`You break the clamp open on nothing but warm ash. It took too much air and burned the carbon out along with the rest. A week's cutting and three days' watching, gone.`,
      )
      .send();

    // ⚠ The DEED is recorded either way. A lost burn is evidence of
    // practice — it is how a collier learns where the band is, and
    // recording only successes would make the ledger a scoreboard.
    await AdvancementApi.recordDeed(giver, {
      discipline: COLLIERY,
      difficulty: 'standard',
      outcome: outcome === 'charcoal' ? 'success' : 'failure',
    });
  }

  private decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/** Cordwood: a wooden provision, which is what a clamp is charged with. */
function isCordwood(item: Stuff): boolean {
  if (!MixinApi.isPerceptible(item)) return false;
  return item.getKeywords().includes('cordwood');
}
