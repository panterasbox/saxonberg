/**
 * `measure capacity` — the gauger's act (assembly D13, AC 24): anybody
 * reads the figure; only a holder of the polity's `gauger` seat writes it
 * of record; the standard is the polity's row; off-standard is said.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import CapacityReading from '../idea/reading/CapacityReading';
import { driveMeasure, instrumentWith } from '@saxonberg/server/mud/platform/idea/reading/__tests__/drive';
import { applyRowFrom } from '@saxonberg/server/mud/platform/idea/reading/__tests__/row';
import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { AddressableMixin } from '@saxonberg/server/mud/lib/address/Addressable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { GovernmentApi } from '@saxonberg/server/mud/api/government';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { GovernmentDescriptor } from '@saxonberg/server/mud/platform/idea/Government';

const ROW = fileURLToPath(
  new URL('../../content/trade/coopering/idea/reading/capacity.yaml', import.meta.url),
);

class Cellar extends AddressableMixin(ContainerMixin(Idea)) {
  static _mixinName = 'CapacityTestCellar';
}
class Person extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'CapacityTestPerson';
}

let said: string[];

function gov(over: Partial<GovernmentDescriptor> = {}): GovernmentDescriptor {
  return {
    key: 'testtown',
    name: 'Testtown',
    description: '',
    charter: '',
    treasury: '',
    departments: [],
    seats: [{ key: 'gauger', label: 'Gauger', department: '/x', positionKey: 'gauger' }],
    standards: [{ key: 'cask', value: 25, unit: 'L' }],
    ...over,
  };
}

async function gauge(litres: number, seated: boolean, polity = gov()): Promise<{ text: string; cask: Vat }> {
  const cellar = makeStuff(() => new Cellar());
  cellar.setAddress('/testtown/cellar');
  const who = makeStuff(() => new Person());
  ContainmentApi.move(who, cellar);
  const cask = makeStuff(() => new Vat());
  cask.setInteriorCapacity(Quantity.of(litres, 'L'));
  ContainmentApi.move(cask, cellar);
  vi.spyOn(GovernmentApi, 'governmentChainAt').mockReturnValue([polity]);
  vi.spyOn(GovernmentApi, 'holdsSeat').mockResolvedValue(seated);
  vi.spyOn(PersistableApi, 'captureHostOf').mockResolvedValue(undefined as never);
  said = [];
  const reading = applyRowFrom(makeStuff(() => new CapacityReading()), ROW);
  const ctx = { commandGiver: who, location: cellar, note: vi.fn() } as unknown as CommandContext;
  await driveMeasure(reading, ctx, {
    subject: { stuff: cask, raw: 'cask' },
    tools: [await instrumentWith('gauging', { grade: 'masterful', condition: 1 })],
  });
  return { text: said.join('\n'), cask };
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toPeers = () => b;
    b.toSelf = (m: unknown) => {
      said.push(String(m));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('measure capacity — the gauge', () => {
  it('⭐ answers ANYONE — the figure, and that it is not of record', async () => {
    const { text, cask } = await gauge(25, false);
    expect(text).toMatch(/run the rod in/);
    expect(text).toMatch(/not of record/);
    expect(cask.getGauge()).toBeNull();
  });

  it('⭐⭐ the seat writes the gauge ONTO the cask, of record', async () => {
    const { text, cask } = await gauge(25, true);
    expect(text).toMatch(/of record/);
    expect(text).not.toMatch(/not of record/);
    expect(cask.getGauge()).toMatchObject({ government: 'testtown', standardL: 25 });
  });

  it('an off-standard cask is said to be so, to anyone', async () => {
    const { text } = await gauge(20, false);
    expect(text).toMatch(/SHORT/);
    expect(text).toMatch(/off standard/);
  });

  it('⭐ a second polity declares its own tun with a row', async () => {
    const { text } = await gauge(40, false, gov({ key: 'other', name: 'Otherton', standards: [{ key: 'cask', value: 40, unit: 'L' }] }));
    // Whose standard applies — Otherton's forty, not Testtown's twenty-five.
    // (An untrained hand reads a wide bracket, so on/off is not asserted.)
    expect(text).toMatch(/forty-litre/);
    expect(text).toMatch(/Otherton/);
  });
});
