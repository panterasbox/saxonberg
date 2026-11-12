/**
 * ⭐ Capacity is physical (size and carrying D7): an ENCLOSED place refuses
 * authored content that does not fit — loudly, a diagnostic naming the
 * thing, its size and the place, and the thing is not placed. An open place
 * lets it spill.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Stuff } from '../Stuff';
import { StuffApi } from '../../../api/stuff';
import { DiagnosticApi } from '../../../api/diagnostics';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import Good from '../Good';
import { installForms, place } from '../../spatial/__tests__/size-fixture';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Mast extends Good {
  constructor() {
    super();
    this.setDimensions({ width: 0.3, depth: 0.3, height: 8 });
  }
}
class Crate extends Good {
  constructor() {
    super();
    this.setDimensions({ width: 0.5, depth: 0.5, height: 0.5 });
  }
}

const CLASSES: Record<string, new () => Stuff> = { '/test/Mast': Mast, '/test/Crate': Crate };
const ROWS = [
  { path: TemplateApplier.templatePath, class: '/platform/idea/TemplateApplier', data: {} },
  { path: '/test/mast', class: '/test/Mast', data: {} },
  { path: '/test/crate', class: '/test/Crate', data: {} },
];

beforeEach(() => {
  installV1QuantityTagTables();
  installV1QuantityMarshallers();
  installForms();
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async () => 'x'),
    find: vi.fn(async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      return ROWS.filter((r) => typeof query.path !== 'string' || r.path === query.path);
    }),
  } as unknown as PersistenceManager);
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (path: string) => CLASSES[path] as never);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    const row = ROWS.find((r) => r.path === path)!;
    return StuffApi.create(() => new CLASSES[row.class]!());
  }) as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('props: too big for an enclosed place', () => {
  it('is not placed, and the diagnostic names the thing, its size and the place', async () => {
    const record = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue();
    const hall = place(3, 'ceiling', 'walled');
    await hall.applyProps(['/test/mast', '/test/crate']);
    const kept = hall.getContents().map((c) => c.getTemplatePath() ?? (c.constructor as { name: string }).name);
    expect(hall.getContents().length).toBe(1);
    expect(kept.some((k) => k.includes('mast') || k === 'Mast')).toBe(false);
    expect(record).toHaveBeenCalledTimes(1);
    const d = record.mock.calls[0]![0];
    expect(d.severity).toBe('error');
    expect(d.channel).toBe('location-graph');
    expect(d.message).toMatch(/\/test\/mast/);
    expect(d.message).toMatch(/8\.00 m/);
    expect(d.message).toMatch(/too-big-inside/);
  });

  it('an open place lets it spill — placed, no diagnostic', async () => {
    const record = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue();
    const yard = place(3, 'open', 'none');
    await yard.applyProps(['/test/mast']);
    expect(yard.getContents().length).toBe(1);
    expect(record).not.toHaveBeenCalled();
  });
});
