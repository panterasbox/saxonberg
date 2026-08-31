/**
 * UnboundedReceptacle — a {@link Receptacle} that is an inexhaustible
 * liquid source (`UnboundedSourceMixin`): you can draw from it forever
 * and it never runs dry. Backs the demo's coffee urn.
 *
 * The unbounded behavior is a focused capability mixin, NOT a flag on
 * the base bulk substrate — a plain `Receptacle` is bounded; only
 * source fixtures (the urn, a future spring / tap) compose this.
 *
 * ⚠ It affords NOTHING. It briefly afforded `wash`, which conflated
 * *inexhaustible source* with *place you can wash* — the other row over
 * this class is a coffee urn. Washing is {@link WaterFixture}'s.
 */

import Receptacle from './Receptacle';
import { UnboundedSourceMixin } from '../../lib/bulk/UnboundedSource';

export default class UnboundedReceptacle extends UnboundedSourceMixin(
  Receptacle,
) {}
