/**
 * Storm lightning strikes (Wave 2, Phase E). A `weather:strike` tick fires
 * the presence-gated strike fan-out: an occupied SkyExposed `storm` scope
 * rolls `storm.strikeRate` and, on a hit, takes an ambient strike routed
 * through the shipped `ElectricityApi.conduct` (never a bespoke shock path).
 * A tall/conductive attractor draws a direct hit; an empty scope is a
 * harmless-but-heard flash; no weather state is stored.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../../../../lib/stuff/Location';
import Thing from '../../../../lib/stuff/Thing';
import Biome from '../../../../lib/biome/Biome';
import { SkyExposedBiome } from '../../SkyExposedBiome';
import Material from '../../../../lib/material/Material';
import { WeatherApi } from '../../../../api/weather';
import { BiomeApi } from '../../../../api/biome';
import { WorldClockApi } from '../../../../api/worldclock';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ElectricityApi } from '../../../../api/electricity';
import { ConnectionManager } from '../../../../../backend/ConnectionManager';
import { Quantity } from '../../../../lib/quantity';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import type { HasInteractive } from '../../../../lib/connection/HasInteractive';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { User } from '../../../../lib/identity/User';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import '../../WorldClockRegistry';

class TestRoom extends Location {}
class TestOccupant extends HasInteractiveMixin(Thing) {
  static _mixinName = 'TestOccupantStrike';
}

// The strike path is a long fire-and-forget async chain (dynamic imports +
// StuffApi.create/move + conduct + destruct); flush generously.
/**
 * Drain whatever the fan-out *scheduled* — the strike itself is awaited
 * directly now (`await WeatherApi.onStormTick()`), so this only has to
 * settle the downstream effects it queued.
 *
 * ⚠⚠ It used to be the ONLY synchronisation, and that is what made this
 * file flaky for months. `onStormTick` swallowed its own promise, so the
 * test pumped 30 macrotask turns and hoped: under load the assertion ran
 * before the fan-out finished (`conduct` never called), and — the
 * nastier direction — a PREVIOUS test's fan-out could land inside the
 * NEXT test's spy window, so it saw a call it never made. One cause, two
 * contradictory symptoms, which is why the failing pair changed run to
 * run. Never synchronise on a turn count when the work can be awaited.
 */
async function flush(): Promise<void> {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 0));
}

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(290, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

function skyRoom(): TestRoom {
  const biome = makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b._extendsBiomePath = '/stuff/idea/biome/universe';
    return b;
  }, '/stuff/idea/biome/outdoor/field');
  const room = makeStuff(() => new TestRoom());
  room.setBiome(biome);
  return room;
}

let matSeq = 0;
function conductiveRod(room: TestRoom): Thing {
  matSeq += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`rod-metal-${matSeq}`);
    m.setElectricalConductivity(Quantity.of(5, 'S/m'));
    return m;
  }, `/stuff/idea/material/_strike/metal-${matSeq}`) as unknown as Material;
  const rod = makeStuff(() => new Thing());
  rod.setMaterial(mat);
  return rod;
}

let occSeq = 0;
async function occupy(room: TestRoom): Promise<void> {
  const occupant = makeStuff(() => new TestOccupant());
  await ContainmentApi.move(occupant, room);
  const user = { _id: `strike-occ-${occSeq++}` } as unknown as User;
  const interactive = await ConnectionManager.get().createInteractive(
    'wsock',
    'wsess',
    user,
  );
  interactive.setHolder(occupant as unknown as HasInteractive & Stuff);
}

describe('Storm lightning strikes (Phase E)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    WorldClockApi._resetForTesting(); // now = 0
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WeatherApi._resetForTesting();
    ConnectionManager.get().clearAll();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('a struck storm scope fires ElectricityApi.conduct', async () => {
    const room = skyRoom();
    await occupy(room);
    WeatherApi._forceTypeForTesting('storm');
    WeatherApi._forceStrikeRollForTesting(0); // always strike

    const spy = vi.spyOn(ElectricityApi, 'conduct');
    await WeatherApi.onStormTick();
    await flush();

    expect(spy).toHaveBeenCalled();
  });

  it('the strikeRate roll gates the strike (a miss fires nothing)', async () => {
    const room = skyRoom();
    await occupy(room);
    WeatherApi._forceTypeForTesting('storm');
    WeatherApi._forceStrikeRollForTesting(0.99); // above the rate → miss

    const spy = vi.spyOn(ElectricityApi, 'conduct');
    await WeatherApi.onStormTick();
    await flush();

    expect(spy).not.toHaveBeenCalled();
  });

  it('a non-storm scope never strikes', async () => {
    const room = skyRoom();
    await occupy(room);
    WeatherApi._forceTypeForTesting('rain'); // not storm
    WeatherApi._forceStrikeRollForTesting(0);

    const spy = vi.spyOn(ElectricityApi, 'conduct');
    await WeatherApi.onStormTick();
    await flush();

    expect(spy).not.toHaveBeenCalled();
  });

  it('a conductive attractor draws a direct hit (shockContact)', async () => {
    const room = skyRoom();
    await occupy(room);
    const rod = conductiveRod(room);
    await ContainmentApi.move(rod, room);
    WeatherApi._forceTypeForTesting('storm');
    WeatherApi._forceStrikeRollForTesting(0);

    const spy = vi.spyOn(ElectricityApi, 'shockContact');
    await WeatherApi.onStormTick();
    await flush();

    expect(spy).toHaveBeenCalled();
    // The victim of the direct hit is the conductive rod.
    expect(spy.mock.calls[0]![1]).toBe(rod);
  });

  it('an empty scope still fires (a heard flash) but harms no one', async () => {
    const room = skyRoom();
    await occupy(room); // the occupant carries no conductive gear
    WeatherApi._forceTypeForTesting('storm');
    WeatherApi._forceStrikeRollForTesting(0);

    const spy = vi.spyOn(ElectricityApi, 'conduct');
    await WeatherApi.onStormTick();
    await flush();

    expect(spy).toHaveBeenCalled();
    // No conductive medium / bridged body → conduct reaches no victims.
    const outcomes = spy.mock.results[0]!.value as unknown[];
    expect(outcomes).toEqual([]);
  });

  it('stores no weather state — the resolve is unchanged after a strike', async () => {
    const room = skyRoom();
    await occupy(room);
    WeatherApi._forceTypeForTesting('storm');
    WeatherApi._forceStrikeRollForTesting(0);

    const before = (await WeatherApi.resolveWeatherFor(room)).sample.type;
    await WeatherApi.onStormTick();
    await flush();
    const after = (await WeatherApi.resolveWeatherFor(room)).sample.type;
    expect(after).toBe(before); // pure — the strike changed no weather state
  });
});
