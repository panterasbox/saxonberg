/**
 * DisguiseGarment — a `Garment` that presents a {@link Disguise} while
 * worn (a hood, a mask, a cloak with the hood up).
 *
 * Per the `Garment` philosophy, added behavior is a composed mixin, not
 * a new noun: this is a Garment that *also* composes
 * `DisguiseBearingMixin`. Seeded as `domain` content (e.g.
 * `/stuff/thing/clothes/hood`) with `data.appearsAs` /
 * `data.masksIdentity` / `data.covers` alongside the usual
 * `slotClaims`.
 */

import Garment from './Garment';
import { DisguiseBearingMixin } from '../../../lib/disguise/Disguise';

export default class DisguiseGarment extends DisguiseBearingMixin(Garment) {}
