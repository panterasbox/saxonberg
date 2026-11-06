/**
 * SoulControllerBase — what every `soul` subcommand shares (controllers-are-io
 * W7, D9: one controller per subcommand over a base per noun). The reads
 * (`list` / `show` / `search`) are anyone's; the mutations (`make` / `edit`
 * / `delete` / `disable` / `enable`) are the SOUL COMMITTEE's — the group
 * holding title over `/expression` (content-packs wave 3, D2b). The real
 * gate is the document store's (`DocumentLogic.gateMutation` →
 * `AccessApi.canAtPath`); a mutating subcommand pre-checks the same title
 * through {@link SoulControllerBase.refuseUnlessCommittee} so the refusal
 * is diegetic rather than a thrown SecurityError.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { AccessApi } from '../../../../api/access';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { EMOTE_MINT_BRANCH } from '../../SoulCatalogue';

export interface SoulModel extends CommandModel {
  verb?: string;
  spec?: string;
  field?: string;
  value?: string;
}

export abstract class SoulControllerBase extends CommandController<SoulModel> {
  /**
   * Refuse the mutation unless the giver holds the emote it targets — the
   * existing row's path, else the mint branch; the same title
   * `DocumentLogic` gates the write on. Returns true when it refused.
   */
  protected async refuseUnlessCommittee(
    model: SoulModel,
    context: CommandContext,
  ): Promise<boolean> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    const existing = verb ? await SoulApi.resolveAny(verb) : null;
    const target = existing?.path || `${EMOTE_MINT_BRANCH}/${verb || 'new'}`;
    if (await AccessApi.canAtPath(context.commandGiver, 'write-document', target)) return false;
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
    const ok = await SoulApi.setDisabled(verb, flag);
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
