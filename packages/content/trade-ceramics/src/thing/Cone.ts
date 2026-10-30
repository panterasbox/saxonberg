/**
 * Cone — ⭐ a potter's mould (ceramics D17): the earthenware sugar cone a
 * refiner sets loaf sugar in, the potter's first big customer (*"sugar is
 * pottery's first"*). A kernel `Mould` thrown green and fired, so a potter
 * can make one; sugar's own cone row names this class when sugar is on
 * master.
 */

import Mould from '@saxonberg/server/mud/platform/thing/Mould';
import { GreenwareMixin } from '@saxonberg/server/mud/lib/material/Greenware';
import { MoistureMixin } from '@saxonberg/server/mud/lib/material/Moisture';

const ConeBase = GreenwareMixin(MoistureMixin(Mould));

export default class Cone extends ConeBase {}
