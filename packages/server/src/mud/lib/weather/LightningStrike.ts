/**
 * LightningStrike — the transient high-potential source a storm strike
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

import Thing from '../stuff/Thing';
import { VisibleMixin } from '../description/Visible';
import { AudibleMixin } from '../perception/Audible';
import { EnergizedMixin } from '../electricity/Energized';

const LightningStrikeBase = EnergizedMixin(AudibleMixin(VisibleMixin(Thing)));

export default class LightningStrike extends LightningStrikeBase {}
