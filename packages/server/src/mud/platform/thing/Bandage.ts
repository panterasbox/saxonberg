/**
 * Bandage — the canonical concrete **dressing**: `DressingMixin(Good)`,
 * a simple single-use consumable that `treat` spends to dress a bleed
 * (the `Coin = StackableMixin(Good)`
 * precedent — a Thing plus one capability mixin). Any dressing-capable
 * item (gauze, a clean rag) qualifies for `treat` too; `treat` gates on
 * `MixinApi.isDressing`, not `instanceof Bandage`.
 *
 * v1 stocks bandages as shipped content; sourcing them (crafting bandages,
 * first-aid kits, sterility tiers) is out of scope — see harm.md.
 */

import Good from '../../lib/stuff/Good';
import { DressingMixin } from '../../lib/vitals/Dressing';

export default class Bandage extends DressingMixin(Good) {}
