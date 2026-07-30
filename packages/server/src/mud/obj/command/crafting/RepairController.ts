/**
 * RepairController — `repair <item>` (the smith's service act, engaged).
 *
 * An engaged act since the capability-table build: the work takes real
 * time on the `hands` slot, paced by the domain instrument (the
 * `mending` tool for soft goods, the reachable anvil for metal — the
 * kinds whose families confer `repair`; a rate-3 sewing machine works
 * in a third the time). At completion, `CraftingApi.repair` resolves
 * the domain gate (forge heat for metal, a `mending` tool for soft
 * goods), prices the material cost off the condition deficit (doubled
 * broken), draws the stock from the same gather walk a craft uses, and
 * restores the condition to full — ceiling-free. A completion-time
 * decline narrates a wasted engagement (the quench posture). Declines
 * render diegetically via the shared CraftController base.
 */

import { ManualBuildController } from './ManualBuildController';
import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { CraftingApi } from '../../../api/crafting';
import { ExecutionContextApi } from '../../../api/execution-context';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';
const REPAIR_MS = 6000;

interface RepairModel extends CommandModel {
  item?: MqlOneResult;
}

export default class RepairController extends ManualBuildController<RepairModel> {
  execute(model: RepairModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const item: Stuff | null = model.item?.stuff ?? null;
    if (!item) {
      const raw = model.item?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here to repair.`)
        .send();
      context.note({ kind: 'empty-result', field: 'item', query: raw });
      return;
    }

    // The pacer: the reachable instrument of a kind whose family
    // confers `repair` — the mending kit/machine or the anvil. The
    // real feasibility gates (durable? worn? stock? heat?) stay in
    // CraftingApi.repair at completion; absence of a pacer is not a
    // gate here (rate 1 — the Api declines diegetically if the domain
    // tool is genuinely missing).
    const pacer =
      this.findCapability(giver, 'mending') ??
      this.findCapability(giver, 'anvil');

    // Capture the maker from the live command frame; the repair runs at
    // engaged-completion, where no frame exists (the strain pattern).
    const makerPath =
      (ExecutionContextApi.getActingAuthor() as Stuff | null)?.getTemplatePath() ??
      '';

    this.engageStep(context, {
      durationMs: this.paceMs(REPAIR_MS, pacer, ['mending', 'anvil']),
      beginSelf: Mml.compose`You settle in over ${Mml.item(item)} and set to the repair.`,
      beginPeers: Mml.compose`${Mml.name(giver)} sets to repairing ${Mml.item(item)}.`,
      // No `this` in the closure — the controller clone is destructed
      // when execute returns (antipatterns.md § Activity-completion
      // closures); the body is a module-private free function.
      onComplete: () => completeRepair(giver, item, makerPath),
    });
  }
}

/** The completion body — plain values only, never the controller. */
function completeRepair(giver: Stuff, item: Stuff, makerPath: string): void {
  void (async (): Promise<void> => {
    const outcome = await CraftingApi.repair({ item, makerPath });
    if (!outcome.ok) {
      CraftController.declineScene(giver, outcome);
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You work ${Mml.item(item)} back into true — sound as the day it was made.`,
      )
      .toPeers(Mml.compose`${Mml.name(giver)} repairs ${Mml.item(item)}.`)
      .send();
  })().catch((err: unknown) => {
    console.error('RepairController: repair failed', err);
  });
}
