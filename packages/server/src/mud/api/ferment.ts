/**
 * FermentApi — the gated facade over the durative-ferment reference
 * layer: the authored {@link FermentProfile} roster (stood up whole at
 * boot — the Material/Condition roster-warm rule, closing the
 * reference-Ideas-inert-at-boot gap for the third time) and the SYNC
 * profile-match reads `FermentingMixin`'s reconcile drives through.
 *
 * The transform itself lives on the vessel (`FermentingMixin`,
 * `lib/ferment/`) — this Api owns only what the mixin cannot: the
 * async boot warm, and the roster queries.
 *
 * The logic lives in the gated, hot-reloadable {@link FermentLogic}
 * singleton at `/platform/idea/api/ferment`; this Api is the thin
 * forwarding shell. `dest /platform/idea/api/ferment` reloads it.
 *
 * See `docs/subsystems/fermentation.md`.
 */

import type Material from '../lib/material/Material';
import type FermentProfile from '../lib/ferment/FermentProfile';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { FermentLogic } from '../platform/idea/api/FermentLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/ferment';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/FermentLogic', import.meta.url),
);

/** Resolve the HMR-able FermentLogic singleton (sync). */
function logic(): FermentLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'FermentLogic',
      ) as typeof FermentLogic | null) ?? FermentLogic)(),
  );
}

export class FermentApi {
  /**
   * Stand up every authored `FermentProfile` row as a live singleton so
   * the SYNC match reads (`profileFor` / `profileByKey`, driven from
   * `FermentingMixin.reconcileFerment`) hit from the first frame. The
   * roster is every root's `idea/ferment/` subtree — found by the
   * branch segment, never by a list of roots. Returns the count stood.
   */
  public static boot(): Promise<number> {
    return logic().boot();
  }

  /**
   * The profile matching `material` — matched by the must's TAGS
   * against each profile's `inputCategory`. Two matching profiles is
   * an AUTHORING error, surfaced as a warning diagnostic and resolved
   * deterministically (lowest key wins) — never a roll. `null` when
   * nothing matches (the vat stays idle).
   */
  public static profileFor(material: Material): FermentProfile | null {
    return logic().profileFor(material);
  }

  /** The live profile with `key`, or `null`. */
  public static profileByKey(key: string): FermentProfile | null {
    return logic().profileByKey(key);
  }

  /** Every live profile (sorted by key — deterministic). */
  public static profiles(): FermentProfile[] {
    return logic().profiles();
  }
}

SecurityApi.decorateApiClass(FermentApi);
