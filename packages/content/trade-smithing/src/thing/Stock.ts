/**
 * Stock — ⭐ **metal an anvil works**: the ingots, bars, pigs and blanks the
 * metal chain ships, and every one of them answers the hammer and the tub
 * itself.
 *
 * An `Ingot` (a build vessel that melts and carries its carbon) that also
 * speaks the smithing pack's two protocols: {@link HammerableMixin} — what a
 * blow does to it — and {@link QuenchableMixin} — whether the tub finishes it
 * or heat-treats it. The verbs `hammer` and `quench` require those, so the
 * piece decides and the controllers only word what it says.
 *
 * ⚠ A pig of cast iron is Stock too, deliberately: it must REACH the hammer
 * so a player hears why cast iron cannot be forged (the piece refuses,
 * diegetically, on its own carbon).
 */

import Ingot from '@saxonberg/server/mud/platform/thing/Ingot';
import { HammerableMixin } from '../lib/Hammerable';
import { QuenchableMixin } from '../lib/Quenchable';

export default class Stock extends QuenchableMixin(HammerableMixin(Ingot)) {}
