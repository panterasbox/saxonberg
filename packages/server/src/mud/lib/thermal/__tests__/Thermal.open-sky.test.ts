/**
 * ⭐⭐ #139 (the soak lane): under the open sky the air IS the weather, and
 * the weather is a pure function of the place and the time — so a thing
 * outdoors that nobody restamps still follows it. The push side alone
 * restamps only the direct contents of an OCCUPIED sky room at a weather
 * boundary, so ice in a temper pit, or anything in a yard nobody stood in,
 * drifted all summer toward the winter it was last told about.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import Biome from '../../biome/Biome';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import { ThermalMixin } from '../Thermal';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { BiomeApi } from '../../../api/biome';
import { WeatherApi } from '../../../api/weather';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class OpenSkyThing extends ThermalMixin(Good) {
  static _mixinName = 'OpenSkyThing';
}
class OpenSkyRoom extends Place {}

const DAY = 86_400;

function body(stampedK: number): OpenSkyThing {
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('open-sky-mat');
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.6, 'W/(m·K)'));
    return m;
  }, '/stuff/idea/material/_open-sky/m') as unknown as Material;
  return makeStuff(() => {
    const t = new OpenSkyThing();
    t.setMass(Quantity.of(0.3, 'kg'));
    t.setMaterial(mat);
    t.setStampedTemperatureK(stampedK);
    t.setLastAmbientK(stampedK);
    return t;
  });
}

describe('#139 — a thing under the open sky follows the weather it is in', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
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
    WorldClockApi._resetForTesting();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WeatherApi._resetForTesting();
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('nobody restamps it, and it still ends at the weather — not at the cold it was last told', async () => {
    const sky = makeStuffAtPath(() => {
      const b = new SkyExposedBiome();
      b.setExtendsBiomePath('/stuff/idea/biome/universe');
      return b;
    }, '/stuff/idea/biome/outdoor/open-sky');
    const room = makeStuff(() => new OpenSkyRoom());
    room.setBiome(sky);
    await room.resolveClimateSite();
    await room.resolveWeatherLocality();
    // The unit clock starts at 0, and a 0 stamp reads as "never touched".
    WorldClockApi._advanceForTesting((3600 / WorldClockApi.getScale()) * 1000);
    const t = body(250); // set down in a hard frost
    await ContainmentApi.move(t, room);
    t.setLastAmbientK(250); // the cold it was last told about
    t.reconcileThermal(); // first touch: stamped
    WorldClockApi._advanceForTesting(((30 * DAY) / WorldClockApi.getScale()) * 1000);
    const now = WorldClockApi.getNow();
    const weather = WeatherApi.temperatureAt(room.climateSite(), room.weatherLocality(), now).rawValue();
    const k = t.getTemperature().rawValue();
    expect(Math.abs(k - 250), 'it stayed at the cold it was last told').toBeGreaterThan(5);
    expect(Math.abs(k - weather)).toBeLessThan(6);
  });
});
