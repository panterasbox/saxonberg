/**
 * The `testharness` controllers — the `testharness` verb, one controller
 * per act (the clock's and the weather's acts are nested stanzas). The clock half runs the
 * REAL TestHarnessApi (a unit test is a test environment, so the seams are
 * live): `clock` reads, `clock-advance 2h` moves, `clock-advance 3d` is
 * refused in the span rule's own words — ⭐ the same cap the harness
 * route meets, asserted here at the verb. The weather half stubs the Api
 * (a Locality is world content) and pins the grammar: kind, `--at`,
 * `--alive`, `unpin`, and the refusal of a kind that is not one.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TestHarnessClockController from '../TestHarnessClockController';
import TestHarnessClockAdvanceController from '../TestHarnessClockAdvanceController';
import TestHarnessWeatherController from '../TestHarnessWeatherController';
import TestHarnessWeatherPinController from '../TestHarnessWeatherPinController';
import TestHarnessWeatherUnpinController from '../TestHarnessWeatherUnpinController';
import TestHarnessShipController from '../TestHarnessShipController';
import TestHarnessGravityController from '../TestHarnessGravityController';
import TestHarnessAfflictController from '../TestHarnessAfflictController';
import TestHarnessSpeciesController from '../TestHarnessSpeciesController';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { CommandApi } from '../../../../../api/command';
import { CommandLineApi } from '../../../../../api/command-line';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { TestHarnessApi } from '../../../../../api/test-harness';
import { WorldClockApi } from '../../../../../api/worldclock';
import { MixinApi } from '../../../../../api/mixin';
import { MessageApi } from '../../../../../api/message';
import { Mml } from '../../../../../api/mml';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext } from '../../../../../api/command';

describe('testharness controllers', () => {
  let ctx: CommandContext;
  let said: string[];
  let note: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
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

  // ⭐ The view's routing (pinned against the shipped view below): the
  // subcommand word names the controller — `clock-advance`, `weather-pin`
  // (compound words; W16 flattened the nested stanzas).
  const BY_WORD = {
    clock: TestHarnessClockController,
    'clock-advance': TestHarnessClockAdvanceController,
    weather: TestHarnessWeatherController,
    'weather-pin': TestHarnessWeatherPinController,
    'weather-unpin': TestHarnessWeatherUnpinController,
    ship: TestHarnessShipController,
    gravity: TestHarnessGravityController,
    afflict: TestHarnessAfflictController,
    species: TestHarnessSpeciesController,
  } as const;
  const run = (m: Record<string, unknown>) => {
    const Ctrl = BY_WORD[m.subcommand as keyof typeof BY_WORD];
    return makeStuff(() => new Ctrl()).execute(m as never, ctx);
  };
  const rejected = () =>
    note.mock.calls.map((c) => c[0]).find((n) => n.kind === 'controller-rejected');

  describe('clock', () => {
    it('a bare `clock` reads', async () => {
      await run({ subcommand: 'clock' });
      expect(said.join('\n')).toMatch(/Game time \d+s — day \d+, \d\d:\d\d/);
      expect(rejected()).toBeUndefined();
    });

    it('`clock-advance 2h` moves the clock two hours', async () => {
      const before = TestHarnessApi.clockNow();
      await run({ subcommand: 'clock-advance', value: '2h' });
      expect(TestHarnessApi.clockNow() - before).toBeGreaterThanOrEqual(7_200);
      expect(said.join('\n')).toMatch(/The clock moved 2 hours/);
    });

    it('⛔ `clock-advance 3d` is the span rule, in its own words — the clock unmoved', async () => {
      const before = TestHarnessApi.clockNow();
      await run({ subcommand: 'clock-advance', value: '3d' });
      expect(rejected()?.reason).toBe('test-refused');
      expect(rejected()?.detail).toMatch(/SPAN step.*\.soak\./s);
      expect(TestHarnessApi.clockNow() - before).toBeLessThan(60);
    });

    it('a duration that is not one token is refused, naming the forms', async () => {
      await run({ subcommand: 'clock-advance', value: 'tuesday' });
      expect(rejected()?.reason).toBe('test-usage');
    });
  });

  describe('weather', () => {
    beforeEach(() => {
      // The giver stands in a room at /test/here; the verb hands that PATH
      // to TestHarnessApi, which resolves the Locality (the route's walk).
      vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
      (ctx as unknown as { commandGiver: unknown }).commandGiver = {
        getTemplatePath: () => '/platform/agent/Avatar/t',
        getContainer: () => ({ getTemplatePath: () => '/test/here' }),
      };
    });

    it('`weather-pin rain` pins the Locality the giver stands in, frozen', async () => {
      const pin = vi
        .spyOn(TestHarnessApi, 'pinWeather')
        .mockResolvedValue({ locality: '/test/here', pin: { type: 'rain', mode: 'frozen' } });
      await run({ subcommand: 'weather-pin', value: 'rain' });
      expect(pin).toHaveBeenCalledWith('/test/here', 'rain', 'frozen');
      expect(said.join('\n')).toMatch(/held at rain/);
    });

    it('`--at` names another place; `--alive` pins alive', async () => {
      const pin = vi
        .spyOn(TestHarnessApi, 'pinWeather')
        .mockResolvedValue({ locality: '/test/there', pin: { type: 'fog', mode: 'alive' } });
      await run({ subcommand: 'weather-pin', value: 'fog', at: '/test/there', alive: true });
      expect(pin).toHaveBeenCalledWith('/test/there', 'fog', 'alive');
    });

    it('`weather-unpin` releases it', async () => {
      const unpin = vi
        .spyOn(TestHarnessApi, 'unpinWeather')
        .mockResolvedValue({ locality: '/test/here', pin: null });
      await run({ subcommand: 'weather-unpin' });
      expect(unpin).toHaveBeenCalledWith('/test/here');
      expect(said.join('\n')).toMatch(/runs free again/);
    });

    it('a kind that is not a weather is refused naming the six', async () => {
      await run({ subcommand: 'weather-pin', value: 'sideways', at: '/x' });
      expect(rejected()?.reason).toBe('test-refused');
    });
  });

  describe('ship (harbors P25)', () => {
    it('`ship <path> at node:<path>` stages her lying at the node', async () => {
      const stage = vi
        .spyOn(TestHarnessApi, 'stageShip')
        .mockResolvedValue({ ship: '/test/hesper/structure', frame: '/test/sea', at: { frame: 'chart', at: null as never } });
      await run({ subcommand: 'ship', op: '/test/hesper/structure', value: 'at', cite: 'node:/test/sea/bar' });
      expect(stage).toHaveBeenCalledWith('/test/hesper/structure', { at: { node: '/test/sea/bar' } });
      expect(said.join('\n')).toMatch(/lies staged on \/test\/sea/);
    });

    it('`… at <frame> <cite>` stages her at a citation on a frame', async () => {
      const stage = vi
        .spyOn(TestHarnessApi, 'stageShip')
        .mockResolvedValue({ ship: '/s', frame: '/test/river', at: { frame: 'line', at: null as never } });
      await run({ subcommand: 'ship', op: '/s', value: 'at', cite: '/test/river estuary-1.2' });
      expect(stage).toHaveBeenCalledWith('/s', { at: { frame: '/test/river', cite: 'estuary-1.2' } });
    });

    it('without `at` and a place, the usage', async () => {
      await run({ subcommand: 'ship', op: '/s' });
      expect(rejected()?.reason).toBe('test-usage');
    });
  });

  describe('gravity · afflict · species (size and carrying drive 7, 15, 19)', () => {
    beforeEach(() => {
      vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
      (ctx as unknown as { commandGiver: unknown }).commandGiver = {
        getTemplatePath: () => '/platform/agent/Avatar/t',
        getContainer: () => ({ getTemplatePath: () => '/test/here' }),
      };
    });

    it('`gravity 0` sets the room the giver stands in; `clear` inherits', async () => {
      const set = vi
        .spyOn(TestHarnessApi, 'setGravity')
        .mockResolvedValue({ place: '/test/here', own: 0, now: 0 });
      await run({ subcommand: 'gravity', value: '0' });
      expect(set).toHaveBeenCalledWith('/test/here', 0);
      expect(said.join('\n')).toMatch(/Gravity at \/test\/here is 0 m\/s²/);
      await run({ subcommand: 'gravity', value: 'clear', at: '/test/there' });
      expect(set).toHaveBeenLastCalledWith('/test/there', null);
    });

    it('`gravity` with no number is the usage, nothing set', async () => {
      const set = vi.spyOn(TestHarnessApi, 'setGravity');
      await run({ subcommand: 'gravity', value: 'heavy' });
      expect(rejected()?.reason).toBe('test-usage');
      expect(set).not.toHaveBeenCalled();
    });

    it('`afflict <name> <condition> [stage]` forwards, and reports how the body reads', async () => {
      const aff = vi
        .spyOn(TestHarnessApi, 'afflict')
        .mockResolvedValue({ character: 'Mara', condition: '/c/x', consciousness: 'unconscious' });
      await run({ subcommand: 'afflict', op: 'Mara', value: '/c/x', cite: '2' });
      expect(aff).toHaveBeenCalledWith('Mara', '/c/x', 2);
      expect(said.join('\n')).toMatch(/unconscious/);
      await run({ subcommand: 'afflict', op: 'Mara' });
      expect(rejected()?.reason).toBe('test-usage');
    });

    it('`species <name> <species>` forwards; a refusal comes back in its own words', async () => {
      vi.spyOn(TestHarnessApi, 'setSpecies').mockRejectedValue(new Error("testharness species: '/x' is not a species"));
      await run({ subcommand: 'species', op: 'Mara', value: '/x' });
      expect(rejected()?.reason).toBe('test-refused');
      expect(rejected()?.detail).toMatch(/is not a species/);
    });
  });

  describe('the shipped view routes each form to its controller', () => {
    const view = (() => {
      const path = fileURLToPath(
        new URL('../../../../../../../../content/platform/content/platform/cmd/system/testharness.yaml', import.meta.url),
      );
      return CommandDefinition.fromYaml(readFileSync(path, 'utf-8'), 'platform/cmd/system/testharness.yaml');
    })();
    function bind(line: string): { controller?: string; model: Record<string, unknown> } {
      const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
      const r = CommandApi.assemble(parsed, view, { commandGiver: {} as never, location: {} as never });
      if ('error' in r) throw new Error(`${line}: ${r.error}`);
      const key = r.model.subcommand;
      return {
        controller: key ? view.controllerForSubcommand(key) : view.resolvedController,
        model: r.model as unknown as Record<string, unknown>,
      };
    }
    const P = '/platform/idea/cmd/system/';

    it('clock / clock-advance', () => {
      expect(bind('testharness clock').controller).toBe(`${P}TestHarnessClockController`);
      const adv = bind('testharness clock-advance 2h');
      expect(adv.controller).toBe(`${P}TestHarnessClockAdvanceController`);
      expect(adv.model.value).toBe('2h');
    });

    it('weather / weather-pin --at --alive / weather-unpin', () => {
      expect(bind('testharness weather --at /x').controller).toBe(`${P}TestHarnessWeatherController`);
      const pin = bind('testharness weather-pin fog --at /test/there --alive');
      expect(pin.controller).toBe(`${P}TestHarnessWeatherPinController`);
      expect(pin.model).toMatchObject({ value: 'fog', at: '/test/there', alive: true });
      expect(bind('testharness weather-unpin').controller).toBe(`${P}TestHarnessWeatherUnpinController`);
    });

    it('gravity · afflict · species', () => {
      const g = bind('testharness gravity 0 --at /test/there');
      expect(g.controller).toBe(`${P}TestHarnessGravityController`);
      expect(g.model).toMatchObject({ value: '0', at: '/test/there' });
      const a = bind('testharness afflict Mara /c/anaesthesia 2');
      expect(a.controller).toBe(`${P}TestHarnessAfflictController`);
      expect(a.model).toMatchObject({ op: 'Mara', value: '/c/anaesthesia', cite: '2' });
      const sp = bind('testharness species Mara /s/gnomus');
      expect(sp.controller).toBe(`${P}TestHarnessSpeciesController`);
      expect(sp.model).toMatchObject({ op: 'Mara', value: '/s/gnomus' });
    });

    it('ship', () => {
      const ship = bind('testharness ship /s at node:/test/sea/bar');
      expect(ship.controller).toBe(`${P}TestHarnessShipController`);
      expect(ship.model).toMatchObject({ op: '/s', value: 'at', cite: 'node:/test/sea/bar' });
    });
  });
});
