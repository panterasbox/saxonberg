/**
 * CuttingTool — what `cut` is done WITH.
 *
 * ⭐⭐ **The instrument affords the verb, never the furniture.** Every
 * other trade in this build already worked this way — `spin` comes from
 * `SpinningTool` (a drop spindle *or* a wheel), `weave` from `Loom` (a
 * hand loom *or* a broad loom) — and tailoring was the one place a verb
 * hung off a room fixture. That made `cut` impossible anywhere but a
 * shop, which is wrong: shears and a length of cloth are enough to cut
 * a shirt out in a field, and the reason not to is that you waste cloth
 * doing it.
 *
 * ⭐ So both rungs are rows over THIS class and nothing else changes:
 * `shears` (portable, rate 1, coarse) and `cutting-table` (fixed,
 * rate 2, fine). A tool variant is pure seed data — the drop-spindle
 * row says so in as many words.
 *
 * ⚠ The verb affordance is a STATIC ON THE CLASS; a row's
 * `commandContributions:` is dead silently.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const CUTTING = ['trade/tailoring/cmd/tailoring/cut.yaml'];

export default class CuttingTool extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: CUTTING,
    peers: CUTTING,
  };
}
