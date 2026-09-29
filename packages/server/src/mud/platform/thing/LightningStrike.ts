/**
 * LightningStrike — the storm's transient, and a CONCRETE class.
 *
 * ⚠ It lived in `lib/weather/` under the "instanced but never stamped"
 * carve-out, which the create→clone sweep dissolved: it is stamped now,
 * from `/platform/thing/LightningStrike`. A `platform/` TWIN over the
 * `lib/` original was the first attempt and it does not work here —
 * `EnergizedMixin.conduct` is `@Final`, and an empty subclass of a
 * final-bearing mixin is refused at import. Instanceable lives in
 * `platform/<branch>/`; that is the rule, and this is now an ordinary
 * case of it.
 *
 * (was:) LightningStrike — the transient high-potential source a storm strike
 * mints, routes through the shipped `ElectricityApi.conduct`, and destructs
 * (weather Wave 2). It is **engine-event content**, not authored/placed room
 * content: minted imperatively in the strike fan-out (the `conduct` /
 * `SustainedShock` precedent), lives for a single conduction event, and is
 * reaped. The declarative-content rule governs *placed* content; an ambient
 * strike is a world event.
 *
 * Composition = `EnergizedMixin` (it imposes a potential, ~tens of MV) ⊕
 * `AudibleMixin` (it cracks a thunderclap the whole locale hears) over a
 * plain describable `Thing`. Held at the `storm.strikeVoltage` dial.
 */

import Thing from '../../lib/stuff/Thing';
import { VisibleMixin } from '../../lib/description/Visible';
import { AudibleMixin } from '../../lib/perception/Audible';
import { EnergizedMixin } from '../../lib/electricity/Energized';

const LightningStrikeBase = EnergizedMixin(AudibleMixin(VisibleMixin(Thing)));

export default class LightningStrike extends LightningStrikeBase {}
