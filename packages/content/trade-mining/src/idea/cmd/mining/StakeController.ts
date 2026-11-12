/**
 * StakeController — `stake [<block>] [at <register>]`.
 *
 * ⭐⭐ **A claim is STAKED, not bought.** You find ground, you post a
 * notice, and the recorder writes it down: a title and no room, which is
 * what a claim IS. A surface working is staked by name (`stake pit`); a
 * block of underground by its centre cell (`stake -4,-8,-2`).
 *
 * ⭐ I/O over {@link ClaimsRegister.stakePlanFor} (controller-liquidity W9,
 * Appendix A rung 1): which of the two it is, the overlap, whose the ground
 * already is (yours included — survey C21), and the title written through
 * the gated `ParcelApi` are the register's. This file words them.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import ClaimsRegister, { type StakeDone, type StakeRefusal } from '../../../thing/ClaimsRegister';

type Composed = ReturnType<typeof Mml.compose>;

const TOPIC = 'act.deed';

interface StakeModel extends CommandModel {
  block?: string;
  /** ⭐ The register, resolved by the BINDER off the view's arg. */
  register?: MqlOneResult;
}

export default class StakeController extends CommandController<StakeModel> {
  async execute(model: StakeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const register = model.register?.stuff ?? null;
    if (!(register instanceof ClaimsRegister)) {
      StakeController.decline(context, Mml.compose`Claims are recorded at the claims office, not out here.`, 'no-register');
      return;
    }
    const plan = await register.stakePlanFor(giver, model.block ?? '');
    if (!plan.ok) {
      StakeController.decline(context, StakeController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => StakeController.refusalWords(r),
      onDone: (d) => StakeController.doneWords(d, giver),
    });
  }

  protected static decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** ⭐ Every reason the recorder will not write it (D4). */
  protected static refusalWords(r: StakeRefusal): Composed {
    switch (r.reason) {
      case 'no-diggings':
        return Mml.compose`The register names no diggings.`;
      case 'warren-unresolvable':
        return Mml.compose`The register names diggings the recorder cannot find — ${r.facts.path}. That is a fault in the books, not in your claim; nobody can stake here until somebody fixes it.`;
      case 'no-block':
        return Mml.compose`Which block? Name it as three numbers — the cell at its centre, like ${'-4,-8,-2'}.`;
      case 'already-claimed':
        if (r.facts.yours) {
          return r.facts.surface !== null
            ? Mml.compose`The ${r.facts.surface} is already in the register in your name.`
            : Mml.compose`That block runs into a claim already in the register in your name.`;
        }
        if (r.facts.surface !== null) {
          return Mml.compose`The ${r.facts.surface} is already in the register, and it is not yours to record over.`;
        }
        return r.facts.held
          ? Mml.compose`A block already recorded runs into that one, and it is not yours to record over. Stand further off and try again.`
          : Mml.compose`A block already in the register runs into that one. Stand further off and try again.`;
      case 'subdivide-failed':
        return Mml.compose`The recorder cannot enter that. Something is wrong with the register.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static doneWords(d: StakeDone, giver: Stuff): { self: Composed; peers: Composed } {
    const peers = Mml.compose`${Mml.actor(giver)} records a claim.`;
    return d.kind === 'block'
      ? {
          self: Mml.compose`The recorder turns the ledger round, writes the block and the date, and turns it back for your mark. Claim ${String(d.number)} is yours — the ground, and nothing standing on it.`,
          peers,
        }
      : {
          self: Mml.compose`The recorder turns the ledger round, writes the ${d.word} and the date, and turns it back for your mark. The ground is yours — the ground, and nothing standing on it.`,
          peers,
        };
  }
}
