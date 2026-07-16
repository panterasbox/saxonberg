/**
 * StunBaton — a wielded electrical contact weapon (the combat toe-hold). A
 * {@link Weapon} (so it wields, has a Construction — `hafted`, a light blunt
 * — a Material, wear, a grade) composing {@link EnergizedMixin} (its
 * electrodes are held at a taser-ish potential) and {@link SwitchableMixin}
 * (armed / safe).
 *
 * On a landed hit combat routes the shock through
 * `ElectricityApi.shockContact(baton, target)` — a **direct two-terminal
 * contact** (the device completes its own circuit, no ground path needed),
 * inflicting through the shipped `ConditionApi.inflict({mechanism:'shock'})`
 * door, NOT the mechanical covering fold. Low-lethal: a taser-ish high
 * voltage at a body-limited current sits in the tetany band (a disarm), not
 * fibrillation.
 *
 * See docs/subsystems/electricity.md + docs/subsystems/combat.md.
 */

import Weapon from '../equipment/Weapon';
import { EnergizedMixin } from './Energized';
import { SwitchableMixin } from '../boundary/Switchable';

const StunBatonBase = SwitchableMixin(EnergizedMixin(Weapon));

export default class StunBaton extends StunBatonBase {}
