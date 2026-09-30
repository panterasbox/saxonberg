/**
 * Tablet — a portable screen (`DisplayMixin` on a carried Thing). The
 * house tablet is a row over this with `pairing: staff`, `shows: [card]`
 * (it runs the house APPS), `principal: <the venue's Business>`; a hand-held remote screen
 * is `pairing: held`. See docs/subsystems/display.md.
 */

import Good from '../../lib/stuff/Good';
import { DisplayMixin } from '../../lib/display/Display';

const TabletBase = DisplayMixin(Good);

export default class Tablet extends TabletBase {}
