/**
 * Phase 6 — production emit-site smoke tests. Confirms the engine
 * fires each well-known event from a sensible chokepoint. Does NOT
 * exercise full network / login flows; the goal is "this site
 * actually emits, with the documented payload shape."
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventApi } from '../event';
import { Events } from '../../lib/events';
import { ConnectionApi } from '../connection';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { EventRegistry } from '../../obj/EventRegistry';
import { Stuff } from '../../lib/stuff/Stuff';
import { Interactive } from '../../obj/Interactive';
import { HasInteractiveMixin } from '../../lib/connection/HasInteractive';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    (r as unknown as { templatePath?: string }).templatePath =
      '/obj/EventRegistry';
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('Engine emit sites', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('StuffCreated fires when a Stuff is created via StuffApi.create', async () => {
    await bootRegistry();
    const seen: Array<{ stuffId: string; templatePath?: string }> = [];
    EventApi.on<{ stuffId: string; templatePath?: string }>(
      Events.StuffCreated,
      (p) => {
        seen.push(p);
      }
    );
    class Plain extends Stuff {}
    const obj = await StuffApi.create(() => new Plain());
    await flushMicrotasks();
    expect(seen.some((s) => s.stuffId === obj.stuffId)).toBe(true);
  });

  it('StuffDestructed fires from StuffApi.destruct', async () => {
    await bootRegistry();
    class Plain extends Stuff {}
    const obj = await StuffApi.create(() => new Plain());
    const seen: Array<{ stuffId: string }> = [];
    EventApi.on<{ stuffId: string }>(Events.StuffDestructed, (p) => {
      seen.push(p);
    });
    StuffApi.destruct(obj);
    await flushMicrotasks();
    expect(seen).toEqual([{ stuffId: obj.stuffId }]);
  });

  it('ConnectionAttached fires from ConnectionApi.transfer', async () => {
    await bootRegistry();
    class Holder extends HasInteractiveMixin(Stuff) {}
    const holder = await StuffApi.create(() => new Holder());
    const interactive = await StuffApi.create(
      () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never)
    );
    const seen: Array<{ interactiveId: string; holderId?: string }> = [];
    EventApi.on<{ interactiveId: string; holderId?: string }>(
      Events.ConnectionAttached,
      (p) => {
        seen.push(p);
      }
    );
    ConnectionApi.transfer(interactive, holder);
    await flushMicrotasks();
    expect(seen).toEqual([
      { interactiveId: interactive.stuffId, holderId: holder.stuffId },
    ]);
  });

  it.todo('ModuleReloaded — wire when hot-reload subsystem lands');
});
