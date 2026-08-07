/**
 * PackController — reconcile a content pack into the running world and push
 * file edits live (`pack sync <packId>`).
 *
 * The runtime half of the content-pack iteration loop: re-reads the pack's
 * files, reconciles the changed `domain` rows, and re-hydrates the affected
 * live singletons — no restart. Wizard-gated (declaratively, via
 * `pack.yaml`'s `requiresWizard` validator), mirroring `reload`/`clone`.
 *
 * Dispatch-on-subcommand: `sync` is the only verb in v1. The reconcile logic
 * lives behind {@link PackApi}; this controller is a thin diegetic wrapper.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { PackApi } from '../../../api/pack';
import type { PackReconcileResult } from '../../../api/pack';

interface PackModel extends CommandModel {
  subcommand?: string;
  packId?: string;
}

const DEFAULT_PACK = 'base-library';

export default class PackController extends CommandController<PackModel> {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    // Wizard axis is declarative — see pack.yaml's
    // `validators: requiresWizard`. The dispatcher rejects before here.
    const sub = model.subcommand;
    if (sub !== 'sync') {
      return this.fail(
        context,
        'usage: pack sync <packId>',
        'unknown-subcommand',
      );
    }
    const packId = model.packId ?? DEFAULT_PACK;

    try {
      const result = await PackApi.sync(packId);
      this.tell(context, `\n${this.format(result)}\n`);
      return;
    } catch (err) {
      return this.fail(context, (err as Error).message, 'sync-failed');
    }
  }

  private format(r: PackReconcileResult): string {
    return (
      `synced pack '${r.packId}': ` +
      `${r.inserted.length} inserted, ${r.updated.length} updated, ` +
      `${r.adopted.length} adopted, ${r.deleted.length} deleted, ` +
      `${r.quantityTables} quantity table(s), ${r.nameBanks} name bank(s), ` +
      `${r.rehydrated} live instance(s) re-hydrated`
    );
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}
