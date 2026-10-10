/**
 * ExpanseApi — the gated facade over the expanse subsystem's resolvers:
 * *what craft is this place*, *where is it*, and *which expanse is that*.
 *
 * ⭐ Every static takes a PATH, never a world object. The question
 * *where am I at sea* belongs to whoever asks it, so the caller walks its
 * own containment (`getRootContainer()`) and hands the root's path here;
 * the Api resolves registries and rows (the `Structure` covering a room,
 * the live expanse singleton) and nothing else. Composition, sighting and
 * traffic are methods on the `Expanse` itself; the voyage's arithmetic is
 * on the craft.
 *
 * The logic lives in the hot-reloadable {@link ExpanseLogic} singleton at
 * `/platform/idea/api/expanse`. See `docs/subsystems/expanse.md`.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Positioned } from '../lib/expanse/Positioned';
import type { Expanse } from '../lib/expanse/Expanse';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ExpanseLogic } from '../platform/idea/api/ExpanseLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/expanse';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ExpanseLogic', import.meta.url),
);

/** Resolve the HMR-able ExpanseLogic singleton (sync). */
function logic(): ExpanseLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ExpanseLogic',
      ) as typeof ExpanseLogic | null) ?? ExpanseLogic)(),
  );
}

export class ExpanseApi {
  /**
   * The craft a place IS or is IN, with a position on an expanse — or
   * `null` ashore. `placePath` is the template path of the asker's ROOT
   * container: a launched boat answers itself; a room answers the
   * Structure whose extent covers it, if that Structure has a position.
   */
  public static craftAt(placePath: string): Promise<(Stuff & Positioned) | null> {
    return logic().craftAt(placePath);
  }

  /** The live expanse at `expansePath` (a row path), or `null`. */
  public static expanse(expansePath: string): Promise<Expanse | null> {
    return logic().expanse(expansePath);
  }
}

SecurityApi.decorateApiClass(ExpanseApi);
