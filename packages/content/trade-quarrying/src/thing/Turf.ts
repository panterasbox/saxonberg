/**
 * Turf — ⭐⭐ **a fuel that carries its own water**, and the whole of why the
 * drying arm had to be real.
 *
 * `WaterActivityMixin(Firewood)`. A turf comes out of a bog nearly all water, and it
 * will not burn: an as-cut turf refuses `ignite` in the shipped words — *"It's
 * too wet to catch."* — and a dried one lights. That refusal is **not a
 * peat-specific branch**: `Combustible.wetPenaltyK()` reads surface wetness and
 * the matter's **own** water as two terms of one formula and adds them, so the
 * turf reuses the rain-on-a-log arithmetic exactly.
 *
 * ⭐ And what dries it is the weather. `WaterActivityMixin`'s two-way arm runs against
 * `BiomeApi.airFor`, so a stack on the moor dries in a dry spell, **gets wetter
 * again in rain**, and only burns when the season allowed it to. *Rain is a
 * disaster* becomes playable, which is unbuildable while drying is a constant.
 *
 * ⚠⚠ **WaterActivityMixin WITHOUT FreshnessMixin, which is the anticipated case made real.**
 * `spoilage.md` argued the split on exactly this ground — *"leather, timber and
 * grain are all dried and none of them rot on a microbial curve; folding water
 * activity into the spoilage gauge would make a tannery compose a microbial
 * load in order to express drying"* — and until now every `WaterActivityMixin` host in
 * the game also composed `FreshnessMixin`, so the claim was untested. A turf is
 * the first host that dries and does not rot. Peat tabulates no spoil
 * activation energy, so `lint:perishable` is satisfied by construction.
 *
 * ⭐ It is stacked in an **openwork lattice** and not heaped, and the engine
 * now has a reason for that: exposure is a fraction the support carries, so a
 * turf on a rack reaches the air all over and one flat on the ground reaches it
 * on one face. The traditional shape is the arithmetic.
 */

import Firewood from '@saxonberg/server/mud/platform/thing/Firewood';
import { WaterActivityMixin } from '@saxonberg/server/mud/lib/material/WaterActivity';

export default class Turf extends WaterActivityMixin(Firewood) {}
