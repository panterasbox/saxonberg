/**
 * ⭐ Who SAW it (tropes D8): the one writer computes a harm row's audience as
 * it builds the row — the sensors in the harmer's place who perceive the
 * harmer, minus the row's parties — and stamps the act.
 */
import "../../../../../test-bootstrap";
import { spySaveMany } from '../../../../lib/persistence/__tests__/pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountabilityApi } from '../../../../api/accountability';
import { StuffApi } from '../../../../api/stuff';
import { MessageApi } from '../../../../api/message';
import { PerceptionApi } from '../../../../api/perception';
import { ExecutionContextApi, FrameKind } from '../../../../api/execution-context';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { Idea } from '../../../../lib/stuff/Idea';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { ContainmentApi } from '../../../../api/containment';
import type { Stuff } from '../../../../lib/stuff/Stuff';

class Room extends ContainerMixin(Idea) {}
class Body extends SensorMixin(ContainableMixin(Idea)) {}

let store: Map<string, Record<string, unknown>>;
let ids = 0;

beforeEach(() => {
  store = new Map();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'save').mockImplementation(async (_c: string, doc: Record<string, unknown>) => {
    const id = `id-${ids++}`;
    store.set(id, { ...doc, _id: id });
    return id;
  });
  spySaveMany(pm);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const P = (k: string): string => `/platform/agent/Avatar/${k}`;

describe('the harm ledger records who saw it (tropes D8)', () => {
  it('a sensor who perceives the harmer is a witness; one in the dark is not; the parties are not', async () => {
    const room = makeStuffAtPath(() => new Room(), '/test/room');
    const bodies = Object.fromEntries(
      ['killer', 'victim', 'watcher', 'blind'].map((k) => [k, makeStuffAtPath(() => new Body(), P(k), P(k))]),
    ) as Record<string, Stuff>;
    for (const b of Object.values(bodies)) ContainmentApi.move(b as never, room as never);
    vi.spyOn(StuffApi, 'findByIdentityPath').mockImplementation(
      ((p: string) => Object.values(bodies).filter((b) => b.getIdentityPath() === p)) as never,
    );
    vi.spyOn(MessageApi, 'getSensors').mockReturnValue(Object.values(bodies) as never);
    vi.spyOn(PerceptionApi, 'perceives').mockImplementation(
      (viewer: Stuff) => viewer.getIdentityPath() !== P('blind'),
    );
    ExecutionContextApi.runRoot(null, 'r', () =>
      ExecutionContextApi.run(null, bodies.killer, 'executeCommand', {
        kind: FrameKind.Command,
        metadata: { causingCommandId: 'cmd-kill', commandContext: { commandGiver: bodies.killer } },
      }, () =>
        AccountabilityApi.record({
          kind: 'death',
          sessionId: 's1',
          initiator: P('killer'),
          opponent: P('victim'),
          victim: P('victim'),
          killer: P('killer'),
          consented: false,
          sentient: true,
        }),
      ), { acting: { boundary: 'test' } });
    await new Promise((r) => setTimeout(r, 5));
    const row = [...store.values()].find((r) => r.kind === 'death')!;
    expect(row.witnesses).toEqual([P('watcher')]);
    expect(row.actId).toBe('cmd-kill');
  });

  it('a harm with no live harmer has no witnesses', async () => {
    AccountabilityApi.record({
      kind: 'death',
      sessionId: 's2',
      initiator: '',
      opponent: '',
      victim: P('victim'),
      killer: '',
      consented: false,
      sentient: true,
    });
    await new Promise((r) => setTimeout(r, 5));
    const row = [...store.values()].find((r) => r.sessionId === 's2')!;
    expect(row.witnesses).toEqual([]);
  });
});
