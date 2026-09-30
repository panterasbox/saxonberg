/**
 * ⭐ **The totality gate.** The acceptance criterion this build is
 * judged on, in executable form: *no shipped numeric-with-unit reading
 * is left as bare prose, and every emitted `<quantity>` from a
 * measurement verb carries a channel.*
 *
 * It is written as a **source scan over the perception controllers**
 * rather than as per-controller behavioural assertions, and that is
 * deliberate. A behavioural test only covers the verbs someone
 * remembered to write a test for; the defect this build fixes was
 * precisely a reading nobody had looked at (`analyze electrical`
 * rendered conductivity, resistance and potential through bare
 * `.format()`). The scan fails on a verb that does not exist yet,
 * which is the only version that keeps working after this build ships.
 *
 * If you are here because this test failed after adding a measurement
 * verb: emit the reading with `formatMml(viewer, scale, { channel,
 * via })` rather than `format()`, and pick a channel from
 * {@link MEASURE_CHANNELS}.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  MEASURE_CHANNELS,
  RESERVED_MEASURE_CHANNELS,
  MeasureChannels,
} from '../MeasureChannel';

const PERCEPTION_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../platform/idea/cmd/perception'
);

/**
 * ⭐⭐ The reading CHANNELS, which is where the quantity-rendering moved.
 *
 * `measure`/`analyze` used to be one controller per channel under
 * `cmd/perception/`; a channel is a `Reading` row now and the rung bodies
 * live here. The scan follows them — a totality gate that keeps looking
 * in the old place reads zero and passes, which is the exact failure
 * mode `lint:family` was rebuilt to remove.
 */
const READING_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../platform/idea/reading'
);

function controllerSources(): { name: string; src: string }[] {
  const out: { name: string; src: string }[] = [];
  for (const [dir, suffix] of [
    [PERCEPTION_DIR, 'Controller.ts'],
    [READING_DIR, 'Reading.ts'],
  ] as const) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(suffix)) continue;
      out.push({ name: f, src: readFileSync(join(dir, f), 'utf-8') });
    }
  }
  return out;
}

/**
 * Every measurement channel a source names — the `channel: '<x>'` option
 * passed to `formatMml`, and ⭐ the `mmlChannel()` a `BiomeReading`
 * declares.
 *
 * ⚠ The second form exists because four channels (`temperature`,
 * `pressure`, `humidity`, `gravity`) share one rung body and name their
 * MML channel by RETURNING it. A scan that knew only the option literal
 * reported `thermal` and `gravity` as emitted by nobody — a totality
 * gate quietly going wrong in the direction that reads as a failure, and
 * the same class as a gate going quietly wrong in the direction that
 * reads as a pass.
 */
function channelsIn(src: string): string[] {
  const opts = [...src.matchAll(/channel:\s*'([a-z]+)'/g)].map((m) => m[1]!);
  const declared = [
    ...src.matchAll(/mmlChannel\(\)[^{]*\{\s*return '([a-z]+)';/g),
  ].map((m) => m[1]!);
  /*
   * ⚠⚠ The THIRD form, and it is the one the docstring above predicted.
   * `Reading.bracketed(value, band, seed, channel)` takes the channel as
   * its trailing POSITIONAL argument, so a scan that knew only the
   * option-object literal reported `light` as emitted by nobody — while
   * `measure light` had been printing a bracketed lux figure on that
   * channel the whole time. Same failure mode as `mmlChannel()`, one
   * call shape further along.
   *
   * The window runs from the open paren to the end of the STATEMENT
   * rather than to a matching close paren, because the channel is the
   * last of four arguments and the third is itself a call — a lazy
   * `\)` stops inside `this.seedFor(...)` and never reaches `'light'`.
   */
  const positional = [
    ...src.matchAll(/\bbracket(?:ed|For)\(([^;]{0,240})/g),
  ].flatMap((call) =>
    [...call[1]!.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!)
  );
  return [...opts, ...declared, ...positional];
}

describe('measurement channels — the vocabulary', () => {
  it('every reserved channel is a member of the vocabulary', () => {
    for (const c of RESERVED_MEASURE_CHANNELS) {
      expect(MEASURE_CHANNELS).toContain(c);
    }
  });

  it('every non-reserved channel is emitted by at least one controller', () => {
    const emitted = new Set(
      controllerSources().flatMap((c) => channelsIn(c.src))
    );
    const reserved = new Set<string>(RESERVED_MEASURE_CHANNELS);
    const unreachable = MEASURE_CHANNELS.filter(
      (c) => !reserved.has(c) && !emitted.has(c)
    );
    expect(unreachable).toEqual([]);
  });

  it('every emitted channel is a member of the vocabulary', () => {
    for (const { name, src } of controllerSources()) {
      for (const c of channelsIn(src)) {
        expect(
          MeasureChannels.isMeasureChannel(c),
          `${name} emits unknown channel '${c}'`
        ).toBe(true);
      }
    }
  });
});

/**
 * ⚠ **The one exemption, and why it is not a loosening.**
 *
 * `analyze weather` reports each field as a *signed deviation from the
 * local climate* — "+3 m/s", "−800 Pa". That is a scalar with a unit,
 * so the bare-format rule would catch it, but it is **a difference
 * between two readings, not a reading**, and there is no channel for
 * it: putting a temperature delta on `thermal` would mean a client
 * pinning "thermal" charts absolute temperatures and deltas on one
 * axis — precisely the un-chartable soup the channel vocabulary exists
 * to prevent.
 *
 * So it stays prose deliberately. The exemption is named here, with one
 * entry, rather than expressed by weakening the pattern — a weakened
 * pattern silently exempts the next case too.
 */
const BARE_FORMAT_EXEMPT = new Set(['WeatherReading.ts']);

describe('measurement readings — no bare numerics', () => {
  it('no perception controller renders a Quantity through bare format()', () => {
    // `.format()` returns a plain string — the value reaches the client
    // as characters and has to be re-parsed. `.formatMml()` is the
    // structured path. This is the exact defect found in
    // AnalyzeElectricalController during this build.
    const offenders = controllerSources()
      .filter(({ name }) => !BARE_FORMAT_EXEMPT.has(name))
      .filter(({ src }) => /\$\{[^}]*\.format\(\)/.test(src))
      .map(({ name }) => name);
    expect(offenders).toEqual([]);
  });

  it('the exemption list stays honest — every entry still exists', () => {
    const names = new Set(controllerSources().map((c) => c.name));
    for (const exempt of BARE_FORMAT_EXEMPT) {
      expect(names.has(exempt), `${exempt} no longer exists`).toBe(true);
    }
  });

  it('every formatMml call in a perception controller supplies a channel', () => {
    const offenders: string[] = [];
    for (const { name, src } of controllerSources()) {
      // Each call's argument list, up to the closing paren. Channels
      // always ride an inline object literal, so a call with no
      // `channel:` in it is un-channelled.
      for (const m of src.matchAll(/\.formatMml\(([^;]*?)\)\s*\}/g)) {
        if (!/channel:/.test(m[1]!)) offenders.push(`${name}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
