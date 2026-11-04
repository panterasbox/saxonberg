/**
 * Pigment — a paper of ground pigment, or a cake of one before it is
 * ground (paint build D19). Made on the stones (`Crafted`, so a mill recipe
 * can mint it), stacked by the paper (`Stackable`), and a body that heat
 * reaches (`Thermal`) — a paper of yellow ochre fired in a pan on the hearth
 * reddens to red ochre by its material's own kinetics.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';

export default class Pigment extends CraftedMixin(ThermalMixin(StackableMixin(Good))) {}
