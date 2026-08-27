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
import BusinessEntity from '../../../obj/Business';
import { MakerMixin } from '../../../lib/craft/Maker';
import { EmployedMixin } from '../../../lib/employment/Employed';
import { MixinApi } from '../../../api/mixin';
import { Idea } from '../../../lib/stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

const SEED = fileURLToPath(
  new URL('../../../../../../content/world-seed/content/world/lounge/business.yaml', import.meta.url),
);
const BUSINESS = '/world/lounge/business';
const DAVE = '/world/lounge/npc/dave';

interface BizDoc {
  class: string;
  data: {
    appointingAuthority: { kind: string; path?: string };
    positions: { key: string; wageRate: number; confers: string[] }[];
    rosterSlots: { positionKey: string; assignee: string; schedule: unknown[] }[];
    operatingLocations: string[];
  };
}

function loadSeed(): BizDoc {
  return YAML.parse(readFileSync(SEED, 'utf8')) as BizDoc;
}

// A Crafter-shaped host: gated MakerMixin + EmployedMixin (Dave and the
// rostered staff are `Crafter`s = MakerMixin(NPC), NPC being a Character).
class Staff extends MakerMixin(EmployedMixin(Idea)) {
  static _mixinName = 'Staff';
}

describe("Dave's Bar — Business seed integrity", () => {
  it('resolves the class and the proprietor edge', () => {
    const doc = loadSeed();
    expect(doc.class).toBe('/obj/Business');
    // Dave owns the bar. The edge is now spelled as the `entity` case of
    // the appointing authority — same fact, same value, under the name
    // every organization uses.
    expect(doc.data.appointingAuthority).toEqual({
      kind: 'entity',
      path: DAVE,
    });
  });

  it('authors the bartender position conferring MakerMixin', () => {
    const doc = loadSeed();
    const bartender = doc.data.positions.find((p) => p.key === 'bartender');
    expect(bartender).toBeDefined();
    expect(bartender!.wageRate).toBeGreaterThan(0);
    expect(bartender!.confers).toContain('MakerMixin');
  });

  it('rosters the four staff (Sloane keeps the midnight-wrap window)', () => {
    const doc = loadSeed();
    const assignees = doc.data.rosterSlots.map((s) => s.assignee).sort();
    expect(assignees).toEqual([
      '/world/lounge/npc/augie',
      '/world/lounge/npc/mara',
      '/world/lounge/npc/remy',
      '/world/lounge/npc/sloane',
    ]);
    const sloane = doc.data.rosterSlots.find((s) =>
      s.assignee.endsWith('sloane'),
    );
    expect(sloane!.schedule).toHaveLength(2); // 22–24 + 0–6
    expect(doc.data.operatingLocations).toContain('/world/lounge/bar');
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
    const mara = makeStuffAtPath(() => new Staff(), '/world/lounge/npc/mara');
    const remy = makeStuffAtPath(() => new Staff(), '/world/lounge/npc/remy');

    atClock(2, 10); // Wednesday 10:00 — Mara's window, not Remy's
    EmploymentApi.tickRoster();

    expect(mara.getEmployment(BUSINESS)?.status).toBe('on-shift');
    expect(remy.getEmployment(BUSINESS)?.status).toBe(
      'off-shift',
    );
    // The order-fulfilment selection: only the on-shift bartender is a maker.
    expect(MixinApi.isMaker(mara)).toBe(true);
    expect(MixinApi.isMaker(remy)).toBe(false);
  });

  it('lets the proprietor cover — a valid maker, unpaid — then stand down', () => {
    const dave = makeStuffAtPath(() => new Staff(), DAVE);
    atClock(2, 10);

    expect(MixinApi.isMaker(dave)).toBe(false); // not covering yet
    EmploymentApi.beginCover(dave, biz);
    expect(MixinApi.isMaker(dave)).toBe(true); // covering → a valid maker
    // The cover is proprietor-held, so it is unpaid + never rostered.
    expect(dave.getEmployment(BUSINESS)?.status).toBe('on-shift');

    EmploymentApi.endCover(dave, biz);
    expect(MixinApi.isMaker(dave)).toBe(false); // stood down
    expect(dave.getEmployment(BUSINESS)).toBeUndefined();
  });
});
