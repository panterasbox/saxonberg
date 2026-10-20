/**
 * TakesFish — ⭐ **a tool that takes a fish itself, there and then**
 * (underwater review): a fish spear in the lit band. `fish` is the one
 * verb for taking fish; a rod answers it with a cast and a wait (the
 * `FishingEngagement`), and a tool that speaks this shape answers it with
 * its own act — the thing decides what fishing with it means (the
 * `Pullable` precedent; ⛔ never a second verb named for the tool).
 *
 * Not a mixin: nothing about it is shared state. `FishController` narrows
 * by SHAPE.
 */

import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** What one try came to, in the tool's own words. */
export type TakeFishOutcome = { ok: true; line: string } | { ok: false; reason: string; line: string };

/** The protocol: a tool you fish with by striking, not by waiting. */
export interface TakesFish {
  takeFishBy(actor: Stuff): Promise<TakeFishOutcome>;
}
