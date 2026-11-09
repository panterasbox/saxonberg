/**
 * The gated template writes (controller-liquidity W3, D9/D10): the title
 * gate is the WRITE's own, so a bare caller — no controller in the way —
 * is refused for a path it holds no title over; and every refusal comes
 * before the first write.
 *
 *   - `writeTemplate` refuses another player's path (C62: the verbs'
 *     `can(…, null)` was always false; the gate now asks `canAtPath`).
 *   - `move` refuses a parent BEFORE writing the destination (C66: the
 *     delete used to refuse after the copy, leaving a stray duplicate).
 *   - `deleteSubtree` asks title of EVERY row it deletes (C65: `rm -r`
 *     asked the root's only), and deletes nothing when one is refused.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi } from '../template';
import { AccessApi } from '../access';
import { ExecutionContextApi } from '../execution-context';
import { PersistApi } from '../persist';
import { ProvenanceApi } from '../provenance';
import { ZoneApi } from '../zone';
import { StuffApi } from '../stuff';
import { Template } from '../../lib/stuff/Template';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import type { Stuff } from '../../lib/stuff/Stuff';

class Person extends Idea {}

/** Run `fn` as `who` — the gate reads the ACTING principal, never an argument. */
function as<T>(who: Stuff, fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'test.as', async () => {
    ExecutionContextApi.tagActingAuthor(who);
    return fn();
  });
}

interface FakeRow {
  path: string;
  own: { class: string; data: Record<string, unknown> };
  extends: string | undefined;
  delete: ReturnType<typeof vi.fn>;
}

let rows: Map<string, FakeRow>;
let extenders: Record<string, string[]>;
let saved: string[];
let alice: Stuff;
let bob: Stuff;

function row(path: string): FakeRow {
  const r: FakeRow = {
    path,
    own: { class: '/platform/idea/Idea', data: {} },
    extends: undefined,
    delete: vi.fn(async () => {
      rows.delete(path);
    }),
  };
  rows.set(path, r);
  return r;
}

beforeEach(() => {
  rows = new Map();
  extenders = {};
  saved = [];
  alice = makeStuffAtPath(() => new Person(), '/platform/agent/Avatar/alice') as unknown as Stuff;
  bob = makeStuffAtPath(() => new Person(), '/platform/agent/Avatar/bob') as unknown as Stuff;
  vi.spyOn(Template, 'findByPath').mockImplementation(
    async (p: string) => (rows.get(p) as unknown as Template) ?? null,
  );
  vi.spyOn(Template, 'findDescendants').mockImplementation(
    async (base: string) =>
      [...rows.values()].filter((r) => r.path.startsWith(`${base}/`)) as unknown as Template[],
  );
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (_c: string, q: Record<string, unknown>) =>
      (extenders[String(q.extends)] ?? []).map((path) => ({ path })) as never,
  );
  // Title: alice holds her home, nothing else.
  vi.spyOn(AccessApi, 'canAtPath').mockImplementation(
    async (s: Stuff | null, _a: unknown, p: string) =>
      s === alice && (p === '/home/alice' || p.startsWith('/home/alice/')),
  );
  vi.spyOn(ZoneApi, 'isFolderClass').mockResolvedValue(false);
  vi.spyOn(ProvenanceApi, 'recordAuthoring').mockResolvedValue(undefined as never);
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'save').mockImplementation(async (_c: string, doc: Record<string, unknown>) => {
    saved.push(String(doc.path));
    return 'id';
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('TemplateApi.writeTemplate — the write gates itself', () => {
  it('no acting principal (a forced or system chain) is refused', async () => {
    const r = await TemplateApi.writeTemplate('/home/alice/x', { class: '/platform/idea/Idea', data: {} });
    expect(r).toMatchObject({ ok: false, reason: 'access-denied' });
    expect(saved).toEqual([]);
  });

  it('a bare call for another player\'s path is refused and writes nothing', async () => {
    const r = await as(bob, () => TemplateApi.writeTemplate('/home/alice/x', { class: '/platform/idea/Idea', data: {} }));
    expect(r).toEqual({ ok: false, reason: 'access-denied', path: '/home/alice/x' });
    expect(saved).toEqual([]);
  });

  it('the title-holder writes', async () => {
    const r = await as(alice, () => TemplateApi.writeTemplate('/home/alice/x', { class: '/platform/idea/Idea', data: {} }));
    expect(r.ok).toBe(true);
    expect(saved).toEqual(['/home/alice/x']);
  });
});

describe('TemplateApi.makeFolder — what a folder is, gated (W8)', () => {
  it('refuses another player\'s path and writes nothing', async () => {
    const r = await as(bob, () => TemplateApi.makeFolder('/home/alice/dir'));
    expect(r).toEqual({ ok: false, reason: 'access-denied', path: '/home/alice/dir' });
    expect(saved).toEqual([]);
  });

  it('writes the tree\'s folder row for the title-holder', async () => {
    const pm = PersistenceManager.get();
    const r = await as(alice, () => TemplateApi.makeFolder('/home/alice/dir'));
    expect(r.ok).toBe(true);
    expect(saved).toEqual(['/home/alice/dir']);
    const doc = vi.mocked(pm.save).mock.calls[0]![1] as { class?: string };
    expect(doc.class).toBe('/platform/idea/FolderZone');
  });
});

describe('TemplateApi.move — refusals before the first write (C66)', () => {
  it('refuses a source that others extend, leaving NO copy at the destination', async () => {
    const src = row('/home/alice/parent');
    extenders['/home/alice/parent'] = ['/home/alice/child'];
    const r = await as(alice, () => TemplateApi.move('/home/alice/parent', '/home/alice/moved'));
    expect(r).toMatchObject({ ok: false, reason: 'extended' });
    expect(saved).toEqual([]);
    expect(src.delete).not.toHaveBeenCalled();
  });

  it('refuses a folder that still holds rows', async () => {
    row('/home/alice/dir');
    row('/home/alice/dir/leaf');
    const r = await as(alice, () => TemplateApi.move('/home/alice/dir', '/home/alice/dir2'));
    expect(r).toMatchObject({ ok: false, reason: 'has-descendants' });
    expect(saved).toEqual([]);
  });

  it('refuses a destination the mover holds no title over', async () => {
    row('/home/alice/a');
    const r = await as(alice, () => TemplateApi.move('/home/alice/a', '/home/bob/a'));
    expect(r).toEqual({ ok: false, reason: 'access-denied', path: '/home/bob/a' });
    expect(saved).toEqual([]);
  });

  it('moves a plain row: writes the destination, then removes the source', async () => {
    const src = row('/home/alice/a');
    const r = await as(alice, () => TemplateApi.move('/home/alice/a', '/home/alice/b'));
    expect(r.ok).toBe(true);
    expect(saved).toEqual(['/home/alice/b']);
    expect(src.delete).toHaveBeenCalled();
  });
});

describe('TemplateApi.deleteSubtree — title over every row (C65)', () => {
  it('refuses -r when ANY descendant is outside the giver\'s title, deleting nothing', async () => {
    // A nested parcel: /home/alice/yard is alice's, but a row under it is
    // reported as titled elsewhere.
    vi.mocked(AccessApi.canAtPath).mockImplementation(
      async (s: Stuff | null, _a: unknown, p: string) =>
        s === alice && p.startsWith('/home/alice/') && !p.includes('/lease/'),
    );
    const root = row('/home/alice/yard');
    const leaf = row('/home/alice/yard/lease/shed');
    const r = await as(alice, () => TemplateApi.deleteSubtree('/home/alice/yard', true));
    expect(r).toEqual({ ok: false, reason: 'access-denied', path: '/home/alice/yard/lease/shed' });
    expect(root.delete).not.toHaveBeenCalled();
    expect(leaf.delete).not.toHaveBeenCalled();
  });

  it('a stranger is refused on a direct call', async () => {
    const root = row('/home/alice/yard');
    const r = await as(bob, () => TemplateApi.deleteSubtree('/home/alice/yard', false));
    expect(r).toMatchObject({ ok: false, reason: 'access-denied' });
    expect(root.delete).not.toHaveBeenCalled();
  });

  it('deletes deepest first when every row is the giver\'s', async () => {
    const order: string[] = [];
    const root = row('/home/alice/yard');
    const leaf = row('/home/alice/yard/shed');
    root.delete.mockImplementation(async () => void order.push(root.path));
    leaf.delete.mockImplementation(async () => void order.push(leaf.path));
    const r = await as(alice, () => TemplateApi.deleteSubtree('/home/alice/yard', true));
    expect(r.ok).toBe(true);
    expect(order).toEqual(['/home/alice/yard/shed', '/home/alice/yard']);
  });

  it('refuses a row extended from OUTSIDE the subtree', async () => {
    row('/home/alice/base');
    extenders['/home/alice/base'] = ['/home/alice/elsewhere'];
    const r = await as(alice, () => TemplateApi.deleteSubtree('/home/alice/base', true));
    expect(r).toMatchObject({ ok: false, reason: 'extended' });
  });
});
