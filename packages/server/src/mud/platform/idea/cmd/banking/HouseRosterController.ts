/**
 * HouseRosterController — `house roster` — the chart (economic bootstrap
 * D16): every authored position, who holds it (by name where the holder
 * is resident, by key otherwise), on shift or off — or `vacant`. A house
 * that is CLOSED says so first: its keeper is away past the short clock
 * and nobody else is on a position (over {@link HouseControllerBase}).
 */

import { HouseControllerBase } from "./HouseControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { EmploymentApi } from "../../../../api/employment";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { StuffApi } from "../../../../api/stuff";
import { MixinApi } from "../../../../api/mixin";

const TOPIC = "act.deed";

export default class HouseRosterController extends HouseControllerBase<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.houseKept(context);
    if (!house) return;
    // The chart is read CURRENT: absent holders vacated, the sign written.
    await EmploymentApi.bringCurrent(house);
    const lines: string[] = [`The chart at ${EmploymentApi.organizationLabel(house)}${house.isClosed() ? " — CLOSED: its keeper is away" : ""}:`];
    for (const position of house.getPositions()) {
      const holders = house.holdersOf(position.key);
      if (holders.length === 0) {
        lines.push(`  ${position.key}: vacant`);
        continue;
      }
      for (const key of holders) {
        const live = StuffApi.findByTemplatePath(key);
        const who = live?.getPresentation() ?? key;
        const shift = live && MixinApi.isEmployed(live) ? (live.isOnShift() ? "on shift" : "off shift") : "away";
        lines.push(`  ${position.key}: ${who} (${shift})`);
      }
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${lines.join("\n")}`).send();
  }
}
