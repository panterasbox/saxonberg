/**
 * Tinker — the mender on the road (repair D14, D15): he walks a round of
 * stops — his yard, the valley crossroads, the valley gate, the Rejection
 * smelter — and mends what people bring him at whichever he is at. The
 * round is the roster's (slots with stations); the mend is the kernel's.
 *
 * ⭐ The class exists for ONE reason: he is born holding his kit, and a
 * bare `NPC` row cannot author held kit (`costume:` takes only wearables).
 * `StagedMixin` brings `props:` — the Katie/Walter/Realtor shape. ⚠ It
 * also brings `cast:`, which no person should claim; composing it on the
 * kernel `NPC` would claim every NPC may contain a cast of people. The
 * honest fix is the `props`-only split `platform/agent/Gus.ts` files —
 * this is its fifth receipt.
 */

import NPC from "@saxonberg/server/mud/lib/npc/NPC";
import { CastMixin } from "@saxonberg/server/mud/lib/npc/Cast";
import { StagedMixin } from "@saxonberg/server/mud/lib/stuff/Staged";

export default class Tinker extends CastMixin(StagedMixin(NPC)) {}
