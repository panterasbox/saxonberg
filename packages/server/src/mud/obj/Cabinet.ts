/**
 * Cabinet — a container *fixture*: storage furniture that holds things and
 * is looked into, not loose clutter.
 *
 * `PopulatesMixin(ContainerMixin(DetailedMixin(Thing)))` — a `Thing`
 * (Tangible/Visible/Containable, so it sits in a room) that is also a
 * `Container` (holds nested contents) and self-stocks from its seed's
 * `populates:` list. Backs the bar's **back-bar** (the bottles + tools live
 * *in* it, so they nest and never read as loose items in the room — the
 * daves-bar presentation rule), and any storage furniture (cabinet, chest,
 * shelf unit). Its contents stay reachable: `CraftingLogic.gatherMatter`
 * walks one level into open containers present in the room.
 */

import Thing from '../lib/stuff/Thing';
import { ContainerMixin } from '../lib/spatial/Container';
import { DetailedMixin } from '../lib/description/Detailed';
import { PopulatesMixin } from '../lib/stuff/Populates';

const CabinetBase = PopulatesMixin(ContainerMixin(DetailedMixin(Thing)));

export default class Cabinet extends CabinetBase {
  static persistentFields: string[] = [];
}
