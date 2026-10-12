/**
 * ShoreMixin (maritime revision 3): a place names its water as one of its
 * own features, and looking at that feature reads the water. The kernel
 * never parses the citation — a test-local `WaterSourceMixin` stands in
 * for the water pack, so this suite imports no pack.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ShoreClass from '../../../platform/location/Shore';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { WaterSourceMixin, type WaterRead } from '../WaterSource';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePaths } from '../../paths';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

const SOURCE = '/test/water/source';
const SEA = '/test/water/sea';

/** A source that knows two reaches and reads them in fixed words. */
class FakeSource extends WaterSourceMixin(Idea) {
  public reads = 0;
  public refHere = new Map<string, string>();
  public override currentWaterRef(citation: string, place: Stuff): string | null {
    return this.refHere.get(place.getTemplatePath() ?? '') ?? citation;
  }
  public override async readWater(citation: string, place: Stuff, nowS: number): Promise<WaterRead | null> {
    this.reads++;
    if (citation.startsWith('nowhere')) return null;
    const ref = this.currentWaterRef(citation, place) ?? citation;
    const name = citation.startsWith('kestrel') ? 'the Kestrel' : citation.startsWith('delight') ? 'the Delight' : 'the sea';
    return { ref, atS: nowS, name, frozen: false, draw: null, opaque: { line: `This is ${name}.` } };
  }
  public override waterLinesFor(read: WaterRead, viewer: Stuff): string[] {
    const { line } = read.opaque as { line: string };
    return [line, `(for ${viewer?.getTemplatePath() ?? 'nobody'})`];
  }
}

type ShoreRoom = InstanceType<typeof ShoreClass>;

let source: FakeSource;
let viewer: Stuff;

function shore(path: string, details: Array<[string[], string]>, waters: Record<string, string>): ShoreRoom {
  const room = makeStuffAtPath(() => new ShoreClass(), path);
  for (const [ids, text] of details) room.setDetail(ids, text);
  room.setWaters(waters);
  return room;
}

beforeEach(() => {
  StuffApi.clearAll();
  makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  WorldClockApi._setNowProviderForTesting(() => 1_000_000);
  source = makeStuffAtPath(() => new FakeSource(), SOURCE);
  viewer = makeStuffAtPath(() => new Idea(), '/test/viewer');
  vi.spyOn(AppApi, 'setting').mockImplementation(((key: string) =>
    key === 'water.sourcePath' ? SOURCE : null) as never);
});

afterEach(() => vi.restoreAllMocks());

describe('looking at the water', () => {
  it('⭐ the feature\'s own words, then the water\'s read for THIS viewer — and only after it has been read', async () => {
    const bank = shore('/test/bank', [[['river', 'kestrel', 'water'], 'Brown and wide.']], { river: 'kestrel:confluence' });
    expect(bank.getDetailFor(viewer, 'kestrel')).toBe('Brown and wide.\n\nThe water is hard to read yet.');
    await bank.settleWater('river');
    expect(bank.getDetailFor(viewer, 'kestrel')).toBe('Brown and wide.\n\nThis is the Kestrel. (for /test/viewer)');
  });

  it('⛔ an uncited feature, another sense, and the room itself are untouched', async () => {
    const bank = shore('/test/bank', [[['lamps'], 'Iron bollards.']], { river: 'kestrel:confluence' });
    bank.setDetail(['river'], { vision: 'Brown.', smell: 'Mud.' });
    await bank.settleWater('river');
    expect(bank.getDetailFor(viewer, 'lamps')).toBe('Iron bollards.');
    expect(bank.getDetailFor(viewer, 'river', 'smell')).toBe('Mud.');
  });

  it('a source that does not know the water says so, never a wrong water', async () => {
    const bank = shore('/test/bank', [[['river'], 'Brown.']], { river: 'nowhere:at-all' });
    await bank.settleWater('river');
    expect(bank.getDetailFor(viewer, 'river')).toBe('Brown.\n\nNothing here can read this water.');
  });

  it('⭐ a cited PATH is its own source (a sea reads itself)', async () => {
    const sea = makeStuffAtPath(() => new FakeSource(), SEA);
    const deck = shore('/test/deck', [[['sea'], 'Below the rail, the water.']], { sea: SEA });
    await deck.settleWater('sea');
    expect(sea.reads).toBe(1);
    expect(source.reads).toBe(0);
  });

  it('⭐ the read follows the ref: when the place\'s water moves (a deck), it is read again', async () => {
    const deck = shore('/test/deck', [[['sea'], 'Water.']], { sea: 'sea:here' });
    source.refHere.set('/test/deck', 'sea@1,1');
    await deck.settleWater('sea');
    expect(source.reads).toBe(1);
    await deck.settleWater('sea');
    expect(source.reads).toBe(1); // fresh, same cell
    source.refHere.set('/test/deck', 'sea@1,2');
    const read = await deck.settleWater('sea');
    expect(source.reads).toBe(2);
    expect(read?.ref).toBe('sea@1,2');
  });
});

describe('which water you mean', () => {
  it('⭐ unnamed: the one water; named: the feature you named, by any of its names', async () => {
    const bank = shore('/test/bank', [[['river', 'kestrel'], 'Brown.'], [['lamps'], 'Iron.']], { river: 'kestrel:confluence' });
    expect(bank.waterFor()).toEqual({ key: 'river', citation: 'kestrel:confluence' });
    expect(bank.waterFor('kestrel')).toEqual({ key: 'river', citation: 'kestrel:confluence' });
    const pick = await bank.waterRefFor('river');
    expect('ref' in pick && pick.ref).toBe('kestrel:confluence');
  });

  it('⭐ naming something that is not water is refused in words', () => {
    const bank = shore('/test/bank', [[['river'], 'Brown.'], [['lamps'], 'Iron.']], { river: 'kestrel:confluence' });
    expect(bank.waterFor('lamps')).toEqual({ refusal: 'There is no water in the lamps.', reason: 'not-water' });
  });

  it('⭐ two waters and none named: asked which, by name', async () => {
    const meet = shore('/test/meet', [[['river', 'kestrel'], 'Brown.'], [['stream', 'delight'], 'Clear.']], {
      river: 'kestrel:confluence',
      stream: 'delight:confluence',
    });
    await meet.settleWater('river');
    await meet.settleWater('stream');
    expect(meet.waterFor()).toEqual({ refusal: 'Which water — the Kestrel or the Delight?', reason: 'which-water' });
    expect(meet.waterFor('delight')).toEqual({ key: 'stream', citation: 'delight:confluence' });
  });

  it('a citation under a key that names no feature is ignored, with a warning — never silent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bank = shore('/test/bank', [[['river'], 'Brown.']], { river: 'kestrel:confluence', ghost: 'kestrel:mouth' });
    expect(bank.waterFor()).toEqual({ key: 'river', citation: 'kestrel:confluence' });
    expect(warn).toHaveBeenCalledTimes(1);
    bank.waterFor();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('the host', () => {
  it('⛔ a place that is not a waterside class has none of it', () => {
    const plain = makeStuff(() => new Idea()) as unknown as { getWaters?: unknown };
    expect(plain.getWaters).toBeUndefined();
  });
});
