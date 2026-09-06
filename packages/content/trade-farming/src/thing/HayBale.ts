/**
 * HayBale — ⭐ **the winter feed budget, made of summer, and the thing
 * that burns the barn down.**
 *
 * A `Provision` that also heats itself. Everything about the heating is
 * in {@link SelfHeatingMixin}; what this class adds is that hay is the
 * one crop whose moisture at the moment it was STACKED matters more than
 * anything that happens to it afterwards.
 *
 * ⚠ `mow` stamps that moisture off the field it came from, so cutting in
 * a wet spell is what puts a bad rick in your barn — weeks before the
 * barn does anything about it.
 */

import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import { SelfHeatingMixin } from '../lib/SelfHeating';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class HayBale extends SelfHeatingMixin(Provision) {
  static fieldMeta: FieldMeta = {};
}
