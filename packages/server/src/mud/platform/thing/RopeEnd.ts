/**
 * RopeEnd — ⭐ **the far end of a rope** (cordage D1): the `LineEnd` a
 * ROPE mints. It is everything a line's end is — held, tugged, tied to a
 * load — and one thing more: hanging down a drop from a rope tied off above,
 * it is a way up (`ClimbableMixin`). A hose's end is never a way up, so
 * this is its own class and not a guard on the line's end.
 */

import LineEnd from './LineEnd';
import { ClimbableMixin } from '../../lib/locomotion/Climbable';

export default class RopeEnd extends ClimbableMixin(LineEnd) {}
