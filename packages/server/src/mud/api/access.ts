/**
 * AccessApi — thin facade over the `AccessRegistry` singleton.
 *
 * Stable caller-facing surface for the access substrate. Every method
 * delegates through the hot-reloadable {@link AccessLogic} singleton at
 * `/obj/api/access` to the Registry; the Registry's methods carry
 * `@CallSecurity(AnyOf(FromModule('mud/api/access#AccessApi'),
 * FromTemplate('/obj/api/access')))` so the security gate denies any
 * caller outside the access subsystem. External code that grabs the
 * Registry Stuff via `StuffApi.findByTemplatePath` cannot call its
 * methods; this Api is the only legitimate path.
 *
 * State lives on the Registry (cached refs, wizard playerId Set,
 * etc.); the cached pointer lives in the logic singleton's module scope
 * (a lookup convenience, not domain state). Reload of `api/access.ts` or
 * `obj/api/AccessLogic.ts` re-resolves the pointer; reload of
 * `obj/AccessRegistry.ts` re-clones the Stuff per HotReloadApi's pattern.
 *
 * The narrow-entry pattern: `AccessApi` is reachable from anywhere,
 * mediating every call into the Registry. State has one home, one
 * calling surface, and one structurally-enforced path between them.
 */

import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import { AccessLogic } from '../obj/api/AccessLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/access';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/AccessLogic', import.meta.url)
);

/** Resolve the HMR-able AccessLogic singleton (sync). */
function logic(): AccessLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'AccessLogic'
      ) as typeof AccessLogic | null) ?? AccessLogic)()
  );
}

export class AccessApi {
  /**
   * Resource-targeted slice walk. Returns true iff `subject` is a
   * member of any group owning the resource's zone-tree slice. NPCs
   * and null subjects fail closed. When the walk finds no owners,
   * falls back to the universal `'core'` group.
   */
  public static async can(
    subject: Stuff | null,
    action: string,
    resource: Stuff | null
  ): Promise<boolean> {
    return logic().can(subject, action, resource);
  }

  /**
   * Role-gated check used when the target IS a Zone Template
   * (transfer ownership, mutate `accessGroups`, destruct the slice).
   * Requires `'owner'` role in the zone's primary `ownerGroup`.
   */
  public static async canMutateZone(
    subject: Stuff | null,
    zone: Stuff
  ): Promise<boolean> {
    return logic().canMutateZone(subject, zone);
  }

  /**
   * Broad "is the actor a member of any group with content scope?".
   * Used by MQL pre-gates that can't be resource-targeted. Fail-
   * closed in the no-Registry test path (the absent permission
   * snapshot already permits the resolver from the dispatcher side).
   */
  public static async isAuthor(subject: Stuff | null): Promise<boolean> {
    return logic().isAuthor(subject);
  }

  /**
   * Orthogonal wizard axis — the code-trust capability. True iff
   * `subject` is an Avatar whose playerId is in the `'wizards'` group.
   * Gates every TypeScript-authoring/execution door (`eval`, `reload`,
   * source writes, CMS source read/write) AND the executable
   * code-naming fields on a content template (`class` /
   * `hydratorClass` / `behaviors[].brain`). A content author who is not
   * a wizard is a "protowizard": content-write access without code
   * trust.
   */
  public static async isWizard(subject: Stuff | null): Promise<boolean> {
    return logic().isWizard(subject);
  }

  /**
   * Orthogonal streamer axis. True iff `subject` is an Avatar whose
   * playerId is in the `'streamers'` group. Gates the livestream
   * control plane (the `stream` verb). Distinct from the wizard
   * axis — a streamer drives the broadcast overlay without holding
   * TypeScript-escape capability.
   */
  public static async isStreamer(subject: Stuff | null): Promise<boolean> {
    return logic().isStreamer(subject);
  }

  /**
   * Walk a source-tree path against the template tree
   * most-specific-first, returning the closest extant FolderZone
   * instance. Workspace controllers in source/mirror mode pass the
   * resolved zone as the access resource.
   */
  public static async resolveSourceFolderZone(
    sourcePath: string
  ): Promise<Stuff | null> {
    return logic().resolveSourceFolderZone(sourcePath);
  }

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Called by the HotReloadApi when `api/access.ts` is
   * reloaded. Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    logic()._resetRegistryRefForReload();
  }
}

SecurityApi.decorateApiClass(AccessApi);
