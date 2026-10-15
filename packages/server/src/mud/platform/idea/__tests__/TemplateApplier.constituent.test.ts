import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { Idea } from '../../../lib/stuff/Idea';
import TemplateApplier from '../TemplateApplier';
import { StuffApi } from '../../../api/stuff';
import { Template } from '../../../lib/stuff/Template';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../../lib/mixin';

/**
 * ⭐ A CONSTITUENT loads with its holder (the scan sweep, 2026-10-14).
 * What a thing is made of is read synchronously, so the applier stands
 * the cited rows up in phase 1, before the field's setter runs — on mint,
 * go-live AND restore — and nothing has to be booted to make that true.
 */
class Holder extends Idea {
  static fieldMeta: FieldMeta = {
    speciesPath: { persistent: true, ref: 'identity:constituent' },
    _parts: { persistent: true, ref: 'identity:constituent' },
    _bySlot: { persistent: true, ref: 'identity:constituent' },
    proprietor: { persistent: true, ref: 'identity:relation' },
  };
  public speciesPath: string | null = null;
  public _parts: string[] = [];
  public _bySlot: Record<string, string> = {};
  public proprietor: string | null = null;
  public seenResident: boolean | null = null;
  public setSpeciesPath(v: string): void {
    this.speciesPath = v;
    this.seenResident = StuffApi.findByTemplatePath(v) !== null;
  }
}

const applier = (): TemplateApplier => makeStuff(() => new TemplateApplier());

describe('the constituent step', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  for (const mode of ['mint', 'go-live', 'restore'] as const) {
    it(`loads every cited path before the setter, on ${mode}`, async () => {
      const ensure = vi.spyOn(StuffApi, 'ensureConstituent').mockResolvedValue();
      const h = makeStuff(() => new Holder());
      await applier().apply(
        h,
        {
          speciesPath: '/s/collie',
          _parts: ['/m/wool', '/m/bone'],
          _bySlot: { wall: '/m/glass' },
          proprietor: '/w/house',
        },
        { mode },
      );
      expect(ensure.mock.calls.map((c) => c[0])).toEqual([
        '/s/collie', '/m/wool', '/m/bone', '/m/glass',
      ]);
    });
  }

  it('⭐ a relation is NOT loaded at hydration', async () => {
    const ensure = vi.spyOn(StuffApi, 'ensureConstituent').mockResolvedValue();
    const single = vi.spyOn(StuffApi, 'singleton');
    await applier().apply(makeStuff(() => new Holder()), { proprietor: '/w/house' }, { mode: 'mint' });
    expect(ensure).not.toHaveBeenCalled();
    expect(single).not.toHaveBeenCalled();
  });

  it('the setter sees the constituent resident', async () => {
    vi.spyOn(StuffApi, 'ensureConstituent').mockImplementation(async (p) => {
      makeStuffAtPath(() => new Holder(), p);
    });
    const h = makeStuff(() => new Holder());
    await applier().apply(h, { speciesPath: '/s/collie' }, { mode: 'restore' });
    expect(h.seenResident).toBe(true);
  });
});

describe('StuffApi.ensureConstituent', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('a live row costs nothing', async () => {
    makeStuffAtPath(() => new Holder(), '/s/live');
    const find = vi.spyOn(Template, 'findByPath');
    await StuffApi.ensureConstituent('/s/live');
    expect(find).not.toHaveBeenCalled();
  });

  it('walks the extends chain first, then the row', async () => {
    const order: string[] = [];
    vi.spyOn(Template, 'findByPath').mockImplementation(async (p: string) =>
      ({ path: p, extends: p === '/b/child' ? '/b/parent' : undefined }) as unknown as Template,
    );
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      order.push(p);
      return makeStuffAtPath(() => new Holder(), p);
    });
    await StuffApi.ensureConstituent('/b/child');
    expect(order).toEqual(['/b/parent', '/b/child']);
  });

  it('a bad citation warns and never throws — a degraded holder, not a failed clone', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(StuffApi.ensureConstituent('/no/such')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
