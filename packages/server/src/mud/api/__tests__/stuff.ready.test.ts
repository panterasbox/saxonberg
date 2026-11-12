/**
 * `StuffApi.ready` — the readiness door the boot stands every Api's needs
 * through (load-on-use W10). ⚠ An Api is a CLASS, which is a function: it
 * must be expanded by its declared `needs`, never called as a loader — the
 * W10 drive's boot died on exactly that (`Class constructor GovernmentApi
 * cannot be invoked without 'new'`).
 */
import '../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StuffApi } from '../stuff';

afterEach(() => vi.restoreAllMocks());

describe('StuffApi.ready', () => {
  it('runs a loader need, and expands an Api class by its needs', async () => {
    const calls: string[] = [];
    const loader = vi.fn(async () => void calls.push('loader'));
    const inner = vi.fn(async () => void calls.push('inner'));
    class FakeApi {
      static readonly needs = [inner];
    }
    await StuffApi.ready(loader, FakeApi);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(calls.sort()).toEqual(['inner', 'loader']);
  });

  it('stands a path need through singleton', async () => {
    const singleton = vi.spyOn(StuffApi, 'singleton').mockResolvedValue({} as never);
    class PathApi {
      static readonly needs = ['/platform/idea/SomeCatalogue'];
    }
    await StuffApi.ready(PathApi, '/platform/idea/Other');
    expect(singleton.mock.calls.map((c) => c[0]).sort()).toEqual([
      '/platform/idea/Other',
      '/platform/idea/SomeCatalogue',
    ]);
  });
});
