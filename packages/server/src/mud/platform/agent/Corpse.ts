/**
 * Corpse — what a Creature leaves behind.
 *
 * The one template that cloned `Creature` directly was
 * `/stuff/agent/Corpse`, and a corpse is a game object rather than a
 * generic creature: it is the forensic record of a death, searchable,
 * carryable, and decaying. `Creature` itself is mid-spine substrate
 * (`Agent -> Creature -> Character`) and should not be cloned to make
 * one.
 *
 * So rather than a generic concrete creature, the corpse gets its own
 * class and its own name. Behavior is inherited unchanged — the
 * forensic-Creature role is exactly as documented in
 * docs/subsystems/mortality.md.
 *
 * See CLAUDE.md § Instanceable Lives in `obj/`.
 */

import { Creature } from '../../lib/creature/Creature';

export default class Corpse extends Creature {}
