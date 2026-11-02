/**
 * Structure — what a bare structure ROW names: one {@link StructureBase}
 * per row (a `Singleton` keyed by the row's path), with no outside of its
 * own (paint review, 2026-11-02).
 *
 * Everything a structure IS — membership, entrance, height, storeys, the
 * landing — is the base's (`lib/structure/Structure`). A building names
 * `platform/idea/Building` (a face and a condition); a ship is `Ship`.
 * What is left here is a structure that is neither: today the peak of
 * Waponi Woo, a stopgap until the mountain slate moves it onto rising
 * ground.
 */

import StructureBase from '../../lib/structure/Structure';
import { SingletonMixin } from '../../lib/stuff/Singleton';

export const STRUCTURE_CLASS_PATH = '/platform/idea/Structure';

export default class Structure extends SingletonMixin(StructureBase) {}
