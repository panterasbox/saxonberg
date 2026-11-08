/**
 * The `wiki` controllers by subcommand — the view's routing (`wiki.yaml`:
 * one controller per subcommand, the fallthrough bare `wiki <page>` to
 * `WikiReadController`), for the tests that drive the verb a model at a
 * time (controllers-are-io W7).
 */

import WikiReadController from '../WikiReadController';
import WikiCreateController from '../WikiCreateController';
import WikiEditController from '../WikiEditController';
import WikiHistoryController from '../WikiHistoryController';
import WikiDiffController from '../WikiDiffController';
import WikiRollbackController from '../WikiRollbackController';
import WikiMoveController from '../WikiMoveController';
import WikiDeleteController from '../WikiDeleteController';
import WikiUndeleteController from '../WikiUndeleteController';
import WikiPurgeController from '../WikiPurgeController';
import WikiProtectController from '../WikiProtectController';
import WikiPreviewController from '../WikiPreviewController';
import WikiLinksController from '../WikiLinksController';
import WikiWantedController from '../WikiWantedController';
import WikiOrphansController from '../WikiOrphansController';
import WikiDanglingController from '../WikiDanglingController';
import WikiListController from '../WikiListController';
import type { WikiControllerBase } from '../WikiControllerBase';

const BY_SUBCOMMAND: Record<string, new () => WikiControllerBase> = {
  read: WikiReadController,
  create: WikiCreateController,
  edit: WikiEditController,
  history: WikiHistoryController,
  diff: WikiDiffController,
  rollback: WikiRollbackController,
  move: WikiMoveController,
  delete: WikiDeleteController,
  undelete: WikiUndeleteController,
  purge: WikiPurgeController,
  protect: WikiProtectController,
  preview: WikiPreviewController,
  links: WikiLinksController,
  wanted: WikiWantedController,
  orphans: WikiOrphansController,
  dangling: WikiDanglingController,
  list: WikiListController,
};

/** The controller the dispatcher clones for `subcommand` (none = read). */
export function wikiControllerFor(subcommand: string | undefined): WikiControllerBase {
  const Ctor = BY_SUBCOMMAND[subcommand ?? 'read'];
  if (!Ctor) throw new Error(`no wiki subcommand '${String(subcommand)}'`);
  return new Ctor();
}
