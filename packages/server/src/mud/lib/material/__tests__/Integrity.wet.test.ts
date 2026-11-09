/**
 * ⭐ The material decides how a good fails in water: a good of a
 * weak-wet material (paper, board) gives way when soaked through — a
 * notebook, an envelope and a sheet alike, with no class of its own saying
 * so — and a good of a material that holds wet does not.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fiber from '../../../platform/idea/material/Fiber';
import Holder from '../../stuff/Holder';
import Good from '../../stuff/Good';
import Book from '../../../platform/thing/Book';
import Envelope from '../../../platform/thing/Envelope';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ScheduleApi } from '../../../api/schedule';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';

const PAPER = '/stuff/idea/material/_wet/paper';
const LINEN = '/stuff/idea/material/_wet/linen';

function material(path: string, wetStrength: number | null): Fiber {
  return makeStuffAtPath(() => {
    const m = new Fiber();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(800, 'kg/m³'));
    m.setWetStrength(wetStrength);
    return m;
  }, path);
}

function made<T extends Stuff>(make: () => T, mat: string, room: Holder): T {
  const t = makeStuff(() => {
    const x = make();
    (x as unknown as Good).setMaterial(StuffApi.findByTemplatePath<Fiber>(mat)!);
    return x;
  });
  ContainmentApi.move(t as never, room as unknown as Stuff & Container);
  return t;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  material(PAPER, 0.1);
  material(LINEN, null);
  vi.spyOn(ScheduleApi, 'schedule').mockImplementation(((_ms: number, fn: () => void) => {
    fn();
    return {} as never;
  }) as typeof ScheduleApi.schedule);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ a good of a weak-wet material gives way when soaked', () => {
  it('a notebook and an envelope of paper give way; nothing on their classes says so', async () => {
    const room = makeStuff(() => new Holder());
    const book = made(() => new Book(), PAPER, room);
    const env = made(() => new Envelope(), PAPER, room);
    book.wet(0.5);
    env.wet(0.5);
    expect(book.isSodden() || env.isSodden()).toBe(false);
    book.wet(0.4);
    env.wet(0.4);
    await new Promise((r) => setTimeout(r, 0));
    expect(book.isDestroyed()).toBe(true);
    expect(env.isDestroyed()).toBe(true);
  });

  it('a good of a material that holds wet does not', async () => {
    const room = makeStuff(() => new Holder());
    const cloth = made(() => new Good(), LINEN, room);
    cloth.wet(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(cloth.isSodden()).toBe(false);
    expect(cloth.isDestroyed()).toBe(false);
  });
});
