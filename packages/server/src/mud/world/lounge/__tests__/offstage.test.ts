/**
 * The lounge parks its cast off-shift — now as **one fact on the house**.
 *
 * ⭐ Until the agent-coordination build this was four cast rows each
 * repeating `offstage: /world/lounge/location/offstage` inside a `shifts`
 * brain's config, plus a 30-second poll per person to notice an hourly
 * flip. Presence is a consequence of employment state, so the fact moved
 * to the employer (`offstage:` on the Business, `station:` on the seat)
 * and the move moved to the roster tick.
 *
 * What is left to assert HERE is the content: the row exists, it is an
 * `Offstage`, the house names it, and no cast row names a retired brain.
 * The behaviour is `EmploymentLogic.shiftMove.test.ts`'s.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const VENUE = fileURLToPath(
  new URL(
    '../../../../../../content/saxonberg-lounge/content/world/lounge/',
    import.meta.url,
  ),
);

interface Spec {
  brain: string;
  trigger?: string;
}
interface Row {
  class: string;
  data: {
    name?: string;
    behaviors?: Spec[];
    operatingLocations?: string[];
    rosterSlots?: { positionKey: string; station?: string }[];
  };
}
const load = (rel: string): Row =>
  YAML.parse(readFileSync(`${VENUE}${rel}`, 'utf8')) as Row;
const cast = (): readonly (readonly [string, Row])[] =>
  readdirSync(`${VENUE}agent/`)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => [f, load(`agent/${f}`)] as const);

describe('the lounge: off shift, its cast is out of the narrative', () => {
  it('⭐ the HOUSE says its hands leave the narrative off shift (persistence-model D15) — no room means "nowhere"', () => {
    expect((load('idea/business.yaml').data as { offShift?: string }).offShift).toBe('out');
    expect(() => load('location/offstage.yaml')).toThrow();
  });

  it('⚠ and no cast row names a retired brain', () => {
    // `shifts` and `covers` are gone. A row still naming one would be
    // wired with a warning and then do nothing, forever — the failure
    // class `lint:idle-cadence` exists to catch.
    for (const [f, row] of cast()) {
      const brains = (row.data.behaviors ?? []).map((b) => b.brain);
      expect(brains, f).not.toContain('/lib/behavior/shifts');
      expect(brains, f).not.toContain('/lib/behavior/covers');
    }
  });

  it('every bar seat stands at the bar, so no slot needs a `station`', () => {
    // The house operates one room, so `operatingLocations[0]` is already
    // right for every seat. `station:` is for a house with two.
    const biz = load('idea/business.yaml').data;
    // ⚠ Index 0 is the room; the bar COUNTER follows it (a sale settles at
    // the counter's path — lint:shopfronts) and is never a place to stand.
    expect(biz.operatingLocations![0]).toBe('/world/lounge/location/bar');
    expect(biz.operatingLocations!.filter((p: string) => p.includes('/location/'))).toEqual([
      '/world/lounge/location/bar',
    ]);
    for (const slot of biz.rosterSlots ?? []) {
      expect(slot.station, slot.positionKey).toBeUndefined();
    }
  });
});
