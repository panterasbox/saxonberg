// ParcelLogic — the hot-reloadable logic singleton behind ParcelApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { StuffApi } from "../../../api/stuff";
import { NavigationApi } from "../../../api/navigation";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import { DiagnosticApi } from "../../../api/diagnostics";
import { AppApi } from "../../../api/app";
import { TOMBSTONE_ROW } from "../../location/Tombstone";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";
import { TemplatePaths } from "../../../lib/paths";
import {
  ParcelRecord,
  type ParcelOwner,
  type ParcelSpace,
  type TitleClaim,
  type TitleGrantOutcome,
} from "../../../lib/parcel/ParcelRecord";
import type { LandUse } from "../../../lib/parcel/LandUse";
import type { PowerBand } from "../../../lib/parcel/PowerBand";
import type { GroupRef } from "../../../lib/social/GroupProvider";
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
 * Lives at `/platform/idea/api/parcel`. Holds registry resolution + the no-registry
 * degrade; durable state (the coverage trie, the group-ref cache) lives on
 * `/platform/idea/ParcelRegistry`, whose methods admit this logic singleton
 * (`FromTemplate('/platform/idea/api/parcel')`) as well as the Api module. Each
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

  /** See {@link ParcelApi.powerOf}. */
  @CallSecurity(ParcelApiCallers)
  public powerOf(
    path: string,
  ): { band: PowerBand; feeder: string; parcel: ParcelRecord | null } {
    const reg = lookupRegistry();
    return reg
      ? reg.powerOf(path)
      : { band: "off-grid", feeder: "", parcel: null };
  }

  /** See {@link ParcelApi.resolveOwnerRef}. */
  @CallSecurity(ParcelApiCallers)
  public async resolveOwnerRef(owner: ParcelOwner): Promise<GroupRef | null> {
    const reg = lookupRegistry();
    return reg ? reg.resolveOwnerRef(owner) : null;
  }

  /** See {@link ParcelApi.extentsHeldBy}. */
  @CallSecurity(ParcelApiCallers)
  public async extentsHeldBy(
    admits: (owner: ParcelOwner) => Promise<boolean>,
  ): Promise<string[]> {
    const reg = lookupRegistry();
    return reg ? reg.extentsHeldBy(admits) : [];
  }

  /** See {@link ParcelApi.parcelsOnReach}. */
  @CallSecurity(ParcelApiCallers)
  public async parcelsOnReach(reachRef: string): Promise<ParcelRecord[]> {
    const reg = lookupRegistry();
    // No registry (a cold box): the rows are the only source, and the
    // reach citation is on the row.
    if (!reg) {
      return (await ParcelRecord.findAll()).filter(
        (r) => r.getReach() === reachRef,
      );
    }
    return reg.parcelsOnReach(reachRef);
  }

  /** See {@link ParcelApi.parcelsOnFeeder}. */
  @CallSecurity(ParcelApiCallers)
  public async parcelsOnFeeder(feederRef: string): Promise<ParcelRecord[]> {
    const reg = lookupRegistry();
    if (!reg) {
      return (await ParcelRecord.findAll()).filter(
        (r) => r.getFeeder() === feederRef,
      );
    }
    return reg.parcelsOnFeeder(feederRef);
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

  /** See {@link ParcelApi.citeReach}. */
  @CallSecurity(ParcelApiCallers)
  public async citeReach(
    extent: string,
    reach: string,
  ): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    return reg ? reg.citeReach(extent, reach) : null;
  }

  /** See {@link ParcelApi.setPublished}. */
  @CallSecurity(ParcelApiCallers)
  public async setPublished(
    extent: string,
    value: boolean,
  ): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    if (!reg) return null;
    // ⚠ `coveringParcelOf` is LONGEST-PREFIX, so an extent with no row
    // of its own answers with its parent's. Require the exact extent,
    // or a child of a dark parcel would read as "was live" and evict
    // people the parent already evicted.
    const before = reg.coveringParcelOf(extent);
    const wasLive =
      before?.extent === extent ? before.isPublished() : true;
    const record = await reg.setPublished(extent, value);
    if (!record) return null;
    // The graph denormalises `published`, so the flip has to reach it —
    // the record stays the source of truth and this is the projection
    // catching up.
    await NavigationApi.reprojectExtent(extent);
    // ⭐⭐ Only a LIVE extent going dark evicts. Draft content has never
    // been live, so nobody is inside it by construction — the flag
    // alone is the whole of a wall. This is the one difference between
    // the two lives of the field, and it is a fact about whether
    // anybody was there rather than a second field.
    if (wasLive && !value) await this.offlineExtent(extent, record);
    return record;
  }

  /**
   * ⭐⭐ Take live content down HONESTLY: move the people inside out to
   * a tombstone that tells them what happened, and tell the author of
   * every room that just lost a destination.
   *
   * Both halves matter. Evicting without a tombstone drops somebody in
   * a void room with no fiction for it; evicting without telling the
   * pointing rooms' authors leaves working content silently broken
   * somewhere nobody is looking.
   *
   * ⚠ The reverse-edge query (`pointingAt`) is what makes the second
   * half possible at all, and it is the reason `{'edges.to': 1}` is an
   * index.
   */
  private async offlineExtent(
    extent: string,
    record: ParcelRecord,
  ): Promise<void> {
    const nodes = await NavigationApi.nodesInExtent(extent);
    if (nodes.length === 0) return;

    const holder = ParcelLogic.holderName(record);
    const tombstone = await this.standTombstone(extent, holder);

    // Evict every PERSON standing in the extent. ⚠ The ROW read, not
    // the identity read: a keyed room under a template node (a leased
    // unit, a provisioned dorm room) is an instance of that row and has
    // people in it too.
    for (const node of nodes) {
      for (const live of StuffApi.findAllByTemplatePath<Stuff>(
        node.identity,
      )) {
        if (!MixinApi.isContainer(live)) continue;
        for (const occupant of [...live.getContents()]) {
          if (!MixinApi.isHasInteractive(occupant)) continue;
          if (!MixinApi.isContainable(occupant)) continue;
          if (!tombstone) continue;
          ContainmentApi.move(
            occupant as unknown as Stuff & Containable,
            tombstone as unknown as Stuff & Container,
          );
        }
      }
    }

    // Tell the author of every PUBLISHED room pointing in that it just
    // lost a destination. Durable, addressed to the pointing row, and
    // delivered to its author on the live stream + `errors` + the CMS.
    const told = new Set<string>();
    for (const node of nodes) {
      for (const pointer of await NavigationApi.pointingAt(node.identity)) {
        if (!pointer.published) continue;
        const edge = pointer.edges.find((e) => e.to === node.identity);
        const key = `${pointer.template}|${edge?.dir ?? ''}`;
        if (told.has(key)) continue;
        told.add(key);
        await DiagnosticApi.record({
          path: pointer.template,
          severity: 'warning',
          message:
            `exit ${edge?.dir ?? '?'} → ${node.template} lost its ` +
            `destination: ${extent} was taken offline by ${holder}.`,
          channel: 'location-graph',
        });
      }
    }
  }

  /**
   * Mint (or find) the tombstone for `extent`, with the one exit `out`.
   *
   * ⭐ The exit is chosen by a four-rung cascade, because *somewhere
   * real* beats *somewhere correct*: (1) a published place outside the
   * extent that pointed INTO it — the way somebody would have come in,
   * so the way they would expect to leave; (2) the configured default
   * start location; (3) the evacuation fallback. A tombstone with no
   * way out would be a worse trap than the thing it is apologising
   * for.
   */
  private async standTombstone(
    extent: string,
    holder: string,
  ): Promise<Stuff | null> {
    const identity = ParcelLogic.tombstoneIdentityFor(extent);
    const standing = StuffApi.findByIdentityPath<Stuff>(identity)[0];
    if (standing) return standing;
    try {
      const out = await this.tombstoneExitTarget(extent);
      const tombstone = await StuffApi.clone<Stuff>(
        TOMBSTONE_ROW,
        undefined,
        {
          // identity-keyed-by: referenced — `pointingAt`'s diagnostics
          // and a second offlining of the same ground both resolve this
          // exact string, and it is re-derivable from the extent.
          asIdentityPath: identity,
          dataOverlay: {
            extent,
            takenDownBy: holder,
            longDescription:
              `Bare ground, and a marker standing in it. The place that ` +
              `stood here — ${extent} — was taken offline by ${holder}. ` +
              `Tell them if you were sent here.`,
          },
        },
      );
      if (out && MixinApi.isExitable(tombstone)) {
        await tombstone.applyExits({ out: { destination: out } });
      }
      return tombstone;
    } catch (err) {
      console.warn(`ParcelLogic.offline: no tombstone for ${extent}`, err);
      return null;
    }
  }

  /** The four-rung cascade for the tombstone's way `out`. */
  private async tombstoneExitTarget(extent: string): Promise<string | null> {
    for (const node of await NavigationApi.nodesInExtent(extent)) {
      for (const pointer of await NavigationApi.pointingAt(node.identity)) {
        if (!pointer.published) continue;
        if (
          pointer.identity === extent ||
          pointer.identity.startsWith(extent + '/')
        ) {
          continue; // inside the extent coming down
        }
        return pointer.identity;
      }
    }
    // ⚠ The settings rungs are a NICETY, not a precondition: a cold
    // settings cache throws, and a tombstone with no way out is still
    // far better than no tombstone at all (the people inside have
    // already been evicted by the time we get here). Found by a test —
    // the throw was escaping into `standTombstone`'s catch and
    // silently preventing the marker from being minted.
    for (const key of ['world.defaultStartLocation', 'world.evacuationFallback']) {
      try {
        const value = AppApi.setting(key);
        if (value) return value;
      } catch {
        // cache not warmed — try the next rung
      }
    }
    return null;
  }

  /**
   * ⭐ The identity a tombstone for `extent` answers to.
   *
   * Re-derivable from the extent, not a uuid — which is what lets a
   * second offlining of the same ground find the marker already
   * standing instead of putting a second one next to it. The leading
   * slash is stripped so each identity nests under the tombstone ROW,
   * the corpse's shape, and a row read finds them all.
   */
  private static tombstoneIdentityFor(extent: string): string {
    return `${TOMBSTONE_ROW}/${extent.replace(/^\/+/, '')}`;
  }

  /** A holder as a readable name — never a key. */
  private static holderName(record: ParcelRecord): string {
    const owner = record.getOwner();
    if (!owner) return 'nobody';
    if (owner.kind === 'group') return owner.name ?? 'a group';
    const path = owner.templatePath ?? '';
    const leaf = path.split('/').filter(Boolean).pop() ?? 'somebody';
    return leaf.replace(/[-_]/g, ' ');
  }

  /** See {@link ParcelApi.isPathPublished}. */
  @CallSecurity(ParcelApiCallers)
  public isPathPublished(path: string): boolean {
    const reg = lookupRegistry();
    // ⚠ No registry yet (early boot, a unit test with no world) reads
    // as published: the gate must not seal the world shut because an
    // index has not warmed.
    if (!reg) return true;
    return reg.coveringParcelOf(path)?.isPublished() ?? true;
  }

  /** See {@link ParcelApi.citeFeeder}. */
  @CallSecurity(ParcelApiCallers)
  public async citeFeeder(
    extent: string,
    feeder: string,
  ): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    return reg ? reg.citeFeeder(extent, feeder) : null;
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
  public async heldUnitOf(
    holder: string,
    underExtent?: string,
  ): Promise<ParcelRecord | null> {
    const reg = lookupRegistry();
    return reg ? reg.heldUnitOf(holder, underExtent) : null;
  }

  /** See {@link ParcelApi.heldUnitsOf}. */
  @CallSecurity(ParcelApiCallers)
  public async heldUnitsOf(holder: string): Promise<ParcelRecord[]> {
    const reg = lookupRegistry();
    return reg ? reg.heldUnitsOf(holder) : [];
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
