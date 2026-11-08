/**
 * WikiPurgeController — `wiki purge <page>`: irreversibly remove a page and every revision, on a confirmed yes (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiPurgeController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    const registry = await this.registry();
    const ref = (model.page ?? '').trim();
    if (!ref) return this.fail(context, 'which page?', 'page-required');
    const hit = await registry.resolve(ref, { includeDeleted: true });
    if (!hit) return this.fail(context, `No page '${ref}'.`, 'no-such-page');
    // Irreversible and destructive: confirm. ⭐ A scripted caller (no
    // Interactive) fails CLOSED (D23) — `needs-input` — rather than
    // purging on a question nobody answered.
    const asker = context.requireInteractive('a yes to purge');
    if (!asker) return;
    const ok = await asker.promptConfirm(
      `Purge '${hit.page.getTitle()}' and every revision of it? This cannot be undone.`,
      'no',
    ).catch(() => false);
    if (!ok) {
      return this.fail(context, 'Purge cancelled.', 'purge-cancelled');
    }
    const removed = await registry.purgePage(hit.page);
    this.send(
      context,
      Mml.compose`\nPurged '${hit.page.getTitle()}' and ${String(removed)} revisions. The act is recorded; the content is gone.\n`,
    );
  }
}
