/**
 * ProvenanceApi — the authorship-ledger surface: who authored a content
 * path, derived from an append-only ledger rather than read from a mutable
 * stamp.
 *
 * The **first concrete brick of the provenance substrate** (see
 * docs/slates/builds/provenance-slate.md). Its immediate consumer is the
 * producer influence stock: `resolveCredit` asks `authorOf(zonePath)` to
 * route attributed-engagement credit. Authorship as a ledger (not a
 * `createdByPlayerId` field) is deliberate — a mutable field is not an
 * authority (the author owns the `data` blob), is re-stampable on every
 * save, and is audit-gapped. The ledger answers all three: append-only, one
 * row per authoring act, `authorOf` **derives** the original author as the
 * earliest row.
 *
 * **Dumb store, smart consumer** (the renown / chronicle precedent). The
 * author on each row is the authenticated giver threaded from the gated,
 * access-checked write path (`TemplateApi.saveTemplate`) — never
 * client-supplied, never read from the author-controlled `data` blob. The
 * operator-trust residue (a developer forging rows) is the *same*
 * irreducible boundary as `renown_events`, answered by tamper-evidence +
 * transparency + exit later — it meets the existing bar, doesn't lower it.
 *
 * This Api is a thin forwarding shell: the logic lives in the hot-reloadable
 * {@link ProvenanceLogic} singleton at `/obj/api/provenance`, reached
 * synchronously via `StuffApi.singletonSync`.
 */

import type AuthoringEvent from '../lib/standing/AuthoringEvent';
import type { AuthoringEventFields } from '../lib/standing/AuthoringEvent';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ProvenanceLogic } from '../obj/api/ProvenanceLogic';
import { fileURLToPath } from 'url';

export type { AuthoringEventFields };

const LOGIC_PATH = '/obj/api/provenance';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ProvenanceLogic', import.meta.url)
);

/** Resolve the HMR-able ProvenanceLogic singleton (sync). */
function logic(): ProvenanceLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ProvenanceLogic'
      ) as typeof ProvenanceLogic | null) ?? ProvenanceLogic)()
  );
}

export class ProvenanceApi {
  /**
   * Record one authoring act (append-only). The `author` is the
   * authenticated giver, supplied by the gated write path — never from
   * client input or the `data` blob. No-op without an active connection.
   */
  public static async recordAuthoring(
    fields: AuthoringEventFields
  ): Promise<void> {
    return logic().recordAuthoring(fields);
  }

  /**
   * Derive the author of a content path — the original author (the earliest
   * authoring row). `null` for engine / unauthored paths. The producer
   * credit router's routing seam.
   */
  public static async authorOf(path: string): Promise<string | null> {
    return logic().authorOf(path);
  }

  /** The raw, per-path authoring-log reader — the unscored substrate seam. */
  public static async eventsFor(path: string): Promise<AuthoringEvent[]> {
    return logic().eventsFor(path);
  }
}

SecurityApi.decorateApiClass(ProvenanceApi);
