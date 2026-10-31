/**
 * Structure — the default BUILDING: one row, one structure (a
 * `Singleton` keyed by its row's path), every capability its outside has.
 *
 * Everything a structure IS — membership, entrance, height, storeys, the
 * landing — is the base's ({@link StructureBase}, `lib/structure/
 * Structure`); this twin is what every Structure row names. A holding's
 * minted house (`/system/residence/idea/HoldingStructure`) is the base
 * keyed per lot instead.
 */

import StructureBase from '../../lib/structure/Structure';
import { SingletonMixin } from '../../lib/stuff/Singleton';

export const STRUCTURE_CLASS_PATH = '/platform/idea/Structure';

export default class Structure extends SingletonMixin(StructureBase) {}
