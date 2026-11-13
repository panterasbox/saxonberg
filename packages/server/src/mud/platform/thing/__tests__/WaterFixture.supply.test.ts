/**
 * A fixture gives what its SUPPLY gives (water-supply build, D2–D4, D7).
 *
 * ⭐⭐ A tap resolves its premises, asks the parcel registry where that
 * premises takes its water, loads the supply on use, and reads it — or
 * reads `unplumbed`. A natural source runs on its own water. Before it has
 * resolved, a fixture is EMPTY and says nothing (fail closed — the fail-open
 * warn it replaced let a tap on an unloaded main run forever).
 *
 * ⭐ Pressure is head: the supply's water surface against the outlet's own
 * height. Little head and a draw gives a trickle; none and nothing comes.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaterFixture from '../WaterFixture';
import Good from '../../../lib/stuff/Good';
import Room from '../../location/Room';
import PersistentRoom from '../../location/PersistentRoom';
import PipeRun from '../PipeRun';
import Street from '../../location/Street';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { ParcelApi } from '../../../api/parcel';
import { ZoneApi } from '../../../api/zone';
import { ContainmentApi } from '../../../api/containment';
import { Mml } from '../../../api/mml';
import type { SupplyReport, SupplyState } from '../../../lib/supply/SupplyState';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

/** A pipe run whose row carries water (load-on-use W8: `carries:` is content). */
function waterRun(): PipeRun {
  const p = new PipeRun();
  p.setCarries('/stuff/idea/material/bulk/water');
  return p;
}

const MAIN = '/test/thing/main';

/** A supply in the `WaterSupply` shape: a main, or (with a level) a store. */
class FakeSupply extends Good {
  public state: SupplyState | null = null;
  public headM: number | null = null;
  public levelL = Infinity;
  public drawn = 0;
  supplyStateNow(): SupplyState | null {
    return this.state;
  }
  async supplyHeadM(): Promise<number | null> {
    return this.headM;
  }
  drawL(litres: number): number {
    const given = Math.min(litres, this.levelL);
    this.drawn += given;
    if (Number.isFinite(this.levelL)) this.levelL -= given;
    return given;
  }
  availableL(): number {
    return this.state === null ? this.levelL : 0;
  }
  public share = 1;
  serves(): boolean {
    return true;
  }
  async shareFor(): Promise<number> {
    return this.share;
  }
  async supplyReport(): Promise<SupplyReport> {
    return { label: 'the main', state: this.state, lines: ['it is the main'] };
  }
  /** The chemistry this main says it carries; `null` = it cannot say. */
  public chemistry: { pH: number; hardnessDgh: number; salinityPpt: number; fouled?: boolean } | null =
    null;
  async readWaterChemistry(): Promise<
    { pH: number; hardnessDgh: number; salinityPpt: number; fouled?: boolean } | null
  > {
    return this.chemistry;
  }
  async readWaterHardnessDgh(): Promise<number | null> {
    return this.chemistry?.hardnessDgh ?? null;
  }
}

function water(): Material {
  const made = StuffApi.findByTemplatePath<Material>('/stuff/idea/material/bulk/water');
  if (made) return made;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    return m;
  }, '/stuff/idea/material/bulk/water') as unknown as Material;
}

function tap(opts: { suppliedBy?: string; natural?: boolean } = {}): WaterFixture {
  const mat = water();
  return makeStuff(() => {
    const t = new WaterFixture();
    t.setShortDescription('standpipe');
    t.setLongDescription('A pipe with a tap on it.');
    t.interiorBulk = true;
    if (opts.suppliedBy) t.setSuppliedBy(opts.suppliedBy);
    if (opts.natural) t.setNatural(true);
    t.setBulkMaterial('interior', mat);
    return t;
  });
}

function mainAt(path = MAIN): FakeSupply {
  return makeStuffAtPath(() => new FakeSupply(), path) as FakeSupply;
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(ParcelApi, 'landUseOf').mockReturnValue('residential');
  vi.spyOn(ZoneApi, 'elevationFor').mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a fixture on a named supply', () => {
  it('runs while the supply delivers', async () => {
    mainAt();
    const t = tap({ suppliedBy: MAIN });
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBeNull();
    expect(t.isBulkEmpty('interior')).toBe(false);
    expect(t.getBulkAvailable('interior')).toBe(Infinity);
  });

  it('⭐ reads empty and says why when the supply is off', async () => {
    mainAt().state = 'off';
    const t = tap({ suppliedBy: MAIN });
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBe('off');
    expect(t.isBulkEmpty('interior')).toBe(true);
    const text = Mml.augment('A pipe with a tap on it.', t, t);
    expect(text).toContain('Nothing comes out of it: it has been shut off.');
  });

  it('analyze water at the tap reads the supply', async () => {
    mainAt().state = 'off';
    const report = await tap({ suppliedBy: MAIN }).supplyReport(0);
    expect(report.label).toBe('the main');
    expect(report.state).toBe('off');
  });

  it('⭐ a draw takes from a store: its level falls', async () => {
    const store = mainAt();
    store.levelL = 30;
    const t = tap({ suppliedBy: MAIN });
    await t.settleBulk('interior');
    expect(t.getBulkAvailable('interior')).toBe(30);
    t.debitBulk('interior', 10);
    expect(store.levelL).toBe(20);
  });
});

describe('⭐⭐ a fixture fails CLOSED', () => {
  it('before it resolves it is empty and silent — never endless', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const t = tap({ suppliedBy: '/test/nowhere/thing/main' });
    expect(t.supplyStateNow()).toBeNull();
    expect(t.isBulkEmpty('interior')).toBe(true);
    expect(Mml.augment('A pipe.', t, t)).not.toContain('Nothing comes out');
    expect(warn).not.toHaveBeenCalled();
  });

  it('a supply that will not load reads unplumbed, and the report names it', async () => {
    vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('no template'));
    const t = tap({ suppliedBy: '/test/nowhere/thing/main' });
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBe('unplumbed');
    const report = await t.supplyReport(0);
    expect(report.lines.join(' ')).toContain('cannot be found');
  });
});

describe('a natural source', () => {
  it('runs on its own water, endlessly, with nothing upstream', async () => {
    const t = tap({ natural: true });
    expect(t.supplyStateNow()).toBeNull();
    expect(t.getBulkAvailable('interior')).toBe(Infinity);
    await t.settleBulk('interior');
    expect(t.isBulkEmpty('interior')).toBe(false);
    const report = await t.supplyReport(0);
    expect(report.lines[0]).toContain('its own source');
  });
});

describe('⭐⭐ a fixture reads its PREMISES', () => {
  function room(path: string): Room {
    return makeStuffAtPath(() => new Room(), path) as Room;
  }

  it('a premises that cites nothing reads unplumbed, in the tap’s words', async () => {
    vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: '', parcel: null });
    const r = room('/test/place/house/kitchen');
    const t = tap();
    ContainmentApi.move(t, r);
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBe('unplumbed');
    expect(t.isBulkEmpty('interior')).toBe(true);
    expect(t.bulkWhyEmpty('interior')).toBe(
      "Nothing comes out — this house isn't on any supply.",
    );
    const report = await t.supplyReport(0);
    expect(report.state).toBe('unplumbed');
    expect(report.lines[0]).toBe('unplumbed — no pipe brings water here.');
  });

  it('`none` is a declared dry premises — the same answer', async () => {
    vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: 'none', parcel: null });
    const t = tap();
    ContainmentApi.move(t, room('/test/place/shed'));
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBe('unplumbed');
  });

  it('a premises citing a supply loads it on use and runs — through the room\'s pipe', async () => {
    mainAt();
    const waterOf = vi
      .spyOn(ParcelApi, 'waterOf')
      .mockReturnValue({ source: MAIN, parcel: null });
    const bar = room('/test/place/bar');
    // ⭐ A room that says it is NOT plumbed — waiting for a plumber.
    bar.setPlumbing('none');
    const t = tap();
    ContainmentApi.move(t, bar);
    // ⭐⭐ No pipe in the room: the supply alone is not water (D10).
    await t.settleBulk('interior');
    expect(waterOf).toHaveBeenCalledWith('/test/place/bar');
    expect(t.supplyStateNow()).toBe('unplumbed');
    // …and it says the PIPE is the cause, not the supply.
    expect(t.bulkWhyEmpty('interior')).toBe('Nothing comes out — no pipe brings water into this room.');
    // A sound run in the room, and it runs.
    ContainmentApi.move(makeStuff(() => waterRun()), bar);
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBeNull();
    expect(t.getBulkAvailable('interior')).toBe(Infinity);
  });

  describe('⭐⭐ a tap implies its pipe (`Plumbed` — the review: no author props one)', () => {
    const cloneRun = () =>
      vi.spyOn(StuffApi, 'clone').mockImplementation((async () => makeStuff(() => waterRun())) as never);

    it('a room that says nothing stands up the default run, once, and runs', async () => {
      mainAt();
      vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: MAIN, parcel: null });
      const clone = cloneRun();
      const bar = room('/test/place/bar');
      const t = tap();
      ContainmentApi.move(t, bar);
      await t.settleBulk('interior');
      expect(clone).toHaveBeenCalledWith('/stuff/thing/fixture/iron-run');
      expect(t.supplyStateNow()).toBeNull();
      expect(t.runOf()).not.toBeNull();
      await t.settleBulk('interior');
      expect(clone).toHaveBeenCalledTimes(1); // the room keeps its pipe
    });

    it('⭐ the run it stands up is the premises\', made by a process — never titled to whoever is standing there', async () => {
      mainAt();
      vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: MAIN, parcel: null });
      cloneRun();
      const bar = room('/test/place/bar');
      const t = tap();
      ContainmentApi.move(t, bar);
      await t.settleBulk('interior');
      const run = t.runOf()!;
      expect(run.isMadeByProcess(), 'declared made by a process').toBe(true);
      expect(run.getMadeFromOwner(), 'and that it is nobody\'s').toBeNull();
    });

    it('`plumbing: lead` stands up the lead run', async () => {
      mainAt();
      vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: MAIN, parcel: null });
      const clone = cloneRun();
      const house = room('/test/place/house/bathroom');
      house.setPlumbing('lead');
      const t = tap();
      ContainmentApi.move(t, house);
      await t.settleBulk('interior');
      expect(clone).toHaveBeenCalledWith('/stuff/thing/fixture/lead-run');
    });

    it('`plumbing: none` stands up nothing, and the tap says no pipe brings water', async () => {
      mainAt();
      vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: MAIN, parcel: null });
      const clone = cloneRun();
      const kitchen = room('/test/place/house/kitchen');
      kitchen.setPlumbing('none');
      const t = tap();
      ContainmentApi.move(t, kitchen);
      await t.settleBulk('interior');
      expect(clone).not.toHaveBeenCalled();
      expect(t.supplyStateNow()).toBe('unplumbed');
      expect(t.bulkWhyEmpty('interior')).toBe('Nothing comes out — no pipe brings water into this room.');
    });

    it('a run already in the room is its pipe — none is stood up beside it', async () => {
      mainAt();
      vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: MAIN, parcel: null });
      const clone = cloneRun();
      const yard = room('/test/place/yard');
      ContainmentApi.move(makeStuff(() => waterRun()), yard);
      const t = tap();
      ContainmentApi.move(t, yard);
      await t.settleBulk('interior');
      expect(clone).not.toHaveBeenCalled();
      expect(t.supplyStateNow()).toBeNull();
    });

    it('two taps in one room read at once make ONE pipe', async () => {
      mainAt();
      vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: MAIN, parcel: null });
      const clone = cloneRun();
      const baths = room('/test/place/baths');
      const a = tap();
      const b = tap();
      ContainmentApi.move(a, baths);
      ContainmentApi.move(b, baths);
      await Promise.all([a.settleBulk('interior'), b.settleBulk('interior')]);
      expect(clone).toHaveBeenCalledTimes(1);
      expect(a.supplyStateNow()).toBeNull();
      expect(b.supplyStateNow()).toBeNull();
    });

    it('a word with no run row reads unplumbed and says so in the log, never invents a pipe', async () => {
      mainAt();
      vi.spyOn(ParcelApi, 'waterOf').mockReturnValue({ source: MAIN, parcel: null });
      vi.spyOn(StuffApi, 'clone').mockRejectedValue(new Error('no template'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const r = room('/test/place/odd');
      r.setPlumbing('leed');
      const t = tap();
      ContainmentApi.move(t, r);
      await t.settleBulk('interior');
      expect(t.supplyStateNow()).toBe('unplumbed');
      expect(warn.mock.calls.flat().join(' ')).toMatch(/leed-run/);
    });
  });

  it('⭐ a keyed holding room answers by its persistence key, not its row', async () => {
    const waterOf = vi
      .spyOn(ParcelApi, 'waterOf')
      .mockReturnValue({ source: '', parcel: null });
    const kitchen = makeStuffAtPath(
      () => new PersistentRoom(),
      '/test/place/plat/room/kitchen',
    ) as PersistentRoom;
    kitchen.setPersistenceKey('/test/place/plat/lots/lot-3/kitchen');
    const t = tap();
    ContainmentApi.move(t, kitchen);
    expect(t.resolvePremisesPath()).toBe('/test/place/plat/lots/lot-3/kitchen');
    await t.settleBulk('interior');
    expect(waterOf).toHaveBeenCalledWith('/test/place/plat/lots/lot-3/kitchen');
  });

  it('a named supply wins over the premises', async () => {
    mainAt();
    const waterOf = vi.spyOn(ParcelApi, 'waterOf');
    const t = tap({ suppliedBy: MAIN });
    ContainmentApi.move(t, room('/test/place/yard'));
    await t.settleBulk('interior');
    expect(waterOf).not.toHaveBeenCalled();
    expect(t.supplyStateNow()).toBeNull();
  });
});

describe('⭐ a shortage is shared by rank (D6)', () => {
  it('a rank given nothing reads overdrawn; a rank given part trickles', async () => {
    const main = mainAt();
    const t = tap({ suppliedBy: MAIN });
    main.share = 0;
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBe('overdrawn');
    expect(t.isBulkEmpty('interior')).toBe(true);
    main.share = 0.4;
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBeNull();
    expect(t.runsWeak()).toBe(true);
    expect(t.getBulkAvailable('interior')).toBe(2);
  });

  it('⭐ a continuous outlet asks as a PUBLIC one', async () => {
    const main = mainAt();
    const asked: string[] = [];
    main.shareFor = async (use?: string) => {
      asked.push(String(use));
      return 1;
    };
    const t = tap({ suppliedBy: MAIN });
    t.setContinuous(true);
    await t.settleBulk('interior');
    expect(asked).toEqual(['civic']);
  });
});

describe('⭐ a piped outlet has a valve (step 11, the officer)', () => {
  it('shut, it gives nothing and says so; opened, it runs again', async () => {
    mainAt();
    const t = tap({ suppliedBy: MAIN });
    await t.settleBulk('interior');
    expect(t.isOn()).toBe(true);
    expect(t.supplyStateNow()).toBeNull();
    t.switchOff();
    expect(t.supplyStateNow()).toBe('off');
    expect(t.isBulkEmpty('interior')).toBe(true);
    expect(t.bulkWhyEmpty('interior')).toBe('Nothing comes out: it has been shut off.');
    t.switchOn();
    expect(t.supplyStateNow()).toBeNull();
  });

  it('a natural source has no valve to shut', () => {
    const t = tap({ natural: true });
    t.switchOff();
    expect(t.supplyStateNow()).toBeNull();
  });
});

describe('⭐ a fouled supply pours fouled water (step 11)', () => {
  it('the tap delivers the fouled material while the main is fouled, and clean water after', async () => {
    const main = mainAt();
    main.chemistry = { pH: 7.5, hardnessDgh: 10, salinityPpt: 0.3, fouled: true };
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('fouled water');
      return m;
    }, '/stuff/idea/material/bulk/fouled-water');
    const t = tap({ suppliedBy: MAIN });
    await t.settleBulk('interior');
    expect(t.getBulkMaterialPath('interior')).toBe('/stuff/idea/material/bulk/fouled-water');
    main.chemistry = { pH: 7.5, hardnessDgh: 10, salinityPpt: 0.3, fouled: false };
    await t.settleBulk('interior');
    expect(t.getBulkMaterialPath('interior')).toBe('/stuff/idea/material/bulk/water');
  });
});

describe('⭐ a public outlet in a street ranks as a public one', () => {
  it('the market standpipe asks as civic, whatever the square is zoned', async () => {
    const main = mainAt();
    const asked: string[] = [];
    main.shareFor = async (use?: string) => {
      asked.push(String(use));
      return 1;
    };
    const square = makeStuff(() => new Street());
    const t = tap({ suppliedBy: MAIN });
    ContainmentApi.move(t, square);
    await t.settleBulk('interior');
    expect(asked).toEqual(['civic']);
  });
});

describe('⭐ pressure is head (D4)', () => {
  it('little head over the outlet runs weak: a draw gives a trickle', async () => {
    mainAt().headM = 132;
    vi.spyOn(ZoneApi, 'elevationFor').mockResolvedValue(130);
    const t = tap({ suppliedBy: MAIN });
    ContainmentApi.move(t, makeStuffAtPath(() => new Room(), '/test/place/loft') as Room);
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBeNull();
    expect(t.runsWeak()).toBe(true);
    expect(t.getBulkAvailable('interior')).toBe(2);
    expect(Mml.augment('A tap.', t, t)).toContain('It runs weak');
  });

  it('water standing below the outlet gives nothing, and says so', async () => {
    mainAt().headM = 128;
    vi.spyOn(ZoneApi, 'elevationFor').mockResolvedValue(130);
    const t = tap({ suppliedBy: MAIN });
    ContainmentApi.move(t, makeStuffAtPath(() => new Room(), '/test/place/attic') as Room);
    await t.settleBulk('interior');
    expect(t.supplyStateNow()).toBe('dry');
    expect(t.isBulkEmpty('interior')).toBe(true);
    expect(t.bulkWhyEmpty('interior')).toBe(
      'Nothing comes out — the water stands below here.',
    );
  });

  it('an unknown head is full head, never none', async () => {
    mainAt().headM = null;
    const t = tap({ suppliedBy: MAIN });
    await t.settleBulk('interior');
    expect(t.runsWeak()).toBe(false);
    expect(t.getBulkAvailable('interior')).toBe(Infinity);
  });
});
