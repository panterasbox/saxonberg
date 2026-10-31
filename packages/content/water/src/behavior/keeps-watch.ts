/**
 * `keeps-watch` brain (`/system/water/behavior/keeps-watch`) — **the
 * hired lookout** (maritime R7).
 *
 * ⭐⭐ The engine never tells a ship what is on the horizon; somebody has
 * to be watching. This is the somebody you can hire: an agent holding the
 * house's `lookout` seat, ON SHIFT, and standing aboard, takes up
 * `watch horizon` (the same verb a player types) and SAYS each new
 * sighting to the deck — *"The light on Gannet Rock, on the starboard
 * bow!"*. The seat is what puts the lookout at the masthead
 * (`Ship.sightHeightFor`), so a hired lookout calls a light the deck
 * cannot see yet.
 *
 * Off shift, out of the seat, or ashore: she stands down, and nobody is
 * told anything. ⛔ Nobody on watch → nobody told.
 *
 * config: `{}` — the craft is wherever she stands, the house is the
 * craft's.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import {
  HORIZON_WATCH_TYPE,
  type HorizonWatch,
} from '@saxonberg/server/mud/lib/perception/HorizonWatch';
import Ship from '@saxonberg/server/mud/platform/idea/Ship';

/** The seat that keeps the watch (the Ship's own key). */
const LOOKOUT = 'lookout';

/** Where a thing lies relative to the ship's head, as a lookout calls it. */
const RELATIVE: ReadonlyArray<[number, string]> = [
  [22.5, 'dead ahead'],
  [67.5, 'on the starboard bow'],
  [112.5, 'abeam to starboard'],
  [157.5, 'on the starboard quarter'],
  [202.5, 'astern'],
  [247.5, 'on the port quarter'],
  [292.5, 'abeam to port'],
  [337.5, 'on the port bow'],
  [360.1, 'dead ahead'],
];

export const brain = class {
  static label = 'keeps-watch';
  static kind: TaskKind = 'work';
  static summary =
    'Keeps the watch from the masthead while on shift as lookout, and ' +
    'calls out what comes into view.';
  static claims: readonly EngagementSlot[] = ['voice'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'keeps the watch');
  }
  // A watch is kept whether or not anybody is on deck to hear it.
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host as Stuff;
    if (host.isDestroyed() || !MixinApi.isEngaged(host) || !MixinApi.isEmployed(host)) return;
    if (!MixinApi.isCommandGiver(host)) return;
    const watch = host.getEngagementByType(HORIZON_WATCH_TYPE) as HorizonWatch | undefined;
    const craft = await brain.craftOf(host);
    const job = craft?.getHouse() ? host.getEmployment(craft.getHouse()!) : null;
    const onWatch = job?.positionKey === LOOKOUT && job.status === 'on-shift';
    if (!onWatch) {
      if (watch) await host.executeCommand('watch off');
      return;
    }
    if (!watch) {
      await host.executeCommand('watch horizon');
      return;
    }
    const heading = craft?.getCourse()?.bearingDeg ?? null;
    for (const n of watch.takeNews()) {
      if (n.change !== 'sighted') continue;
      const name = n.name.charAt(0).toUpperCase() + n.name.slice(1);
      ctx.say(`${name}, ${brain.where(n.bearingDeg, heading)}!`);
    }
  }

  /** The structure whose deck she stands on, if any. */
  static async craftOf(host: Stuff): Promise<Ship | null> {
    const root = MixinApi.isContainable(host) ? host.getRootContainer() ?? host : host;
    const craft = await ExpanseApi.craftAt(root.getDurableHandle() ?? root.getTemplatePath() ?? '');
    return craft instanceof Ship ? craft : null;
  }

  /** A sighting as a lookout calls it — off the ship's head, or by the compass at anchor. */
  static where(bearingDeg: number | null, headingDeg: number | null): string {
    if (bearingDeg === null) return 'in sight';
    if (headingDeg === null) {
      const points = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
      return `to the ${points[Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8]}`;
    }
    const rel = (((bearingDeg - headingDeg) % 360) + 360) % 360;
    return (RELATIVE.find(([max]) => rel < max) ?? RELATIVE[0]!)[1];
  }
};
