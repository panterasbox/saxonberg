/**
 * Handcart — a wheeled `Vessel` you hitch and pull. The worked example of
 * the haulage substrate: a container-object (holds cargo, carries its own
 * frame mass — both from `Vessel`) that is also `Haulable` (it can be
 * hitched and dragged, paying its `draftFactor`-attenuated draft load on
 * the hauler's encumbrance rather than its full cargo weight).
 *
 * Natural sibling of `Pack` in the `equipment` subsystem: a Pack is a
 * wearable `Vessel` (load stays on your body, couples at the worn floor);
 * a Handcart is a *dragged* `Vessel` (load leaves your body onto the
 * wheels — `carry / drag / cart / can't-budge` emergent from
 * `draftFactor × mass` vs. capacity). Variety (a heavy wagon, a light
 * barrow, a dragged sledge with a high draftFactor) is content +
 * data, not subclassing.
 *
 * Seeded as `domain` content (e.g. `/obj/gear/handcart`) with
 * `data.draftFactor` / `data.handedness` / `data.mass`.
 */

import { Vessel } from '../../lib/stuff/Vessel';
import { HaulableMixin } from '../../lib/slot/Haulable';

const HandcartBase = HaulableMixin(Vessel);

export default class Handcart extends HandcartBase {}
