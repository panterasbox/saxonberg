/**
 * LiveWire — a downed, energized cable: the mundane electrical **source** of
 * the flooded-cell demonstrator. A `Thing` (so it has a Material + is
 * Containable — it lies in the water) composing {@link EnergizedMixin} (it is
 * held at a mains-ish potential, ~120–240 V) and {@link SwitchableMixin} (it
 * can be de-energized — a switched-off wire is dead, and the conduction walk
 * reads that). Perceptible so `look` describes it.
 *
 * No behavior of its own: it just *imposes a potential* into the room's
 * conductive-contact graph. `ElectricityApi.conduct(wire)` does the rest —
 * everyone bridged to it through the water + `Floor` takes the current that
 * passes through them. This is the generalizable seam: the deferred wall
 * socket and the magic Lightning bolt are the same `Energized` source.
 *
 * See docs/subsystems/electricity.md.
 */

import Thing from '../lib/stuff/Thing';
import { VisibleMixin } from '../lib/description/Visible';
import { DetailedMixin } from '../lib/description/Detailed';
import { SwitchableMixin } from '../lib/boundary/Switchable';
import { EnergizedMixin } from '../lib/electricity/Energized';

const LiveWireBase = SwitchableMixin(
  EnergizedMixin(DetailedMixin(VisibleMixin(Thing))),
);

export default class LiveWire extends LiveWireBase {}
