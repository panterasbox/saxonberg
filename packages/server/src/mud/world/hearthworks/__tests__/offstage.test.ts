/**
 * The hearthworks parks its cast off-shift — now as **one fact on the
 * house**, plus the one thing this venue has that the lounge does not:
 * ⭐ **two operating rooms**, so a seat has to say which one it stands in.
 *
 * Until the agent-coordination build this was each cast row's `shifts`
 * config repeating `behindBar:` and `offstage:`, with a 30-second poll per
 * person to notice an hourly flip. The behaviour is
 * `EmploymentLogic.shiftMove.test.ts`'s; what is content stays here.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const VENUE = fileURLToPath(
  new URL(
    '../../../../../../content/hearthworks/content/world/terminus/hearthworks/',
    import.meta.url,
  ),
);
const OFFSTAGE = '/world/terminus/hearthworks/location/offstage';
const SMITHY = '/world/terminus/hearthworks/location/smithy';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';

interface Spec {
  brain: string;
}
interface Row {
  class: string;
  data: {
    behaviors?: Spec[];
    offstage?: string;
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

describe('the hearthworks parks its cast through Offstage', () => {
  it("the venue's offstage row is a platform Offstage", () => {
    expect(load('location/offstage.yaml').class).toBe(
      '/platform/location/Offstage',
    );
  });

  it('the HOUSE names it, once', () => {
    expect(load('idea/business.yaml').data.offstage).toBe(OFFSTAGE);
  });

  it('⭐⭐ two rooms, so the COOK’s seat names its station and the smith’s rides the default', () => {
    const biz = load('idea/business.yaml').data;
    // The default is `operatingLocations[0]` — the smithy. A cook sent to
    // the forge is exactly the silent wrongness `station:` exists for.
    expect(biz.operatingLocations?.[0]).toBe(SMITHY);
    const bySeat = new Map(
      (biz.rosterSlots ?? []).map((s) => [s.positionKey, s.station]),
    );
    expect(bySeat.get('cook')).toBe(COOKHOUSE);
    expect(bySeat.get('smith')).toBeUndefined();
  });

  it('⚠ and no cast row names a retired brain', () => {
    for (const [f, row] of cast()) {
      const brains = (row.data.behaviors ?? []).map((b) => b.brain);
      expect(brains, f).not.toContain('/lib/behavior/shifts');
      expect(brains, f).not.toContain('/lib/behavior/covers');
    }
  });
});
