/**
 * ⭐⭐ persistence-model D10 — a refused save is told, isolated, and never
 * keeps a body.
 *
 *  - A refused capture puts a diagnostic on the `persistence` channel and
 *    rethrows; the first refusal of a streak is one line to the connected
 *    body, a second refusal is not told again until a save lands.
 *  - In a batch, the refused record fails alone (the batch-mates are saved).
 */
import '../../../../test-bootstrap';
import { withSaveMany } from './pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { PersistableMixin } from '../Persistable';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { PersistableApi } from '../../../api/persistable';
import { ParcelApi } from '../../../api/parcel';
import { DiagnosticApi } from '../../../api/diagnostics';
import { MessageApi } from '../../../api/message';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

class Body extends PersistableMixin(HasInteractiveMixin(ContainerMixin(ContainableMixin(Idea)))) {
  static fieldMeta: FieldMeta = {};
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}
class Room extends PersistableMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}

let snapshots: Record<string, unknown>[];
let told: number;
let diagnosed: Array<{ channel?: string; path: string }>;

beforeEach(() => {
  StuffApi.clearAll();
  snapshots = [];
  told = 0;
  diagnosed = [];
  const find = vi.fn(async (col: string, q: Record<string, unknown>) =>
    col === 'holder_snapshots' ? snapshots.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)) : [],
  );
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col === 'holder_snapshots') snapshots.push({ ...doc });
    return 'id';
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(
    withSaveMany({ isConnected: () => true, save, find, findById: vi.fn(), delete: vi.fn() }) as unknown as PersistenceManager,
  );
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'g' });
  vi.spyOn(DiagnosticApi, 'record').mockImplementation(async (d) => {
    diagnosed.push(d as { channel?: string; path: string });
  });
  vi.spyOn(MessageApi, 'scene').mockImplementation((() => {
    // ⚠ A scene with no topic throws on send (the drive found it): the mock insists.
    let topic = '';
    const scene = { topic: (t: string) => ((topic = t), scene), toSelf: () => scene, send: () => { if (!topic) throw new Error('Scene.send() requires a topic'); told++; } };
    return scene;
  }) as unknown as typeof MessageApi.scene);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
});
afterEach(() => vi.restoreAllMocks());

describe('⭐ D10 — a refused save', () => {
  it('is a diagnostic and one line to the body; a second refusal is not told again until a save lands', async () => {
    const me = makeStuffAtPath(() => new Body(), '/platform/agent/Avatar/me');
    PersistableApi.refuseSavesOf('/platform/agent/Avatar/me', true);
    try {
      await expect(PersistableApi.capture(me, 'me')).rejects.toThrow(/refused/);
      await expect(PersistableApi.capture(me, 'me')).rejects.toThrow(/refused/);
      expect(diagnosed.filter((d) => d.channel === 'persistence')).toHaveLength(2);
      expect(told).toBe(1);
    } finally {
      PersistableApi.refuseSavesOf('/platform/agent/Avatar/me', false);
    }
    await PersistableApi.capture(me, 'me');
    PersistableApi.refuseSavesOf('/platform/agent/Avatar/me', true);
    try {
      await expect(PersistableApi.capture(me, 'me')).rejects.toThrow();
      expect(told).toBe(2);
    } finally {
      PersistableApi.refuseSavesOf('/platform/agent/Avatar/me', false);
    }
  });

  it('in a batch, fails alone — its batch-mates are saved, and it is named', async () => {
    const a = makeStuffAtPath(() => new Room(), '/w/a');
    const b = makeStuffAtPath(() => new Room(), '/w/b');
    PersistableApi.refuseSavesOf('/w/a', true);
    try {
      const r = await PersistableApi.captureBatch([a, b]);
      expect(r).toMatchObject({ captured: 1, failed: 1, refused: ['/w/a'] });
      expect(snapshots.map((s) => s.scope)).toEqual(['/w/b']);
      expect(diagnosed.map((d) => d.path)).toEqual(['/w/a']);
    } finally {
      PersistableApi.refuseSavesOf('/w/a', false);
    }
  });
});
