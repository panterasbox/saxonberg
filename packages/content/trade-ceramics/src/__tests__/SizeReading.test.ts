/**
 * `measure size` — a brick against the statute brick (ceramics D30, S11):
 * a brick of the statute's volume reads true; one struck from an oversize
 * mould reads OVER, off standard, by the polity's own unit.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import SizeReading from '../idea/reading/SizeReading';
import { driveMeasure, instrumentWith } from '@saxonberg/server/mud/platform/idea/reading/__tests__/drive';
import { applyRowFrom } from '@saxonberg/server/mud/platform/idea/reading/__tests__/row';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { GovernmentApi } from '@saxonberg/server/mud/api/government';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { CommandContext } from '@saxonberg/server/mud/api/command';

const ROW = fileURLToPath(new URL('../../content/trade/ceramics/idea/reading/size.yaml', import.meta.url));

class Yard extends ContainerMixin(Idea) {
  static _mixinName = 'SizeTestYard';
}
class Person extends ContainerMixin(ContainableMixin(Idea)) {
  static _mixinName = 'SizeTestPerson';
}

let said: string[];

async function measureBrick(kg: number, gauger = false): Promise<string> {
  const earthenware = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('earthenware');
    m.setDensity(Quantity.of(2000, 'kg/m³'));
    return m;
  }, `/stuff/idea/material/_size/earthenware-${(seq += 1)}`) as unknown as Material;
  const yard = makeStuff(() => new Yard());
  const who = makeStuff(() => new Person());
  ContainmentApi.move(who, yard);
  const brick = makeStuff(() => {
    const b = new Good();
    b.setMass(Quantity.of(kg, 'kg'));
    b.setMaterial(earthenware);
    return b;
  });
  ContainmentApi.move(brick, yard);
  vi.spyOn(GovernmentApi, 'subjectTo').mockResolvedValue([
    {
      key: 'testtown',
      name: 'Testtown',
      description: '',
      charter: '',
      treasury: '',
      departments: [],
      seats: gauger ? [{ key: 'gauger', title: 'Gauger' }] : [],
      standards: [
        { key: 'brick-length', value: 9, unit: 'in' },
        { key: 'brick-width', value: 4.5, unit: 'in' },
        { key: 'brick-depth', value: 2.25, unit: 'in' },
      ],
    },
  ] as never);
  vi.spyOn(GovernmentApi, 'holdsSeat').mockResolvedValue(gauger as never);
  said = [];
  const reading = applyRowFrom(makeStuff(() => new SizeReading()), ROW);
  const ctx = { commandGiver: who, location: yard, note: vi.fn() } as unknown as CommandContext;
  await driveMeasure(reading, ctx, {
    subject: { stuff: brick, raw: 'brick' },
    tools: [await instrumentWith('gauging', { grade: 'fine', condition: 1 })],
  });
  return said.join('\n');
}

let seq = 0;

beforeEach(() => {
  StuffApi.clearAll();
  // A practised hand with a good rule: the blur is a hair's breadth.
  vi.spyOn(SizeReading.prototype as never, 'bandOf').mockResolvedValue('proficient' as never);
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
afterEach(() => vi.restoreAllMocks());

describe('measure size', () => {
  it('a brick of the statute volume is a true brick', async () => {
    // 9 × 4.5 × 2.25 in = 1.494 L; earthenware at 2000 kg/m³ → 2.99 kg.
    expect(await measureBrick(2.99)).toMatch(/true brick by Testtown/);
  });

  it('⭐ a brick from an oversize mould is OVER the statute — off standard', async () => {
    expect(await measureBrick(3.6)).toMatch(/OVER Testtown's statute brick.*off standard/);
  });

  it("the gauger's measure is of record; anyone else's is theirs", async () => {
    expect(await measureBrick(2.99, true)).toMatch(/of record/);
    expect(await measureBrick(2.99, false)).not.toMatch(/of record/);
  });
});
