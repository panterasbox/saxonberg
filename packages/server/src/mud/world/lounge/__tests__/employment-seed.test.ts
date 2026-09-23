/**
 * Employment seed integrity + wiring — validates the authored Business seed
 * (`business.yaml`) and that its roster actually drives on-shift state and
 * the order-fulfilment capability. Reads the real seed data (so a bad edit
 * is caught here, not at spawn) and runs it through the engine end to end.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { EmploymentApi } from '../../../api/employment';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../../lib/quantity';
import BusinessEntity from '../../../platform/idea/Business';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainmentApi } from '../../../api/containment';
import { EmployedMixin } from '../../../lib/employment/Employed';
import { MixinApi } from '../../../api/mixin';
import { Idea } from '../../../lib/stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

const SEED = fileURLToPath(
  new URL('../../../../../../content/saxonberg-lounge/content/world/lounge/idea/business.yaml', import.meta.url),
);
const BUSINESS = '/world/lounge/idea/business';
const DAVE = '/world/lounge/agent/dave';

interface BizDoc {
  class: string;
  data: {
    appointingAuthority: { kind: string; path?: string };
    positions: { key: string; wageRate: number; fulfills?: boolean }[];
    rosterSlots: { positionKey: string; assignee: string; schedule: unknown[] }[];
    operatingLocations: string[];
  };
}

function loadSeed(): BizDoc {
  return YAML.parse(readFileSync(SEED, 'utf8')) as BizDoc;
}

// A staff-shaped host: employable, and able to stand behind the bar.
// ⭐ It composes NO capability — since the trades-and-labor build the bar
// staff are plain `Cast`, and what lets the one on shift serve an `order`
// is the house's `fulfills` SEAT, read off the shift, in a room the house
// operates. A player in the same seat gets exactly the same answer.
class Staff extends EmployedMixin(ContainableMixin(Idea)) {
  static _mixinName = 'Staff';
}
class BarRoom extends ContainerMixin(Idea) {
  static _mixinName = 'EmploymentSeedBar';
}
const BAR = '/world/lounge/location/bar';

/** Stand a staff member behind the bar — the "here" leg of `isFulfilling`. */
function behindBar(path: string): Staff {
  const who = makeStuffAtPath(() => new Staff(), path);
  const bar =
    StuffApi.findByTemplatePath<BarRoom>(BAR) ??
    makeStuffAtPath(() => new BarRoom(), BAR);
  ContainmentApi.move(who as never, bar as never);
  return who;
}

describe("Dave's Bar — Business seed integrity", () => {
  it('resolves the class and the proprietor edge', () => {
    const doc = loadSeed();
    expect(doc.class).toBe('/platform/idea/Business');
    // Dave owns the bar. The edge is now spelled as the `entity` case of
    // the appointing authority — same fact, same value, under the name
    // every organization uses.
    expect(doc.data.appointingAuthority).toEqual({
      kind: 'entity',
      path: DAVE,
    });
  });

  it('authors the bartender position as the FULFILLING seat', () => {
    const doc = loadSeed();
    const bartender = doc.data.positions.find((p) => p.key === 'bartender');
    expect(bartender).toBeDefined();
    expect(bartender!.wageRate).toBeGreaterThan(0);
    expect(bartender!.fulfills).toBe(true);
    // ⚠ And the house must name where it operates, or the seat grants
    // nothing: `isFulfilling` is employer-bounded.
    expect(doc.data.operatingLocations).toContain(BAR);
  });

  it('rosters the four staff (Sloane keeps the midnight-wrap window; Mara also keeps the bar)', () => {
    const doc = loadSeed();
    const assignees = [...new Set(doc.data.rosterSlots.map((s) => s.assignee))].sort();
    expect(assignees).toEqual([
      '/world/lounge/agent/augie',
      '/world/lounge/agent/mara',
      '/world/lounge/agent/remy',
      '/world/lounge/agent/sloane',
    ]);
    // The keeper seat — the one that BUYS for the house (`purchases`) —
    // is Mara's on her tending window, unpaid.
    const keeper = doc.data.positions.find((p) => p.key === 'keeper') as
      | { purchases?: boolean; wageRate: number }
      | undefined;
    expect(keeper?.purchases).toBe(true);
    expect(keeper?.wageRate).toBe(0);
    expect(
      doc.data.rosterSlots.filter((s) => s.positionKey === 'keeper').map((s) => s.assignee),
    ).toEqual(['/world/lounge/agent/mara']);
    const sloane = doc.data.rosterSlots.find((s) =>
      s.assignee.endsWith('sloane'),
    );
    expect(sloane!.schedule).toHaveLength(2); // 22–24 + 0–6
    expect(doc.data.operatingLocations).toContain('/world/lounge/location/bar');
  });
});

describe("Dave's Bar — Business seed drives the engine", () => {
  let biz: BusinessEntity;

  beforeEach(() => {
    StuffApi.clearAll();
    const doc = loadSeed();
    biz = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
    biz.appointingAuthority = doc.data.appointingAuthority as never;
    biz.positions = doc.data.positions as never;
    biz.rosterSlots = doc.data.rosterSlots as never;
    biz.operatingLocations = doc.data.operatingLocations;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function atClock(weekday: number, hour: number): void {
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(
      Quantity.of(weekday * 86_400 + hour * 3_600, 's'),
    );
  }

  it('materializes an Employment per assignee and selects the on-shift maker', () => {
    const mara = behindBar('/world/lounge/agent/mara');
    const remy = behindBar('/world/lounge/agent/remy');

    atClock(2, 10); // Wednesday 10:00 — Mara's window, not Remy's
    EmploymentApi.tickRoster();

    expect(mara.getEmployment(BUSINESS)?.status).toBe('on-shift');
    expect(remy.getEmployment(BUSINESS)?.status).toBe(
      'off-shift',
    );
    // The order-fulfilment selection: only the on-shift bartender serves.
    expect(mara.isFulfilling()).toBe(true);
    expect(remy.isFulfilling()).toBe(false);
  });

  it('lets the proprietor cover — a valid fulfiller, unpaid — then stand down', () => {
    const dave = behindBar(DAVE);
    atClock(2, 10);

    expect(dave.isFulfilling()).toBe(false); // not covering yet
    dave.beginCovering(biz);
    // ⭐ The cover lands on the house's FULFILLING seat, not on
    // `positions[0]` — a proprietor steps behind the bar to serve, not
    // into the bookkeeping.
    expect(dave.isFulfilling()).toBe(true);
    // The cover is proprietor-held, so it is unpaid + never rostered.
    expect(dave.getEmployment(BUSINESS)?.status).toBe('on-shift');

    dave.endCovering(biz);
    expect(dave.isFulfilling()).toBe(false); // stood down
    expect(dave.getEmployment(BUSINESS)).toBeUndefined();
  });
});
