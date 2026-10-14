import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LatitudeReading from '../LatitudeReading';
import { ExpanseApi } from '../../../../api/expanse';
import { WeatherApi } from '../../../../api/weather';
import { CelestialApi } from '../../../../api/celestial';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { CommandApi } from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { GeoPosition } from '../../../../lib/expanse/GeoPosition';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

/**
 * The noon sight (maritime D16): the true latitude, a bracket by band,
 * refused in the sky's own words, and it mends the reckoning's latitude.
 */
let told: string[];
let sky = 'clear';
const takeLatitude = vi.fn();
const craft = {
  getExpansePosition: () => new GeoPosition(50.2134, -4.5),
  takeLatitude,
} as unknown as Stuff;
const sailor = { getTemplatePath: () => '/test/sailor', getRootContainer: () => null } as unknown as Stuff;
const deck = { stuffId: 'deck' } as unknown as Stuff;

function ctx() {
  return CommandApi.createCommandContext({
    commandGiver: sailor as never,
    location: deck as never,
    commandText: 'measure latitude',
    executionId: 't',
    commandId: 't',
    verb: 'measure',
    command: CommandDefinition.fromYaml('verbs: [measure]\ncontroller: X\ndescription: d\n', '<t>'),
  });
}

let reading: LatitudeReading;

beforeEach(() => {
  StuffApi.clearAll();
  told = [];
  sky = 'clear';
  takeLatitude.mockReset();
  reading = makeStuffAtPath(() => new LatitudeReading(), '/test/reading/latitude');
  vi.spyOn(ExpanseApi, 'craftAt').mockResolvedValue(craft as never);
  vi.spyOn(MixinApi, 'isVoyaging').mockImplementation(((x: unknown) => x === craft) as never);
  vi.spyOn(MixinApi, 'isContainable').mockReturnValue(false);
  vi.spyOn(MixinApi, 'isAdvancing').mockReturnValue(false);
  vi.spyOn(WeatherApi, 'skyReadFor').mockImplementation(async () => ({ currentType: sky }) as never);
  vi.spyOn(CelestialApi, 'profileFor').mockResolvedValue({} as never);
  vi.spyOn(CelestialApi, 'isDay').mockReturnValue(true);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => { told.push(m.toString()); return b; };
    b.send = () => {};
    return b as never;
  });
  const r = reading as unknown as Record<string, unknown>;
  r.actorOf = () => sailor;
  r.placeOf = () => deck;
});

afterEach(() => vi.restoreAllMocks());

const measure = (band: string): Promise<void> =>
  (reading as unknown as { measure: (...a: unknown[]) => Promise<void> }).measure(ctx(), null, {}, band, '');

describe('LatitudeReading', () => {
  it('truth is the craft\'s latitude', async () => {
    expect(await reading.truth(sailor)).toBeCloseTo(50.2134, 4);
  });

  it('⭐ a novice and an expert get the same answer with a different bracket', async () => {
    await measure('novice');
    await measure('expert');
    expect(told[0]).toContain('50.2° N ± 0.5°');
    expect(told[1]).toContain('50.21° N ± 0.05°');
    expect(told.join(' ')).toContain('nothing about how far along');
    expect(takeLatitude).toHaveBeenCalledTimes(2);
  });

  it('an overcast sky refuses the sight in its own words', async () => {
    sky = 'overcast';
    await measure('expert');
    expect(told.join(' ')).toContain('The sky is overcast');
    expect(takeLatitude).not.toHaveBeenCalled();
  });
});
