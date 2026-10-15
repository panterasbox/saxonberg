/**
 * Ship — ⭐ **a {@link Structure} whose position is a variable** (maritime
 * review, 2026-10-13).
 *
 * A building and a ship are both *these rooms are one building*; what a
 * ship adds is everything that follows from the building MOVING, and none
 * of it belongs on a tower:
 *
 * - **the position and the voyage** — `expansePosition` (Positioned) and,
 *   under way, the voyage triple (Voyaging; see `Voyage`), held as a
 *   sustained engagement (Engaged) and outliving the process
 *   (Persistable: a ship's position, course and plot survive a restart);
 * - **heights aboard** — `deckHeightM` / `mastheadHeightM`, what a horizon
 *   reads of an OBSERVER on her; `heightM` (the truck) stays the
 *   Structure's, what others read of her as a target;
 * - **the house** — the Business whose roster mans her (her outfit), so
 *   the lookout is a SEAT read off the shipped roster;
 * - **who and what is aboard** — the Voyaging hooks (`aboard`,
 *   `watchRoom`, `gearAboard`, `sightHeightFor`).
 *
 * ⭐ *Is it a ship?* is `instanceof Ship` (and *does it voyage?* is
 * `MixinApi.isVoyaging`, which a boat answers too) — never a guard on a
 * field (`deckHeightM === null` once stood in for this on every
 * Structure).
 */

import Structure from './Structure';
import { PositionedMixin } from '../../lib/expanse/Positioned';
import { EngagedMixin } from '../../lib/activity/Engaged';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { VoyagingMixin } from '../../lib/expanse/Voyaging';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';

/** The position key of the seat that sees further (maritime D13). */
const LOOKOUT_POSITION = 'lookout';

export const SHIP_CLASS_PATH = '/platform/idea/Ship';

export default class Ship extends PersistableMixin(
  VoyagingMixin(EngagedMixin(PositionedMixin(Structure))),
) {
  static fieldMeta: FieldMeta = {
    deckHeightM: { persistent: true, authorable: true },
    mastheadHeightM: { persistent: true, authorable: true },
    house: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /** An observer's eye height on deck, metres. */
  protected deckHeightM = 0;
  /** An observer's eye height at the masthead, metres; `null` for none. */
  protected mastheadHeightM: number | null = null;
  /** The Business row whose roster mans her; `null` for none. */
  protected house: string | null = null;

  public getDeckHeightM(): number { return this.deckHeightM; }
  public setDeckHeightM(value: number): void { this.deckHeightM = Number(value) || 0; }

  public getMastheadHeightM(): number | null { return this.mastheadHeightM; }
  public setMastheadHeightM(value: number | null): void {
    this.mastheadHeightM = value === null || value === undefined ? null : Number(value);
  }

  public getHouse(): string | null { return this.house; }
  public setHouse(value: string | null): void { this.house = value ?? null; }

  /** Her height as a target — the truck. */
  override getTargetHeightM(): number {
    return this.getHeightM();
  }

  /**
   * How high `observer`'s eye is, aboard her.
   *
   * ⭐⭐ The lookout is a SEAT (maritime D13): the masthead height is
   * granted to whoever holds the house's `lookout` position **on shift**,
   * read off the shipped roster, and the deck height to everyone else. So
   * appointing somebody lookout makes her see further with nothing about
   * her having changed.
   */
  override sightHeightFor(observer: unknown): number {
    const deck = this.deckHeightM;
    const house = this.house;
    if (house === null || this.mastheadHeightM === null) return deck;
    const who = observer as Stuff;
    if (!who || !MixinApi.isEmployed(who)) return deck;
    const job = who.getEmployment(house);
    if (job?.positionKey === LOOKOUT_POSITION && job.status === 'on-shift') {
      return this.mastheadHeightM;
    }
    return deck;
  }

  /** Runtime cache of the member room rows (the extent's descendants). */
  private memberPaths: Promise<string[]> | null = null;

  /** The member rooms that are resident now. */
  private async liveMembers(): Promise<(Stuff & Container)[]> {
    if (this.memberPaths === null) {
      const ext = this.getExtent();
      this.memberPaths = ext === ''
        ? Promise.resolve([])
        : Template.findDescendants(ext).then((ts) => ts.map((t) => t.path));
    }
    const out: (Stuff & Container)[] = [];
    for (const p of await this.memberPaths) {
      const s = StuffApi.findByTemplatePath<Stuff>(p);
      if (s && s.isLocation() && MixinApi.isContainer(s)) out.push(s);
    }
    return out;
  }

  /** Everyone standing in a member room — told what the water does. */
  override async aboard(): Promise<Stuff[]> {
    const out: Stuff[] = [];
    for (const room of await this.liveMembers()) {
      for (const x of room.getContents()) if (MixinApi.isOrganism(x)) out.push(x);
    }
    return out;
  }

  /** The entrance — the deck the watch is kept on. */
  override async watchRoom(): Promise<(Stuff & Container) | null> {
    const entrance = this.getEntrance();
    if (!entrance) return null;
    try {
      const s = await StuffApi.singleton<Stuff>(entrance);
      return MixinApi.isContainer(s) ? s : null;
    } catch {
      return null;
    }
  }

  /** The Durable gear on deck — what an unattended watch wears. */
  override async gearAboard(): Promise<Stuff[]> {
    const deck = await this.watchRoom();
    return deck ? deck.getContents().filter((x) => MixinApi.isDurable(x)) : [];
  }
}
