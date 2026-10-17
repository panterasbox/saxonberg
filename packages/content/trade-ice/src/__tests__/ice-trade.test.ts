/**
 * ⭐ The ice trade's acts (storage-and-ice W8, D19/D22).
 *
 *  1. `scrape` and `mark` hand the act to the sheet underfoot; a body the
 *     sheet is not holding up is refused (you do not work ice from the
 *     water), and a room with no sheet is refused.
 *  2. The plough's horse rung: refused with no draft animal on the ice.
 *  3. The tool rows: every capability the acts ask for is offered by a row.
 *  4. The boss's go-ahead: he marks the first patch only when the ice bears
 *     the margin.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Actor } from '@saxonberg/server/mud/lib/creature/Actor';
import Pool from '@saxonberg/server/mud/platform/location/Pool';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '@saxonberg/content-water/src/idea/WatercourseCatalogue';
import IceSheet from '@saxonberg/content-water/src/thing/IceSheet';
import ScrapeController from '../idea/cmd/ice/ScrapeController';
import MarkController from '../idea/cmd/ice/MarkController';
import Scraper from '../thing/Scraper';
import IceMarker from '../thing/IceMarker';

const DAY = 86_400;
const T0 = 720 * DAY;
const REF = 'circlemere:mere';
const here = dirname(fileURLToPath(import.meta.url));
const ROWS = join(here, '..', '..', 'content', 'trade', 'ice', 'thing');

class Walker extends Actor {}

let cat: WatercourseCatalogue;
let pool: Pool;
let sheet: IceSheet;

const stubCommand = CommandDefinition.fromYaml('verbs: [x]\ncontroller: x\ndescription: d\n', '<test>');
function ctxFor(actor: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: pool as never,
    commandText: verb,
    executionId: 't',
    commandId: 't',
    verb,
    command: stubCommand,
  });
}
const rejected = (ctx: CommandContext): string | null => {
  const n = ctx.getNotes().find((x) => x.kind === 'controller-rejected');
  return n ? (n as unknown as { reason: string }).reason : null;
};

function walker(): Walker {
  const w = makeStuff(() => {
    const a = new Walker();
    a.setMass(Quantity.of(80, 'kg'));
    return a;
  });
  ContainmentApi.move(w as unknown as Stuff & never, pool as unknown as Stuff & never);
  return w;
}

beforeEach(async () => {
  StuffApi.clearAll();
  vi.spyOn(PersistApi, 'find').mockImplementation(async (collection: string) =>
    collection !== Collections.Content
      ? []
      : [
          {
            _id: '1',
            path: '/stuff/idea/Watercourse/circlemere',
            class: '/system/water/idea/Watercourse',
            data: {
              key: 'circlemere',
              name: 'circlemere',
              basin: 'circlemere',
              branchesFrom: null,
              site: { latitudeDeg: -66, continentality: 1, offsetK: -7 },
              nodes: [{ name: 'mere', elevation: 900, channelWidthM: 200, meanDepthM: 4 }],
            },
          },
        ],
  );
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(T0, 's'));
  WeatherApi._forceTypeForTesting('clear');
  cat = makeStuffAtPath(() => new WatercourseCatalogue(), WATERCOURSE_CATALOGUE_PATH) as WatercourseCatalogue;
  pool = makeStuff(() => new Pool());
  sheet = makeStuff(() => new IceSheet());
  sheet.areaM2 = 4000;
  pool.addFixture(sheet as never, 'floor');
  (sheet as unknown as { reachRef: string }).reachRef = REF;
  await cat.iceAt(REF, T0);
});

afterEach(() => {
  WeatherApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('scrape and mark hand the act to the sheet', () => {
  it('⭐ on the ice: scrape clears a patch, mark scores the grid', async () => {
    const w = walker();
    sheet.occupy(w as never, 'ground:1');
    const scraper = makeStuff(() => {
      const s = new Scraper();
      s.setCapabilities(['scraping']);
      return s;
    });
    const s = ctxFor(w as unknown as Stuff, 'scrape');
    await makeStuff(() => new ScrapeController()).execute({ tool: { stuff: [scraper], raw: '' } } as never, s);
    expect(rejected(s)).toBeNull();
    expect(sheet.getLog().some((p) => p.kind === 'scraped')).toBe(true);
    const marker = makeStuff(() => {
      const m = new IceMarker();
      m.setCapabilities(['marking']);
      return m;
    });
    const m = ctxFor(w as unknown as Stuff, 'mark');
    await makeStuff(() => new MarkController()).execute({ tool: { stuff: [marker], raw: '' } } as never, m);
    expect(rejected(m)).toBeNull();
    expect(sheet.patchByWord('marked')?.gridM).toBe(0.3);
  });

  it('⭐ from the water you cannot work the ice', async () => {
    const w = walker();
    const scraper = makeStuff(() => {
      const s = new Scraper();
      s.setCapabilities(['scraping']);
      return s;
    });
    const ctx = ctxFor(w as unknown as Stuff, 'scrape');
    await makeStuff(() => new ScrapeController()).execute({ tool: { stuff: [scraper], raw: '' } } as never, ctx);
    expect(rejected(ctx)).toBe('refused');
    expect(sheet.getLog()).toHaveLength(1);
  });

  it('the ice plough wants a horse out on the ice', async () => {
    const w = walker();
    sheet.occupy(w as never, 'ground:1');
    const plough = makeStuff(() => {
      const m = new IceMarker();
      m.setCapabilities(['marking']);
      m.draught = 'horse';
      m.gridM = 0.56;
      return m;
    });
    const ctx = ctxFor(w as unknown as Stuff, 'mark');
    await makeStuff(() => new MarkController()).execute({ tool: { stuff: [plough], raw: '' } } as never, ctx);
    expect(rejected(ctx)).toBe('refused');
  });
});

describe('the rows', () => {
  const rows = (): Record<string, { class?: string; data?: Record<string, unknown> }> =>
    Object.fromEntries(
      readdirSync(ROWS)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => [f.replace('.yaml', ''), YAML.parse(readFileSync(join(ROWS, f), 'utf8'))]),
    );

  it('every capability an act asks for is offered by a row', () => {
    const r = rows();
    const offered = new Set(Object.values(r).flatMap((x) => (x.data?.capabilities as string[] | undefined) ?? []));
    for (const kind of ['ice-sawing', 'spudding', 'scraping', 'marking']) expect(offered.has(kind)).toBe(true);
    expect(r['ice-plough']!.data!.draught).toBe('horse');
    expect(r['hand-marker']!.data!.gridM).toBe(0.3);
  });
});
