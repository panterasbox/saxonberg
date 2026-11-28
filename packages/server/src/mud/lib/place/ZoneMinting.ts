/**
 * ZoneMintingMixin — ⭐ **this warren makes copies of a zone: it names
 * each, stands it up and puts it to sleep, and records it**
 * (zone-instancing D1, D3).
 *
 * A warren that copies a plan — a holding's programme, a ship kind, a
 * moving water's patches — copies a ZONE as well as its rooms. Each copy
 * is one instance of the plan's zone row (a {@link MintedZone}), minted
 * under an identity this warren derives from its own key:
 *
 *  - `zoneNaming: key` — the copy IS the key (a path in the world: a
 *    holding's parcel extent), so it inherits from the lot it stands on;
 *  - `zoneNaming: under-row` — the copy is `<zone row>/<key>` (a ship's
 *    serial, a patch's `<course>/<n>`), so it inherits its kind's chain.
 *
 * `joins` says where a copy is joined to the world, and selects checked
 * behavior: `parcel` (a parcel must cover the identity; the copy is
 * indexed), `berth` (no parcel, indexed; the way in comes and goes),
 * `frame` (the zone must be a moving zone; never indexed, never kept).
 *
 * The zone row says who mints it (`mintedBy`), and the mint asserts it, so
 * the declaration is load-bearing at run time. A copy's zone persists
 * nothing: its identity is re-derived from the warren's own key at every
 * wake (D8). Wiring the way in stays where it is — the institution, the
 * berth, the water warren; this capability adds the declaration and the
 * naming, not a second way to hang a door.
 *
 * Composed by exactly the warrens that mint zones (`HoldingWarren`,
 * `ShipWarren`, `ReachWarren`, `SeaWarren`) — not by `Warren` or
 * `FloorplanWarren`, whose other composers (a mine, a corridor, the
 * lounge) mint no zone.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type MintedZone from '../../platform/idea/place/MintedZone';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { ParcelApi } from '../../api/parcel';
import { Template } from '../stuff/Template';
import { NavigationApi } from '../../api/navigation';
import { DiagnosticApi } from '../../api/diagnostics';
import type { CopyRoom } from './PlaceNode';

/** The class every copied zone row's class is (or extends). */
const MINTED_ZONE_CLASS = '/platform/idea/place/MintedZone';

/** How a warren names its copies (D1). Closed; read by `lint:locations`. */
export const ZONE_NAMINGS = ['key', 'under-row'] as const;
export type ZoneNaming = (typeof ZONE_NAMINGS)[number];

/** Where a copy joins the world (D1). Closed; read by `lint:locations`. */
export const COPY_JOINS = ['parcel', 'berth', 'frame'] as const;
export type CopyJoin = (typeof COPY_JOINS)[number];

export interface ZoneMinting {
  getZoneNaming(): ZoneNaming | '';
  getJoins(): CopyJoin | '';
  /** The naming rule, in one place. Throws on a key the scheme cannot name. */
  copyIdentity(zoneRow: string, key: string): string;
  /** The copy's zone, standing: the live one, or minted from its row. Idempotent. */
  wakeCopyZone(zoneRow: string, key: string): Promise<MintedZone>;
  /** The copy sleeps: its zone instance goes (it keeps nothing). */
  sleepCopyZone(zone: MintedZone): void;
  /** Throw unless every room stands in `zone` — a room stamped elsewhere missed its copy. */
  checkCopyRooms(zone: MintedZone, rooms: readonly Stuff[]): void;
  /** Record the standing copy's rooms in the index (a no-op when `joins` is `frame`). */
  recordCopy(zone: MintedZone, rooms: readonly CopyRoom[]): Promise<void>;
  /** The copy is gone for good: sleep it and retire it from the index. */
  destroyCopy(zoneRow: string, key: string): Promise<void>;
}

/** What the capability composes over: a warren, which tears its rooms down. */
type WarrenHost = Stuff & { teardown(): void };

export function ZoneMintingMixin<TBase extends MixinConstructor<WarrenHost>>(Base: TBase) {
  return class ZoneMintingMixin extends Base implements ZoneMinting {
    static _mixinName: string = 'ZoneMintingMixin';

    static fieldMeta: FieldMeta = {
      zoneNaming: { persistent: true, authorable: true },
      joins: { persistent: true, authorable: true },
      _copyZones: { ref: 'instance', lifetime: 'weak' },
    };

    /** How this warren names its copies — authored on its row. */
    public zoneNaming: ZoneNaming | '' = '';

    /** Where its copies join the world — authored on its row. */
    public joins: CopyJoin | '' = '';

    /** The copies standing, by identity (runtime; put to sleep by this warren). */
    private _copyZones: Map<string, MintedZone> = new Map();

    /** Mints in flight, by identity — two wakes of one copy share one zone. */
    private _pendingCopies: Map<string, Promise<MintedZone>> = new Map();

    public getZoneNaming(): ZoneNaming | '' {
      return this.zoneNaming;
    }

    public setZoneNaming(value: string | null): void {
      if (value === null || value === undefined || value === '') {
        this.zoneNaming = '';
        return;
      }
      if (!(ZONE_NAMINGS as readonly string[]).includes(value)) {
        throw new Error(
          `${this.constructor.name}: zoneNaming '${value}' is not one of ${ZONE_NAMINGS.join(', ')}`,
        );
      }
      this.zoneNaming = value as ZoneNaming;
    }

    public getJoins(): CopyJoin | '' {
      return this.joins;
    }

    public setJoins(value: string | null): void {
      if (value === null || value === undefined || value === '') {
        this.joins = '';
        return;
      }
      if (!(COPY_JOINS as readonly string[]).includes(value)) {
        throw new Error(
          `${this.constructor.name}: joins '${value}' is not one of ${COPY_JOINS.join(', ')}`,
        );
      }
      this.joins = value as CopyJoin;
    }

    /** Who this warren is, as a zone row's `mintedBy` names it. */
    private minterPath(): string {
      return (this as unknown as Stuff).getTemplatePath() ?? this.constructor.name;
    }

    public copyIdentity(zoneRow: string, key: string): string {
      const row = zoneRow.replace(/\/+$/, '');
      switch (this.zoneNaming) {
        case 'key': {
          const k = key.replace(/\/+$/, '');
          if (!k.startsWith('/') || k === row || k.startsWith(`${row}/`)) {
            throw new Error(
              `${this.constructor.name} '${this.minterPath()}': a copy named by its key needs a path ` +
                `outside its zone row '${row}', got '${key}'`,
            );
          }
          return k;
        }
        case 'under-row': {
          const k = key.replace(/^\/+|\/+$/g, '');
          if (k === '') {
            throw new Error(
              `${this.constructor.name} '${this.minterPath()}': a copy named under its row needs a key`,
            );
          }
          return `${row}/${k}`;
        }
        default:
          throw new Error(
            `${this.constructor.name} '${this.minterPath()}' mints zones and authors no zoneNaming ` +
              `(one of ${ZONE_NAMINGS.join(', ')})`,
          );
      }
    }

    public async wakeCopyZone(zoneRow: string, key: string): Promise<MintedZone> {
      const identity = this.copyIdentity(zoneRow, key);
      const held = this._copyZones.get(identity);
      if (held !== undefined && !held.isDestroyed()) return held;
      const pending = this._pendingCopies.get(identity);
      if (pending !== undefined) return pending;
      const p = this.mintCopyZone(zoneRow.replace(/\/+$/, ''), identity).finally(() => {
        this._pendingCopies.delete(identity);
      });
      this._pendingCopies.set(identity, p);
      return p;
    }

    private async mintCopyZone(zoneRow: string, identity: string): Promise<MintedZone> {
      // ⚠ Through the class loader, never a static import: the row's class
      // is loaded by path, and a module reached by a package specifier is a
      // different instance than the one the loader serves (and HMR swaps).
      const MintedZoneClass = (await StuffApi.loadClassByPath(MINTED_ZONE_CLASS)) as typeof MintedZone;
      const who = `${this.constructor.name} '${this.minterPath()}'`;
      // A copy left standing by an earlier body of this warren is taken
      // back, never minted twice.
      for (const s of StuffApi.findByIdentityPath<Stuff>(identity)) {
        if (s instanceof MintedZoneClass && !s.isDestroyed() && s.isCopy()) {
          this._copyZones.set(identity, s);
          return s;
        }
      }
      const row = await Template.findByPath(zoneRow);
      if (!row) throw new Error(`${who}: its zone row '${zoneRow}' does not exist`);
      const cls = await StuffApi.loadClassByPath(row.class);
      if (
        typeof cls !== 'function' ||
        (cls !== MintedZoneClass &&
          !((cls as { prototype?: unknown }).prototype instanceof MintedZoneClass))
      ) {
        throw new Error(
          `${who}: zone row '${zoneRow}' is ${row.class}, not a MintedZone — ` +
            `a zone a warren copies says so (class MintedZone, mintedBy)`,
        );
      }
      const mintedBy = (row.data as Record<string, unknown> | undefined)?.mintedBy;
      if (mintedBy !== this.minterPath()) {
        throw new Error(
          `${who}: zone row '${zoneRow}' is copied by '${String(mintedBy ?? '(undeclared)')}', ` +
            `not by this warren`,
        );
      }
      if ((await Template.findByPath(identity)) !== null) {
        throw new Error(`${who}: copy '${identity}' would shadow the row of that name`);
      }
      if (this.joins === '') {
        throw new Error(`${who} mints zones and authors no joins (one of ${COPY_JOINS.join(', ')})`);
      }
      if (this.joins === 'parcel' && (await ParcelApi.coveringParcelOf(identity)) === null) {
        throw new Error(`${who}: copy '${identity}' joins by parcel and no parcel covers it`);
      }
      if (this.joins === 'frame' && !MixinApi.hasMixin(cls as never, Mixins.MovingZone)) {
        throw new Error(`${who}: copy '${identity}' joins a frame and '${zoneRow}' is not a moving zone`);
      }
      // identity-keyed-by: referenced — a copy's rooms, the location-graph
      // copy nodes and players' map claims name it; it is re-derived from
      // the warren's own key at every wake.
      const zone = await StuffApi.clone<MintedZone>(zoneRow, undefined, { asIdentityPath: identity });
      this._copyZones.set(identity, zone);
      return zone;
    }

    public sleepCopyZone(zone: MintedZone): void {
      const identity = zone.getIdentityPath();
      if (identity !== null && this._copyZones.get(identity) === zone) this._copyZones.delete(identity);
      if (!zone.isDestroyed()) StuffApi.destruct(zone);
    }

    public checkCopyRooms(zone: MintedZone, rooms: readonly Stuff[]): void {
      for (const room of rooms) {
        if (room.isDestroyed()) continue;
        if (room.getZone() !== (zone as unknown as ReturnType<Stuff['getZone']>)) {
          const at = room.getZone()?.getIdentityPath() ?? '(none)';
          throw new Error(
            `${this.constructor.name} '${this.minterPath()}': room ` +
              `'${room.getIdentityPath() ?? room.getTemplatePath()}' stands in zone '${at}', ` +
              `not in its copy '${zone.getIdentityPath()}'`,
          );
        }
      }
    }

    public async recordCopy(zone: MintedZone, rooms: readonly CopyRoom[]): Promise<void> {
      // A frame copy (a patch on moving water) is never recorded: the map
      // records the water it moves on, never the patch (D7, D13).
      if (this.joins === 'frame') return;
      const identity = zone.getIdentityPath();
      if (identity === null) return;
      try {
        await NavigationApi.recordCopy(identity, rooms);
      } catch (err) {
        // The index is derived bookkeeping: a failed write never fails the
        // wake. It is recorded where an author looks, and the next wake
        // writes it again.
        void DiagnosticApi.record({
          path: this.minterPath(),
          severity: 'warning',
          message: `copy '${identity}' could not be recorded in the location graph (${String(err)})`,
          channel: 'location-graph',
        });
      }
    }

    public async destroyCopy(zoneRow: string, key: string): Promise<void> {
      const identity = this.copyIdentity(zoneRow, key);
      const held = this._copyZones.get(identity);
      if (held !== undefined) this.sleepCopyZone(held);
      if (this.joins === 'frame') return;
      await NavigationApi.retireCopy(identity);
    }

    /** The copies sleep with their rooms: rooms first (the base), then each zone. */
    public teardown(): void {
      super.teardown();
      const zones = [...this._copyZones.values()];
      this._copyZones.clear();
      for (const zone of zones) {
        if (zone.isDestroyed()) continue;
        try {
          StuffApi.destruct(zone);
        } catch (err) {
          console.error(
            `${this.constructor.name}: copy zone '${zone.getIdentityPath()}' did not sleep`,
            err,
          );
        }
      }
    }
  };
}
