/**
 * The `draught` controllers (read · set) + CoverController — ⭐⭐ **one dial, three
 * consequences, and the player is told all three.**
 *
 * Opening a fire's vents makes it hotter, cleaner and *dimmer*, because
 * luminosity is incandescent soot. Shutting them makes it cooler,
 * sootier and brighter, and starts filling the room with what it is not
 * finishing. That is one number — and the narration is the point: a
 * trade-off nobody is told about is a number in a log.
 *
 * ⭐ `cover` is the banking verb. The act is historically *banking*;
 * `bank` is the banking verb (a subcommand dispatcher over eight names),
 * and *it got there first* is not one of the ways to settle a verb
 * collision. `cover` is the curfew bell's word — *couvre-feu* — and this
 * game's locality fire ordinance is already called a curfew. See
 * `cover.yaml`'s header for the whole ladder.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import DraughtSetController from '../DraughtSetController';
import DraughtReadController from '../DraughtReadController';
import CoverController from '../CoverController';
import Forge from '../../../../thing/Forge';
import Place from '../../../../../lib/stuff/Place';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { chargeWood } from '../../../../../lib/fire/__tests__/burner-fuel';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { CommandLineApi } from '../../../../../api/command-line';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { Burner } from '../../../../../lib/fire/Burner';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: string[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push((msg as { body?: string }).body ?? '');
  }
}

const one = (stuff: unknown, raw: string): MqlOneResult =>
  ({ stuff, raw }) as MqlOneResult;

describe('the draught', () => {
  let avatar: FakeAvatar;
  let room: Place;
  let forge: Forge;

  function ctx(verb: string): CommandContext {
    return CommandApi.createCommandContext({
      commandGiver: avatar as unknown as CommandContext['commandGiver'],
      location: room as never,
      commandText: verb,
      executionId: 't',
      commandId: 'c',
      verb,
      command: CommandDefinition.fromYaml(
        `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
        '<test>',
      ),
    });
  }

  async function setDraught(setting: string): Promise<CommandContext> {
    const c = ctx('draught');
    await makeStuff(() => new DraughtSetController()).execute(
      // ⭐ The setting is a `values:` slot on the set shapes (W7b). A bare
      // word after `draught` once bound to the fire and never arrived —
      // three drive runs found it; the read shape now needs `at <fire>`
      // (asserted through the real views below).
      { fire: one(forge, 'forge'), setting } as CommandModel,
      c,
    );
    return c;
  }

  beforeEach(() => {
    installV1QuantityMarshallers();
    room = makeStuff(() => new Place());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    forge = makeStuff(() => new Forge()) as Forge;
    ContainmentApi.move(forge as never, room as never);
    chargeWood(forge as unknown as Stuff & Burner, 20);
    forge.setBurnTemperatureK(1300);
    forge.setEmittedFlux(90);
    // ⚠ Two gotchas in one line. `BurnerMixin.lit` defaults TRUE (right
    // for the `Campfire` seed it was written for, wrong for a bare
    // `new Forge()`), so the fixture has to start it cold the way every
    // shipped row does — and `_setLit` is `ApiOnly`-gated because the
    // combustion driver is the one writer of lit state, so `ignite()` is
    // the legitimate path and it goes through the driver's own fuel check.
    (forge as unknown as { lit: boolean }).lit = false;
    expect(forge.ignite().lit).toBe(true);
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ wide open: hotter, cleaner — and DIMMER, and it says so', async () => {
    await setDraught('low');
    const cool = forge.getHeldTemperatureK();
    const bright = forge.getEmittedFlux().rawValue();

    const c = await setDraught('wide');
    const hot = forge.getHeldTemperatureK();
    const dim = forge.getEmittedFlux().rawValue();

    expect(hot).toBeGreaterThan(cool);
    expect(dim).toBeLessThan(bright); // ⭐ the counter-intuitive one
    expect(forge.completeness()).toBe(1);
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      false,
    );
    // The words carry both halves, or the lesson does not land.
    const said = avatar.received.join(' ');
    expect(said).toMatch(/clean/);
    expect(said).toMatch(/less light/);
  });

  it('starved: cooler, sootier, brighter, and the words say THAT', async () => {
    await setDraught('wide');
    avatar.received.length = 0;
    await setDraught('low');
    const said = avatar.received.join(' ');
    expect(said).toMatch(/cools/);
    expect(said).toMatch(/sooty/);
    expect(forge.completeness()).toBeLessThan(1);
  });

  it('⭐ five words, and `half` is the middle one', async () => {
    await setDraught('half');
    expect(forge.getDraught()).toBeCloseTo(0.5);
    await setDraught('open');
    expect(forge.getDraught()).toBeCloseTo(1);
  });

  it('⚠ a word the view does not offer still cannot set NaN', async () => {
    // Unreachable through the view (its `values:` are exactly five words),
    // and asserted anyway: a controller that trusted its matcher and was
    // wrong would put `NaN` in a fire's draught.
    const c = await setDraught('sideways');
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
    expect(Number.isFinite(forge.getDraught())).toBe(true);
  });

  it('⭐ bare `draught` READS it — asking where a dial stands is not a mistake', async () => {
    await setDraught('banked');
    avatar.received.length = 0;
    const c = ctx('draught');
    await makeStuff(() => new DraughtReadController()).execute(
      { fire: one(forge, 'forge') } as CommandModel,
      c,
    );
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      false,
    );
    expect(avatar.received.join(' ')).toMatch(/banked/);
    // ⚠ And no figure in the PROSE: a dial is read in words. The markup's
    // own stuff-ids are not prose, so strip the tags before asserting —
    // otherwise the claim passes or fails on an opaque identifier.
    const prose = avatar.received.join(' ').replace(/<[^>]*>/g, '');
    expect(prose).not.toMatch(/\d/);
  });

  describe('cover — banking', () => {
    async function cover(): Promise<CommandContext> {
      const c = ctx('cover');
      await makeStuff(() => new CoverController()).execute(
        { fire: one(forge, 'forge') } as CommandModel,
        c,
      );
      return c;
    }

    it('⭐⭐ banks it: a twentieth of the rate, twenty times as long, still in', async () => {
      await setDraught('wide');
      const wideW = forge.burnPowerW();
      const wideHours = forge.fuelEnergyJ() / wideW / 3600;

      await cover();

      const bankedW = forge.burnPowerW();
      const bankedHours = forge.fuelEnergyJ() / bankedW / 3600;
      expect(bankedW).toBeLessThan(wideW / 10);
      expect(bankedHours).toBeGreaterThan(wideHours * 10);
      // ⭐ Still in. That is the whole acceptance criterion, and it is
      // arithmetic rather than a mechanism: banking IS the draught floor.
      expect(forge.isLit()).toBe(true);
      expect(forge.getDraught()).toBeCloseTo(0.05);
    });

    it('a banked fire is EMBERS, not a dim bonfire', async () => {
      await setDraught('wide');
      const wide = forge.getEmittedFlux().rawValue();
      await cover();
      const embers = forge.getEmittedFlux().rawValue();
      expect(embers).toBeLessThan(wide);
      expect(embers).toBeGreaterThan(0);
    });

    it('refuses a fire that is already out', async () => {
      expect(forge.douse()).toBe(true);
      const c = await cover();
      expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
        true,
      );
    });

    it('⭐ W8: the burner banks itself and refuses, from a direct call', () => {
      expect(forge.bank()).toEqual({ ok: true, facts: undefined });
      expect(forge.getDraught()).toBeCloseTo(0.05);
      expect(forge.douse()).toBe(true);
      expect(forge.bank()).toEqual({ ok: false, reason: 'not-lit' });
    });

    it('⭐ W8: one draught vocabulary on the burner', () => {
      expect(forge.draughtFor(' Wide ')).toBe(1);
      expect(forge.draughtFor('half')).toBe(0.5);
      expect(forge.draughtFor('medium')).toBeNull();
    });

    it('⭐ W8: the burner answers light and douse — a refusal from a direct call', async () => {
      const plan = await forge.ignitePlanFor(avatar as unknown as Stuff);
      expect(await plan.onComplete()).toEqual({ ok: false, reason: 'already-burning' });
      const out = await forge.extinguishPlanFor(avatar as unknown as Stuff);
      expect(await out.onComplete()).toEqual({ ok: true, facts: undefined });
      expect(await (await forge.extinguishPlanFor(avatar as unknown as Stuff)).onComplete()).toEqual({
        ok: false,
        reason: 'not-burning',
      });
    });

    it('⭐ `draught banked` and `cover` are the same act', async () => {
      await cover();
      const byCover = forge.getDraught();
      await setDraught('wide');
      await setDraught('banked');
      expect(forge.getDraught()).toBeCloseTo(byCover);
    });
  });

  /*
   * ⭐⭐ The three shapes, through the REAL views in the order the burner
   * offers them (draught-fire → draught-set → draught). A shape error
   * moves the chain on; a bind error stops it — so the first view that
   * binds is the one that runs, and `draught forge medium` is refused by
   * the view with the five words.
   */
  describe('the shapes', () => {
    const VIEWS = [
      'platform/cmd/device/draught-fire.yaml',
      'platform/cmd/device/draught-set.yaml',
      'platform/cmd/device/draught.yaml',
    ];
    function chain(line: string): { view?: string; setting?: unknown; fire?: string; refused?: string } {
      for (const path of VIEWS) {
        const def = CommandApi.getCommand(path)!;
        const r = CommandApi.assemble(CommandLineApi.parsePipeline(line).commands[0]!, def, {
          commandGiver: avatar as never,
          location: room as never,
        });
        if (!('error' in r)) {
          // Objects bind as the typed words here; MQL resolves them later.
          const m = r.model as { setting?: unknown; fire?: string | { raw?: string } };
          const fire = typeof m.fire === 'string' ? m.fire : m.fire?.raw;
          return { view: path, setting: m.setting, fire };
        }
        if (r.error !== 'shape') return { refused: r.error };
      }
      return { refused: 'shape' };
    }

    it('binds each typed form to the act it means', async () => {
      if (!CommandApi.getCommand(VIEWS[0]!)) await CommandApi.preloadAll();
      expect(chain('draught low')).toMatchObject({ view: VIEWS[1], setting: 'low' });
      expect(chain('draught low at forge')).toMatchObject({ setting: 'low', fire: 'forge' });
      expect(chain('draught forge low')).toMatchObject({ view: VIEWS[0], setting: 'low', fire: 'forge' });
      expect(chain('draught')).toMatchObject({ view: VIEWS[2] });
      expect(chain('draught at forge')).toMatchObject({ view: VIEWS[2], fire: 'forge' });
      // ⭐ Drive step 8's option representative: refused by the VIEW.
      expect(chain('draught forge medium')).toEqual({ refused: 'bind' });
    });
  });
});
