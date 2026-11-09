/**
 * SeaWarren — ⭐⭐ **the water beside a ship that has stopped at sea**
 * (river D30): the sea brought into line with the river.
 *
 * ONE singleton for the realm. Its members are sea patches, budded only
 * where a ship has stopped — a ship stopped within hail of a patch's spot
 * shares it, so two ships hove-to together have one water between them —
 * and reaped when nothing is left in them. Each patch has its own zone (D38), minted and reaped
 * with it.
 *
 * It answers the same questions of a sea that the river's warren answers
 * of a river, by the same shape:
 *
 * - **where a boat goes in** (`launchPlaceFor` a ship's deck): the water
 *   beside her;
 * - **where it comes out** (`recoverPlaceFor` a sea patch): the deck of a
 *   ship still lying there;
 * - **where a way leads, and whether it may be taken**: over her side (not
 *   while she is under way — swimmers at sea exist only where a ship has
 *   stopped), up onto her deck (not once she has sailed).
 *
 * ⚠ The patches do not drift: a ship stopped holds where she is (her course
 * is null and her position is her fix), and so does her water. A ship
 * hove-to drifting with the set, and her water with her, is the ships
 * slate's (recorded in the plan).
 */

import { RoomWarren } from '@saxonberg/server/mud/lib/location/RoomWarren';
import type { Attachment } from '@saxonberg/server/mud/lib/location/Warren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { LaunchableMixin } from '@saxonberg/server/mud/lib/location/Launchable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Place from '@saxonberg/server/mud/lib/stuff/Place';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import type { Voyaging } from '@saxonberg/server/mud/lib/expanse/Voyaging';
import type { Positioned } from '@saxonberg/server/mud/lib/expanse/Positioned';
import Structure from '@saxonberg/server/mud/lib/structure/Structure';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import type SeaPatch from '../location/SeaPatch';
import type SeaStop from '../location/SeaStop';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type SeaZone from '../location/SeaZone';
import SeaPatchExit from './exits/SeaPatchExit';
import type WaterExpanse from './WaterExpanse';

type MemberStuff = Stuff & Container;

const PATCH_ROW = '/system/water/location/sea/patch/water';
const PATCH_ZONE = '/system/water/location/sea/patch';
const EXIT_KIND = '/system/water/idea/exits/sea-patch';
const STOP_ROW = '/system/water/location/sea/stop/water';
const STOP_ZONE = '/system/water/location/sea/stop';
/** How far you can call to somebody in the water, m (`expanse.hailRangeM`). */
const HAIL_M = 100;
/** One nautical mile, m. */
const NM_M = 1852;

/** A ship as the sea's warren asks of her: a structure that voyages. */
type ShipShape = Structure & Voyaging & Positioned;

export default class SeaWarren extends LaunchableMixin(SingletonMixin(RoomWarren)) {
  /** The patches standing now. Runtime: a sea patch is never persisted. */
  private _patches = new Set<SeaPatch>();
  private _serial = 0;
  private _mintChain: Promise<unknown> = Promise.resolve();
  /** ⭐ The stops standing now, by key — each persisted by its own record. */
  private _stops = new Map<string, SeaStop>();

  /* ───────────────────────── Warren policy ───────────────────────── */

  public override laysOutOwnFrame(): boolean {
    return true;
  }

  protected occupantsOf(m: MemberStuff): (Stuff & Container)[] {
    return m.getContents().filter((c) => MixinApi.isTangible(c)) as unknown as (Stuff & Container)[];
  }

  protected async createMember(): Promise<MemberStuff> {
    return StuffApi.clone<MemberStuff>(PATCH_ROW);
  }

  public async admitArrival(): Promise<void> {
    /* no-op — the way in is a ship's side. */
  }

  protected attachmentFor(): Attachment {
    return { direction: 'down' };
  }

  protected override async wireHubExit(_room: MemberStuff): Promise<void> {
    /* the sea wires its own ways — see `patchAlongside` */
  }

  protected async wireHostFixtures(): Promise<void> { /* no host */ }
  protected async unwireHostFixtures(): Promise<void> { /* no host */ }

  public override canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /**
   * An empty patch is reaped, its zone with it. ⭐ A stop is kept first (its
   * record is by position): reaped empty, it stands again whenever its
   * wreck's deck, or a ship coming to the spot, asks for the water there.
   */
  protected async reconcile(): Promise<void> {
    for (const m of this.getMembers()) {
      const stop = [...this._stops.values()].find((st) => (st as unknown) === (m as unknown)) ?? null;
      if (stop !== null) {
        await PersistableApi.capture(m, stop.getPersistenceKey() ?? undefined).catch(() => undefined);
      }
      if (this.occupantsOf(m).length > 0) continue;
      if (stop !== null) {
        for (const [k, v] of this._stops) if (v === stop) this._stops.delete(k);
      }
      this.reap(m);
    }
  }

  /* ───────────────────────── boats ───────────────────────── */

  /** ⭐ Where a boat goes in off a ship's deck (D30): the water beside her. */
  public override async launchPlaceFor(from: Stuff): Promise<(Stuff & Container) | null> {
    const ship = await this.shipOf(from);
    if (ship === null || !this.stopped(ship)) return null;
    return (await this.patchAlongside(ship)) as unknown as Stuff & Container;
  }

  /** ⭐ Where a boat in the water comes out (D30): onto the deck of a ship lying here. */
  public override async recoverPlaceFor(from: Stuff): Promise<(Stuff & Container) | null> {
    const patch = [...this._patches].find((r) => (r as unknown) === (from as unknown)) ?? null;
    if (patch === null || !MixinApi.isExitable(patch)) return null;
    for (const exit of (patch as unknown as Exitable).getExits().values()) {
      if (!(exit instanceof SeaPatchExit) || exit.getWay() !== 'deck') continue;
      if ((await this.refusalFor(exit)) !== null) continue;
      return (await this.shipByHandle(exit.getTarget()))?.watchRoom() ?? null;
    }
    return null;
  }

  /* ───────────────────────── the ways ───────────────────────── */

  /** ⭐ Where a sea way leads now. */
  public async destinationFor(exit: SeaPatchExit): Promise<Stuff & Container> {
    if (exit.getWay() === 'side') {
      const ship = await this.shipOf(exit.getSource() as unknown as Stuff);
      if (ship === null || !this.stopped(ship)) throw new Error('She is under way; there is no water beside her to go into.');
      return (await this.patchAlongside(ship)) as unknown as Stuff & Container;
    }
    if (exit.getWay() === 'wreck') {
      const wreck = await this.shipByHandle(exit.getTarget());
      const deck = wreck !== null ? await wreck.watchRoom() : null;
      if (deck === null) throw new Error('There is nothing there now but the bottom.');
      return deck;
    }
    const ship = await this.shipByHandle(exit.getTarget());
    if (ship === null || !this.stopped(ship) || !this.within(ship, exit.getSource() as unknown as SeaPatch)) {
      throw new Error('She has sailed.');
    }
    const deck = await ship.watchRoom();
    if (deck === null) throw new Error('She has sailed.');
    return deck;
  }

  /** ⭐ Whether a sea way may be taken now, in words; `null` when it may. */
  public async refusalFor(exit: SeaPatchExit): Promise<string | null> {
    if (exit.getWay() === 'side') {
      const ship = await this.shipOf(exit.getSource() as unknown as Stuff);
      if (ship === null || ship.getExpansePosition() === null) return 'There is no sea under her.';
      if (!this.stopped(ship)) return 'She is under way. Over the side now, and she would be gone before you came up.';
      return null;
    }
    if (exit.getWay() === 'wreck') {
      return (await this.shipByHandle(exit.getTarget())) === null ? 'There is nothing there now but the bottom.' : null;
    }
    const ship = await this.shipByHandle(exit.getTarget());
    if (ship === null || !this.stopped(ship) || !this.within(ship, exit.getSource() as unknown as SeaPatch)) {
      return 'She has sailed; there is only the sea where she was.';
    }
    return null;
  }

  /* ───────────────────────── patches ───────────────────────── */

  /**
   * The water beside a stopped ship: the patch within hail of her, minted if this is
   * the first time anybody has gone into it, with a way up onto her deck.
   */
  public async patchAlongside(ship: ShipShape): Promise<SeaPatch> {
    // ⭐ Over a wreck, the water beside her IS the stop over it:
    // a diver puts in from a ship that comes to the spot.
    const stop = [...this._stops.values()].find((r) => !r.isDestroyed() && this.within(ship, r as unknown as SeaPatch)) ?? null;
    if (stop !== null) {
      await this.wireDeck(stop as unknown as SeaPatch, ship);
      return stop as unknown as SeaPatch;
    }
    let patch = [...this._patches].find((r) => !r.isDestroyed() && this.within(ship, r)) ?? null;
    if (patch === null) patch = await this.mintPatch(ship);
    await this.wireDeck(patch, ship);
    return patch;
  }

  /* ───────────────────────── stops ───────────────────────── */

  /**
   * ⭐ A ship has gone down where she lies (`Frame.stopOver`): the sea keeps a
   * surface over her — the stop at her position, found or made — and the
   * ways into and out of her are wired. `null` when she is on no chart.
   */
  public async stopOver(ship: ShipShape): Promise<SeaStop | null> {
    const pos = ship.getExpansePosition();
    const sea = ship.getExpanse();
    if (pos === null || !sea) return null;
    const stop = await this.stopAt(sea, pos);
    await stop.markWreck(ship as unknown as Parameters<SeaStop['markWreck']>[0]);
    return stop;
  }

  /** The stop at a chart position, found or made — the way it comes back after a restart, too. */
  public async stopAt(sea: string, pos: GeoPosition): Promise<SeaStop> {
    const key = stopKey(sea, pos);
    const live = this._stops.get(key);
    if (live && !live.isDestroyed()) return live;
    return this.serial(async () => {
      const again = this._stops.get(key);
      if (again && !again.isDestroyed()) return again;
      const stood = (await PersistableApi.standUpKeyed(STOP_ROW, key)) as unknown as SeaStop | null;
      if (stood === null) throw new Error(`SeaWarren: the stop ${key} could not be stood up`);
      if (stood.getExpansePosition() === null) {
        stood.setExpanse(sea);
        stood.setExpansePosition(pos);
      }
      if (stood.getWater() === null) {
        const water = await StuffApi.singleton<WaterExpanse>(sea).catch(() => null);
        const depth = water ? await water.depthAt(pos).catch(() => 20) : 20;
        stood.setWater({ of: sea, depthM: Math.round(depth * 10) / 10 });
      }
      await this.adoptStop(stood, key);
      return stood;
    });
  }

  /** ⭐ A stop standing up — fresh, or back from its record: its zone, membership, the warren's note of it. */
  public async adoptStop(stop: SeaStop, keyGiven?: string): Promise<void> {
    const pos = stop.getExpansePosition();
    const key = keyGiven ?? stop.getPersistenceKey() ?? (pos !== null ? stopKey(stop.getExpanse() ?? '', pos) : '');
    if (key === '' || this._stops.get(key) === stop) return;
    this._stops.set(key, stop);
    if (!this.hasMember(stop as unknown as MemberStuff)) this.addMember(stop as unknown as MemberStuff);
    const zoneId = `${STOP_ZONE}/${key.replace(/[^A-Za-z0-9.@-]+/g, '-')}`;
    const z = stop.getZone();
    if (z === null || (z.getIdentityPath() ?? z.getTemplatePath()) !== zoneId) {
      // identity-keyed-by: lookup — the stop's getZone() resolves to this
      // instance; nothing persists under it (a zone is minted with its stop).
      const zone = await StuffApi.clone<SeaZone>(STOP_ZONE, undefined, { asIdentityPath: zoneId });
      zone.adopt(stop as never);
    }
  }

  private async mintPatch(ship: ShipShape): Promise<SeaPatch> {
    const patch = await this.serial(async () => (await this.createMemberSerialized()) as unknown as SeaPatch);
    const pos = ship.getExpansePosition()!;
    patch.setExpanse(ship.getExpanse());
    patch.setExpansePosition(pos);
    this.addMember(patch as unknown as MemberStuff);
    this._serial += 1;
    // identity-keyed-by: lookup — the patch's getZone() resolves to this
    // instance; nothing persists under it (a zone is minted with its patch).
    const zone = await StuffApi.clone<SeaZone>(PATCH_ZONE, undefined, { asIdentityPath: `${PATCH_ZONE}/${this._serial}` });
    zone.adopt(patch as never);
    const sea = ship.getExpanse() ? await StuffApi.singleton<WaterExpanse>(ship.getExpanse()!).catch(() => null) : null;
    const depth = sea ? await sea.depthAt(pos).catch(() => 20) : 20;
    patch.setWater({ of: ship.getExpanse()!, depthM: Math.round(depth * 10) / 10 });
    this._patches.add(patch);
    return patch;
  }

  /** A way up onto her deck, named for her, if the patch has none yet. */
  private async wireDeck(patch: SeaPatch, ship: ShipShape): Promise<void> {
    const deck = ship.getEntrance();
    // ⭐ The way names HER — her durable handle, never her deck's
    // row, which every ship of a kind shares; the row is only its face.
    const handle = ship.getDurableHandle() ?? ship.getTemplatePath() ?? '';
    if (!deck || !handle || !MixinApi.isExitable(patch)) return;
    const name = ship.getName().replace(/^the\s+/i, '').trim().toLowerCase() || 'ship';
    const ex = patch as unknown as Stuff & Container & Exitable;
    if (ex.getExit(name)) return;
    await ex.installExit<SeaPatchExit>(
      EXIT_KIND,
      { direction: name, source: ex, destinationPath: deck, media: ['water', 'vertical'] },
      (e) => e.configureSea('deck', handle),
    );
  }

  private reap(m: MemberStuff): void {
    if (m.isDestroyed()) return;
    for (const r of this._patches) if ((r as unknown) === (m as unknown)) this._patches.delete(r);
    const zone = m.getZone() as unknown as (Stuff & { removeLocation(p: unknown): boolean }) | null;
    this.removeMember(m);
    if (zone !== null && MixinApi.isMovingZone(zone as unknown as Stuff)) zone.removeLocation(m);
    StuffApi.destruct(m as unknown as Stuff);
    // ⭐ The zone goes with its place (D38): minted with it, reaped with it —
    // not left for eviction (the drive's world ran out of memory).
    if (zone !== null && MixinApi.isMovingZone(zone as unknown as Stuff) && !(zone as unknown as Stuff).isDestroyed()) {
      StuffApi.destruct(zone as unknown as Stuff);
    }
  }

  /* ───────────────────────── reads ───────────────────────── */

  /** The ship a deck (or any of her places) belongs to — her warren's answer for a keyed room. */
  private async shipOf(place: Stuff): Promise<ShipShape | null> {
    // The place is asked: a keyed room's ship is its warren's.
    const s = place.isPlace() ? await (place as unknown as Place).structure().catch(() => null) : null;
    if (!s || !MixinApi.isVoyaging(s) || !MixinApi.isPositioned(s)) return null;
    return s;
  }

  /** The ship a way up names by her handle, standing (stood up if she sleeps). */
  private async shipByHandle(handle: string): Promise<ShipShape | null> {
    const s = handle ? await ExpanseApi.standUpCraft(handle) : null;
    return s !== null && s instanceof Structure ? (s as unknown as ShipShape) : null;
  }

  /** Stopped at sea: on the chart, no course set. */
  private stopped(ship: ShipShape): boolean {
    return ship.getCourse() === null && ship.getExpansePosition() !== null;
  }

  private hailM(): number {
    try {
      const n = Number.parseFloat(AppApi.setting('expanse.hailRangeM') ?? '');
      return Number.isFinite(n) && n > 0 ? n : HAIL_M;
    } catch {
      return HAIL_M;
    }
  }

  /** ⭐ A ship lies beside a patch when she is on its sea within hail of it. */
  private within(ship: ShipShape, patch: SeaPatch): boolean {
    const at = ship.getExpansePosition();
    const here = patch.getExpansePosition();
    if (at === null || here === null || ship.getExpanse() !== patch.getExpanse()) return false;
    return at.distanceNm(here) * NM_M <= this.hailM();
  }

  /** One mint at a time. */
  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this._mintChain.then(run, run);
    this._mintChain = next.then(() => undefined, () => undefined);
    return next;
  }
}

/** A stop's key: its sea and its position, to a few meters. */
function stopKey(sea: string, pos: GeoPosition): string {
  return `${sea}@${pos.latDeg.toFixed(4)}@${pos.lonDeg.toFixed(4)}`;
}
