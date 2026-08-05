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
 * Both charged items and foci answer to this verb, because from the
 * user's side it is one act: spend your reserve, make the thing work
 * again. What differs is the **cost basis** (D9) — filling a tank is a
 * transfer of energy; re-impressing a pattern is *work*, buying back
 * order rather than energy, and it costs more per point restored.
 *
 * The controller keeps only machinery (the MVC rule): resolve, gate,
 * move the reserve, narrate.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { Quantity } from '../../../lib/quantity';
import { MANA_RESERVE_KEY } from '../../../lib/magic/Caster';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.magic.cast';

/** kJ delivered into a tank per point of the caster's reserve spent. */
const KJ_PER_MANA_PT = 1;
/**
 * Pattern integrity restored per point spent. Re-impressing order is
 * dearer than pouring energy — a focus is cheap to own and expensive to
 * maintain, which is the counterweight to it having no tank to run dry.
 */
const PATTERN_PER_MANA_PT = 0.004;

interface RechargeModel extends CommandModel {
  target: MqlOneResult;
  amount?: number;
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export default class RechargeController extends CommandController<RechargeModel> {
  execute(model: RechargeModel, context: CommandContext): void {
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

    const charged = MixinApi.isCharged(target);
    if (!charged) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.item(target)} has nothing in it that would hold a charge.`,
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

    const pool = actor.getMana();
    const available = pool?.current.rawValue() ?? 0;
    // How much of the caster's own reserve to spend: what they asked
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

    // Charge first: a thing that is both takes the tank before the
    // pattern, because a slack pattern on a full tank is still useful
    // and a sharp pattern on an empty one is not.
    let spent = 0;
    const reports: string[] = [];
    if (charged) {
      const perPt = dial(AppSettingKeys.magicRechargeKJPerManaPt, KJ_PER_MANA_PT);
      const taken = target.receiveCharge(asked * perPt);
      const cost = perPt > 0 ? taken / perPt : 0;
      spent += cost;
      if (taken > 0) {
        reports.push('The shell drinks it down and warms in your hand.');
      } else {
        reports.push('It is already as full as it will get.');
      }
    }

    if (spent > 0) {
      actor.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-spent, 'pt'));
    }

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.text(reports.join(' ')))
      .toPeers(
        Mml.compose`${Mml.name(actor)} holds ${Mml.item(target)} still, and something passes between them.`,
      )
      .send();
  }
}
