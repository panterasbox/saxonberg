/**
 * ConfigController — the developer surface for application settings.
 *
 * `config`                  → list every setting (registry keys + ad-hoc).
 * `config <key>`            → show one.
 * `config <key> <value>`    → set one (persist + refresh cache).
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - the `requiresDeveloper` validator (in `config.yaml`) gates the verb;
 *     no access check belongs here.
 *
 * The namespace is open: a set to an unregistered key still succeeds and
 * round-trips — it just earns a soft prose note. That note is prose ONLY
 * (status stays `ok`); it is NOT a `controller-rejected` note, because the
 * write succeeded.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { AppApi } from "../../../api/app";
import { AppSettingDefaults } from "../../../lib/config/keys";

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
    // Registry (blessed) keys first, then ad-hoc, alphabetical within each.
    const keys = Object.keys(all).sort((a, b) => {
      const known = (k: string) => (k in AppSettingDefaults ? 0 : 1);
      return known(a) - known(b) || a.localeCompare(b);
    });
    const lines = [""];
    for (const k of keys) {
      // '*' flags an ad-hoc key (not in the registry); ' ' a blessed one.
      const marker = k in AppSettingDefaults ? " " : "*";
      lines.push(`  ${marker} ${k} = ${all[k]}`);
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
    await AppApi.setSetting(key, value);
    const lines = ["", `${key} set to ${value}.`];
    if (!(key in AppSettingDefaults)) {
      lines.push(`(note: "${key}" is not a known setting — it was still saved.)`);
    }
    lines.push("");
    this.send(context, Mml.fromMarkup(lines.join("\n")));
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic("system.app.config")
      .toSelf(body)
      .send();
  }
}
