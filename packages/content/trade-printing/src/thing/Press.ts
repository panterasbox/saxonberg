/**
 * Press — the hand press: an industrial instrument that pulls
 * the forme's text AS SET onto paper. Ink is drawn by the page from a pot of
 * printing ink in reach; paper from the press (`put ream in press`) or the
 * pressman's hands. The covenant may keep it idle.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { PrintingMixin, type RunOutcome } from '../lib/Printing';
import type Forme from './Forme';

const PRINT = ['trade/printing/cmd/printing/print.yaml'];

export default class Press extends PrintingMixin(ToolMixin(ContainerMixin(Good))) {
  static commandContributions: CommandContributions = { self: [], peers: PRINT, environment: PRINT };

  protected override inkPerPageL(): number {
    return 0.002;
  }

  /** Pull `copies` of the forme. */
  public async pull(forme: Forme, copies: number, by: Stuff): Promise<RunOutcome> {
    if (!forme.isSet()) return { ok: false, reason: 'not-set', line: 'There is no type in the forme to print from.' };
    const pages = await DocumentApi.pagesOf(forme.getSource());
    return this.runOff({
      source: forme.getSource(),
      title: forme.getTitle(),
      pages: [forme.getSetText()],
      ...(pages?.teaches ? { teaches: pages.teaches } : {}),
      copies,
      by,
    });
  }
}
