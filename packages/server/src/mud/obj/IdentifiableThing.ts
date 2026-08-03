/**
 * IdentifiableThing — a `Thing` whose type is hidden until identified
 * (the blue-vial demo). Per the composition-not-subclassing idiom, this
 * is a Thing that *also* composes `IdentifiableMixin`; seeded as `domain`
 * content with `data.identifiedName` alongside the usual
 * `shortDescription` (the unidentified appearance).
 */

import Thing from '../lib/stuff/Thing';
import { IdentifiableMixin } from '../lib/identification/Identifiable';

export default class IdentifiableThing extends IdentifiableMixin(Thing) {}
