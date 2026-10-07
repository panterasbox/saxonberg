/**
 * The write chokepoint keeps the graph current — and never fails a save
 * doing it.
 *
 * ⭐⭐ `DomainHook` is the REAL template write chokepoint:
 * `TemplateApi.saveTemplate` has five direct callers and is bypassed by
 * the pack installer and by `Template.save()`. Anything that must be
 * true of every row write belongs here.
 *
 * ⭐⭐ And the trade this file pins: a throw in the projection is
 * recorded as a diagnostic against the row and **swallowed**. The graph
 * is derived and self-heals at the next rebuild; losing an author's
 * save to a hiccup in a derived store would be the wrong trade, and an
 * author who cannot save because an index is unhappy has no way to
 * understand why.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DomainHook from '../DomainHook';
import { TemplateApi } from '../../../../api/template';
import { NavigationApi } from '../../../../api/navigation';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { PersistApi } from '../../../../api/persist';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { RuntimeDiagnostic } from '@saxonberg/types';

const ROW = '/test/hook/zone/hall';

let recorded: RuntimeDiagnostic[];
let projected: string[];

beforeEach(() => {
  StuffApi.clearAll();
  recorded = [];
  projected = [];

  // The validators are not this file's subject.
  vi.spyOn(TemplateApi, 'validateReservedPath').mockResolvedValue(undefined);
  vi.spyOn(TemplateApi, 'validateFolderLeafSave').mockResolvedValue(undefined);
  vi.spyOn(TemplateApi, 'validateSingletonContainerTarget').mockResolvedValue(
    undefined,
  );
  vi.spyOn(TemplateApi, 'validateFolderLeafDelete').mockResolvedValue(
    undefined,
  );

  vi.spyOn(DiagnosticApi, 'record').mockImplementation(
    (async (d: RuntimeDiagnostic) => {
      recorded.push(d);
    }) as never,
  );
  vi.spyOn(NavigationApi, 'projectRow').mockImplementation(
    (async (path: string) => {
      projected.push(path);
    }) as never,
  );
  vi.spyOn(NavigationApi, 'removeRow').mockResolvedValue(undefined);
  vi.spyOn(NavigationApi, 'checkGraph').mockResolvedValue([]);
  vi.spyOn(PersistApi, 'find').mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function hook(): DomainHook {
  return makeStuff(() => new DomainHook());
}

describe('a row save keeps the graph current', () => {
  it('⭐ re-projects the saved row, AFTER the write', async () => {
    vi.spyOn(NavigationApi, 'isGraphWarm').mockReturnValue(true);
    const order: string[] = [];
    const next = vi.fn(async () => {
      order.push('write');
      return 'id-1';
    });
    vi.spyOn(NavigationApi, 'projectRow').mockImplementation(
      (async (path: string) => {
        order.push('project');
        projected.push(path);
      }) as never,
    );

    const id = await hook().aroundSave('content', { path: ROW }, next);

    expect(id).toBe('id-1');
    expect(projected).toEqual([ROW]);
    // ⚠ After, not around: the projection reads what was written.
    expect(order).toEqual(['write', 'project']);
  });

  it('⭐ re-projects every CHILD that extends the saved row', async () => {
    // Editing a parent changes every child's effective exits.
    vi.spyOn(NavigationApi, 'isGraphWarm').mockReturnValue(true);
    vi.spyOn(PersistApi, 'find').mockResolvedValue([
      { path: '/test/hook/zone/hall-b' },
      { path: '/test/hook/zone/hall-c' },
    ] as never);

    await hook().aroundSave('content', { path: ROW }, async () => 'id');

    expect(projected).toEqual([
      ROW,
      '/test/hook/zone/hall-b',
      '/test/hook/zone/hall-c',
    ]);
  });

  it('records each finding as a diagnostic against the ROW', async () => {
    vi.spyOn(NavigationApi, 'isGraphWarm').mockReturnValue(true);
    vi.spyOn(NavigationApi, 'checkGraph').mockResolvedValue([
      {
        rule: 'dangling-destination',
        severity: 'error',
        path: ROW,
        dir: 'north',
        detail: 'exit north names /nowhere, which does not exist',
      },
    ] as never);

    await hook().aroundSave('content', { path: ROW }, async () => 'id');

    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.path).toBe(ROW);
    expect(recorded[0]!.severity).toBe('error');
    expect(recorded[0]!.message).toContain('north');
    expect(recorded[0]!.channel).toBe('location-graph');
  });

  it('⚠ SKIPS the projection until the graph has warmed', async () => {
    // The installer writes thousands of rows before the registry boots.
    vi.spyOn(NavigationApi, 'isGraphWarm').mockReturnValue(false);
    const id = await hook().aroundSave('content', { path: ROW }, async () => 'x');
    expect(id).toBe('x');
    expect(projected).toEqual([]);
    expect(recorded).toEqual([]);
  });
});

describe('⭐⭐ the projection never fails the save', () => {
  it('a throw is recorded against the row and SWALLOWED', async () => {
    vi.spyOn(NavigationApi, 'isGraphWarm').mockReturnValue(true);
    vi.spyOn(NavigationApi, 'projectRow').mockRejectedValue(
      new Error('the derived store hiccupped'),
    );

    const id = await hook().aroundSave('content', { path: ROW }, async () => 'id-2');

    // The row SAVED. That is the whole point.
    expect(id).toBe('id-2');
    const d = recorded.find((x) => x.severity === 'warning');
    expect(d).toBeDefined();
    expect(d!.path).toBe(ROW);
    expect(d!.message).toContain('The row SAVED');
    expect(d!.message).toContain('hiccupped');
  });

  it('a VALIDATOR throw still refuses the save — that gate is not ours to soften', async () => {
    vi.spyOn(TemplateApi, 'validateFolderLeafSave').mockRejectedValue(
      new Error('folder/leaf'),
    );
    await expect(
      hook().aroundSave('content', { path: ROW }, async () => 'id'),
    ).rejects.toThrow(/folder\/leaf/);
  });
});

describe('a row delete un-projects its node', () => {
  it('⚠ resolves the path BEFORE the delete, then removes the node', async () => {
    vi.spyOn(NavigationApi, 'isGraphWarm').mockReturnValue(true);
    const { Template } = await import('../../../../lib/stuff/Template');
    vi.spyOn(Template, 'loadById').mockResolvedValue({ path: ROW } as never);
    const removed: string[] = [];
    vi.spyOn(NavigationApi, 'removeRow').mockImplementation(
      (async (p: string) => {
        removed.push(p);
      }) as never,
    );

    await hook().aroundDelete('content', 'doc-1', async () => undefined);

    // Afterwards there is nothing to resolve the path FROM, so the
    // graph would otherwise keep a node for a row that is gone.
    expect(removed).toEqual([ROW]);
  });

  it('an unresolvable id deletes anyway and leaves the graph alone', async () => {
    vi.spyOn(NavigationApi, 'isGraphWarm').mockReturnValue(true);
    const { Template } = await import('../../../../lib/stuff/Template');
    vi.spyOn(Template, 'loadById').mockRejectedValue(new Error('gone'));
    const next = vi.fn(async () => undefined);

    await expect(
      hook().aroundDelete('content', 'doc-1', next),
    ).resolves.toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
