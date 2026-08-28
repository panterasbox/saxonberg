/**
 * RechargeController — `recharge <item> [amount]`.
 *
 * **Recharging is a service, and that is the whole point** (requirements
 * D7). A depleted shell is a paperweight with a socket, so bounding the
 * *item count* is bounding the wrong quantity — what is genuinely scarce
 * is **caster-hours**, which is self-balancing with population. So:
 *
 * - a mage who will sit and fill other people's wands has a **recurring
 *   business**, and stays worth hiring however common wands become;
 * - **you find shells and buy charge**, so wealth cannot corner the
 *   found channel — what money buys is caster-labour, which is capped;
 * - shell inflation is therefore **harmless**, and distribution can
 *   afford to be generous.
 *
 * ## What it takes to do it at all
 *
 * Three things, and until this build only the first was checked:
 *
 * | | supplies | without it |
 * |---|---|---|
 * | your **reserve** | the energy | "You have no gift to pour into it." |
 * | a **working** (`transfer`) | the specification | you know of no way to move it |
 * | a **conduit** | the coupling | you have nothing to carry it through |
 *
 * The energy was always yours — mana is a metabolic fraction, so what
 * ends up in the wand was food and water a few hours ago. What was
 * missing was any account of *how it crosses*, and the answer is that
 * it does not cross by intent: it crosses through a coupling, and
 * couplings have impedance (see {@link ConduitMixin}).
 *
 * ⚠ **The verb stays afforded when you cannot use it.** `ChargedMixin`
 * contributes it, so the affordance follows the *target* — and a caster
 * with no conduit sees `recharge` and fails audibly, exactly as a flat
 * wand still affords `zap` (D34). Hiding it would turn the affordance
 * list into a free inventory check on everyone in the room.
 *
 * ## Efficiency
 *
 * `delivered = committed × coupling × competence`, and **both factors
 * are below 1** — an efficiency of 1 was a perfect pump, the one free
 * lunch in a model where a firebolt spends 35.2 τ to deliver 29.9. The
 * shortfall is not bookkeeping: it is heat in the coupling, which is
 * where transfer losses go.
 *
 * The controller keeps only machinery (the MVC rule): resolve, gate,
 * move the reserve, narrate.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { MagicApi } from '../../../../api/magic';
import { SpellKnowledge } from '../../../../lib/magic/SpellKnowledge';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

/** The working that specifies the transfer. */
const TRANSFER_SPELL_PATH = '/stuff/idea/magic/Spell/transfer';

interface RechargeModel extends CommandModel {
  target: MqlOneResult;
  amount?: number;
}

export default class RechargeController extends CommandController<RechargeModel> {
  async execute(model: RechargeModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const target = model.target?.stuff ?? null;

    if (!target) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }

    if (!MixinApi.isCharged(target)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} has nothing in it that would hold a charge.`,
        )
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'ChargedMixin' });
      return;
    }

    if (!MixinApi.isCaster(actor) || !MixinApi.isReserved(actor)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no gift to pour into it.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-faculty',
        detail: 'actor is not a caster',
      });
      return;
    }

    // ── the specification ──
    if (!(await SpellKnowledge.knowsOf(actor, TRANSFER_SPELL_PATH))) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You can feel where the energy would have to go, and no idea how to send it. There is a working for this, and you do not have it.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-working',
        detail: TRANSFER_SPELL_PATH,
      });
      return;
    }

    // ⚠ No conduit pre-check here: `MagicApi.transferCharge` owns that
    // refusal, and duplicating it would let the two drift.
    const pool = actor.getMana();
    const available = pool?.current.rawValue() ?? 0;
    // How much of the caster's own reserve to commit: what they asked
    // for, or everything they can spare.
    const asked =
      typeof model.amount === 'number' && Number.isFinite(model.amount)
        ? Math.max(0, model.amount)
        : available;
    if (asked <= 0 || available <= 0) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have nothing left to give it.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'insufficient-mana',
        detail: 'empty reserve',
      });
      return;
    }
    // An explicit amount you cannot afford is REFUSED, not silently
    // trimmed — the player asked for a specific trade (AC 8).
    if (asked > available) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You reach for that much and come up short — there is not enough in you.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'insufficient-mana',
        detail: `asked ${asked}, holds ${available}`,
      });
      return;
    }

    const moved = await MagicApi.transferCharge(actor, target, asked);
    if (moved.refusal) {
      MessageApi.scene(actor).topic(TOPIC).toSelf(Mml.text(moved.refusal)).send();
      context.note({
        kind: 'controller-rejected',
        reason: 'transfer-refused',
        detail: moved.refusal,
      });
      return;
    }

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.text(moved.report))
      .toPeers(
        Mml.compose`${Mml.actor(actor)} holds ${Mml.thing(target)} still, and something passes between them.`,
      )
      .send();
  }
}
