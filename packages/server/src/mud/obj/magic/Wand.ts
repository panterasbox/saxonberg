/**
 * Wand — the **charged** item class: a shell with a battery and a
 * pre-formed specification.
 *
 * Point it and it fires the working bound into it, spending its own
 * stored energy rather than yours. That is the whole of D5's first
 * class, and it is why a novice with a master-made wand genuinely
 * outperforms that novice casting: the maker passed the competence gate
 * at manufacture, and the user is spending stored labour.
 *
 * `Wand` is the generic concrete class rings, amulets and orbs share the
 * substrate with — what distinguishes those is `alwaysOn` (D8), not a
 * different class. A ring that confers its effect continuously draws
 * continuously and flattens in days; a stowed wand lasts months.
 * **Always-on is the expensive mode**, and it is one field.
 *
 * ⚠ Two things this class must NOT do, both of which would ship as bugs:
 *
 * - **No per-class verb variation** (D34). A fire wand must not afford
 *   `scorch` and a lightning wand `shock`, or the verb list identifies
 *   them. Every wand affords the same `zap`, declared once on the
 *   capability.
 * - **A depleted wand still affords `zap`.** If a flat item stopped
 *   affording its verb, the affordance list would become a free charge
 *   meter — and charge is meant to need an instrument to read. Zapping a
 *   dead wand fails audibly instead.
 */

import Thing from '../../lib/stuff/Thing';
import { ReservedMixin } from '../../lib/reserve';
import { ArcaneMixin } from '../../lib/magic/Arcane';
import { ChargedMixin } from '../../lib/magic/Charged';

// `ChargedMixin` stores its energy in a `Reserve` rather than a bare
// number — the same substrate mana, endurance and fuel use — so
// `ReservedMixin` is its prerequisite and is composed beneath it.
const WandBase = ChargedMixin(ReservedMixin(ArcaneMixin(Thing)));

export default class Wand extends WandBase {}
