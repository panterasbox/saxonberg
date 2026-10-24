/**
 * Shore — ⭐ **a place beside a named water** (maritime revision 3): a
 * mere's shore, a heath by its tarn, a ship's deck, a beach.
 *
 * The one thing this class adds over {@link Locale}
 * is {@link ShoreMixin}: a row declares which of its own features is
 * which water (`waters: { mere: blackmere:mere }`), and looking at that
 * feature reads the water. Being beside water is a fact about SOME
 * places, so it is a class those rows pick — never a field every room
 * carries blank (`Street`'s correction, followed). A lit public
 * waterfront is {@link Quay}.
 */

import { FrameSitedMixin } from '../../lib/expanse/FrameSited';
import Locale from './Locale';
import { ShoreMixin } from '../../lib/location/Shore';

export default class Shore extends FrameSitedMixin(ShoreMixin(Locale)) {}
