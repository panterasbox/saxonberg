/**
 * Compartment — ⭐ **a room of a ship**.
 *
 * Every ship room row names this class — a kind's deck, cabin and hold
 * (`/stuff/location/ship/<kind>/<leaf>`, minted keyed by her warren) and an
 * authored ship's own rooms (the Hesper's, the regulars', the Ostrander's,
 * loaded by their rows). One kind of ship room; how it is instanced is the
 * key, not the class.
 *
 * - **A shore of her sea** — `Shore` so a deck that cites the sea over her
 *   side (`waters: { sea: … }`, stamped by the deck itself as her warren wakes
 *   it — `onWarrenWake`) reads it as the Hesper's deck always has: `look sea`, a bucket
 *   over the side, the rod.
 * - ⭐ **No record of its own** (*persistence is the exception*):
 *   a deck or a cabin comes up from its row each time she wakes — its
 *   fixtures and her gear with it — and keeps nothing. The room that keeps
 *   a record is her HOLD (`Hold`, this class plus `Persistable`): her cargo
 *   is what survives her sleeping, a restart and her going down. When she
 *   sleeps, what is loose up here is stowed below first
 *   (`ShipWarren.stow`). Nothing a flood or a wreck reads lives on a room:
 *   every water read asks her (below), so a wreck's rooms are under the
 *   sea again the moment they stand.
 * - **Her warren's member** — `WarrenMember`, so *which ship is this
 *   room?* is its warren's answer, and so an interactive arriving or
 *   leaving pokes the warren's population coalescer (the witness below),
 *   which is what puts a ship of a kind to sleep whole.
 * - ⭐⭐ **A room that can flood** — `WaterPlace(Swimmable(…))`, and
 *   every water read ASKS ITS SHIP: how deep the water stands over this
 *   room's floor is her bilge's height above her keel less this room's
 *   `floorM` (`Ship.floodDepthAt`), so her rooms flood from the lowest up by
 *   arithmetic and nothing is stored on the room. Sunk, every room is under
 *   the sea's whole depth at the bottom less its floor.
 *
 * ⚠ **Dry is dry.** A water place with no water cited would read
 * `swimming` and fifty-odd readers of `isWaterPlace` would treat people on
 * deck as in the water (the reason a deck first left this composition out). So every
 * read is overridden: a dry compartment says `dry`, its `depthNow()` is
 * 0 (the readers that ask *is this the water* — `depthNow() > 0`, the read
 * every water place has — hear no), has no column (`bandsNow` is always empty — a diver reaches a
 * wreck through her deck, from the water's own column over her), and puts
 * whoever stands in it in the AIR unless the water is over their head.
 *
 * ⛔ Not `Singleton` (it is `Location`, not `Locale`): one smack's deck row
 * is every smack's deck. An authored ship's room is still one instance per
 * row because it is loaded by `StuffApi.singleton`, exactly as a `Shore` is.
 */

import Location from './Location';
import { ShoreMixin } from '../../lib/location/Shore';
import { SwimmableMixin } from '../../lib/locomotion/Swimmable';
import { WaterPlaceMixin, type WaterState } from '../../lib/location/WaterPlace';
import { HaulOutMixin } from '../../lib/location/HaulOut';
import { WarrenMemberMixin } from '../../lib/location/WarrenMember';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import Ship from '../idea/Ship';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Exitable } from '../../lib/boundary/Exitable';
import type Exit from '../../lib/boundary/Exit';
import type { ColumnBand } from '../../lib/location/WaterColumn';
import type { MediumRead } from '../../api/biome';
import type { FieldMeta } from '../../lib/mixin';
import type { MarkupAugmenter } from '../../api/mml';

/** How deep an adult stands in water before it is over their head, m (`water.column.wadeM`). */
const DEFAULT_WADE_M = 1.5;

/** ⭐ What a look says of the water in a compartment — never a number. */
const floodAugmenter: MarkupAugmenter = (text, host, _viewer, opts) => {
  if (opts?.filter && !opts.filter.includes('vision')) return text;
  if (!(host instanceof Compartment)) return text;
  const line = host.floodWords();
  if (line === null) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
};

export default class Compartment extends HaulOutMixin(WaterPlaceMixin(
  SwimmableMixin(ShoreMixin(WarrenMemberMixin(Location))),
)) {
  static fieldMeta: FieldMeta = {
    floorM: { persistent: true, authorable: true },
  };
  // (`persistent` here is what lets a `Hold` keep it; a plain compartment
  // reads it off its row every wake.)

  static markupAugmenters: MarkupAugmenter[] = [floodAugmenter];

  /**
   * ⭐ How high this room's floor stands above her keel, m (grain) —
   * authored on an authored ship's room; a kind's floorplan entry says it
   * for a kind's room (`floorM` there wins). `null` = ask her: her deck
   * stands at her hull's depth, any other room on her keel.
   */
  public floorM: number | null = null;

  public getFloorM(): number | null {
    return this.floorM;
  }

  public setFloorM(value: number | null): void {
    const n = value === null || value === undefined ? NaN : Number(value);
    this.floorM = Number.isFinite(n) && n >= 0 ? n : null;
  }

  /* ─────────────────────────── her ─────────────────────────── */

  /** The ship this room is a room of, standing — `null` when none is. */
  public shipNow(): Ship | null {
    const s = this.structureNow();
    return s instanceof Ship ? s : null;
  }

  /**
   * ⭐ Stood up by her warren (the one wake hook): a
   * room that names the sea over her side (`details: sea`) is a shore of
   * whatever sea she lies on. A kind's deck row cannot name it — a smack
   * lies on whichever sea she is on — so the room asks her as it wakes.
   *
   * @hook
   */
  public override async onWarrenWake(): Promise<void> {
    await super.onWarrenWake();
    const sea = this.shipNow()?.getExpanse() ?? null;
    if (sea === null || !this.hasDetail('sea')) return;
    this.setWaters({ ...this.getWaters(), sea });
  }

  /**
   * ⭐ A ship alongside is seen across her way (master's
   * `isSeenAcrossExit`): from the landing, `look deck` describes her
   * DECK — the one room of hers in plain view over the side — while she is
   * afloat. `look hesper` is HER: her name, and the words for what she is,
   * are the ship's keywords, and a deck answers only to phrases with `deck`
   * in them. Her cabin and hold are entered to be seen; a wreck is under
   * the sea, seen by nobody on the quay.
   *
   * @hook
   */
  public override isSeenAcrossExit(): boolean {
    const ship = this.shipNow();
    if (ship === null || ship.isSunk()) return false;
    const deck = ship.watchRoomNow();
    return deck !== null && deck.stuffId === (this as unknown as Stuff).stuffId;
  }

  /* ─────────────────────────── the flood reads ─────────────────────────── */

  /** ⭐ The water's height above her keel now, m — her bilge (the datum is her keel). */
  public override levelNow(): number {
    return this.shipNow()?.floodHeightM() ?? 0;
  }

  /** ⭐ How deep the water stands over this room's floor now, m — her answer. */
  public override depthNow(): number {
    return this.shipNow()?.floodDepthAt(this as unknown as Stuff, this.floorM) ?? 0;
  }

  public override stateNow(): WaterState {
    const d = this.depthNow();
    if (d <= 0) return 'dry';
    if (d <= wadeDepthM()) return 'wading';
    return 'swimming';
  }

  /** ⭐ A cut-off basin is a tidepool's idea; a ship's room has no rim. */
  public override isCutOff(): boolean {
    return false;
  }

  /** ⭐ No column under a room: a wreck is reached from the water over her. */
  public override bandsNow(): ColumnBand[] {
    return [];
  }

  /** Is she on the bottom with the sea in her? */
  private sunk(): boolean {
    return this.shipNow()?.isSunk() === true;
  }

  /**
   * ⭐ Who is in the water: nobody, until it is over their head — standing
   * in it to the knees or the chest, you are in the air with wet legs.
   * Over your head, you are in it; and sunk, the sea is over the whole of
   * her and there is no air to put your head into.
   */
  public override mediumFor(_occupant: Stuff): MediumRead {
    if (this.stateNow() !== 'swimming') {
      return {
        tag: 'air',
        substance: 'air',
        immersed: false,
        atSurface: false,
        temperatureK: null,
        depthM: 0,
        waterRef: null,
      };
    }
    const sunk = this.sunk();
    return {
      tag: 'water',
      substance: 'water',
      immersed: true,
      atSurface: !sunk,
      temperatureK: this.waterTemperatureK(),
      depthM: sunk ? Math.max(0, this.depthNow()) : 0,
      waterRef: null,
      oxygenMgL: null,
    };
  }

  /** ⭐ Afloat, the water in her has air over it; sunk, it has the sea. */
  public override headOutAt(_occupant: Stuff): boolean {
    return !this.sunk();
  }

  /** ⭐ Swum only where the water is over your head. */
  public override canEngageAxis(direction: string): boolean {
    if (this.stateNow() !== 'swimming') return false;
    return super.canEngageAxis(direction);
  }

  /**
   * ⭐ Up, in a room under water, is the room's own way up — the
   * companionway to her deck, and from a sunk deck the water's column
   * over her (wired by the water when she went down).
   */
  public override wayUp(): { exit: Exit } | { reason: string; line: string } {
    if (this.stateNow() !== 'swimming') {
      return { reason: 'not-in-water', line: 'You are not in the water.' };
    }
    const up = (this as unknown as Stuff & Exitable).getExit('up');
    if (up) return { exit: up };
    return this.sunk()
      ? { reason: 'no-way-up', line: 'There is no way up out of her from here.' }
      : { reason: 'at-surface', line: 'Your head is already out of the water.' };
  }

  /** ⭐ Sunk, there is no surface in her to hold a body at. */
  public override async holdAtSurface(body: Stuff): Promise<boolean> {
    if (this.sunk()) return false;
    return super.holdAtSurface(body);
  }

  /**
   * ⭐ The water in her, in words: nothing when she is dry; how deep it
   * stands, and the sea over everything once she is on the bottom.
   */
  public floodWords(): string | null {
    if (this.sunk()) return 'She lies on the bottom, and the sea fills her.';
    const d = this.depthNow();
    if (d <= 0) return null;
    if (d < 0.15) return 'Water sloshes across the boards underfoot.';
    if (d < 0.5) return 'Water stands knee-deep here.';
    if (d < 1) return 'Water stands waist-deep here.';
    if (d <= wadeDepthM()) return 'The water is up to your chest here.';
    return 'The water here is over your head.';
  }

  /* ─────────────────────────── the population witness ─────────────────────────── */

  /**
   * Population witness (the `PersistentLocation` shape): an interactive
   * arriving or leaving pokes her warren, whose reconcile is what puts her
   * to sleep whole. A no-op before her warren has adopted the room.
   */
  public override onContainableAdded(thing: Stuff & Containable, from?: Stuff | null): void {
    super.onContainableAdded(thing, from);
    this.notePopulation(thing);
  }

  public override onContainableRemoved(thing: Stuff & Containable, to?: Stuff | null): void {
    super.onContainableRemoved(thing, to);
    this.notePopulation(thing);
    // ⭐ Somebody left her while she settles: out of the count.
    if (MixinApi.isHasInteractive(thing as unknown as Stuff)) this.shipNow()?.noteLeft();
  }

  private notePopulation(thing: Stuff & Containable): void {
    if (!MixinApi.isHasInteractive(thing as unknown as Stuff)) return;
    const warren = this.getWarren();
    if (warren !== null) {
      warren.notifyPopulationChange(this as unknown as Stuff & Location);
      return;
    }
    // ⭐ An authored ship's room that loaded after her warren adopted her
    // rooms: somebody came aboard, so it joins her now —
    // `maintain` and the bilge well find her through it.
    void this.joinShip();
  }

  /** Ask the ship this room is a room of to adopt it (an authored ship's warren adopts on read). */
  private async joinShip(): Promise<void> {
    try {
      const ship = await this.structure();
      if (!(ship instanceof Ship)) return;
      await (await ship.standWarren())?.adoptResident();
    } catch (err) {
      console.warn(`Compartment: ${this.getTemplatePath()} could not join her ship:`, err);
    }
  }
}

/** The wading depth dial (`water.column.wadeM`) — the water place's own. */
function wadeDepthM(): number {
  try {
    const n = Number.parseFloat(AppApi.setting(AppSettingKeys.waterColumnWadeM) ?? '');
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_WADE_M;
  } catch {
    return DEFAULT_WADE_M;
  }
}
