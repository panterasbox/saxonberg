/**
 * HouseParController — `house par <category> <level> [--grade <band>]
 * [--from <business>]` — the unit is inferred from the level's suffix
 * (`12L`, `5kg`, bare number = count); a level of `0` removes the line
 * (over {@link HouseShopControllerBase}).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { PAR_UNITS } from '@saxonberg/server/mud/api/employment';
import type { ParUnit } from '@saxonberg/server/mud/api/employment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { HouseShopControllerBase, TOPIC } from './HouseShopControllerBase';

interface HouseParModel extends CommandModel {
  category?: string;
  level?: string;
  grade?: string;
  from?: string;
}

export default class HouseParController extends HouseShopControllerBase<HouseParModel> {
  async execute(model: HouseParModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.houseKept(context);
    if (!house) return;
    if (!(await this.screen(context))) return;
    const category = (model.category ?? "").trim();
    const parsed = HouseParController.parseLevel(model.level ?? "");
    if (!category || !parsed) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`house par <category> <level>\` — the level as \`12\` (count), \`6L\` or \`5kg\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-par", detail: `${category} ${model.level ?? ""}` });
      return;
    }
    if (parsed.level === 0) {
      const removed = house.removeParLine(category);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          removed
            ? Mml.compose`You strike ${category} from the par sheet of ${house.getPresentation()}.`
            : Mml.compose`${category} isn't on the par sheet.`,
        )
        .send();
      return;
    }
    house.setParLine({
      category,
      level: parsed.level,
      unit: parsed.unit,
      minGrade: (model.grade ?? "").trim(),
      supplier: (model.from ?? "").trim(),
    });
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Par for ${category} at ${house.getPresentation()}: ${String(parsed.level)} ${parsed.unit}${model.from ? ` from ${model.from}` : ""}.`)
      .send();
  }

  /** `12` → count, `6L` → L, `5kg` → kg; null when unparsable. */
  private static parseLevel(raw: string): { level: number; unit: ParUnit } | null {
    const m = /^(\d+(?:\.\d+)?)\s*([A-Za-z]*)$/.exec(raw.trim());
    if (!m) return null;
    const level = Number(m[1]);
    const suffix = (m[2] ?? "").toLowerCase();
    const unit: ParUnit | null =
      suffix === "" ? "count"
      : suffix === "l" ? "L"
      : suffix === "kg" ? "kg"
      : PAR_UNITS.includes(suffix as ParUnit) ? (suffix as ParUnit)
      : null;
    if (!Number.isFinite(level) || level < 0 || !unit) return null;
    return { level, unit };
  }
}
