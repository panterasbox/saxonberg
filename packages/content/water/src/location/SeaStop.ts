/**
 * SeaStop — ⭐ **the sea over a ship that went down**.
 *
 * The sea's version of a river's stop (`ReachStop`): one room at a fixed
 * place on the chart, persisted by `(row, key)` with the key its position,
 * so what lies under it is there after a restart. Unlike a sea patch — the
 * water beside a ship still afloat, columnless — a stop has the sea's whole
 * depth under it: its column is DERIVED from the depth like any deep
 * water's (`WaterPlace.bandsNow`), so a person who comes up out of a wreck
 * swims up through the dark to this surface, and a diver goes down it.
 *
 * ⭐ It lies over a wreck (`WreckSiteMixin`): when its bed band buds, the
 * way into each ship on the bottom is wired on it ({@link onBandBudded}).
 * A ship stopped within hail of it uses it as the water beside her
 * (`SeaWarren.patchAlongside`), so a diver puts in from a ship that comes
 * to the spot.
 */

import Location from '@saxonberg/server/mud/platform/location/Location';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { ShoreMixin } from '@saxonberg/server/mud/lib/location/Shore';
import { SwimmableMixin } from '@saxonberg/server/mud/lib/locomotion/Swimmable';
import { WaterPlaceMixin } from '@saxonberg/server/mud/lib/location/WaterPlace';
import { HaulOutMixin } from '@saxonberg/server/mud/lib/location/HaulOut';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { PositionedMixin } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { MovingMixin } from '@saxonberg/server/mud/lib/expanse/Moving';
import { MovingPlaceMixin } from '@saxonberg/server/mud/lib/location/MovingPlace';
import type { ColumnBand } from '@saxonberg/server/mud/lib/location/WaterColumn';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { ColumnTarget } from '../idea/exits/ColumnExit';
import { WreckSiteMixin } from '../lib/WreckSite';
import type SeaWarren from '../idea/SeaWarren';

const WARREN_PATH = '/system/water/idea/SeaWarren';

export default class SeaStop extends WreckSiteMixin(
  MovingPlaceMixin(
    HaulOutMixin(WaterPlaceMixin(
      SwimmableMixin(ShoreMixin(PersistableMixin(MovingMixin(PositionedMixin(WarrenMemberMixin(Location)))))),
    )),
  ),
) {
  /** A stop holds where it is: nothing moves it. */
  public override isUnderWay(): boolean {
    return false;
  }

  /** ⭐ Back from its record: the sea's warren takes it again, and its wrecks are wired. */
  public override async onRestored(): Promise<void> {
    await super.onRestored();
    const warren = await StuffApi.singleton<SeaWarren>(WARREN_PATH).catch(() => null);
    if (warren) await warren.adoptStop(this);
    await this.wireWrecks();
  }

  /** ⭐ The ways into the wrecks are on its bed band, budded if need be. */
  public override async wreckBed(): Promise<(Stuff & Container) | null> {
    const column = await StuffApi.singleton<Stuff>(TemplatePaths.waterColumn).catch(() => null);
    if (column === null || !MixinApi.isWaterColumn(column)) return null;
    return column.bandOf(this as unknown as Stuff & Container, 'bed');
  }

  /** A wreck's deck leads out to the bed band she lies on. */
  public override wreckUpTarget(): ColumnTarget {
    return 'bed';
  }

  /** ⭐ Its bed band has budded: the way into each wreck goes on it. */
  public override async onBandBudded(band: ColumnBand, room: Stuff & Container): Promise<void> {
    await super.onBandBudded(band, room);
    if (band === 'bed') await this.wireWreckWaysOn(room);
  }

  public override getShort(): string {
    return 'In the sea';
  }

  public override getLong(): string {
    return 'The open sea, the swell lifting and dropping you, nothing in any direction but water — and somewhere far below, the bottom.';
  }
}
