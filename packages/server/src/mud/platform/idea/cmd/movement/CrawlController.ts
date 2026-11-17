/**
 * CrawlController — the `crawl` verb (size and carrying D20): through an
 * exit on hands and knees (`prone`), low enough for a crawlway. What the
 * body holds goes through ahead of it, measured on its own; the crossing
 * narrates it pushed along (`Mobile`'s traverse message for the mode).
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class CrawlController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'crawl';
  }
}
