/**
 * MudlogApi — in-game messaging facility for log-style content.
 *
 * Every call delivers to a Sensor. Topic is `system.log.<level>` (no
 * category) or `system.log.<category>.<level>`. Recipient resolution:
 *
 *   1. `opts.to` (Sensor or Sensor[]) → deliver to those.
 *   2. Else `ExecutionContextApi.getCurrentCommandContext()?.commandGiver`
 *      → deliver to the command giver.
 *   3. Else throw — no stdout fallback. MudlogApi is purely an in-game
 *      messaging facility; stdout/file logging is a separate concern.
 *
 * Frame construction is internal — MudlogApi knows its recipients
 * explicitly and doesn't need Scene's per-audience plumbing. It does
 * stamp `meta.commandId` and `meta.causingCommandId` from
 * ExecutionContext, same as Scene.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link MudlogLogic} singleton at `/obj/api/mudlog`,
 * reached synchronously via `StuffApi.singletonSync`. The author-facing
 * overload pairs live here; the logic methods take the resolved
 * implementation signature. `dest /obj/api/mudlog` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { LogLevel } from '@saxonberg/types';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MudlogLogic } from '../obj/api/MudlogLogic';
import { Mml } from './mml';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

type SensorStuff = Stuff & Sensor;

export interface MudlogOptions {
  to?: SensorStuff | SensorStuff[];
  payload?: unknown;
}

const LEVELS: ReadonlyArray<LogLevel> = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
];

const LOGIC_PATH = '/obj/api/mudlog';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/MudlogLogic', import.meta.url)
);

/** Resolve the HMR-able MudlogLogic singleton (sync). */
function logic(): MudlogLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'MudlogLogic'
      ) as typeof MudlogLogic | null) ?? MudlogLogic)()
  );
}

export class MudlogApi {
  private constructor() {}

  static trace(body: Mml, opts?: MudlogOptions): void;
  static trace(category: string, body: Mml, opts?: MudlogOptions): void;
  static trace(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    logic().trace(a, b, c);
  }

  static debug(body: Mml, opts?: MudlogOptions): void;
  static debug(category: string, body: Mml, opts?: MudlogOptions): void;
  static debug(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    logic().debug(a, b, c);
  }

  static info(body: Mml, opts?: MudlogOptions): void;
  static info(category: string, body: Mml, opts?: MudlogOptions): void;
  static info(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    logic().info(a, b, c);
  }

  static warn(body: Mml, opts?: MudlogOptions): void;
  static warn(category: string, body: Mml, opts?: MudlogOptions): void;
  static warn(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    logic().warn(a, b, c);
  }

  static error(body: Mml, opts?: MudlogOptions): void;
  static error(category: string, body: Mml, opts?: MudlogOptions): void;
  static error(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    logic().error(a, b, c);
  }

  static fatal(body: Mml, opts?: MudlogOptions): void;
  static fatal(category: string, body: Mml, opts?: MudlogOptions): void;
  static fatal(
    a: string | Mml,
    b?: Mml | MudlogOptions,
    c?: MudlogOptions
  ): void {
    logic().fatal(a, b, c);
  }

  /**
   * Hook for log4j-style "skip composition when disabled" guards. v1
   * always returns true; future enhancements (per-category levels,
   * dynamic config) plug in here.
   */
  static isEnabled(category: string | undefined, level: LogLevel): boolean {
    return logic().isEnabled(category, level);
  }
}

// Re-export the level constant list for diagnostic UIs that want to
// render every level.
export const MUDLOG_LEVELS = LEVELS;

SecurityApi.decorateApiClass(MudlogApi);
