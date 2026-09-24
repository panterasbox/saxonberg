/**
 * InstrumentApi — the caller-facing surface of the reading ladder.
 *
 * Two methods, because there are two questions: *what does this channel
 * say* and *what channels are there*. Everything else about a reading
 * lives on the {@link Reading} the first one hands back — the rungs, the
 * bands, the brackets, the refusals — because a reading is an act
 * performed by a channel, not a function of a subsystem.
 *
 * ⭐ **A channel is a row any pack can ship.** Installing `trade-mining`
 * installs `strike`, `dip`, `ground` and `grade`; removing it removes
 * them, and nothing in the platform changes in either direction. That
 * is the property this Api exists to keep: no list here, and no list
 * anywhere else either.
 *
 * Thin, security-gated forwarding shell; the logic lives in the
 * hot-reloadable {@link InstrumentLogic} singleton at
 * `/platform/idea/api/instrument`.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { InstrumentLogic } from '../platform/idea/api/InstrumentLogic';
import type Reading from '../lib/instrument/Reading';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/instrument';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/InstrumentLogic', import.meta.url),
);

/** Resolve the HMR-able InstrumentLogic singleton (sync). */
function logic(): InstrumentLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'InstrumentLogic',
      ) as typeof InstrumentLogic | null) ?? InstrumentLogic)(),
  );
}

export class InstrumentApi {
  /**
   * The channel a player named, or `null` when nothing installed ships
   * it. The two read verbs turn `null` into *"there is no reading called
   * 'x' — `readings` lists what you can find out."*
   */
  public static async reading(channel: string): Promise<Reading | null> {
    return logic().reading(channel);
  }

  /** Every channel this install ships, alphabetical by token. */
  public static async readings(): Promise<Reading[]> {
    return logic().readings();
  }
}

SecurityApi.decorateApiClass(InstrumentApi);
