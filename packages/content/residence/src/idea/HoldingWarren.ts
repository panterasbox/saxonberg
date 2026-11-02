/**
 * HoldingWarren — **what ONE person holds**, and the holding as a warren
 * one level down
 * (residences D16): a keyed instance of ONE programme row per holding,
 * whose members are the holding's rooms and which owns every
 * holding-level concern — the floorplan mint, intra-holding wiring +
 * the locked front-door edge, dormancy AS A UNIT (the holding sleeps
 * and wakes whole, never room-by-room), the shell condition +
 * weathering clock (D4/P10), the tenure term (D5), the archetype
 * aggregation point (D15), and lease revert.
 *
 * Identity is the keyed model: the programme row is authored content
 * (`class: /system/residence/idea/HoldingWarren`), each holding gets a
 * keyed instance `(scope = the row, key = the holding's parcel
 * extent)`; each room is a keyed instance of a REAL room row
 * `(scope = the room row, key = <extent>/<leaf>)` — `templatePath`
 * always resolves to a row (D17), per-holding uniqueness carried by
 * the persistence spine's unique-key guard.
 *
 * ⭐ **The lift (harbors P1).** The floorplan mint, keyed rooms,
 * whole-warren dormancy, `layOut`, the shell clock and its bands are the
 * kernel's `FloorplanWarren` now — a ship's hull weathers on the same
 * clock. What stays here is only what is residential: the address stem,
 * the parcel keyway and the keyed front-door edge, the parcel's open
 * ground (`openGroundM2`), the relay to the institution, and the house's
 * words for its fabric. (`admitPlot`, the break-ground seam, retired with
 * `plot` in the farming build — a farm's ground is a floorplan's tract.)
 *
 * The member contract stays **open to runtime-added members** (the
 * cross-build interface with farming's break-ground act): the
 * floorplan is the *initial* mint, never the closed set — `wake()`
 * stands up the floorplan rooms AND re-admits any extra keyed rooms
 * whose records already ride the holding's extent.
 */

import {
  FloorplanWarren,
  type FloorplanRoom,
  type FloorplanExit,
  type UpkeepWords,
} from '@saxonberg/server/mud/lib/location/FloorplanWarren';
import type Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

type MemberStuff = Stuff & Container;

export default class HoldingWarren extends FloorplanWarren {
  static fieldMeta: FieldMeta = {
    addressBase: { persistent: true, authorable: true },
  };

  /** The address stem rooms stamp (`<addressBase>/<leaf>`); empty
   *  derives from the holding key's tail. */
  public addressBase: string = '';

  /** The holding's keyway (sync lock identity), refreshed at wake. */
  private _keyway: string = '';

  // ── authored-field surface ──────────────────────────────────────

  public getAddressBase(): string {
    return this.addressBase;
  }

  public setAddressBase(value: string): void {
    this.addressBase = value;
  }

  /**
   * The entry room's ROW for a programme row — the eager face a
   * FrontDoorExit / LotGateExit carries (D17: a real row). Shared by
   * every institution that hangs doors on this programme.
   */
  public static async entryRowOf(programmePath: string): Promise<string> {
    const { Template } = await import(
      '@saxonberg/server/mud/lib/stuff/Template'
    );
    const row = await Template.findByPath(programmePath);
    const floorplan = (
      row?.data as { floorplan?: Array<Record<string, unknown>> }
    )?.floorplan;
    const entry = floorplan?.find((r) => r.entry === true) ?? floorplan?.[0];
    return String(entry?.room ?? programmePath);
  }

  /** The floorplan LEAFS of a programme row (for revert bookkeeping
   *  without waking the holding). */
  private static async floorplanLeafsOf(
    programmePath: string,
  ): Promise<Array<string | undefined>> {
    const { Template } = await import(
      '@saxonberg/server/mud/lib/stuff/Template'
    );
    const row = await Template.findByPath(programmePath);
    const floorplan = (
      row?.data as { floorplan?: Array<Record<string, unknown>> }
    )?.floorplan;
    return (floorplan ?? []).map((r) =>
      typeof r.leaf === 'string' ? (r.leaf as string) : undefined,
    );
  }

  // ── identity ────────────────────────────────────────────────────

  /** The holding's parcel extent — the programme's persistence key. */
  public holdingKey(): string | null {
    return this.warrenKey();
  }

  /**
   * ⭐ **The holding's open ground**, m² (tracts build D27): the parcel's
   * workable area less every floorplan room's footprint — what the tracts'
   * shares (`shareOf`) divide. `0` on an unmeasured parcel (nobody can say
   * what a third of it is). Residential because the area is the PARCEL's.
   */
  public async openGroundM2(): Promise<number> {
    const extent = this.holdingKey();
    if (!extent) return 0;
    const workable = await ParcelApi.workableAreaOf(extent);
    if (!(workable > 0)) return 0;
    const built = this.getFloorplan().reduce((n, r) => n + (r.footprintM2 ?? 0), 0);
    return Math.max(0, workable - built);
  }

  // ── wake / membership ───────────────────────────────────────────

  /**
   * Stand the whole holding up (the kernel's floorplan wake), with the
   * keyway cache refreshed first so the locked edges it wires gate on
   * the parcel's current keyway.
   */
  public override async wake(): Promise<void> {
    await this.refreshKeyway();
    await super.wake();
  }

  /**
   * The room's address: `<addressBase or derived>/<leaf>` — the
   * Locality address is the human per-place identity (D16).
   *
   * @hook
   */
  protected override addressFor(spec: FloorplanRoom): string | null {
    const base = this.addressBase || this.derivedAddressBase();
    if (!base) return null;
    return spec.leaf ? `${base}/${spec.leaf}` : base;
  }

  private derivedAddressBase(): string {
    const extent = this.holdingKey();
    if (!extent) return '';
    // `/world/terminus/hinkley-hills/lots/lot-7` → `terminus/hinkley-hills/lot-7`
    const parts = extent.split('/').filter(Boolean);
    if (parts[0] === 'world') parts.shift();
    return parts.filter((p) => p !== 'lots' && p !== 'units').join('/');
  }

  /**
   * The locked edge — keyway-gated INWARD (the dorm-door model); the way
   * back OUT is free (a guest let in is never trapped, and leaving your
   * own house needs no key). ⭐ The ROOM installs, from a kind ROW.
   *
   * @hook
   */
  protected override async wireLockedEdge(
    from: MemberStuff,
    to: MemberStuff,
    edge: FloorplanExit,
  ): Promise<void> {
    if (!MixinApi.isExitable(from) || !MixinApi.isExitable(to)) return;
    const { default: KeyedDoorExitClass } = await import('./KeyedDoorExit');
    void KeyedDoorExitClass; // the class the kind row names
    await from.installExit<
      Exit & { configureKeyedDoor(p: HoldingWarren): void }
    >(
      '/system/residence/idea/exits/keyed-door',
      {
        direction: edge.direction,
        source: from,
        destination: to,
        keepLiveDestination: true,
        oneWay: true,
      },
      (e) => e.configureKeyedDoor(this),
    );
    const back = edge.opposite ?? 'out';
    if (!to.getExit(back)) {
      await to.installExit('/platform/idea/exits/passage', {
        direction: back,
        source: to,
        destination: from as never,
        keepLiveDestination: true,
        oneWay: true,
      });
    }
  }

  // ── the keyway (the front door's sync lock identity) ────────────

  public async refreshKeyway(): Promise<void> {
    const extent = this.holdingKey();
    if (!extent) return;
    const record = await ParcelApi.coveringParcelOf(extent);
    this._keyway =
      record && record.getExtent() === extent ? record.getKeyway() : '';
  }

  /** The holding's keyway ('' = no key opens; the institution's own
   *  cache is the other reader). */
  public keyway(): string {
    return this._keyway;
  }

  // ── dormancy as a unit (D16) ────────────────────────────────────

  /**
   * Population-reactive reconcile: the holding NEVER reaps a room on its
   * own — it sleeps whole or not at all. All it does is relay the
   * aggregate population change to the owning institution, whose
   * reconcile captures-whole + tears the holding down.
   */
  protected async reconcile(): Promise<void> {
    const institution = this.getWarren() as unknown as {
      notifyPopulationChange(room: MemberStuff): void;
    } | null;
    if (institution) {
      institution.notifyPopulationChange(this as unknown as MemberStuff);
    }
  }

  // ── the house's words for its fabric ────────────────────────────

  /**
   * A house speaks of paint, sills and a householder's kit.
   *
   * @hook
   */
  public override upkeepWords(): UpkeepWords {
    return {
      declining: 'The paint is going; weather is starting to find the seams.',
      failed: 'The paint has gone; rain has gotten into the sills.',
      kit: "a householder's kit",
      work: 'You work the place over — putty into the seams, paint where the weather has been at it, a nail where a nail was wanted.',
      witnessed: "works over the fabric of the place with a householder's kit.",
    };
  }
}
