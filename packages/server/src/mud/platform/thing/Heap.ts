/**
 * Heap — **what a broom leaves you holding** (cleanliness D15, D20): a heap
 * of sweepings off a kept floor, a heap of muck out of a byre. `dispose` is
 * the heap's verb, offered to whoever carries one — so it is always there
 * to try, and the refusal says what lifts it (*there is no midden here*).
 * Where it goes is the `on <midden>` arg: a midden is a bulk holder a heap
 * rots down in for the field.
 *
 * ⭐ ONE heap per sweep, not a stack of tenths (B-series drive finding:
 * "24 heap of sweepingss") — so this extends `Good`, never a stack.
 */

import Good from '../../lib/stuff/Good';
import type { CommandContributions } from '../../api/command';

export default class Heap extends Good {
  static commandContributions: CommandContributions = {
    // `environment` — to whoever HOLDS it.
    environment: ['platform/cmd/inventory/dispose.yaml'],
  };
}
