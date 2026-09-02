/**
 * FermentProfile — the instanceable concrete over the `lib/ferment/`
 * substrate class (the Material precedent: the abstract home stays in
 * `lib/`, templates name THIS path). Every ferment-profile row's
 * `class:` is `/platform/idea/ferment/FermentProfile`; rows themselves
 * live under their owning pack's `idea/ferment/` subtree.
 */

import FermentProfileBase from '../../../lib/ferment/FermentProfile';

export default class FermentProfile extends FermentProfileBase {}
