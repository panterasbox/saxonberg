/**
 * TestHarnessController — the `testharness` verb. The clock half runs the
 * REAL TestHarnessApi (a unit test is a test environment, so the seams are
 * live): `clock` reads, `clock advance 2h` moves, `clock advance 3d` is
 * refused in the span rule's own words — ⭐ the same cap the harness
 * route meets, asserted here at the verb. The weather half stubs the Api
 * (a Locality is world content) and pins the grammar: kind, `--at`,
 * `--alive`, `unpin`, and the refusal of a kind that is not one.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TestHarnessController from '../TestHarnessController';
import { TestHarnessApi } from '../../../../../api/test-harness';
import { WorldClockApi } from '../../../../../api/worldclock';
import { MixinApi } from '../../../../../api/mixin';
import { MessageApi } from '../../../../../api/message';
import { Mml } from '../../../../../api/mml';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext } from '../../../../../api/command';

describe('TestHarnessController', () => {
  let ctrl: TestHarnessController;
  let ctx: CommandContext;
  let said: string[];
  let note: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    ctrl = makeStuff(() => new TestHarnessController());
    said = [];
    const realText = Mml.text.bind(Mml);
    vi.spyOn(Mml, 'text').mockImplementation((s: string) => {
      said.push(s);
      return realText(s);
    });
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.send = () => {};
      return b as never;
    });
    note = vi.fn();
    ctx = {
      commandGiver: { getTemplatePath: () => '/platform/agent/Avatar/t' } as never,
      note,
    } as unknown as CommandContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  const run = (m: Record<string, unknown>) => ctrl.execute(m as never, ctx);
  const rejected = () =>
    note.mock.calls.map((c) => c[0]).find((n) => n.kind === 'controller-rejected');

  describe('clock', () => {
    it('a bare `clock` reads', async () => {
      await run({ subcommand: 'clock' });
      expect(said.join('\n')).toMatch(/Game time \d+s — day \d+, \d\d:\d\d/);
      expect(rejected()).toBeUndefined();
    });

    it('`clock advance 2h` moves the clock two hours', async () => {
      const before = TestHarnessApi.clockNow();
      await run({ subcommand: 'clock', op: 'advance', value: '2h' });
      expect(TestHarnessApi.clockNow() - before).toBeGreaterThanOrEqual(7_200);
      expect(said.join('\n')).toMatch(/The clock moved 2 hours/);
    });

    it('⛔ `clock advance 3d` is the span rule, in its own words — the clock unmoved', async () => {
      const before = TestHarnessApi.clockNow();
      await run({ subcommand: 'clock', op: 'advance', value: '3d' });
      expect(rejected()?.reason).toBe('test-refused');
      expect(rejected()?.detail).toMatch(/SPAN step.*\.soak\./s);
      expect(TestHarnessApi.clockNow() - before).toBeLessThan(60);
    });

    it('a duration that is not one token is refused, naming the forms', async () => {
      await run({ subcommand: 'clock', op: 'advance', value: 'tuesday' });
      expect(rejected()?.reason).toBe('test-usage');
    });
  });

  describe('weather', () => {
    beforeEach(() => {
      // The giver stands in a room at /world/here; the verb hands that PATH
      // to TestHarnessApi, which resolves the Locality (the route's walk).
      vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
      (ctx as unknown as { commandGiver: unknown }).commandGiver = {
        getTemplatePath: () => '/platform/agent/Avatar/t',
        getContainer: () => ({ getTemplatePath: () => '/world/here' }),
      };
    });

    it('`weather pin rain` pins the Locality the giver stands in, frozen', async () => {
      const pin = vi
        .spyOn(TestHarnessApi, 'pinWeather')
        .mockResolvedValue({ locality: '/world/here', pin: { type: 'rain', mode: 'frozen' } });
      await run({ subcommand: 'weather', op: 'pin', value: 'rain' });
      expect(pin).toHaveBeenCalledWith('/world/here', 'rain', 'frozen');
      expect(said.join('\n')).toMatch(/held at rain/);
    });

    it('`--at` names another place; `--alive` pins alive', async () => {
      const pin = vi
        .spyOn(TestHarnessApi, 'pinWeather')
        .mockResolvedValue({ locality: '/world/there', pin: { type: 'fog', mode: 'alive' } });
      await run({ subcommand: 'weather', op: 'pin', value: 'fog', at: '/world/there', alive: true });
      expect(pin).toHaveBeenCalledWith('/world/there', 'fog', 'alive');
    });

    it('`weather unpin` releases it', async () => {
      const unpin = vi
        .spyOn(TestHarnessApi, 'unpinWeather')
        .mockResolvedValue({ locality: '/world/here', pin: null });
      await run({ subcommand: 'weather', op: 'unpin' });
      expect(unpin).toHaveBeenCalledWith('/world/here');
      expect(said.join('\n')).toMatch(/runs free again/);
    });

    it('a kind that is not a weather is refused naming the six', async () => {
      await run({ subcommand: 'weather', op: 'pin', value: 'sideways', at: '/x' });
      expect(rejected()?.reason).toBe('test-refused');
    });
  });

  it('no subcommand → the usage, as a refusal', async () => {
    await run({});
    expect(rejected()?.reason).toBe('test-usage');
  });
});
