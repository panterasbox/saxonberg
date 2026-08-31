/**
 * Tablet — a portable screen (`DisplayMixin` on a carried Thing). The
 * house tablet is a row over this with `pairing: staff`, `shows: [card]`
 * (it runs the house APPS), `principal: <the venue's Business>`; a hand-held remote screen
 * is `pairing: held`. See docs/subsystems/display.md.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { DisplayMixin } from '../../lib/display/Display';

const TabletBase = DisplayMixin(DetailedMixin(Thing));

export default class Tablet extends TabletBase {}
