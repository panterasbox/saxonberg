/**
 * MeasureChannel — the measurement-channel vocabulary.
 *
 * A **measurement channel** answers *what kind of reading is this?* — the
 * stable identity a client pins to an instrument panel, charts as a
 * series, or groups a filter around. It is emitted as the `channel`
 * attribute on the `<quantity>` MML tag (see {@link Quantity}), so a
 * temperature reading and a pressure reading are distinguishable as
 * *kinds* rather than by parsing the prose that renders them.
 *
 * ⚠ **This is NOT `lib/material/Channel.ts`.** That vocabulary
 * (`edge` · `point` · `blunt` · `shock` · `heat`) is the *mechanism*
 * channel — the shape of the force a blow transacts over, read by the
 * materials-response fold. The two lists are **homonyms with unrelated
 * meanings at unrelated layers**: `heat` there is how a blow damages a
 * body; `thermal` here is a category of instrument reading. Merging
 * them, or importing one where the other is meant, is a bug — nothing
 * in this file may import from `lib/material/Channel`.
 *
 * **Closed, and grows with a release.** A channel earns its place when
 * a client would plausibly want to pin, chart or filter that class of
 * reading as one thing. The verb that produced a reading and the depth
 * it was taken at are *frame data*; only the kind is identity — which
 * is why `measure light` and `analyze light` share the `light` channel
 * rather than splitting by which verb ran.
 *
 * The `Channel` / `Grade` / `ToolCapability` value-object precedent: a
 * closed vocabulary tuple + its type + a thin static holder. No
 * behavior here.
 */

/**
 * The known measurement channels.
 *
 * The **emitting** channels each back at least one shipped reading:
 *
 * | Channel | Readings |
 * |---|---|
 * | `thermal` | temperature |
 * | `mass` | mass |
 * | `light` | intensity, luminous flux, colour temperature |
 * | `atmosphere` | pressure, humidity, wind, air density |
 * | `chemistry` | material density, molar mass |
 * | `electrical` | conductivity, contact resistance, potential |
 * | `spatial` | altitude, volume, ceiling height |
 * | `gravity` | gravitational acceleration |
 * | `celestial` | sun altitude + azimuth |
 *
 * The **reserved** channels — `weather`, `time`, `response` — name
 * readings that ship today as prose because they are not a scalar with
 * a unit: a weather sample is qualitative, a clock reading is a
 * timestamp, and the materials resist/deliver readout is a grid. They
 * are listed so the vocabulary is complete over the measurement verbs
 * and so a later build has a name to attach to, but nothing emits them
 * and the totality test does not require an emitter for them.
 *
 * ⚠ `spatial`, `gravity` and `celestial` are three channels where an
 * earlier draft had one (`position`). Altitude, gravitational field
 * strength and a sun angle are things a player would pin separately —
 * collapsing them would have made a "position" panel that mixes metres,
 * m/s² and degrees, which is exactly the un-chartable soup the channel
 * exists to prevent.
 */
export const MEASURE_CHANNELS = [
  'thermal',
  'mass',
  'light',
  'atmosphere',
  'chemistry',
  'electrical',
  'spatial',
  'gravity',
  'celestial',
  'weather',
  'time',
  'response',
] as const;

/**
 * Channels with no scalar emitter today — see the note on
 * {@link MEASURE_CHANNELS}. Exported so the totality test can assert
 * "every channel is either emitted or deliberately reserved" rather
 * than silently tolerating an unreachable name.
 */
export const RESERVED_MEASURE_CHANNELS = [
  'weather',
  'time',
  'response',
] as const;

/** A measurement channel — one of {@link MEASURE_CHANNELS}. */
export type MeasureChannel = (typeof MEASURE_CHANNELS)[number];

/** Thin static holder, mirroring `Channels` in `lib/material/Channel`. */
export class MeasureChannels {
  /** Whether `value` names a known measurement channel. */
  public static isMeasureChannel(value: string): value is MeasureChannel {
    return (MEASURE_CHANNELS as readonly string[]).includes(value);
  }
}
