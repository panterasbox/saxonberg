/**
 * `analyze rooms` — the place read (residences D15/D4; the retired
 * `survey`, controller-liquidity W17).
 *
 * What it must say, and what it must never do:
 *
 *   - the room archetypes, satisfied or not, and BY WHAT — the report
 *     names whatever object actually answered;
 *   - at home, the whole holding rather than the one room, plus the two
 *     things only a home has: the shell's condition BAND with its cause,
 *     and who owes the upkeep, said in words rather than in a key;
 *   - never a number, never a gauge, never a score;
 *   - and it decides nothing — an unrecognized room is reported as such
 *     and works identically (the no-enforcement pin lives beside the
 *     value object, in `ArchetypeSatisfaction.test.ts`).
 *
 * Driven through the verb (`driveAnalyze`), so the reading's gate is the
 * shipped one.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import RoomsReading from '../RoomsReading';
import { withRow } from './row';
import { driveAnalyze } from './drive';
import ArchetypeCatalogue from '../../ArchetypeCatalogue';
import Locale from '../../../location/Locale';
import { BiomeApi } from '../../../../api/biome';
import PersistentLocation from '../../../location/PersistentLocation';
import { FloorplanWarren } from '../../../../lib/location/FloorplanWarren';
import Chair from '../../../thing/Chair';
import { DocumentApi } from '../../../../api/document';
import { MessageApi } from '../../../../api/message';
import { CommandApi } from '../../../../api/command';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { Mml } from '../../../../api/mml';
import { PerceiverMixin } from '../../../../lib/description/Perceiver';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../api/command';
import type { StoredDocument } from '../../../../lib/document/StoredDocument';
import BuildingBase from '../../../../lib/structure/Building';
import { NavigationApi } from '../../../../api/navigation';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { Idea } from '../../../../lib/stuff/Idea';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';
import { WayIndexMixin } from '../../../../lib/location/WayIndex';
import { AppApi } from '../../../../api/app';

const ARCHETYPE_DIR = fileURLToPath(
  new URL(
    '../../../../../../../content/generic-objects/content/archetypes/',
    import.meta.url,
  ),
);

/** The same tiny reader the satisfaction suite uses — the REAL rows. */
function roomArchetypeDocs(): StoredDocument[] {
  return readdirSync(ARCHETYPE_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => readFileSync(join(ARCHETYPE_DIR, f), 'utf8'))
    .map((raw) => {
      const lines = raw.split('\n').filter((l) => !l.trimStart().startsWith('#'));
      const capabilities = lines
        .filter((l) => l.trimStart().startsWith('- { key:'))
        .map((l) => {
          const key = /key:\s*([\w-]+)/.exec(l)![1]!;
          const needs = /needs:\s*\{([^}]*)\}/.exec(l)![1]!;
          const [nk, nvRaw] = needs.split(':').map((x) => x.trim());
          const nv =
            nvRaw === 'true'
              ? true
              : Number.isFinite(Number(nvRaw))
                ? Number(nvRaw)
                : nvRaw;
          return { key, needs: { [nk!]: nv }, default: null };
        });
      const data = {
        archetypeId: lines
          .find((l) => l.startsWith('archetypeId:'))!
          .slice('archetypeId:'.length)
          .trim(),
        label: lines
          .find((l) => l.startsWith('label:'))!
          .slice('label:'.length)
          .trim(),
        capabilities,
      };
      return {
        getPath: () => `/generic-objects/archetypes/${data.archetypeId}`,
        getData: () => data as Record<string, unknown>,
        getKind: () => 'archetype',
      } as unknown as StoredDocument;
    });
}

/**
 * A synthetic archetype doc, for the two scopes the shipped rows do not
 * exercise yet. The logistics build adds five industry-less archetypes;
 * without `roomsScope` all five would land on every `analyze rooms` in the
 * game, in every bedroom, for every player.
 */
function scopedDoc(
  archetypeId: string,
  label: string,
  roomsScope: string,
): StoredDocument {
  const data = {
    archetypeId,
    label,
    roomsScope,
    capabilities: [{ key: 'shelter', needs: { seating: 1 }, default: null }],
  };
  return {
    getPath: () => `/test/archetypes/${archetypeId}`,
    getData: () => data as Record<string, unknown>,
    getKind: () => 'archetype',
  } as unknown as StoredDocument;
}

let captured: string;
function captureBody(): void {
  captured = '';
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body.toString();
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

function ctxFor(actor: unknown, location: unknown): CommandContext {
  return {
    commandGiver: actor,
    location,
    note: vi.fn(),
  } as unknown as CommandContext;
}

/** A body that can stand in the room it reads. */
const ReaderBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class Reader extends ReaderBase {}

function bed(): Chair {
  const b = makeStuff(() => new Chair());
  b.setStaticSlots([
    { name: 'lie:1', accepts: 'SlottableMixin', capacity: 1, postures: ['lie', 'sit'] },
  ]);
  b.setRestQuality(2.0);
  b.setShortDescription('a bed');
  return b;
}

/** A building whose weather is not walked here — its condition is set by the test. */
class TestHouse extends BuildingBase {
  static _mixinName = 'RoomsTestHouse';
  public override weatherScope(): Stuff | null {
    return null;
  }
}

/**
 * A programme stand-in: a real floorplan Warren (so the back-ref wiring is
 * the real wiring) that names a tenure term — the kernel's
 * `FloorplanWarren.getUpkeepTerm` hook. Deliberately NOT the residential
 * class: the kernel never names it.
 */
class FakeProgramme extends FloorplanWarren {
  public band = 'sound';
  public cause: string | null = null;
  override getUpkeepTerm(): string {
    return 'landlord-shell';
  }
  protected async reconcile(): Promise<void> {
    /* not used */
  }
}

/** Put `rooms` in a holding whose shell reads `band` because of `cause`. */
function holding(
  rooms: PersistentLocation[],
  band: string,
  cause: string | null,
): FakeProgramme {
  const p = makeStuff(() => new FakeProgramme());
  p.band = band;
  p.cause = cause;
  for (const r of rooms) p.addMember(r as unknown as Stuff & Container);
  return p;
}

/** `analyze rooms`, standing in `room` — through the verb. */
const analyzeRooms = async (room: unknown): Promise<CommandContext> => {
  const reader = makeStuff(() => new Reader());
  ContainmentApi.move(
    reader as unknown as Stuff & Containable,
    room as unknown as Stuff & Container,
  );
  const reading = withRow(await StuffApi.create(() => new RoomsReading()), 'rooms');
  const ctx = ctxFor(reader, room);
  await driveAnalyze(reading, ctx);
  return ctx;
};

/**
 * ⭐ Stand a way index where the realm's settings name one, answering the
 * kernel's `WayIndex` question. The reading finds it through
 * `ways.indexPath` and narrows it by its mixin — the kernel imports no pack
 * and probes no shape — so a fixture stands in exactly as the transport
 * pack's lane catalogue does.
 */
const WAY_INDEX = '/test/idea/WayIndex';
let settings: Record<string, string> = {};
function installLane(nodes: (Stuff & Container)[]): void {
  const paths = nodes.map((n) => n.getTemplatePath() ?? '');
  class StubWayIndex extends WayIndexMixin(Idea) {
    static _mixinName = 'StubWayIndex';
    override async waysideOf(path: string): Promise<string[]> {
      return paths.includes(path) ? paths : [];
    }
  }
  makeStuffAtPath(() => new StubWayIndex() as unknown as Stuff, WAY_INDEX);
  settings['ways.indexPath'] = WAY_INDEX;
}

describe('analyze rooms', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    captureBody();
    settings = {};
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) => settings[key] ?? '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
      kind === 'archetype' ? roomArchetypeDocs() : [],
    );
    const catalogue = makeStuffAtPath(
      () => new ArchetypeCatalogue(),
      '/platform/idea/ArchetypeCatalogue',
    );
    await catalogue.warm();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('reads the bare room against all four, and says no to each', async () => {
    const room = makeStuff(() => new Locale());
        await analyzeRooms(room);
    expect(captured).toContain('You take stock of the room');
    for (const label of ['a bedroom', 'a kitchen', 'a bathroom', 'a living room']) {
      expect(captured).toContain(`${label}: no`);
    }
    // No home, so no shell line and no term line.
    expect(captured).not.toContain('Upkeep here is');
  });

  it('names what answered — the bed, by name', async () => {
    const room = makeStuff(() => new Locale());
    const b = bed();
    ContainmentApi.move(
      b as unknown as Stuff & Containable,
      room as unknown as Stuff & Container,
    );
    await analyzeRooms(room);
    expect(captured).toContain('a bedroom: yes');
    expect(captured).toMatch(/sleeping \(.*bed.*\)/);
  });

  it('at home it reads the WHOLE place, and adds the shell and the term', async () => {
    const hall = makeStuffAtPath(() => new PersistentLocation(), '/world/_rooms/house/hall');
    const bedroom = makeStuff(() => new PersistentLocation());
    ContainmentApi.move(
      bed() as unknown as Stuff & Containable,
      bedroom as unknown as Stuff & Container,
    );
    holding(
      [hall, bedroom],
      'worn',
      'the paint has gone; rain has gotten into the sills',
    );
    // ⭐ The fabric is the BUILDING's (paint D13): a bare house, half worn.
    const house = makeStuff(() => new TestHouse());
    house.setCondition(0.5);
    vi.spyOn(NavigationApi, 'structureAt').mockResolvedValue(house as never);

    // Standing in the HALL, which has nothing in it at all.
    await analyzeRooms(hall);
    expect(captured).toContain('You take stock of the place as a whole');
    // The bedroom next door answers for the whole holding.
    expect(captured).toContain('a bedroom: yes');
    expect(captured).toContain('The fabric of the place is worn');
    expect(captured).toContain('the paint has gone');
    expect(captured).toContain(
      'Upkeep here is the landlord’s for the shell; yours for what you put in it',
    );
  });

  it('bands and words only — no number anywhere in the readout', async () => {
    const hall = makeStuff(() => new PersistentLocation());
    holding([hall], 'sound', null);
    await analyzeRooms(hall);
    // The one thing D4 forbids: a gauge. `0.87` or `87%` must never appear.
    expect(captured).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(captured).not.toMatch(/\b0\.\d+\b/);
  });

  /* ── roomsScope (logistics D19 / P6) ────────────────────────── */

  /** Re-warm the catalogue with the shipped rows PLUS `extra`. */
  const warmWith = async (extra: StoredDocument[]): Promise<void> => {
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
      kind === 'archetype' ? [...roomArchetypeDocs(), ...extra] : [],
    );
    const catalogue = StuffApi.findByTemplatePath<ArchetypeCatalogue>(
      '/platform/idea/ArchetypeCatalogue',
    )!;
    await catalogue.warm();
  };

  it("an `off-room` archetype never appears in a room reading", async () => {
    await warmWith([scopedDoc('haulage-rig', 'a haulage rig', 'off-room')]);
    const room = makeStuff(() => new Locale());
    await analyzeRooms(room);
    // A rig is read by NAMING it, never by standing somewhere.
    expect(captured).not.toContain('a haulage rig');
    // …and the shipped four are untouched.
    expect(captured).toContain('a bedroom: no');
  });

  it("a `corridor` archetype stays off an INDOOR reading", async () => {
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const room = makeStuff(() => new Locale());
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(false);
    await analyzeRooms(room);
    // ⭐ The whole point of the second field: five new archetypes must not
    // print in every bedroom in the game.
    expect(captured).not.toContain('a way');
  });

  it("a `corridor` archetype reports over ALL of a corridor's rooms at once (AC15l)", async () => {
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const here = makeStuffAtPath(
      () => new Locale(),
      '/test/way/here',
    );
    const along = makeStuffAtPath(
      () => new Locale(),
      '/test/way/along',
    );
    // ⚠ A LANE, not a zone. A zone is not a way — it used to be the unit
    // here, and it was wrong in both directions (a one-room courtyard
    // reported a corridor that is a spot; a city-sized zone would report
    // water because a fountain exists a quarter-mile off).
    installLane([here, along]);
    // The shelter is a room AWAY — the union is the point.
    ContainmentApi.move(
      bed() as unknown as Stuff & Containable,
      along as unknown as Stuff & Container,
    );
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);

    await analyzeRooms(here);
    expect(captured).toContain('a way: yes');
  });

  it('a corridor missing its shelter reports the gap and blocks nothing', async () => {
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const here = makeStuffAtPath(
      () => new Locale(),
      '/test/way/lonely',
    );
    installLane([here]);
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);

    const ctx = await analyzeRooms(here);
    expect(captured).toContain('a way: no');
    expect(captured).toContain('wants shelter');
    // Reported, never enforced: nothing was rejected and nothing penalised.
    expect(ctx.note).not.toHaveBeenCalled();
  });

  it('⭐⭐ outdoors but on NO WAY reports no corridor line at all', async () => {
    /*
     * ⚠⚠ The case that made the zone wrong. This used to resolve the
     * room's ZONE, so any sky-exposed room answered corridor questions
     * about whatever it was zoned with — a courtyard reported a
     * "corridor" that is one spot, and a room in a city-sized zone would
     * have reported *the corridor has water* because a fountain exists a
     * quarter-mile away. A zone is not a way.
     *
     * ⭐ A lane IS the way, so a place that is not on one is not asked.
     */
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const courtyard = makeStuffAtPath(
      () => new Locale(),
      '/test/way/courtyard',
    );
    // A lane exists in the realm — it just does not run through here.
    installLane([
      makeStuffAtPath(
        () => new Locale(),
        '/test/way/elsewhere',
      ),
    ]);
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);

    await analyzeRooms(courtyard);
    expect(captured).not.toContain('a way');
  });

  it('⛔ `survey` is no verb — the place read is a channel of `analyze`', () => {
    class Viewer extends PerceiverMixin(Locale) {}
    const verbs = CommandApi.collectSelfDefs(Viewer)
      .map((d) => d.verbs)
      .flat();
    expect(verbs).not.toContain('survey');
    expect(verbs).toContain('look');
  });

  it('⚠ no way index named: an outdoor place reports no corridor, and nothing throws', async () => {
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const here = makeStuffAtPath(() => new Locale(), '/test/way/unindexed');
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);
    // No `ways.indexPath`: the realm has no ways (no transport pack).
    const ctx = await analyzeRooms(here);
    expect(captured).not.toContain('a way');
    expect(captured).toContain('a bedroom: no');
    expect(ctx.note).not.toHaveBeenCalled();
  });

  it('a building that is no holding still gets its shell line — and no upkeep line', async () => {
    const shop = makeStuffAtPath(() => new Locale(), '/world/_rooms/shop/floor');
    const house = makeStuff(() => new TestHouse());
    house.setCondition(0.5);
    vi.spyOn(NavigationApi, 'structureAt').mockResolvedValue(house as never);
    await analyzeRooms(shop);
    expect(captured).toContain('You take stock of the room');
    expect(captured).toContain('The fabric of the place is');
    expect(captured).not.toContain('Upkeep here is');
  });

  it('a reader standing somewhere else is refused by name', async () => {
    const room = makeStuff(() => new Locale());
    const elsewhere = makeStuff(() => new Locale());
    const reader = makeStuff(() => new Reader());
    ContainmentApi.move(
      reader as unknown as Stuff & Containable,
      elsewhere as unknown as Stuff & Container,
    );
    // The verb resolves `here` to where the reader stands, so a mismatch
    // is reachable only by a caller handing the read another place — the
    // reading still refuses it by name rather than reading somewhere else.
    class Direct extends RoomsReading {
      async readAt(ctx: CommandContext, here: Stuff): Promise<void> {
        await this.analyze(ctx, here, 'novice' as never, null, '');
      }
    }
    const reading = withRow(await StuffApi.create(() => new Direct()), 'rooms');
    const ctx = ctxFor(reader, room);
    await reading.readAt(ctx, room as unknown as Stuff);
    expect(captured).toContain('from inside it');
    expect(ctx.note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'not-here' }),
    );
  });

  it('a reader with nowhere to stand is told so', async () => {
    const reader = makeStuff(() => new Reader());
    const reading = withRow(await StuffApi.create(() => new RoomsReading()), 'rooms');
    const ctx = ctxFor(reader, null);
    await driveAnalyze(reading, ctx);
    expect(captured).toContain('nothing here to take stock of');
  });
});
