/**
 * Quay — ⭐ **a lit public waterfront** (maritime revision 3): a street
 * the town lights that is also beside a named water — the wharfside bank
 * at the confluence.
 *
 * {@link Street} with {@link ShoreMixin}. ⭐ A public quay is civic
 * infrastructure in the design-lenses sense: it makes access to the
 * river common, away from whoever owns the private wharves.
 */

import Street from './Street';
import { ShoreMixin } from '../../lib/location/Shore';

export default class Quay extends ShoreMixin(Street) {}
