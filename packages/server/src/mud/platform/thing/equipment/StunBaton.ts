/**
 * StunBaton — a wielded electrical contact weapon (the combat toe-hold). A
 * {@link Weapon} (so it wields, has a Construction — `hafted`, a light blunt
 * — a Material, wear, a grade) composing {@link EnergizedMixin} (its
 * electrodes are held at a taser-ish potential) and {@link SwitchableMixin}
 * (armed / safe).
 *
 * The shock rides the **instrument seam** (the combat hook grammar):
 * `EnergizedMixin` composes `CombatReactiveMixin`, and its
 * `augmentInflict` queues `ctx.deliverShock(this)` — the combat engine
 * drains the queue right after the mechanical inflict, delivering a
 * **direct two-terminal contact** through
 * `ElectricityApi.shockContact(baton, target)` (the device completes its
 * own circuit, no ground path needed), inflicting through the shipped
 * `ConditionApi.inflict({mechanism:'shock'})` door, NOT the mechanical
 * covering fold. A switched-off baton truthfully delivers nothing (the
 * `effectiveVoltage ≤ 0` guard in the conduction walk). Low-lethal: a
 * taser-ish high voltage at a body-limited current sits in the tetany
 * band (a disarm), not fibrillation.
 *
 * See docs/subsystems/electricity.md + docs/subsystems/combat.md.
 */

import Weapon from './Weapon';
import { EnergizedMixin } from '../../../lib/electricity/Energized';
import { SwitchableMixin } from '../../../lib/boundary/Switchable';

const StunBatonBase = SwitchableMixin(EnergizedMixin(Weapon));

export default class StunBaton extends StunBatonBase {}
