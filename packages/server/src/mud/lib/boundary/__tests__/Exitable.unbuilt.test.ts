/**
 * ⭐⭐ A destination that does not exist is a DIAGNOSTIC, not a boot
 * crash.
 *
 * `StuffApi.singleton` throws *Template not found* for a missing row,
 * and eager rooms come from each pack's `boot:` list — so one mistyped
 * destination anywhere in content took the whole world down, wrapped as
 * *"failed to clone"*, from a stack trace naming the framework rather
 * than the row. An author could not see it coming and could not read it
 * when it arrived.
 *
 * Now the direction is installed **unbuilt**: `look` still names it,
 * `canTraverse` refuses with `gate: 'unbuilt'`, the author is told which
 * row and which direction — and creating the row later heals it on the
 * next hydrate, which is the half that makes the fix feel like a fix.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { DiagnosticApi } from '../../../api/diagnostics';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import CartesianLocation from '../../location/CartesianLocation';
import {
  makeStuffAtPath,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';
import type { RuntimeDiagnostic } from '@saxonberg/types';

const ZONE = '/test/unbuilt/zone';
const HERE = '/test/unbuilt/zone/here';
const THERE = '/test/unbuilt/zone/there';
const MISSING = '/test/unbuilt/zone/nowhere';

let recorded: RuntimeDiagnostic[];

beforeEach(() => {
  StuffApi.clearAll();
  recorded = [];
  seedKernelContentStore([
    { path: HERE, class: '/platform/location/CartesianLocation', data: {} },
    { path: THERE, class: '/platform/location/CartesianLocation', data: {} },
  ]);
  vi.spyOn(DiagnosticApi, 'record').mockImplementation(
    (async (d: RuntimeDiagnostic) => {
      recorded.push(d);
    }) as never,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function room(path: string): Promise<CartesianLocation> {
  const zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
  const loc = makeStuffAtPath(() => new CartesianLocation(), path);
  zone.addLocation(loc, 0, 0, 0);
  return loc;
}

describe('an exit onto nothing', () => {
  it('⭐⭐ installs the direction instead of throwing', async () => {
    const here = await room(HERE);
    await expect(
      here.applyExits({ north: { destination: MISSING } }),
    ).resolves.toBeUndefined();

    const exit = here.getExits().get('north');
    expect(exit).toBeDefined();
    expect(exit!.isUnbuilt()).toBe(true);
    // The path is KEPT, which is what lets creating the row heal it.
    expect(exit!.getDestinationTemplatePath()).toBe(MISSING);
  });

  it('⭐ refuses traversal with a reason, and names the GATE', async () => {
    const here = await room(HERE);
    await here.applyExits({ north: { destination: MISSING } });
    const exit = here.getExits().get('north')!;
    const guard = exit.canTraverse({} as never);
    expect(guard.ok).toBe(false);
    expect(guard.gate).toBe('unbuilt');
    expect(guard.reason).toBe('Nothing lies that way yet.');
  });

  it('⭐⭐ tells the AUTHOR which row and which direction', async () => {
    const here = await room(HERE);
    await here.applyExits({ north: { destination: MISSING } });
    const d = recorded.find((x) => x.severity === 'error');
    expect(d).toBeDefined();
    expect(d!.path).toBe(HERE);
    expect(d!.message).toContain('north');
    expect(d!.message).toContain(MISSING);
    expect(d!.channel).toBe('location-graph');
  });

  it('a real destination still wires a real exit, and records nothing', async () => {
    const here = await room(HERE);
    await room(THERE);
    await here.applyExits({ east: { destination: THERE } });
    const exit = here.getExits().get('east')!;
    expect(exit.isUnbuilt()).toBe(false);
    expect(exit.canTraverse({} as never).ok).toBe(true);
    expect(recorded).toEqual([]);
  });

  it('⭐ re-applying the SAME hole is idempotent — one exit, one report', async () => {
    const here = await room(HERE);
    await here.applyExits({ north: { destination: MISSING } });
    await here.applyExits({ north: { destination: MISSING } });
    expect(here.getExits().size).toBe(1);
    expect(recorded.filter((d) => d.severity === 'error')).toHaveLength(1);
  });

  it('⭐⭐ it HEALS: create the row, re-apply, and the real exit lands', async () => {
    const here = await room(HERE);
    await here.applyExits({ north: { destination: MISSING } });
    expect(here.getExits().get('north')!.isUnbuilt()).toBe(true);

    // The author creates the room they meant.
    seedKernelContentStore([
      { path: HERE, class: '/platform/location/CartesianLocation', data: {} },
      { path: THERE, class: '/platform/location/CartesianLocation', data: {} },
      { path: MISSING, class: '/platform/location/CartesianLocation', data: {} },
    ]);
    await here.applyExits({ north: { destination: MISSING } });

    const healed = here.getExits().get('north')!;
    expect(healed.isUnbuilt()).toBe(false);
    expect(healed.canTraverse({} as never).ok).toBe(true);
  });

  it('⚠ a WORKING exit is never replaced by a stub', async () => {
    // If a later spec names a row that does not exist, refusing to
    // trade a working passage for a hole is the only sane answer.
    const here = await room(HERE);
    await room(THERE);
    await here.applyExits({ east: { destination: THERE } });
    await here.applyExits({ east: { destination: MISSING } });
    const exit = here.getExits().get('east')!;
    expect(exit.isUnbuilt()).toBe(false);
    expect(exit.getDestinationTemplatePath()).toBe(THERE);
  });
});
