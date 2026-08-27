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
 * author on each row is **derived from the dispatched execution context**
 * (`ExecutionContextApi.getActingAuthor`) — never a caller-supplied value,
 * never read from the author-controlled `data` blob — so it cannot be
 * spoofed. The write is **centralized**: `recordAuthoring` is gated to the
 * single `TemplateApi.saveTemplate` chokepoint that every authoring
 * transport (the in-world verbs and the REST CMS) funnels through. The
 * operator-trust residue (a developer forging rows) is the *same*
 * irreducible boundary as `renown_events`, answered by tamper-evidence +
 * transparency + exit later — it meets the existing bar, doesn't lower it.
 *
 * This Api is a thin forwarding shell: the logic lives in the hot-reloadable
 * {@link ProvenanceLogic} singleton at `/platform/idea/api/provenance`, reached
 * synchronously via `StuffApi.singletonSync`.
 */

import type AuthoringEvent from '../lib/standing/AuthoringEvent';
import type { AuthoringEventFields } from '../lib/standing/AuthoringEvent';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { ProvenanceLogic } from '../platform/idea/api/ProvenanceLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export type { AuthoringEventFields };

const LOGIC_PATH = '/platform/idea/api/provenance';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ProvenanceLogic', import.meta.url)
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
   * Record one authoring act for `path` (append-only). The author is NOT a
   * parameter — it is derived from the dispatched execution context inside
   * the logic (`ExecutionContextApi.getActingAuthor`), so it cannot be
   * spoofed. The **write is gated to the template save chokepoint**
   * (`TemplateLogic`): every legitimate authoring path — the in-world
   * authoring verbs and the REST CMS — funnels through
   * `TemplateApi.saveTemplate`, so that is the single, centralized writer of
   * provenance; nothing else may append a row. No-op without an active
   * connection or an attributable context.
   *
   * Gated to the authoring-transport singletons: `TemplateLogic`
   * (`/platform/idea/api/template`) — the template chokepoint every template
   * authoring path (in-world verbs + the REST CMS) funnels through — and
   * `DocumentLogic` (`/platform/idea/api/document`) — the path-addressed document
   * store (scripts and any other owned-JSON kind), a legitimately separate
   * authoring transport (stored documents aren't templates). Each records
   * authoring for *its own* paths (template paths vs `/home/…`/`/world/…`
   * document paths); the chokepoint guarantee per kind is preserved.
   *
   * `StudioLogic` (`/platform/idea/api/studio`) is a third authoring transport: its
   * `publishBlueprint` (the composition-naming act #2) records authoring
   * against the synthetic `/platform/idea/BlueprintCatalogue/<blueprintId>` path — the
   * curated commons has no per-owner namespace, so the naming act is
   * attributed even though the blueprint record itself is commons-owned.
   * Nothing else may append a row.
   */
  @CallSecurity(
    SecurityPolicies.AnyOf(
      SecurityPolicies.FromTemplate('/platform/idea/api/template'),
      SecurityPolicies.FromTemplate('/platform/idea/api/document'),
      SecurityPolicies.FromTemplate('/platform/idea/api/studio'),
      // Governed eval (sandbox build): a field-parcel eval is a real,
      // receipted authoring act against the minted `_eval` template —
      // the governed channel made concrete for code.
      SecurityPolicies.FromTemplate('/platform/idea/cmd/author/EvalController')
    )
  )
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
