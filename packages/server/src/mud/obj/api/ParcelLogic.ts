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
  type ParcelSpace,
  type TitleClaim,
  type TitleGrantOutcome,
} from "../../lib/parcel/ParcelRecord";
import type { LandUse } from "../../lib/parcel/LandUse";
import type { GroupRef } from "../../lib/social/GroupProvider";
import type ParcelRegistry from "../ParcelRegistry";

const REGISTRY_PATH = TemplatePaths.parcelRegistry;

const ParcelApiCallers = SecurityPolicies.FromModule("/api/parcel#ParcelApi");

/**
 * Resolve the Registry without forcing a clone. In production it's cloned
 * by `AppBootstrap`, so this returns it cheaply. In test harnesses without
 * a live Registry it returns `null` — the reads then degrade to the pure
 * rungs (`ownerOf` → self-home ?? null), so `AccessApi.can` fails
 * closed on anything but a self-home path.
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
  public async ownerOf(path: string): Promise<ParcelOwner | null> {
    const reg = lookupRegistry();
    if (reg) return reg.ownerOf(path);
    // Pure degrade: no registry → no parcels → self-home ?? untitled.
    return ParcelRecord.selfHomeOwnerOf(path);
  }

  /** See {@link ParcelApi.coveringParcelOf}. */
  @CallSecurity(ParcelApiCallers)
  public coveringParcelOf(path: string): ParcelRecord | null {
    const reg = lookupRegistry();
    return reg ? reg.coveringParcelOf(path) : null;
  }

  /** See {@link ParcelApi.landUseOf}. */
  @CallSecurity(ParcelApiCallers)
  public landUseOf(path: string): LandUse {
    const reg = lookupRegistry();
    return reg ? reg.landUseOf(path) : "wild";
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
    area = 0,
    storeys = 1,
    landUse: LandUse | null = null,
  ): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    return reg
      ? reg.subdivide(childPath, parentExtent, owner, area, storeys, landUse)
      : null;
  }

  /** See {@link ParcelApi.spaceOf}. */
  @CallSecurity(ParcelApiCallers)
  public async spaceOf(extent: string): Promise<ParcelSpace> {
    const reg = lookupRegistry();
    return reg
      ? reg.spaceOf(extent)
      : { capacity: 0, allocated: 0, unallocated: 0, utilisation: 0 };
  }

  /** See {@link ParcelApi.allRecords}. No registry → the rows themselves. */
  @CallSecurity(ParcelApiCallers)
  public async allRecords(): Promise<ParcelRecord[]> {
    const reg = lookupRegistry();
    return reg ? reg.allRecords() : ParcelRecord.findAll();
  }

  /** See {@link ParcelApi.grant}. The grant path MINTS the registry when
   *  absent (the registry-at-boot rule: the installer's requires phase
   *  runs before `BootstrapManager` clones the manifest singletons, and
   *  `BootstrapManager` reuses a resident one). */
  @CallSecurity(ParcelApiCallers)
  public async grant(
    claim: TitleClaim,
  ): Promise<{ outcome: TitleGrantOutcome; holder: ParcelOwner }> {
    const reg =
      lookupRegistry() ??
      (registryRef = await StuffApi.singleton<ParcelRegistry>(REGISTRY_PATH));
    return reg.grant(claim);
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

  /** See {@link ParcelApi.grantUse}. */
  @CallSecurity(ParcelApiCallers)
  public async grantUse(
    extent: string,
    holder: string,
    expiresAt: number | null,
  ): Promise<boolean> {
    const reg = lookupRegistry();
    return reg ? reg.grantUse(extent, holder, expiresAt) : false;
  }

  /** See {@link ParcelApi.revokeUse}. */
  @CallSecurity(ParcelApiCallers)
  public async revokeUse(extent: string, holder: string): Promise<boolean> {
    const reg = lookupRegistry();
    return reg ? reg.revokeUse(extent, holder) : false;
  }

  /** See {@link ParcelApi.hasUseGrant}. */
  @CallSecurity(ParcelApiCallers)
  public async hasUseGrant(extent: string, holder: string): Promise<boolean> {
    const reg = lookupRegistry();
    return reg ? reg.hasUseGrant(extent, holder) : false;
  }

  /** See {@link ParcelApi.setKeyway}. */
  @CallSecurity(ParcelApiCallers)
  public async setKeyway(extent: string, keyway: string): Promise<boolean> {
    const reg = lookupRegistry();
    return reg ? reg.setKeyway(extent, keyway) : false;
  }

  /** See {@link ParcelApi.heldUnitOf}. */
  @CallSecurity(ParcelApiCallers)
  public async heldUnitOf(holder: string): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    return reg ? reg.heldUnitOf(holder) : null;
  }

  /** See {@link ParcelApi.childParcelsOf}. */
  @CallSecurity(ParcelApiCallers)
  public async childParcelsOf(parentExtent: string): Promise<ParcelRecord[]> {
    const reg = lookupRegistry();
    return reg ? reg.childParcelsOf(parentExtent) : [];
  }

  /** See {@link ParcelApi.retire}. */
  @CallSecurity(ParcelApiCallers)
  public async retire(extent: string): Promise<void> {
    const reg = lookupRegistry();
    if (reg) await reg.retire(extent);
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
