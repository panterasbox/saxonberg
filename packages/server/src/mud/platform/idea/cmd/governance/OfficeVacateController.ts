/**
 * OfficeVacateController — `office vacate <office>` — revert a seat to
 * the founder (founder-only: the `requiresFoundingAuthority` subcommand
 * validator) (over {@link OfficeControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { CompactApi } from '../../../../api/compact';
import { Office } from '../../../../lib/governance/Office';
import { OfficeControllerBase, type OfficeModel } from './OfficeControllerBase';

export default class OfficeVacateController extends OfficeControllerBase {
  async execute(model: OfficeModel, context: CommandContext): Promise<void> {
    // Authority is the `requiresFoundingAuthority` subcommand validator's
    // job (the dispatcher rejects non-founders before `execute` runs).
    const office = Office.byKey((model.office ?? '').trim());
    if (!office) {
      return this.fail(
        context,
        `No such office: ${model.office ?? '(none)'}.`,
        'unknown-office',
      );
    }
    const changed = await CompactApi.vacateOffice(office.getKey());
    if (!changed) {
      return this.fail(
        context,
        `${office.getDisplayName()} is already held by the founder.`,
        'no-change',
      );
    }
    this.send(
      context,
      Mml.compose`\nVacated ${office.getDisplayName()}; it reverts to the founder.\n`,
    );
  }
}
