/**
 * UnboundedReceptacle — a {@link Receptacle} that is an inexhaustible
 * liquid source (`UnboundedSourceMixin`): you can draw from it forever
 * and it never runs dry. Backs the demo's coffee urn.
 *
 * The unbounded behavior is a focused capability mixin, NOT a flag on
 * the base bulk substrate — a plain `Receptacle` is bounded; only
 * source fixtures (the urn, a future spring / tap) compose this.
 */

import Receptacle from './Receptacle';
import { UnboundedSourceMixin } from '../../lib/bulk/UnboundedSource';

export default class UnboundedReceptacle extends UnboundedSourceMixin(
  Receptacle,
) {}
