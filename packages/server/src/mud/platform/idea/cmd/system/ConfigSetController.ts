/**
 * ConfigSetController — `config <key> <value>` — set one setting, persist
 * it and refresh the cache (over {@link ConfigControllerBase}).
 *
 * ⭐ A **Tier C** key (a tax, a levy, a capital control —
 * `AppApi.seatFor` names its seat) is refused by the write itself with
 * `wrong-seat` → `tier-c`, naming the seat and its verb (`treasury set`,
 * `reserve set`): a political dial is set through the office that answers
 * for it, and lands in that officer's chronicle.
 *
 * The namespace is open: a set to a key outside the `AppSettingKeys`
 * vocabulary still succeeds and round-trips — it just earns a soft prose
 * note. That note is prose ONLY (status stays `ok`); it is NOT a
 * `controller-rejected` note, because the write succeeded.
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { AppApi } from "../../../../api/app";
import {
  ConfigControllerBase,
  KNOWN_KEYS,
  type ConfigModel,
} from "./ConfigControllerBase";

export default class ConfigSetController extends ConfigControllerBase {
  async execute(model: ConfigModel, context: CommandContext): Promise<void> {
    const key = model.key ?? "";
    const value = model.value ?? "";
    // The tier rule is the write's own (AppLogic.setSetting, D9): `config`
    // sets as the Prime Minister; a Tier C dial refuses `wrong-seat`.
    const wrote = await AppApi.setSetting(key, value);
    if (!wrote.ok) {
      const detail =
        wrote.reason === "wrong-seat"
          ? `\`${key}\` is a Tier C dial: ${wrote.whoSets}.`
          : "You do not hold the Prime Minister's office.";
      ConfigControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
      context.note({
        kind: "controller-rejected",
        reason: wrote.reason === "wrong-seat" ? "tier-c" : "not-seated",
        detail,
      });
      return;
    }
    const lines = ["", `${key} set to ${value}.`];
    if (!KNOWN_KEYS.has(key)) {
      lines.push(`(note: "${key}" is not a known setting — it was still saved.)`);
    }
    lines.push("");
    ConfigControllerBase.send(context, Mml.fromMarkup(lines.join("\n")));
  }
}
