/**
 * RenownApi — the gated append/read surface for renown: the measured,
 * signed aggregate of social standing, the "quality" half of the
 * consumer-influence thesis. Renown is an **output you observe**, never an
 * **input you assign**.
 *
 * **Dumb store, smart consumer** (the chronicle/belief precedent). The
 * substrate stores {@link RenownEvent} rows — the RAW, pre-valence signal
 * — and aggregates them on a schedule. No valence, no score, no polarity
 * lives on a row; the value-function is applied only at recompute, so
 * re-legislating it re-scores history without rewriting a row. This is the
 * **system of record**, distinct from the curated `chronicle` narrative
 * timeline and from the per-pair `regard` belief scalar (its sibling, fed
 * by the same reaction but stored independently).
 *
 * This build ships the **substrate** — the log, the append/read seams, and
 * (later phases) the per-scope aggregate + recompute. It wires **no
 * consumer**: governance influence, NPC behaviour, and disguise/notoriety
 * read `renownOf` later.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link RenownLogic} singleton at `/obj/api/renown`,
 * reached synchronously via `StuffApi.singletonSync`. `dest /obj/api/renown`
 * reloads it.
 */

import type RenownEvent from '../lib/renown/RenownEvent';
import type {
  RenownEventFields,
  RenownScope,
} from '../lib/renown/RenownEvent';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { RenownLogic } from '../obj/api/RenownLogic';
import { fileURLToPath } from 'url';

export type { RenownEventFields, RenownScope };

const LOGIC_PATH = '/obj/api/renown';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/RenownLogic', import.meta.url)
);

/** Resolve the HMR-able RenownLogic singleton (sync). */
function logic(): RenownLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'RenownLogic'
      ) as typeof RenownLogic | null) ?? RenownLogic)()
  );
}

export class RenownApi {
  /**
   * Append one raw, scope-tagged signal row to the log. Stores the
   * pre-valence signal verbatim (no score); `at` defaults to the
   * game-time witness. No-op without an active connection.
   */
  public static async append(fields: RenownEventFields): Promise<void> {
    return logic().append(fields);
  }

  /**
   * The raw, scope-filtered log reader — the substrate read. Returns the
   * subject's signal rows within `scope` (default: cooperative-wide).
   * Consumers should read the materialized aggregate (`renownOf`, later);
   * this is the unscored substrate seam.
   */
  public static async eventsFor(
    subjectId: string,
    scope?: RenownScope
  ): Promise<RenownEvent[]> {
    return logic().eventsFor(subjectId, scope ?? null);
  }
}

SecurityApi.decorateApiClass(RenownApi);
