/**
 * HouseFreightController — `house freight` — what your house has
 * shipped, the bills of lading newest first (the last twenty), read off
 * your own paper (over {@link HouseFreightControllerBase}).
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import {
  HouseFreightControllerBase,
  type FreightModel,
} from './HouseFreightControllerBase';

export default class HouseFreightController extends HouseFreightControllerBase {
  async execute(model: FreightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const paper = await this.paperFor(model, context);
    if (!paper) return;
    const { house, registry, query } = paper;
    const bills = await registry.freightOf(house, query);
    if (bills.length === 0) {
      return this.tell(giver, 'No paper. Nothing of yours has moved.');
    }
    const lines = bills
      .slice(0, 20)
      .map(
        (b) =>
          `  ${b.what} · ${b.howMuch} · ${HouseFreightController.leafOf(b.from)} → ${HouseFreightController.leafOf(b.to)}` +
          (b.declaredValueMinor > 0 ? ` · declared ${b.declaredValueMinor}` : '') +
          ` · by ${b.via}`,
      );
    this.tell(
      giver,
      `Your freight${bills.length > 20 ? ' (last 20)' : ''}:\n${lines.join('\n')}`,
    );
  }
}
