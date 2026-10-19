/**
 * AshPit — a shallow pit an ash-burner keeps a big, open, hungry fire in,
 * to burn wood all the way to ASH (potash D2).
 *
 * ⭐ It is simply a big Burner. Its fuel is the wood — `stoke pit with
 * brash`, `ignite pit`, `draught pit wide`, `sweep pit` — and the shipped
 * grate rule does the rest: every kilogram burnt leaves its wood's ash
 * fraction in the bed, with its alkali, and the sweep rakes it out in heaps
 * whose strength is what burned. No verb, no mixin and no override: the
 * Burner's own affordances reach it (a class static here would SHADOW the
 * mixin's list).
 *
 * Why its own class: every kernel twin of the firebox chain adds something
 * an open pit has not got — a flue (Hearth), a seat (Campfire), room heat
 * (Brazier) — and `Forge` is a forge by name. A charcoal clamp would
 * afford `char`, which is the wrong word for a fire meant to burn through.
 */
import Firebox from '@saxonberg/server/mud/lib/fire/Firebox';

export default class AshPit extends Firebox {}
