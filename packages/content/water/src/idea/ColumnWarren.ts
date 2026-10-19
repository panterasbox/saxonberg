/**
 * ColumnWarren — ⭐⭐ **the water under every deep water** (underwater D5,
 * D7).
 *
 * ONE singleton for the realm: any water place deeper than you can stand
 * in has a column, and the column needs no per-venue policy — the band
 * rows are the system's, so a second water needs zero rows. Members are
 * the bands, keyed `<surface>#<band>` and budded on first traversal (the
 * `MineWarren` carve shape: a keyed, serialized clone, restored or seeded
 * from its snapshot, wired as it buds).
 *
 *  - **Wiring.** Every band gets `up` (to the band above, or the surface)
 *    and `down` (to the band below, when there is one) as lazy
 *    `ColumnExit`s; the surface gets its `down` from
 *    {@link ColumnWarren.ensureColumnExits}. Nothing wires a live ref
 *    between bands: each room's ways fault their far side in.
 *  - **Neighbours.** A surface row may author rooms beside one band
 *    (`column: { neighbours: … }`) — the bespoke case is authored rooms
 *    beside the column. They are wired both ways when the band buds.
 *  - **Keeping.** A band is captured to its snapshot when it empties of
 *    people, so what sank to the bed is there after a restart. A band is
 *    reaped only when its surface no longer has it (the water went down).
 *
 * ⚠ Sideways between two neighbouring waters' columns is the river's
 * (`river-slate`): nothing that ships has two water places side by side.
 */

import { InnerWarren } from '@saxonberg/server/mud/lib/location/InnerWarren';
import type { Attachment } from '@saxonberg/server/mud/lib/location/Warren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { WaterColumnMixin, type ColumnBand } from '@saxonberg/server/mud/lib/location/WaterColumn';
import type { WaterPlace } from '@saxonberg/server/mud/lib/location/WaterPlace';
import type { Shore } from '@saxonberg/server/mud/lib/location/Shore';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type Band from '../location/Band';
import type ColumnExit from './exits/ColumnExit';
import type { ColumnTarget } from './exits/ColumnExit';

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;
type SurfaceStuff = Stuff & Container & WaterPlace & Shore;

/** The band rows — the system's, never a venue's. */
const BAND_ROW = '/system/water/location/band/';

/** The exit kind a band's way to an authored room beside it is cloned from. */
const UNDERWATER_EXIT_KIND = '/system/water/idea/exits/underwater';

/** The exit kind a column's ways are cloned from. */
const COLUMN_EXIT_KIND = '/system/water/idea/exits/column';

const ColumnWarrenBase = WaterColumnMixin(SingletonMixin(PersistableMixin(InnerWarren)));

export default class ColumnWarren extends ColumnWarrenBase {
  /** Where the singleton lives (`TemplatePaths.waterColumn`). */
  static readonly PATH = '/system/water/idea/ColumnWarren';

  /** Which band row the NEXT `createMember()` clones (set inside the chain). */
  private _budBand: ColumnBand = 'lit';

  /** The subclass's own serialization chain (the MineWarren carve shape). */
  private _budChain: Promise<unknown> = Promise.resolve();

  /** key → the live band. Runtime only: a band is restored from its snapshot. */
  private _bands = new Map<string, Band>();

  /** The member key of one band of one surface. */
  public keyOf(surfacePath: string, band: ColumnBand): string {
    return `${surfacePath}#${band}`;
  }

  /** The live band, when it has been budded and not reaped. */
  public bandAt(surfacePath: string, band: ColumnBand): Band | null {
    const live = this._bands.get(this.keyOf(surfacePath, band)) ?? null;
    return live !== null && !live.isDestroyed() ? live : null;
  }

  /* ─────────────────────────── the seam ─────────────────────────── */

  public async ensureColumnExits(surface: Stuff & Container): Promise<void> {
    if (!MixinApi.isWaterPlace(surface) || !MixinApi.isExitable(surface)) return;
    const bands = surface.bandsNow();
    const first = bands[0];
    if (first === undefined || surface.getExit('down')) return;
    await this.installColumnExit(surface, 'down', pathOf(surface), first);
  }

  public async bandOf(
    surface: Stuff & Container,
    band: ColumnBand,
  ): Promise<(Stuff & Container) | null> {
    if (!MixinApi.isWaterPlace(surface)) return null;
    if (!surface.bandsNow().includes(band)) return null;
    const live = this.bandAt(pathOf(surface), band);
    if (live !== null) return live as unknown as MemberStuff;
    const run = this._budChain.then(
      () => this._budOne(surface as SurfaceStuff, band),
      () => this._budOne(surface as SurfaceStuff, band),
    );
    this._budChain = run.then(() => undefined, () => undefined);
    return run;
  }

  /* ─────────────────────────── budding ─────────────────────────── */

  private async _budOne(surface: SurfaceStuff, band: ColumnBand): Promise<MemberStuff> {
    const surfacePath = pathOf(surface);
    const existing = this.bandAt(surfacePath, band);
    if (existing !== null) return existing as unknown as MemberStuff;
    const key = this.keyOf(surfacePath, band);
    this._budBand = band;
    const room = (await this.createMemberSerialized()) as unknown as Band & MemberStuff;
    room.attachTo(surface, band);
    this.addMember(room);
    const bands = surface.bandsNow();
    const index = Math.max(0, bands.indexOf(band));
    const c = (surface as unknown as { getCoordinates?(): [number, number, number] }).getCoordinates?.();
    if (c) {
      (room as unknown as { setCoordinates(v: [number, number, number]): void })
        .setCoordinates([c[0], c[1], c[2] - (index + 1)]);
    }
    await PersistableApi.restoreOrSeed(room, key);
    this._bands.set(key, room);
    await this.wire(room, surface, bands, index);
    return room;
  }

  /** `up` and `down` along the column, then the authored neighbours. */
  private async wire(
    room: Band & MemberStuff,
    surface: SurfaceStuff,
    bands: ColumnBand[],
    index: number,
  ): Promise<void> {
    const surfacePath = pathOf(surface);
    const ex = this.requireExitable(room);
    const above: ColumnTarget = index === 0 ? 'surface' : bands[index - 1]!;
    if (!ex.getExit('up')) await this.installColumnExit(ex, 'up', surfacePath, above);
    const below = bands[index + 1];
    if (below !== undefined && !ex.getExit('down')) {
      await this.installColumnExit(ex, 'down', surfacePath, below);
    }
    for (const n of surface.getColumn().neighbours ?? []) {
      if (n.band !== room.getBand() || ex.getExit(n.direction)) continue;
      const beside = await StuffApi.singleton<Stuff>(n.destination);
      if (!MixinApi.isExitable(beside) || !MixinApi.isContainer(beside)) continue;
      await ex.addBidirectionalExit(beside as ExitableContainer, n.direction, {
        kind: UNDERWATER_EXIT_KIND,
        opposite: n.opposite ?? NavigationApi.invertDirection(n.direction) ?? undefined,
        keepLiveDestination: true,
      });
    }
  }

  private async installColumnExit(
    on: Stuff & Container & Exitable,
    direction: string,
    surfacePath: string,
    target: ColumnTarget,
  ): Promise<void> {
    await on.installExit<ColumnExit>(
      COLUMN_EXIT_KIND,
      {
        direction,
        source: on,
        destinationPath: target === 'surface' ? surfacePath : `${BAND_ROW}${target}`,
        media: ['water'],
      },
      (e) => e.configureColumn(surfacePath, target),
    );
  }

  /* ─────────────────────────── Warren policy hooks ─────────────────────────── */

  /** Clone the band row `bandOf` selected — reachable only through it. */
  protected async createMember(): Promise<MemberStuff> {
    return StuffApi.clone<MemberStuff>(`${BAND_ROW}${this._budBand}`);
  }

  /** Arrivals swim down from the surface; a column never population-buds. */
  public async admitArrival(): Promise<void> {
    /* no-op — the way in is the surface's `down`. */
  }

  /** Unused: `wireHubExit` is overridden wholesale (there is no hub). */
  protected attachmentFor(): Attachment {
    return { direction: 'down' };
  }

  /** The column wires itself as it buds; there is no hub to wire to. */
  protected override async wireHubExit(_room: MemberStuff): Promise<void> {
    /* see `wire` */
  }

  /** A column has no host fixture. */
  protected async wireHostFixtures(): Promise<void> { /* no-op */ }
  protected async unwireHostFixtures(): Promise<void> { /* no-op */ }

  /**
   * ⭐ Keep what is down there. A band that has emptied of people is
   * captured (what sank stays sunk across a restart); one its surface no
   * longer has — the water went down — is captured and reaped.
   */
  protected async reconcile(): Promise<void> {
    for (const m of this.getMembers()) {
      if (this.occupantsOf(m).length > 0) continue;
      const band = m as unknown as Band;
      const key = this.keyOf(band.getSurfacePath(), band.getBand());
      await PersistableApi.capture(m, key);
      const surface = band.getSurface();
      if (surface !== null && surface.bandsNow().includes(band.getBand())) continue;
      this._bands.delete(key);
      this.removeMember(m);
      StuffApi.destruct(m);
    }
  }
}

/** A surface's durable path: its identity, else its row. */
function pathOf(s: Stuff): string {
  return s.getIdentityPath() ?? s.getTemplatePath() ?? '';
}
