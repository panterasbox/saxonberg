/**
 * UniversityAvenue — the Eternal University campus-entry arrival room: the
 * transit plaza at the edge of campus where the Teleport Authority sets
 * travellers down. The lounge's only route lands here, and a fresh credential
 * is born registered for its terminal — so it is the new player's first step
 * onto campus.
 *
 * A plain describable singleton Location (the EU build expands the campus
 * from here). The University Avenue TPA terminal is seeded into it.
 */

import Location from "../../lib/stuff/Location";
import { VisibleMixin } from "../../lib/description/Visible";
import { DetailedMixin } from "../../lib/description/Detailed";
import { SingletonMixin } from "../../lib/stuff/Singleton";

const UniversityAvenueBase = SingletonMixin(
  DetailedMixin(VisibleMixin(Location)),
);

export default class UniversityAvenue extends UniversityAvenueBase {
  static persistentFields: string[] = [];
}
