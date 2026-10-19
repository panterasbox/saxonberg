/**
 * PoolBottom — what sank (storage-and-ice D12). A shut holder at the
 * bottom of a pool: when the ice goes out, whatever was left on it that is
 * denser than water goes here, kept but unreachable — neither perceived
 * nor reachable through a shut `Sealable` — until diving exists (the
 * underwater slate's verb is what opens it).
 */

import Holder from '@saxonberg/server/mud/lib/stuff/Holder';
import { SealableMixin } from '@saxonberg/server/mud/lib/spatial/Sealable';

export default class PoolBottom extends SealableMixin(Holder) {}
