/**
 * A part's condition moves something another subsystem already reads
 * (assembly AC 11): a lantern's cracked pane darkens it; a chair's failed
 * cushion leaves you on the bare frame.
 */
import '../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Lamp from '../thing/Lamp';
import Chair from '../thing/Chair';
import Vat from '../thing/Vat';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../../lib/quantity';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { PartLine } from '../../lib/craft/Assembled';

function line(part: string, role: PartLine['role'], failed = 0, condition = 1): PartLine {
  return { part, template: `/x/${part}`, count: 1, role, material: '', grade: 'fair', condition, failed, makers: [] };
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a part moves another subsystem', () => {
  it('⭐ a cracked pane lets out a fraction of the light; a sound one all of it', () => {
    vi.spyOn(Object.getPrototypeOf(Lamp.prototype), 'getEmittedFlux').mockReturnValue(
      Quantity.of(100, 'lumen'),
    );
    const lantern = makeStuff(() => new Lamp());
    lantern.recordAssembly([line('body', 'structural'), line('pane', 'facing')], []);
    expect(lantern.getEmittedFlux().rawValue()).toBeCloseTo(100, 6);
    lantern.recordAssembly([line('body', 'structural'), line('pane', 'facing', 1)], []);
    expect(lantern.getEmittedFlux().rawValue()).toBeCloseTo(35, 6);
  });

  it('⭐ a failed cushion leaves you on the bare frame; a worn frame rests worse', () => {
    vi.spyOn(Object.getPrototypeOf(Chair.prototype), 'getRestQuality').mockReturnValue(0.8);
    const chair = makeStuff(() => new Chair());
    chair.recordAssembly([line('frame', 'structural'), line('cushion', 'wear')], []);
    expect(chair.getRestQuality()).toBeCloseTo(0.8, 6);
    chair.recordAssembly([line('frame', 'structural'), line('cushion', 'wear', 1)], []);
    expect(chair.getRestQuality()).toBeCloseTo(0.4, 6);
    chair.recordAssembly([line('frame', 'structural', 0, 0.5), line('cushion', 'wear')], []);
    expect(chair.getRestQuality()).toBeCloseTo(0.4, 6);
  });

  it('⭐⭐ a cask left EMPTY dries out and its hoops ride loose — every stave sound', () => {
    let nowS = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => nowS);
    const cask = makeStuff(() => new Vat());
    cask.recordAssembly(
      [line('stave', 'structural')],
      [{ key: 'hooping', method: 'hooped', members: ['stave'], tension: 1, maker: '' }],
    );
    expect(cask.getClosure()).toBe('liquidTight'); // first empty read starts the clock
    const t0 = WorldClockApi.getNow().rawValue();
    while (WorldClockApi.getNow().rawValue() - t0 < 8 * 86_400) nowS += 10_000_000;
    expect(cask.getClosure()).toBe('open');
    expect(cask.failedLines()).toEqual([]);
    expect(cask.slackJoints().map((j) => j.key)).toEqual(['hooping']);
    WorldClockApi._resetForTesting();
  });
});
