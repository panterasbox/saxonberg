/**
 * AssayKit — ⭐ the CARRIED rung of the assay ladder.
 *
 * A folding balance, a nest of weights, bone-ash cupels and a furnace
 * the size of a purse. Everything a bench does, slower and worse, and
 * wherever you happen to be standing.
 *
 * ## ⚠⚠ Why this is a CLASS and not just the row it was
 *
 * `assay-kit.yaml` shipped as a plain `/platform/thing/ToolItem` row for
 * a whole build — declaring the `assay-scale` capability, propped in the
 * assay shed, named by the mining archetype — and **nothing could be
 * done with it**, because there was no verb. The verb arrives with this
 * build, and a verb affordance is a **static on a class**: a row's
 * `commandContributions:` is discarded at hydration without a word.
 *
 * So the kit needs three lines of code it did not need before, and they
 * are these. Nothing else about it changes.
 *
 * ⭐ Same capability as the bench, deliberately. They are two rungs of
 * one act and they differ in time, in fee and in ceiling — never in
 * access. `AssayController` tells them apart on `fixedInPlace`.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class AssayKit extends ToolItem {
  /**
   * ⚠⚠ **`environment`, not `inventory` — the bucket means the OPPOSITE
   * of what it sounds like.**
   *
   * `inventory` grants INWARD: a container affords a verb to the things
   * it swallowed (*a pack that affords `rummage` affords it to what it
   * swallowed, however deep*). What is wanted here is the outward push —
   * a thing afford ing its verb to whoever is holding it and to the room
   * it is standing in — and that is `environment`, which goes to every
   * ancestor. The ten shipped platform instruments used exactly this
   * pair, under a doc comment that said "inventory".
   *
   * ⭐ Found by driving: `assay the ore` with the lump in hand answered
   * *"I don't understand 'assay'"*, which is the affordance link failing
   * closed and silent — the fourth of the five, and the one this build
   * has now tripped over twice.
   */
  static override commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/mining/cmd/mining/assay.yaml'],
    peers: ['trade/mining/cmd/mining/assay.yaml'],
  };
}
