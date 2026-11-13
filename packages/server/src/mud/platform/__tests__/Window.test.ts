import "../../../test-bootstrap";
import { describe, it, expect, afterEach , beforeEach } from 'vitest';
import Window from '../thing/Window';
import { Boundary } from '../../lib/boundary/Boundary';
import Location from '../../lib/location/Location';
import CartesianZone from '../idea/location/CartesianZone';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { ProxyApi } from '../../api/proxy';
import TemplateApplier from '../idea/TemplateApplier';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../lib/security/__tests__/test-setup';
import { Colour } from '../../lib/perception/Colour';

describe('Window', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('is a Boundary and a Sealable, defaults to closed + base 1.0', async () => {
    const w = await StuffApi.create(() => new Window());
    expect(w).toBeInstanceOf(Boundary);
    expect(MixinApi.isSealable(w)).toBe(true);
    expect(w.isOpen()).toBe(false);
    expect(w.getBaseTransmissivity()).toBe(1.0);
    expect(w.getDirectionalOverrides()).toBeNull();
    expect(w.getColorTint()).toBeNull();
  });

  it('transmissivity is 0 when closed regardless of base / overrides', async () => {
    const w = await StuffApi.create(() => new Window());
    w.setBaseTransmissivity(0.7);
    w.setDirectionalOverrides({ aToB: 1, bToA: 0.3 });
    expect(w.transmissivity('light', 'A', 'B')).toBe(0);
    expect(w.transmissivity('light', 'B', 'A')).toBe(0);
  });

  it('symmetric: transmissivity returns base in both directions when open', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setBaseTransmissivity(0.6);
    expect(w.transmissivity('light', 'A', 'B')).toBe(0.6);
    expect(w.transmissivity('light', 'B', 'A')).toBe(0.6);
  });

  it('one-way glass: aToB=1, bToA=0', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setBaseTransmissivity(1);
    w.setDirectionalOverrides({ aToB: 1, bToA: 0 });
    expect(w.transmissivity('light', 'A', 'B')).toBe(1);
    expect(w.transmissivity('light', 'B', 'A')).toBe(0);
    expect(w.transmissivity('sight', 'A', 'B')).toBe(1);
    expect(w.transmissivity('sight', 'B', 'A')).toBe(0);
  });

  it('rejects out-of-range transmissivity / overrides', async () => {
    const w = await StuffApi.create(() => new Window());
    expect(() => w.setBaseTransmissivity(-0.1)).toThrow(RangeError);
    expect(() => w.setBaseTransmissivity(1.5)).toThrow(RangeError);
    expect(() => w.setDirectionalOverrides({ aToB: 2 })).toThrow(RangeError);
  });

  it('⭐ never passes a body; light, sight, smell and sound read the glass', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setBaseTransmissivity(0.5);
    expect(w.passesBodiesWhenOpen()).toBe(false);
    expect(w.transmissivity('movement', 'A', 'B')).toBe(0);
    for (const ch of ['light', 'sight', 'smell', 'sound'] as const) {
      expect(w.transmissivity(ch, 'A', 'B'), ch).toBe(0.5);
    }
    w.close();
    for (const ch of ['light', 'sight', 'smell', 'sound'] as const) {
      expect(w.transmissivity(ch, 'A', 'B'), ch).toBe(0);
    }
  });

  it('hydrates configuration via the TemplateApplier (scalar fields)', async () => {
    const w = await StuffApi.create(() => new Window());
    await makeStuff(() => new TemplateApplier()).apply(w, {
      baseTransmissivity: 0.4,
      aToBOverride: 0.4,
      bToAOverride: 0,
      colorTint: 'amber',
      open: true,
    }, { mode: 'mint' });
    expect(w.getBaseTransmissivity()).toBe(0.4);
    // The structured runtime API is reconstructed from the two scalars.
    expect(w.getDirectionalOverrides()).toEqual({ aToB: 0.4, bToA: 0 });
    expect(w.getColorTint()).toBe('amber');
    expect(w.isOpen()).toBe(true);

    // toDocument bracket-read shape — the persistence layer sees the
    // two scalars directly, not the structured object.
    const raw = ProxyApi.unwrap(w) as unknown as {
      baseTransmissivity: number;
      aToBOverride: number | null;
      bToAOverride: number | null;
      colorTint: string | null;
    };
    expect(raw.baseTransmissivity).toBe(0.4);
    expect(raw.aToBOverride).toBe(0.4);
    expect(raw.bToAOverride).toBe(0);
    expect(raw.colorTint).toBe('amber');
  });

  it('one-side-only override hydrates correctly', async () => {
    const w = await StuffApi.create(() => new Window());
    await makeStuff(() => new TemplateApplier()).apply(w, {
      aToBOverride: 0.5,
      // bToAOverride absent — should stay null
    }, { mode: 'mint' });
    expect(w.getDirectionalOverrides()).toEqual({ aToB: 0.5 });
  });

  it('null overrides round-trip through the runtime API', async () => {
    const w = await StuffApi.create(() => new Window());
    w.setDirectionalOverrides({ aToB: 1, bToA: 0 });
    expect(w.getDirectionalOverrides()).toEqual({ aToB: 1, bToA: 0 });
    w.setDirectionalOverrides(null);
    expect(w.getDirectionalOverrides()).toBeNull();
  });

  it('⭐ one-way glass reads by SIDE: what flows into each place', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new Location());
    const b = makeStuff(() => new Location());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);

    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setDirectionalOverrides({ aToB: 1, bToA: 0 });
    await a.addBidirectionalExit(b, 'north', { boundary: w });
    const north = a.getExit('north')!; // side A
    const south = b.getExit('south')!; // side B
    expect(w.sideOf(north)).toBe('A');
    // Into B (south's place) flows A→B; into A flows B→A.
    expect(w.transmissivityInto('sight', south)).toBe(1);
    expect(w.transmissivityInto('sight', north)).toBe(0);
  });
});

describe('Window.lightTransmittance — glaze, tint, shut (W0)', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('an open, unglazed, untinted window is clear (UNDYED)', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    const c = w.lightTransmittance();
    expect(c.r).toBe(1);
    expect(c.g).toBe(1);
    expect(c.b).toBe(1);
  });

  it('an authored colorTint colours the light by its palette word', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setColorTint('green');
    expect(w.lightTransmittance().nearestTag()).toBe('green');
  });

  it('glazing WINS over the authored tint', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setColorTint('green');
    w.setGlazing(Colour.of(1, 0.1, 0.1)); // red glass set over a green-tinted row
    expect(w.lightTransmittance().nearestTag()).toBe('red');
    expect(w.getGlazing()).not.toBeNull();
  });

  it('clearing the glaze falls back to the authored tint', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setColorTint('green');
    w.setGlazing(Colour.of(1, 0.1, 0.1));
    w.setGlazing(null);
    expect(w.getGlazing()).toBeNull();
    expect(w.lightTransmittance().nearestTag()).toBe('green');
  });

  it('a SHUT window imparts no colour (it passes no light)', async () => {
    const w = await StuffApi.create(() => new Window());
    w.setGlazing(Colour.of(1, 0.1, 0.1));
    // Window starts closed.
    const c = w.lightTransmittance();
    expect(c.r).toBe(1);
    expect(c.g).toBe(1);
    expect(c.b).toBe(1);
  });

  it('transmittanceColour answers the glazing', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setGlazing(Colour.of(1, 0.1, 0.1));
    expect(w.transmittanceColour('A', 'B').nearestTag()).toBe('red');
  });
});
