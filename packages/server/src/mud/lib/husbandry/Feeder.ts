/**
 * Feeder — ⭐ **a vessel an animal feeds from.**
 *
 * A pure carrier: no fields, no behaviour, no hunger read, no schedule,
 * and emphatically nothing "for cats". It composes over the shipped
 * vessel shape and adds exactly one thing — *a concept the `feeds` brain
 * can look for, and a gate can name.*
 *
 * ⭐⭐ Everything a feeding bowl needs already exists and none of it is
 * about feeding. Interior bulk holds water and milk, so `fill`, `pour`
 * and `drink` all work on it the day it ships. Contents hold scraps and
 * cuts, so `put` works. It is Chattel, so a bought saucer persists with
 * its owner; its contents are `Provision`s carrying `Freshness`, so food
 * left in it **turns on the shipped clock with no code at all** — which
 * is the neglect signal, arriving free, and reading identically to
 * anyone whether or not they meant it.
 *
 * ⚠ Why a marker and not a flag on `Bulkable`: "a thing animals eat
 * from" is a *kind* of object, and an author adding the second one (a
 * trough beside the saucer) should write a row, not code. The mixin is
 * what lets the row exist.
 */

import type { MixinConstructor } from '../mixin';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- a pure carrier: the mixin IS the claim, and it has no surface of its own
export interface Feeder {}

export function FeederMixin<TBase extends MixinConstructor>(Base: TBase) {
  class FeederMixin extends Base implements Feeder {
    static _mixinName = 'FeederMixin';
  }
  return FeederMixin;
}
