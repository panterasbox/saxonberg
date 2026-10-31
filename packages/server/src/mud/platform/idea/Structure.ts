/**
 * Structure — *these rooms are one building*: the concrete, singleton
 * twin of {@link StructureBase} (`lib/spatial/Structure`), which carries
 * the whole concept — membership by `extent`, the entrance, the storeys,
 * the height a horizon reads.
 *
 * ⭐ What this twin adds is the one claim a BUILDING makes and a ship of a
 * kind does not: **one row is one structure** (`SingletonMixin`), keyed by
 * its scope. Every building row names this class; `Ship` extends the base
 * (harbors B1 — a ship kind is many ships of one row).
 */

import StructureBase from '../../lib/spatial/Structure';
import { SingletonMixin } from '../../lib/stuff/Singleton';

export const STRUCTURE_CLASS_PATH = '/platform/idea/Structure';

export default class Structure extends SingletonMixin(StructureBase) {}
