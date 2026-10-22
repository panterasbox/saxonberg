/**
 * SeaWarren — ⭐⭐ **the water beside a ship that has stopped at sea**
 * (river D30): the sea brought into line with the river.
 *
 * ONE singleton for the realm. Its members are sea rooms, budded only
 * where a ship has stopped — keyed by the hail cell she lies in, so ships
 * stopped within hail of one another share one — and reaped when nothing
 * is left in them. Each room has its own zone (D38), minted and reaped
 * with it.
 *
 * It answers the same questions of a sea that the river's warren answers
 * of a river, by the same shape:
 *
 * - **where a boat goes in** (`launchPlaceFor` a ship's deck): the water
 *   beside her;
 * - **where it comes out** (`recoverPlaceFor` a sea room): the deck of a
 *   ship still lying there;
 * - **where a way leads, and whether it may be taken**: over her side (not
 *   while she is under way — swimmers at sea exist only where a ship has
 *   stopped), up onto her deck (not once she has sailed).
 *
 * ⚠ The rooms do not drift: a ship stopped holds where she is (her course
 * is null and her position is her fix), and so does her water. A ship
 * hove-to drifting with the set, and her water with her, is the ships
 * slate's (recorded in the plan).
 */

import { RoomWarren } from '@saxonberg/server/mud/lib/location/RoomWarren';
import type { Attachment } from '@saxonberg/server/mud/lib/location/Warren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { Stuff, EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { GeoPosition } from '@saxonberg/server/mud/lib/expanse/GeoPosition';
import type SeaRoom from '../location/SeaRoom';
import type SeaZone from '../location/SeaZone';
import type SeaRoomExit from './exits/SeaRoomExit';
import type WaterExpanse from './WaterExpanse';

type MemberStuff = Stuff & Container;

const ROOM_ROW = '/system/water/location/sea/room/water';
const ROOM_ZONE = '/system/water/location/sea/room';
const EXIT_KIND = '/system/water/idea/exits/sea-room';
/** How far you can call to somebody in the water, m (`expanse.hailRangeM`). */
const HAIL_M = 100;
/** One degree of latitude, m. */
const DEG_M = 111_320;

/** A ship as the sea's warren asks of her, by shape. */
interface ShipShape {
  getTemplatePath(): string | null;
  getEntrance(): string | null;
  getName?(): string;
  getCourse(): unknown;
  getExpanse(): string | null;
  getExpansePosition(): GeoPosition | null;
}

export default class SeaWarren extends SingletonMixin(RoomWarren) {
  /** Hail cell key → its room. Runtime: a sea room is never persisted. */
  private _rooms = new Map<string, SeaRoom>();
  private _serial = 0;
  private _mintChain: Promise<unknown> = Promise.resolve();

  /* ───────────────────────── Warren policy ───────────────────────── */

  public override laysOutOwnFrame(): boolean {
    return true;
  }

  protected occupantsOf(m: MemberStuff): (Stuff & Container)[] {
    return m.getContents().filter((c) => MixinApi.isTangible(c)) as unknown as (Stuff & Container)[];
  }

  protected async createMember(): Promise<MemberStuff> {
    return StuffApi.clone<MemberStuff>(ROOM_ROW);
  }

  public async admitArrival(): Promise<void> {
    /* no-op — the way in is a ship's side. */
  }

  protected attachmentFor(): Attachment {
    return { direction: 'down' };
  }

  protected override async wireHubExit(_room: MemberStuff): Promise<void> {
    /* the sea wires its own ways — see `roomAlongside` */
  }

  protected async wireHostFixtures(): Promise<void> { /* no host */ }
  protected async unwireHostFixtures(): Promise<void> { /* no host */ }

  public override canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** An empty room is reaped, its zone with it. */
  protected async reconcile(): Promise<void> {
    for (const m of this.getMembers()) {
      if (this.occupantsOf(m).length > 0) continue;
      this.reap(m);
    }
  }

  /* ───────────────────────── boats ───────────────────────── */

  /** ⭐ Where a boat goes in off a ship's deck (D30): the water beside her. */
  public async launchPlaceFor(from: Stuff): Promise<(Stuff & Container) | null> {
    const ship = await this.shipOf(from);
    if (ship === null || !this.stopped(ship)) return null;
    return (await this.roomAlongside(ship)) as unknown as Stuff & Container;
  }

  /** ⭐ Where a boat in the water comes out (D30): onto the deck of a ship lying here. */
  public async recoverPlaceFor(from: Stuff): Promise<(Stuff & Container) | null> {
    const room = [...this._rooms.values()].find((r) => (r as unknown) === (from as unknown)) ?? null;
    if (room === null || !MixinApi.isExitable(room)) return null;
    for (const exit of (room as unknown as Exitable).getExits()) {
      const way = exit as unknown as Partial<SeaRoomExit>;
      if (way.getWay?.() !== 'deck') continue;
      if ((await this.refusalFor(exit as unknown as SeaRoomExit)) !== null) continue;
      return StuffApi.singleton<Stuff & Container>(way.getTarget!()).catch(() => null);
    }
    return null;
  }

  /* ───────────────────────── the ways ───────────────────────── */

  /** ⭐ Where a sea way leads now. */
  public async destinationFor(exit: SeaRoomExit): Promise<Stuff & Container> {
    if (exit.getWay() === 'side') {
      const ship = await this.shipOf(exit.getSource() as unknown as Stuff);
      if (ship === null || !this.stopped(ship)) throw new Error('She is under way; there is no water beside her to go into.');
      return (await this.roomAlongside(ship)) as unknown as Stuff & Container;
    }
    const deck = exit.getTarget();
    const ship = await this.shipOf(await StuffApi.singleton<Stuff>(deck));
    if (ship === null || !this.stopped(ship) || this.cellOf(ship) !== this.keyOf(exit.getSource() as unknown as Stuff)) {
      throw new Error('She has sailed.');
    }
    return StuffApi.singleton<Stuff & Container>(deck);
  }

  /** ⭐ Whether a sea way may be taken now, in words; `null` when it may. */
  public async refusalFor(exit: SeaRoomExit): Promise<string | null> {
    if (exit.getWay() === 'side') {
      const ship = await this.shipOf(exit.getSource() as unknown as Stuff);
      if (ship === null || ship.getExpansePosition() === null) return 'There is no sea under her.';
      if (!this.stopped(ship)) return 'She is under way. Over the side now, and she would be gone before you came up.';
      return null;
    }
    const deck = await StuffApi.singleton<Stuff>(exit.getTarget()).catch(() => null);
    const ship = deck ? await this.shipOf(deck) : null;
    if (ship === null || !this.stopped(ship) || this.cellOf(ship) !== this.keyOf(exit.getSource() as unknown as Stuff)) {
      return 'She has sailed; there is only the sea where she was.';
    }
    return null;
  }

  /* ───────────────────────── rooms ───────────────────────── */

  /**
   * The water beside a stopped ship: her cell's room, minted if this is
   * the first time anybody has gone into it, with a way up onto her deck.
   */
  public async roomAlongside(ship: ShipShape): Promise<SeaRoom> {
    const key = this.cellOf(ship);
    let room = this._rooms.get(key) ?? null;
    if (room === null || room.isDestroyed()) room = await this.mintRoom(ship, key);
    await this.wireDeck(room, ship);
    return room;
  }

  private async mintRoom(ship: ShipShape, key: string): Promise<SeaRoom> {
    const room = await this.serial(async () => (await this.createMemberSerialized()) as unknown as SeaRoom);
    const pos = ship.getExpansePosition()!;
    room.setExpanse(ship.getExpanse());
    room.setExpansePosition(pos);
    this.addMember(room as unknown as MemberStuff);
    this._serial += 1;
    // identity-keyed-by: lookup — the room's getZone() resolves to this
    // instance; nothing persists under it (a zone is minted with its room).
    const zone = await StuffApi.clone<SeaZone>(ROOM_ZONE, undefined, { asIdentityPath: `${ROOM_ZONE}/${this._serial}` });
    zone.adopt(room as never);
    const sea = ship.getExpanse() ? await StuffApi.singleton<WaterExpanse>(ship.getExpanse()!).catch(() => null) : null;
    const depth = sea ? await sea.depthAt(pos).catch(() => 20) : 20;
    room.setWater({ of: ship.getExpanse()!, depthM: Math.round(depth * 10) / 10 });
    this._rooms.set(key, room);
    return room;
  }

  /** A way up onto her deck, named for her, if the room has none yet. */
  private async wireDeck(room: SeaRoom, ship: ShipShape): Promise<void> {
    const deck = ship.getEntrance();
    if (!deck || !MixinApi.isExitable(room)) return;
    const name = (ship.getName?.() ?? '').replace(/^the\s+/i, '').trim().toLowerCase() || 'ship';
    const ex = room as unknown as Stuff & Container & Exitable;
    if (ex.getExit(name)) return;
    await ex.installExit<SeaRoomExit>(
      EXIT_KIND,
      { direction: name, source: ex, destinationPath: deck, media: ['water', 'vertical'] },
      (e) => e.configureSea('deck', deck),
    );
  }

  private reap(m: MemberStuff): void {
    if (m.isDestroyed()) return;
    for (const [k, r] of this._rooms) if ((r as unknown) === (m as unknown)) this._rooms.delete(k);
    const zone = m.getZone() as unknown as (Stuff & { removeLocation(p: unknown): boolean }) | null;
    this.removeMember(m);
    if (zone !== null && MixinApi.isMovingZone(zone as unknown as Stuff)) zone.removeLocation(m);
    StuffApi.destruct(m as unknown as Stuff);
  }

  /* ───────────────────────── reads ───────────────────────── */

  /** The ship a deck (or any of her rooms) belongs to, by shape. */
  private async shipOf(place: Stuff): Promise<ShipShape | null> {
    const path = place.getTemplatePath();
    const s = path ? await NavigationApi.structureAt(path).catch(() => null) : null;
    if (!s || !MixinApi.isVoyaging(s) || !MixinApi.isPositioned(s)) return null;
    return s as unknown as ShipShape;
  }

  /** Stopped at sea: on the chart, no course set. */
  private stopped(ship: ShipShape): boolean {
    return ship.getCourse() === null && ship.getExpansePosition() !== null;
  }

  private hailM(): number {
    const n = Number.parseFloat(AppApi.setting('expanse.hailRangeM') ?? '');
    return Number.isFinite(n) && n > 0 ? n : HAIL_M;
  }

  /** ⭐ The hail cell a position falls in — ships within it share their water. */
  private cellAt(expanse: string, pos: GeoPosition): string {
    const dLat = this.hailM() / DEG_M;
    const dLon = dLat / Math.max(0.1, Math.cos((pos.latDeg * Math.PI) / 180));
    return `${expanse}@${Math.round(pos.latDeg / dLat)}@${Math.round(pos.lonDeg / dLon)}`;
  }

  private cellOf(ship: ShipShape): string {
    const pos = ship.getExpansePosition();
    return pos ? this.cellAt(ship.getExpanse() ?? '', pos) : '';
  }

  private keyOf(room: Stuff): string {
    for (const [k, r] of this._rooms) if ((r as unknown) === (room as unknown)) return k;
    return '';
  }

  /** One mint at a time. */
  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this._mintChain.then(run, run);
    this._mintChain = next.then(() => undefined, () => undefined);
    return next;
  }
}
