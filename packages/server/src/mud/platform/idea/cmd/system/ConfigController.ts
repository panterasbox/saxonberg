/**
 * ConfigController — the Prime Minister's knob board for the world's
 * Tier B settings (wizard-axis D12).
 *
 * `config`                  → list every setting (known + ad-hoc).
 * `config <key>`            → show one.
 * `config <key> <value>`    → set one (persist + refresh cache).
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - the `requiresPrimeMinister` validator (in `config.yaml`) gates the
 *     verb; setting a dial is not authoring TypeScript, so it is the
 *     executive's, never a wizard's.
 *
 * ⭐ A **Tier C** key (a tax, a levy, a capital control —
 * `AppApi.seatFor` names its seat) is refused here with `tier-c`, naming
 * the seat and its verb (`treasury set`, `reserve set`): a political dial
 * is set through the office that answers for it, and lands in that
 * officer's chronicle. Reads and the listing are unchanged; the listing
 * marks a C key with its seat.
 *
 * The namespace is open: a set to a key outside the `AppSettingKeys`
 * vocabulary still succeeds and round-trips — it just earns a soft prose
 * note. That note is prose ONLY (status stays `ok`); it is NOT a
 * `controller-rejected` note, because the write succeeded.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";

/** The blessed key vocabulary — used only to flag/soft-note ad-hoc keys. */
const KNOWN_KEYS = new Set<string>(Object.values(AppSettingKeys));

interface ConfigModel extends CommandModel {
  key?: string;
  value?: string;
}

export default class ConfigController extends CommandController<ConfigModel> {
  async execute(model: ConfigModel, context: CommandContext): Promise<void> {
    const { key, value } = model;
    if (!key) return this.list(context);
    if (value === undefined) return this.show(key, context);
    return this.set(key, value, context);
  }

  private list(context: CommandContext): void {
    const all = AppApi.settings();
    // Blessed keys first, then ad-hoc, alphabetical within each.
    const keys = Object.keys(all).sort((a, b) => {
      const known = (k: string) => (KNOWN_KEYS.has(k) ? 0 : 1);
      return known(a) - known(b) || a.localeCompare(b);
    });
    const lines = [""];
    for (const k of keys) {
      // '*' flags an ad-hoc key (not a known setting); ' ' a blessed one.
      const marker = KNOWN_KEYS.has(k) ? " " : "*";
      const tier = AppApi.tierOf(k);
      const seat = tier.startsWith("C:") ? tier.slice(2) : null;
      lines.push(`  ${marker} ${k} = ${all[k]}${seat ? `  [C: ${seat}]` : ""}`);
    }
    lines.push("");
    this.send(context, Mml.fromMarkup(lines.join("\n")));
  }

  private show(key: string, context: CommandContext): void {
    this.send(context, Mml.fromMarkup(`\n${key} = ${AppApi.setting(key)}\n`));
  }

  private async set(
    key: string,
    value: string,
    context: CommandContext,
  ): Promise<void> {
    // The tier rule is the write's own (AppLogic.setSetting, D9): `config`
    // sets as the Prime Minister; a Tier C dial refuses `wrong-seat`.
    const wrote = await AppApi.setSetting(context.commandGiver, key, value);
    if (!wrote.ok) {
      const detail =
        wrote.reason === "wrong-seat"
          ? `\`${key}\` is a Tier C dial: ${wrote.whoSets}.`
          : "You do not hold the Prime Minister's office.";
      this.send(context, Mml.fromMarkup(`\n${detail}\n`));
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
    this.send(context, Mml.fromMarkup(lines.join("\n")));
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic("shell.config")
      .toSelf(body)
      .send();
  }
}
