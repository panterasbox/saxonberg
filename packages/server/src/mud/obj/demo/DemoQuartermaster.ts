/**
 * DemoQuartermaster — minimal concrete Character subclass for
 * exercising the `give` verb's recipient path. Character is abstract;
 * the proper NPC stack lands later. This stub provides just enough
 * substrate (Agent + Container + the rest of Character's chain) for
 * `give apple to quartermaster` to round-trip.
 *
 * Lives under /obj/demo/ as throwaway showcase content.
 */

import { Character } from '../../lib/character/Character';

export class DemoQuartermaster extends Character {}
