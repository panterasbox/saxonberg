/**
 * PourController — `pour <source> [into <target>] [--amount 2cups] [--exact]`.
 *
 * ⭐⭐ **One act, one view** (controllers-are-io D12). The TARGET says what being
 * poured into means (`PourTargetMixin.receivePour`): a holder of bulk takes the
 * liquid, a build vessel banks a serving or an ingredient. This file words what
 * comes back.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { PourBegin, PourDone, PourRefusal } from '../../../../lib/bulk/PourTarget';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

interface PourModel extends CommandModel {
  source: MqlOneResult;
  target?: MqlOneResult;
  /** `--amount 2cups` — how much to move. Absent ⇒ as much as fits, or one serving. */
  amount?: string;
  /** `--exact` — take the full measure or none of it. */
  exact?: boolean;
}

export default class PourController extends ManualBuildController<PourModel> {
  async execute(model: PourModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const source = model.source?.stuff ?? null;
    if (!source) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.source?.raw ?? '?'}' to pour.`)
        .send();
      context.note({ kind: 'empty-result', field: 'source', query: model.source?.raw ?? '' });
      return;
    }
    const target = model.target?.stuff ?? null;
    if (!target) {
      const raw = model.target?.raw ?? '';
      if (raw.trim() === '' || raw.startsWith('reachable:')) {
        this.declineStep(
          context,
          Mml.compose`Pour it into what? Name something that will take it, or stand at a build.`,
          'no-vessel',
        );
        return;
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' to pour into.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    if (!MixinApi.isPourTarget(target)) {
      this.declineStep(context, Mml.compose`You can't pour anything into ${Mml.thing(target)}.`, 'not-a-holder');
      return;
    }
    const plan = await target.receivePour({
      by: giver,
      source,
      ...(model.source.via ? { sourceVia: model.source.via } : {}),
      ...(model.target?.via ? { targetVia: model.target.via } : {}),
      ...(model.amount !== undefined ? { amount: model.amount } : {}),
      ...(model.exact === true ? { exact: true } : {}),
    });
    if (!plan.ok) {
      this.declineStep(context, PourController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f) => PourController.beginSelf(f),
      beginPeers: (f) => PourController.beginPeers(f, giver),
      onRefused: (r) => PourController.refusalWords(r),
      onDone: (f) => {
        for (const note of f.notes) context.note(note);
        return PourController.doneWords(f, giver);
      },
    });
  }

  private static refusalWords(r: PourRefusal): Composed {
    const { source, target } = r.facts;
    switch (r.reason) {
      case 'not-a-pour-target':
        return Mml.compose`You can't pour anything into ${Mml.thing(target)}.`;
      case 'nothing-in-source':
        return Mml.compose`There's nothing to pour out of ${Mml.thing(source)}.`;
      case 'not-a-holder':
        return Mml.compose`You can't pour a measure from ${Mml.thing(source)}.`;
      case 'source-empty':
        return Mml.compose`${Mml.thing(source)} is empty — nothing pours.`;
      case 'ingredient-gone':
        return Mml.compose`It is gone before you can add it.`;
      default: {
        const unworded: never = r.reason;
        throw new Error(`PourController: no words for '${String(unworded)}'`);
      }
    }
  }

  private static beginSelf(f: PourBegin): Composed {
    if (f.kind === 'serving') {
      return Mml.compose`You start pouring ${Mml.thing(f.source)} into ${Mml.thing(f.target)}.`;
    }
    if (f.kind === 'ingredient') {
      return Mml.compose`You start adding ${Mml.thing(f.source)} to ${Mml.thing(f.target)}.`;
    }
    return Mml.compose``;
  }

  private static beginPeers(f: PourBegin, giver: Stuff): Composed | null {
    if (f.kind === 'serving') {
      return Mml.compose`${Mml.actor(giver)} starts pouring ${Mml.thing(f.source)} into ${Mml.thing(f.target)}.`;
    }
    if (f.kind === 'ingredient') {
      return Mml.compose`${Mml.actor(giver)} adds ${Mml.thing(f.source)} to ${Mml.thing(f.target)}.`;
    }
    return null;
  }

  private static doneWords(f: PourDone, giver: Stuff): { self: Composed; peers?: Composed | null } {
    const { source, target } = f;
    switch (f.kind) {
      case 'melted':
        return {
          self: Mml.compose`${Mml.thing(target)} slumps and runs as the pour hits it — it has melted — and everything goes across the floor.`,
          peers: Mml.compose`${Mml.actor(giver)} pours into ${Mml.thing(target)}, and it gives way under the heat.`,
        };
      case 'burned':
        return {
          self: Mml.compose`${Mml.thing(target)} smokes, chars and catches as the pour hits it — it is burning — and the metal runs out across the floor.`,
          peers: Mml.compose`${Mml.actor(giver)} pours into ${Mml.thing(target)}, and it gives way under the heat.`,
        };
      case 'escaped':
        return {
          self: Mml.compose`It will not stay in ${Mml.thing(target)} — it is gone into the air.`,
          peers: Mml.compose`${Mml.actor(giver)} loses a charge of gas into the air.`,
        };
      case 'drained':
        return {
          self: Mml.compose`The liquid runs straight through ${Mml.thing(target)} and pools on the floor.`,
          peers: Mml.compose`${Mml.actor(giver)} pours liquid through ${Mml.thing(target)}; it pools on the floor.`,
        };
      case 'mismatch':
        return { self: Mml.compose`That won't mix with what's already in ${Mml.thing(target)}.` };
      case 'too-much':
        return { self: Mml.compose`That's more than will fit in ${Mml.thing(target)}.` };
      case 'full':
        return { self: Mml.compose`${Mml.thing(target)} is already full.` };
      case 'nothing':
        return { self: Mml.compose`There's nothing to pour.` };
      case 'lost-wax':
        return {
          self: Mml.compose`You pour from ${Mml.thing(source)}. The wax runs out as the metal takes its place.`,
          peers: Mml.compose`${Mml.actor(giver)} pours, and wax runs smoking out of the mould.`,
        };
      case 'mould-broken':
        return {
          self: Mml.compose`You pour from ${Mml.thing(source)}. It sets, and the mould is broken away from it.`,
          peers: Mml.compose`${Mml.actor(giver)} pours, and breaks the mould away from the casting.`,
        };
      case 'poured':
        return {
          self: Mml.compose`You pour from ${Mml.thing(source)} into ${Mml.thing(target)}.`,
          peers: Mml.compose`${Mml.actor(giver)} pours from ${Mml.thing(source)} into ${Mml.thing(target)}.`,
        };
      case 'banked':
        return {
          self: Mml.compose`You pour ${Mml.thing(source)} into ${Mml.thing(target)}.`,
          peers: Mml.compose`${Mml.actor(giver)} pours ${Mml.thing(source)} into ${Mml.thing(target)}.`,
        };
      case 'added':
        return { self: Mml.compose`You add ${Mml.thing(source)} to ${Mml.thing(target)}.` };
      default: {
        const unworded: never = f.kind;
        throw new Error(`PourController: no words for '${String(unworded)}'`);
      }
    }
  }
}
