/**
 * Tap — the dispensing station: a `Surfaced` fixture (the drip tray and
 * the rail the glasses stand on) that is ALSO a crafting tool offering
 * the `tap` capability, so the `pint` recipe requires it the way a shaken
 * drink requires `shaker`. The keg it draws from is a bulk holder in the
 * same room (resting on or beside the tap — a resting item's container is
 * the room, so the gather walk already sees it as a source): the tap is
 * the tool, the keg is the matter. Nothing is plumbed — a `feeds:` pointer
 * would be a field nothing reads.
 *
 * Ships at `/trade/hospitality/thing/Tap`.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { SurfacedMixin } from '@saxonberg/server/mud/lib/spatial/Surfaced';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';

const TapBase = SurfacedMixin(ToolMixin(DetailedMixin(Thing)));

export default class Tap extends TapBase {
  constructor() {
    super();
    this.capabilities = ['tap'];
    this.setKeywords(['tap', 'taps', 'beer-tap']);
    this.setPrimaryKeyword('tap');
  }
}
