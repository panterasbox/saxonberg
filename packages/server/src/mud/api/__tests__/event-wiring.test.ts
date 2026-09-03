/**
 * Phase 6 — production emit-site smoke tests. Confirms the engine
 * fires each well-known event from a sensible chokepoint. Does NOT
 * exercise full network / login flows; the goal is "this site
 * actually emits, with the documented payload shape."
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { EventApi } from '../event';
import { Events, type ReloadEvent } from '../../lib/events';
import { ConnectionApi } from '../connection';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { HotReloadApi } from '../hot-reload';
import EventRegistry from '../../platform/idea/EventRegistry';
import { Stuff } from '../../lib/stuff/Stuff';
import Interactive from '../../platform/idea/Interactive';
import { HasInteractiveMixin } from '../../lib/connection/HasInteractive';
import { Idea } from "../../lib/stuff/Idea";

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
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
    class Plain extends Idea {}
    const obj = await StuffApi.create(() => new Plain());
    await flushMicrotasks();
    expect(seen.some((s) => s.stuffId === obj.stuffId)).toBe(true);
  });

  it('StuffDestructed fires from StuffApi.destruct', async () => {
    await bootRegistry();
    class Plain extends Idea {}
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
    class Holder extends HasInteractiveMixin(Idea) {}
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
    interactive.transferTo(holder);
    await flushMicrotasks();
    expect(seen).toEqual([
      { interactiveId: interactive.stuffId, holderId: holder.stuffId },
    ]);
  });

  it('ModuleReloaded fires from HotReloadApi.reload with the documented payload', async () => {
    await bootRegistry();
    HotReloadApi._clearAllForTest();

    const workDir = mkdtempSync(join(tmpdir(), 'hmr-event-wiring-'));
    try {
      const fixturePath = join(workDir, 'WiringGreeter.ts');
      writeFileSync(
        fixturePath,
        `export class WiringGreeter { greet() { return 'hello'; } }\n`
      );

      const seen: ReloadEvent[] = [];
      EventApi.on<ReloadEvent>(Events.ModuleReloaded, (p) => { seen.push(p); });

      await HotReloadApi.reload(fixturePath);
      await flushMicrotasks();

      expect(seen).toHaveLength(1);
      expect(seen[0]!.path).toBe(fixturePath);
      expect(seen[0]!.versionId).toBeTypeOf('string');
      expect(seen[0]!.previousVersionId).toBeNull();
      expect(seen[0]!.exports).toContain('WiringGreeter');
      expect(seen[0]!.error).toBeUndefined();
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
