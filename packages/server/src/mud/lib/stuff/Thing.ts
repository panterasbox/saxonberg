/**
 * Thing - Base class for portable inanimate objects
 *
 * Composition: ContainableMixin(Stuff)
 *
 * Provides:
 * - environment - What container holds this object (from ContainableMixin)
 * - runtimeId, destroyed - Core object state (from Stuff)
 *
 * Thing is intentionally minimal — just a Stuff that can be contained.
 * Subclasses layer on visibility, properties, or whatever else they need.
 */

import { Stuff } from './Stuff';
import { ContainableMixin } from '../spatial/Containable';

const ThingBase = ContainableMixin(Stuff);

export class Thing extends ThingBase {
  static persistentFields: string[] = [];

  constructor() {
    super();
  }
}
