/**
 * Lump — ⭐ **a carryable piece of what came out of the ground, and they
 * pool.**
 *
 * The `Ore` shape without a grade: stacks merge by row, so twenty limestone
 * lumps are one entry on a stock sheet and a cartload is one thing to move.
 * What distinguishes one lump row from another is its **material** —
 * limestone, quicklime, clay, spoil — and the material is what every
 * consumer downstream actually reads: the smelt looks for the `flux` tag,
 * the field looks for `liming`, the kiln looks for what its recipe names.
 *
 * ⚠ No grade, deliberately. An ore lump carries one because a smelt's yield
 * is grade × metal fraction; a limestone lump does not, because a flux
 * either is limestone or is not. Adding a grade here would invent a number
 * nothing reads.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { StackableMixin } from '@saxonberg/server/mud/lib/stuff/Stackable';

export default class Lump extends StackableMixin(Thing) {}
