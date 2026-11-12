/**
 * SoulControllerBase — what every `soul` subcommand shares (controllers-are-io
 * W7, D9: one controller per subcommand over a base per noun). The reads
 * (`list` / `show` / `search`) are anyone's; the mutations (`make` / `edit`
 * / `delete` / `disable` / `enable`) are the SOUL COMMITTEE's — the group
 * holding title over `/expression` (content-packs wave 3, D2b). The gate is
 * the document store's own (`DocumentLogic.gateMutation` →
 * `AccessApi.canAtPath`), met by every caller of the catalogue's writes; a
 * mutating subcommand words its {@link DocumentRefusal} through
 * {@link SoulControllerBase.refusedByCommittee} so the refusal is diegetic
 * rather than a thrown error (controller-liquidity W8 — the controller's
 * pre-check of the same title is gone).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { DocumentRefusal } from '../../../../lib/document/StoredDocument';

export interface SoulModel extends CommandModel {
  verb?: string;
  spec?: string;
  field?: string;
  value?: string;
}

export abstract class SoulControllerBase extends CommandController<SoulModel> {
  /**
   * Word a catalogue write the document store refused for title: the soul
   * committee's work. True when `err` was that refusal (and it is worded);
   * false for any other error, which the caller words itself.
   */
  protected refusedByCommittee(context: CommandContext, err: unknown): boolean {
    if (!(err instanceof DocumentRefusal)) return false;
    this.fail(
      context,
      'The soul committee holds the emote catalogue; this is its work.',
      'not-soul-committee',
    );
    return true;
  }

  protected async setDisabled(
    model: SoulModel,
    context: CommandContext,
    flag: boolean,
  ): Promise<void> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    let ok: boolean;
    try {
      ok = await SoulApi.setDisabled(verb, flag);
    } catch (err) {
      if (this.refusedByCommittee(context, err)) return;
      throw err;
    }
    if (!ok) return this.fail(context, `No emote '${verb}'.`, 'no-such-emote');
    this.send(context, Mml.compose`\n${flag ? 'Disabled' : 'Enabled'} emote '${verb}'.\n`);
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}
