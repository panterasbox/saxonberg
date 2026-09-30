/**
 * ⭐⭐ **The coach's cabin is five cubic metres of air, and the row is
 * what says so.**
 *
 * `AtmosphericMixin` moved from `Vessel` to `ExitableVessel` in the
 * base-class narrowing build — *a bag is not a place; a thing you can go
 * inside is* — and `Coach` is the only class in the tree on
 * `ExitableVessel`. So this row is the one place in the game where the
 * new claim is actually made, and these are the two halves of it: the
 * class can hold an interior, and the row states one.
 *
 * ⚠ The failure this catches is the silent one. A vessel has no geometry
 * to derive a volume from, so a row that says nothing gets no envelope —
 * which is correct for an open boat and would be a defect here. Nothing
 * else in the tree would notice.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { Vessel } from '@saxonberg/server/mud/lib/stuff/Vessel';
import Coach from '../thing/Coach';

const row = (): Record<string, unknown> =>
  parse(
    readFileSync(
      fileURLToPath(
        new URL(
          '../../content/system/transport/thing/coach.yaml',
          import.meta.url,
        ),
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

const data = (): Record<string, unknown> =>
  row().data as Record<string, unknown>;

describe('⭐⭐ the coach states an interior, which is what gives it air', () => {
  it('Coach composes Atmospheric — through ExitableVessel, not through Vessel', () => {
    expect(MixinApi.hasMixin(Coach, Mixins.Atmospheric)).toBe(true);
    expect(MixinApi.hasMixin(Vessel, Mixins.Atmospheric)).toBe(false);
  });

  it('⭐ the row authors interiorVolume — without it the envelope never runs', () => {
    expect(data().interiorVolume).toBe(5);
  });

  it('⚠ and a material, or the cause sentence names the universe default', () => {
    // "the stone still holds the day" — in a carriage. A coach body is
    // timber, and the envelope's conduction reads it.
    expect(data()._materialPath).toBe('/stuff/idea/material/wood/oak');
  });

  it('⚠ interiorVolume is not interiorCapacity — a cabin is not a tank', () => {
    // `interiorCapacity` is Bulkable's liquid capacity; the barge
    // authors 12000 of it. Conflating them would give a tanker a
    // twelve-thousand-cubic-metre cabin.
    expect(data().interiorCapacity).toBeUndefined();
  });
});
