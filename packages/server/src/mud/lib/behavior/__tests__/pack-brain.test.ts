/**
 * Brains in packs (libations 1g): a capability pack ships a brain under
 * `src/behavior/<name>.ts`, an agent row names it by the pack's own
 * namespace (`/<root>/behavior/<name>`), the resolver finds it through
 * the pack source table (never the kernel tree), and the behavior
 * engine fires it on its cadence exactly as a kernel brain.
 *
 * The pack is a real directory (the `stuff.resolveClassFile` pattern):
 * a tmp `src/` registered with `ModuleApi.registerPackSource`, so the
 * import is the loader's real one — no stub stands in for it.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { StuffApi } from '../../../api/stuff';
import { ModuleApi } from '../../../api/module';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { SensorMixin } from '../../message/Sensor';
import { EngagedMixin } from '../../activity/Engaged';
import { BehavedMixin } from '../Behaved';

const ROOT = '/fixture-brains';
const BRAIN = `${ROOT}/behavior/paces`;

class TestRoom extends ContainerMixin(Idea) {}
class TestNPC extends BehavedMixin(EngagedMixin(SensorMixin(ContainableMixin(Idea)))) {}
class TestPlayer extends SensorMixin(ContainableMixin(Idea)) {}

type NPC = TestNPC & { postRegister(c?: unknown): Promise<void>; behaviors: unknown[] };

let src: string;

beforeAll(async () => {
  src = mkdtempSync(join(tmpdir(), 'pack-brains-'));
  mkdirSync(join(src, 'behavior'), { recursive: true });
  writeFileSync(
    join(src, 'behavior', 'paces.ts'),
    [
      "const g = globalThis as unknown as { __packPaces?: number };",
      "g.__packPaces ??= 0;",
      "export const brain = class {",
      "  static label = 'paces';",
      "  static act(): void {",
      "    (globalThis as unknown as { __packPaces: number }).__packPaces++;",
      "  }",
      "};",
      "",
    ].join('\n'),
  );
  ModuleApi.registerPackSource(src, ROOT);
  await StuffApi.resolveExport(BRAIN, 'brain');
});
afterAll(() => rmSync(src, { recursive: true, force: true }));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const fired = (): number => (globalThis as unknown as { __packPaces: number }).__packPaces;

describe('a brain shipped by a pack', () => {
  it('resolves into the pack src/ by its namespace path', async () => {
    const resolved = await StuffApi.resolveExport(BRAIN, 'brain');
    expect(resolved).not.toBeNull();
    expect((resolved as { label: string }).label).toBe('paces');
    expect(StuffApi.resolveClassFile(BRAIN).file).toBe(join(src, 'behavior', 'paces.ts'));
  });

  it('fires on its cadence like a kernel brain', async () => {
    vi.useFakeTimers();
    const before = fired();
    const room = makeStuff(() => new TestRoom());
    const npc = makeStuff(() => new TestNPC()) as unknown as NPC;
    const player = makeStuff(() => new TestPlayer());
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(player as never, room as never);
    npc.behaviors = [{ brain: BRAIN, trigger: 'cadence:1s' }];
    await npc.postRegister();
    await vi.advanceTimersByTimeAsync(3000);
    expect(fired()).toBeGreaterThan(before);
  });
});
