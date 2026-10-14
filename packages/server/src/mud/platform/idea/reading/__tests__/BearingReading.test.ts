import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BearingReading from '../BearingReading';
import { ExpanseApi } from '../../../../api/expanse';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { CommandApi } from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { GeoPosition } from '../../../../lib/expanse/GeoPosition';
import type { Contact } from '../../../../lib/expanse/Expanse';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

/**
 * `measure bearing` (maritime R8): the true bearing of a thing in sight,
 * bracketed by band; a bearing on a FIXED thing mends the reckoning to
 * within range × tan(bracket), a bearing on a sail mends nothing, and a
 * thing out of sight cannot be taken.
 */
let told: string[];
let contacts: Contact[];
const takeFix = vi.fn();
const light = { stuffId: 'light', getPresentation: () => 'the light' } as unknown as Stuff;
const brig = { stuffId: 'brig', getPresentation: () => 'the brig' } as unknown as Stuff;
const craft = {
  getExpansePosition: () => new GeoPosition(42, -8),
  takeFix,
  liveExpanse: async () => ({ contactsFrom: async () => contacts }),
} as unknown as Stuff;
const sailor = { getTemplatePath: () => '/test/sailor', getRootContainer: () => null } as unknown as Stuff;

function ctx() {
  return CommandApi.createCommandContext({
    commandGiver: sailor as never,
    location: {} as never,
    commandText: 'measure bearing light',
    executionId: 't',
    commandId: 't',
    verb: 'measure',
    command: CommandDefinition.fromYaml('verbs: [measure]\ncontroller: X\ndescription: d\n', '<t>'),
  });
}

let reading: BearingReading;

beforeEach(() => {
  StuffApi.clearAll();
  told = [];
  takeFix.mockReset();
  contacts = [
    { craft: light as never, name: 'the light on Gannet Rock', bearingDeg: 47.4, rangeNm: 8, channel: 'visual', fixed: true },
    { craft: brig as never, name: 'the brig', bearingDeg: 200, rangeNm: 3, channel: 'visual', fixed: false },
  ];
  reading = makeStuffAtPath(() => new BearingReading(), '/test/reading/bearing');
  vi.spyOn(ExpanseApi, 'craftAt').mockResolvedValue(craft as never);
  vi.spyOn(MixinApi, 'isVoyaging').mockImplementation(((x: unknown) => x === craft) as never);
  vi.spyOn(MixinApi, 'isContainable').mockReturnValue(false);
  vi.spyOn(MixinApi, 'isAdvancing').mockReturnValue(false);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: { toString(): string }) => { told.push(m.toString()); return b; };
    b.send = () => {};
    return b as never;
  });
  (reading as unknown as Record<string, unknown>).actorOf = () => sailor;
});
afterEach(() => vi.restoreAllMocks());

const measure = (target: Stuff | null, band: string): Promise<void> =>
  (reading as unknown as { measure: (...a: unknown[]) => Promise<void> }).measure(ctx(), target, {}, band, 'light');

describe('BearingReading', () => {
  it('⭐ the same true bearing at every band, with a different bracket', async () => {
    await measure(light, 'novice');
    await measure(light, 'expert');
    expect(told[0]).toMatch(/The light on Gannet Rock bears 047° ± 5°/);
    expect(told[1]).toMatch(/The light on Gannet Rock bears 047° ± 0\.5°/);
  });

  it('⭐ a bearing on a FIXED thing fixes you to within range × tan(bracket)', async () => {
    await measure(light, 'competent');
    expect(takeFix).toHaveBeenCalledTimes(1);
    const nm = takeFix.mock.calls[0]![1] as number;
    expect(nm).toBeCloseTo(8 * Math.tan((2 * Math.PI) / 180), 5);
    expect(told[0]).toMatch(/fixes you/);
  });

  it('a bearing on a sail mends nothing', async () => {
    await measure(brig, 'expert');
    expect(takeFix).not.toHaveBeenCalled();
    expect(told[0]).toMatch(/The brig bears 200°.*not where you are/);
  });

  it('⛔ a thing out of sight cannot be taken', async () => {
    contacts = [];
    await measure(light, 'expert');
    expect(takeFix).not.toHaveBeenCalled();
    expect(told[0]).toMatch(/You cannot see the light from here/);
  });
});
