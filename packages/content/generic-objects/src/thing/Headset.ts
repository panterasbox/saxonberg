/**
 * Headset — ⭐ **the aether implant, worn** (size and carrying D34, W6).
 *
 * The same augment as the cranial implant (it confers `AetherMixin` —
 * `MixinApi.getActiveMixins` reads every slot occupant's `confers()`, not
 * only the cranial bay's), made `Wearable` so `wear headset` seats it in
 * the head slot its row claims. A guest, or a species that refuses an
 * implant, sends a thought with no phone in hand.
 *
 * Why a class: the plan expected a row alone (`targetSlot: head`), but no
 * code reads `targetSlot` — the implant reaches the cranial bay through
 * `Avatar.installDefaultLoadout` by name, and the head slot accepts only
 * a `WearableMixin`. The headset is the one augment you put on.
 */

import AetherImplant from '@saxonberg/server/mud/platform/thing/AetherImplant';
import { WearableMixin } from '@saxonberg/server/mud/lib/slot/Wearable';

export default class Headset extends WearableMixin(AetherImplant) {}
