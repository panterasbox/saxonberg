// ParcelLogic — the hot-reloadable logic singleton behind ParcelApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { StuffApi } from "../../api/stuff";
import { TemplatePaths } from "../../lib/paths";
import {
  ParcelRecord,
  type ParcelOwner,
} from "../../lib/parcel/ParcelRecord";
import type { GroupRef } from "../../lib/social/GroupProvider";
import type ParcelRegistry from "../ParcelRegistry";

const REGISTRY_PATH = TemplatePaths.parcelRegistry;

const ParcelApiCallers = SecurityPolicies.FromModule("/api/parcel#ParcelApi");

/** The state's default-owner group (public-held default). */
const STATE_OWNER: ParcelOwner = { kind: "group", name: "core" };

/**
 * Resolve the Registry without forcing a clone. In production it's cloned
 * by `AppBootstrap`, so this returns it cheaply. In test harnesses without
 * a live Registry it returns `null` — the reads then degrade to the pure
 * rungs (`ownerOf` → self-home ?? state), so `AccessApi.can` stays
 * byte-identical (no parcels → the state's `core` walk).
 */
let registryRef: ParcelRegistry | null = null;
function lookupRegistry(): ParcelRegistry | null {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<ParcelRegistry>(REGISTRY_PATH);
  if (reg) registryRef = reg;
  return reg ?? null;
}

/**
 * ParcelLogic — the hot-reloadable logic singleton behind
 * {@link ParcelApi}.
 *
 * Lives at `/obj/api/parcel`. Holds registry resolution + the no-registry
 * degrade; durable state (the coverage trie, the group-ref cache) lives on
 * `/obj/ParcelRegistry`, whose methods admit this logic singleton
 * (`FromTemplate('/obj/api/parcel')`) as well as the Api module. Each
 * method is gated `FromModule('/api/parcel#ParcelApi')` (the Api is the
 * only caller; internal sub-logic is on the Registry).
 *
 * @internal
 */
@Unshadowable
export class ParcelLogic extends ApiLogic {
  /** See {@link ParcelApi.ownerOf}. */
  @CallSecurity(ParcelApiCallers)
  public async ownerOf(path: string): Promise<ParcelOwner> {
    const reg = lookupRegistry();
    if (reg) return reg.ownerOf(path);
    // Pure degrade: no registry → no parcels → self-home ?? the state.
    return ParcelRecord.selfHomeOwnerOf(path) ?? STATE_OWNER;
  }

  /** See {@link ParcelApi.coveringParcelOf}. */
  @CallSecurity(ParcelApiCallers)
  public coveringParcelOf(path: string): ParcelRecord | null {
    const reg = lookupRegistry();
    return reg ? reg.coveringParcelOf(path) : null;
  }

  /** See {@link ParcelApi.resolveOwnerRef}. */
  @CallSecurity(ParcelApiCallers)
  public async resolveOwnerRef(owner: ParcelOwner): Promise<GroupRef | null> {
    const reg = lookupRegistry();
    return reg ? reg.resolveOwnerRef(owner) : null;
  }

  /** See {@link ParcelApi.groupOwnerRefs}. */
  @CallSecurity(ParcelApiCallers)
  public async groupOwnerRefs(): Promise<GroupRef[]> {
    const reg = lookupRegistry();
    return reg ? reg.groupOwnerRefs() : [];
  }

  /** See {@link ParcelApi.subdivide}. */
  @CallSecurity(ParcelApiCallers)
  public async subdivide(
    childPath: string,
    parentExtent: string,
    owner: ParcelOwner,
  ): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    return reg ? reg.subdivide(childPath, parentExtent, owner) : null;
  }

  /** See {@link ParcelApi.transfer}. */
  @CallSecurity(ParcelApiCallers)
  public async transfer(
    extent: string,
    newOwner: ParcelOwner,
  ): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    return reg ? reg.transfer(extent, newOwner) : null;
  }

  /** See {@link ParcelApi.rebuildCoverageIndex}. */
  @CallSecurity(ParcelApiCallers)
  public async rebuildCoverageIndex(): Promise<void> {
    const reg = lookupRegistry();
    if (reg) await reg.rebuildCoverageIndex();
  }

  /** See {@link ParcelApi._resetRegistryRefForReload}. */
  @CallSecurity(ParcelApiCallers)
  public _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
