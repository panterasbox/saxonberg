/**
 * Vessel - Portable container: a Thing that can also hold other Stuff.
 *
 * Chests, packs, pouches, jars, crates, carts — anything that is itself
 * containable (lives in the world, can be moved) while also holding stuff
 * inside it. Pure structural composition; subclasses (locked chest, bag of
 * holding, backpack with slots) layer behavior on top.
 *
 * Composition: ContainerMixin(Thing) — Thing already supplies Containable,
 * so Vessel carries both environment (its own location) and inventory
 * (its contents).
 */

import { Thing } from '../stuff/Thing';
import { ContainerMixin } from './Container';

const VesselBase = ContainerMixin(Thing);

export class Vessel extends VesselBase {
  static persistentFields: string[] = [];
}
