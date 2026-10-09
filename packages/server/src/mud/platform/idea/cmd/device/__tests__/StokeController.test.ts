/**
 * StokeController — ⭐⭐ **putting fuel in a fire**, the act no fire in
 * this game could accept until the fire build.
 *
 * Fuel was a `%` Reserve nothing could refill, so every forge, oven,
 * hearth, still and lamp was a one-shot object: it went out and stayed
 * out. Both whiskey wire drives carry a `DIRTY_REASON` whose last clause
 * is *"no refuel verb exists for any burner"*.
 *
 * ⚠ Each refusal here is the OBJECT answering for itself — a stone has
 * no heat of combustion, a sodden turf carries its own water, a full bed
 * is full — so none of them is a check the controller invented.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import StokeController from '../StokeController';
import IgniteController from '../IgniteController';
import Forge from '../../../../thing/Forge';
import Lamp from '../../../../thing/Lamp';
import Good from '../../../../../lib/stuff/Good';
import Material from '../../../../../lib/material/Material';
import Location from '../../../../../lib/stuff/Location';
import { ThermalMixin } from '../../../../../lib/thermal/Thermal';
import { WetMixin } from '../../../../../lib/wetness/Wet';
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
import { Quantity } from '../../../../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  protected override handleMessage(): void {}
}

/** An ordinary piece of matter — not a Combustible, just a thing. */
class Lump extends WetMixin(ThermalMixin(Good)) {
  static _mixinName = 'StokeTestLump';
}

let seq = 0;

function material(opts: {
  name: string;
  mjPerKg: number;
  absorption?: number;
}): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(opts.name);
    m.setDensity(Quantity.of(700, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setHeatOfCombustion(Quantity.of(opts.mjPerKg, 'MJ/kg'));
    m.setWaterAbsorptionCapacity(Quantity.of(opts.absorption ?? 28, '%'));
    m.setAutoignitionTemperature(Quantity.of(570, 'K'));
    return m;
  }, `/stuff/idea/material/_test/stoke-${opts.name}-${seq}`) as unknown as Material;
}

const one = (stuff: unknown, raw: string): MqlOneResult =>
  ({ stuff, raw }) as MqlOneResult;

/**
 * ⚠ `BurnerMixin.lit` defaults TRUE — right for the `Campfire` seed it
 * was written for and wrong for a bare `new Forge()`. Every shipped row
 * authors `lit:` either way (`lint:light-sources` clause (g) refuses one
 * that does not); a fixture has to say so too.
 */
function cold<T>(thing: T): T {
  (thing as unknown as { lit: boolean }).lit = false;
  return thing;
}

describe('StokeController', () => {
  let avatar: FakeAvatar;
  let room: Location;
  let forge: Forge;

  function ctx(verb = 'stoke'): CommandContext {
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

  function lump(opts: {
    name: string;
    mjPerKg: number;
    kg: number;
    wetness?: number;
  }): Lump {
    const l = makeStuff(() => {
      const t = new Lump();
      t.setMaterial(material({ name: opts.name, mjPerKg: opts.mjPerKg }));
      t.setMass(Quantity.of(opts.kg, 'kg'));
      return t;
    }) as Lump;
    if (opts.wetness !== undefined) {
      // ⚠ `_saturation` is `WetMixin`'s own field and the Hydrator's
      // carve-out is what a test wears here — there is no public setter
      // because nothing in the world sets a body's wetness directly;
      // rain and immersion do.
      (l as unknown as { _saturation: number })._saturation = opts.wetness;
    }
    ContainmentApi.move(l as never, room as never);
    return l;
  }

  async function stoke(fuel: Stuff, burner: Stuff): Promise<CommandContext> {
    const c = ctx();
    await makeStuff(() => new StokeController()).execute(
      { fuel: one(fuel, 'fuel'), burner: one(burner, 'forge') } as CommandModel,
      c,
    );
    return c;
  }

  beforeEach(() => {
    installV1QuantityMarshallers();
    room = makeStuff(() => new Location());
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar as never, room as never);
    forge = cold(makeStuff(() => new Forge()) as Forge);
    forge.setFuelCapacityKg(30);
    ContainmentApi.move(forge as never, room as never);
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ lays fuel in a cold bed, and the fire can then be lit', async () => {
    expect(forge.fuelRemaining()).toBe(0);
    // ⭐ The refusal that `stoke` lifts, and it has to NAME itself —
    // `no-fuel`, not `not-flammable`: a forge with an empty bed is a fire
    // waiting for somebody, not an unburnable object.
    expect(forge.ignite()).toEqual({ lit: false, reason: 'no-fuel' });

    const oak = lump({ name: 'oak', mjPerKg: 16, kg: 6 });
    await stoke(oak as unknown as Stuff, forge as unknown as Stuff);

    expect(forge.fuelRemaining()).toBeCloseTo(6);
    expect((oak as unknown as Stuff).isDestroyed()).toBe(true);
    expect(forge.ignite().lit).toBe(true);
  });

  it('⭐ the fire knows what it is burning', async () => {
    await stoke(
      lump({ name: 'charcoal', mjPerKg: 30, kg: 10 }) as unknown as Stuff,
      forge as unknown as Stuff,
    );
    expect(forge.fuelMaterial()?.getName()).toMatch(/charcoal/);
  });

  it('⭐⭐ the FUEL decides the heat — charcoal reaches a forge, oak does not', async () => {
    const hot = cold(makeStuff(() => new Forge()) as Forge);
    hot.setBurnTemperatureK(1600);
    hot.setFuelCapacityKg(30);
    ContainmentApi.move(hot as never, room as never);
    const cool = cold(makeStuff(() => new Forge()) as Forge);
    cool.setBurnTemperatureK(1600);
    cool.setFuelCapacityKg(30);
    ContainmentApi.move(cool as never, room as never);

    await stoke(
      lump({ name: 'charcoal', mjPerKg: 30, kg: 10 }) as unknown as Stuff,
      hot as unknown as Stuff,
    );
    await stoke(
      lump({ name: 'oak', mjPerKg: 16, kg: 10 }) as unknown as Stuff,
      cool as unknown as Stuff,
    );
    hot.ignite();
    cool.ignite();

    // Charcoal's flame (~2250 K) clears the 1600 K vessel ceiling; oak's
    // (~1340 K) is the binding constraint instead.
    expect(hot.getHeldTemperatureK()).toBeCloseTo(1600, 0);
    expect(cool.getHeldTemperatureK()).toBeLessThan(1400);
  });

  it('⭐ a heavier charge of the same fuel burns longer (AC3)', async () => {
    const heavy = cold(makeStuff(() => new Forge()) as Forge);
    heavy.setFuelCapacityKg(30);
    const light = cold(makeStuff(() => new Forge()) as Forge);
    light.setFuelCapacityKg(30);
    ContainmentApi.move(heavy as never, room as never);
    ContainmentApi.move(light as never, room as never);
    await stoke(
      lump({ name: 'oak', mjPerKg: 16, kg: 12 }) as unknown as Stuff,
      heavy as unknown as Stuff,
    );
    await stoke(
      lump({ name: 'oak', mjPerKg: 16, kg: 1 }) as unknown as Stuff,
      light as unknown as Stuff,
    );
    // ⭐ Duration is energy over power, and the small charge also delivers
    // LESS power (a stick cannot feed a forge), so the heavy one wins on
    // both terms — which is why there is no "fire size" field anywhere.
    const hoursFor = (f: Forge): number =>
      f.fuelEnergyJ() / Math.max(f.burnPowerW(), 1) / 3600;
    expect(hoursFor(heavy)).toBeGreaterThan(hoursFor(light));
  });

  it('refuses a stone: nothing to burn', async () => {
    const stone = lump({ name: 'granite', mjPerKg: 0, kg: 4 });
    const c = await stoke(stone as unknown as Stuff, forge as unknown as Stuff);
    expect(forge.fuelRemaining()).toBe(0);
    expect((stone as unknown as Stuff).isDestroyed()).toBe(false);
    expect(
      c.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(true);
  });

  it('⭐ refuses a sodden log — the same formula `ignite` already used', async () => {
    const wet = lump({ name: 'oak', mjPerKg: 16, kg: 6, wetness: 1 });
    const c = await stoke(wet as unknown as Stuff, forge as unknown as Stuff);
    expect(forge.fuelRemaining()).toBe(0);
    expect((wet as unknown as Stuff).isDestroyed()).toBe(false);
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
  });

  it('refuses a full bed', async () => {
    forge.setFuelCapacityKg(5);
    await stoke(
      lump({ name: 'oak', mjPerKg: 16, kg: 4 }) as unknown as Stuff,
      forge as unknown as Stuff,
    );
    const over = lump({ name: 'oak', mjPerKg: 16, kg: 4 });
    const c = await stoke(over as unknown as Stuff, forge as unknown as Stuff);
    expect(forge.fuelRemaining()).toBeCloseTo(4);
    expect((over as unknown as Stuff).isDestroyed()).toBe(false);
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
  });

  it('⭐⭐ refuses a vessel whose interior IS its tank — a lamp is filled', async () => {
    const lamp = makeStuff(() => {
      const l = new Lamp();
      (l as unknown as { interiorBulk: boolean }).interiorBulk = true;
      l.setInteriorCapacity(Quantity.of(0.5, 'L'));
      return l;
    }) as Lamp;
    ContainmentApi.move(lamp as never, room as never);
    const oak = lump({ name: 'oak', mjPerKg: 16, kg: 0.2 });
    const c = await stoke(oak as unknown as Stuff, lamp as unknown as Stuff);
    expect((oak as unknown as Stuff).isDestroyed()).toBe(false);
    expect(c.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
  });

  it('⭐⭐ a fire can be run TWICE — the thing none of them could do', async () => {
    await stoke(
      lump({ name: 'oak', mjPerKg: 16, kg: 6 }) as unknown as Stuff,
      forge as unknown as Stuff,
    );
    const igniteOnce = async (): Promise<boolean> => {
      const c = ctx('ignite');
      await makeStuff(() => new IgniteController()).execute(
        { target: one(forge, 'forge') } as CommandModel,
        c,
      );
      return forge.isLit();
    };
    expect(await igniteOnce()).toBe(true);

    // Burn it right out.
    (forge as unknown as { fuelBed: Record<string, number> }).fuelBed = {};
    forge.douse();
    expect(forge.isLit()).toBe(false);
    expect(forge.ignite()).toEqual({ lit: false, reason: 'no-fuel' });

    // …and stoke it again.
    await stoke(
      lump({ name: 'oak', mjPerKg: 16, kg: 6 }) as unknown as Stuff,
      forge as unknown as Stuff,
    );
    expect(await igniteOnce()).toBe(true);
  });
});
