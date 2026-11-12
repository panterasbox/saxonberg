/**
 * ConfigControllerBase — what the three `config` shapes share
 * (controller-liquidity W7a, D13 rung 4: one controller per SHAPE, told
 * apart by arity — three views of the one verb): the Prime Minister's
 * knob board for the world's Tier B settings (wizard-axis D12).
 *
 * `config`                  → `ConfigListController` (`config.yaml`):
 *                             list every setting (known + ad-hoc).
 * `config <key>`            → `ConfigShowController` (`config-show.yaml`):
 *                             show one.
 * `config <key> <value>`    → `ConfigSetController` (`config-set.yaml`):
 *                             set one (persist + refresh cache).
 *
 * The binder tells them apart: a missing required arg and a leftover word
 * are both SHAPE errors, so each line fails every view but its own.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - the `requiresPrimeMinister` validator (on each view) gates the
 *     verb; setting a dial is not authoring TypeScript, so it is the
 *     executive's, never a wizard's.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import type { Mml } from "../../../../api/mml";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";

/** The blessed key vocabulary — used only to flag/soft-note ad-hoc keys. */
export const KNOWN_KEYS = new Set<string>(Object.values(AppSettingKeys));

export interface ConfigModel extends CommandModel {
  key?: string;
  value?: string;
}

export abstract class ConfigControllerBase extends CommandController<ConfigModel> {
  protected static send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic("shell.config")
      .toSelf(body)
      .send();
  }
}
