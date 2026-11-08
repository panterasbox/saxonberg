/**
 * Printer — a modern printer: prints a document AS IT STANDS
 * now, every page, with no type and no compositor's errors. Modern work: a
 * covenant that admits nothing later than medieval keeps it idle.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { PrintingMixin, type RunOutcome } from '../lib/Printing';

const PRINT = ['trade/printing/cmd/printing/print.yaml'];

export default class Printer extends PrintingMixin(ToolMixin(ContainerMixin(Good))) {
  static commandContributions: CommandContributions = { self: [], peers: PRINT, environment: PRINT, inventory: PRINT };

  /** Print `path` as it stands now. */
  public async printDocument(path: string, title: string, copies: number, by: Stuff): Promise<RunOutcome> {
    const pages = await DocumentApi.pagesOf(path);
    if (pages === null) return { ok: false, reason: 'not-a-page', line: 'That is not something that reads as a page.' };
    return this.runOff({ source: path, title, pages: pages.pages, ...(pages.teaches ? { teaches: pages.teaches } : {}), copies, by });
  }

  /** Print a page of words — a ledger's extract — frozen under `source`. */
  public async printPage(source: string, title: string, text: string, copies: number, by: Stuff): Promise<RunOutcome> {
    return this.runOff({ source, title, pages: [text], copies, by });
  }
}
