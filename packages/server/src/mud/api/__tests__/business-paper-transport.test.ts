/**
 * ⚠⚠ **`saveAsBusiness` is the second ownership bypass in the document
 * store**, and this file is the argument that it is a safe one.
 *
 * A bill of lading is issued by a *clerk* on behalf of a *carrier*.
 * `DocumentApi.save` gates on parcel title, which admits the
 * **landowner** — making every clerk a landowner is exactly the error
 * `saveRelease` exists to avoid, and titling each carrier an extent
 * works for the proprietor and fails for every employee.
 *
 * Three rails keep it narrow, and each has a test here:
 *
 *   1. **No caller-supplied owner** — derived from the `Business`.
 *   2. **The path must lie under that business's own branch.** This is
 *      also what makes a depot's records cover exactly what it handled,
 *      read by prefix (AC17).
 *   3. **The `kind` is one of the closed three** — it can never write a
 *      command-view, a recipe or a release.
 *
 * ⚠ Deliberately NO caller-module allowlist, unlike `saveRelease`: the
 * callers are pack registries, and a `FromModule` list here would be a
 * kernel edit every paper-filing pack needs. That is a decision, so it
 * is asserted rather than assumed.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../document';
import { StuffApi } from '../stuff';
import { ExecutionContextApi } from '../execution-context';
import BusinessEntity from '../../platform/idea/Business';
import { Idea } from '../../lib/stuff/Idea';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { AccessApi } from '../access';

class TestClerk extends Idea {
  static _mixinName = 'TestClerk';
}

const CARRIER = '/trade/haulage/idea/carrier-business';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  // ⚠ Collection-aware, unlike the release suite's: the provenance row
  // this path also writes lands in `authoring_events`, and a
  // collection-blind mock would hand it back from a `documents` scan.
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col !== 'documents') return [] as never;
      return [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      if (col === 'documents') store.set(id, { ...doc, _id: id });
      return id;
    },
  );
}

function carrier(): BusinessEntity {
  return (
    StuffApi.findByTemplatePath<BusinessEntity>(CARRIER) ??
    makeStuffAtPath(() => new BusinessEntity(), CARRIER)
  );
}

async function asClerk<T>(fn: () => Promise<T>): Promise<T> {
  const acting =
    StuffApi.findByTemplatePath<TestClerk>('/platform/agent/Avatar/carter') ??
    makeStuffAtPath(() => new TestClerk(), '/platform/agent/Avatar/carter');
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(acting);
    return fn();
  }) as Promise<T>;
}

const WAYBILL = `${CARRIER}/bills-of-lading/abc123`;

beforeEach(() => {
  StuffApi.clearAll();
  installStore();
  // This file is not about authorization — the point under test is the
  // shape of the bypass, so the ambient gate is declared, not assumed.
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the business-filed-paper transport', () => {
  it('stamps the BUSINESS as owner, not the clerk who wrote it', async () => {
    const biz = carrier();
    await asClerk(() =>
      DocumentApi.saveAsBusiness(biz, WAYBILL, 'bill-of-lading', {
        what: 'a crate of gin',
        to: '/test/pithead-yard',
      }),
    );
    const docs = await DocumentApi.listOfKind('bill-of-lading');
    expect(docs).toHaveLength(1);
    // The carrier owns the paper; a person wrote it.
    expect(docs[0]!.getOwner()).toBe(CARRIER);
    expect(docs[0]!.getPath()).toBe(WAYBILL);
  });

  it('refuses a path outside the business own branch', async () => {
    const biz = carrier();
    await expect(
      asClerk(() =>
        DocumentApi.saveAsBusiness(
          biz,
          '/trade/haulage/idea/rival-business/bills-of-lading/forged',
          'bill-of-lading',
          {},
        ),
      ),
    ).rejects.toThrow(/not under/);
    expect(await DocumentApi.listOfKind('bill-of-lading')).toHaveLength(0);
  });

  it('refuses any kind outside the closed three', async () => {
    const biz = carrier();
    for (const kind of ['release', 'command-view', 'recipe', 'archetype']) {
      await expect(
        asClerk(() =>
          DocumentApi.saveAsBusiness(biz, `${CARRIER}/x`, kind, {}),
        ),
      ).rejects.toThrow(/not a business-filed kind/);
    }
    // …and admits all three that are.
    for (const kind of ['bill-of-lading', 'warehouse-receipt', 'rate-card']) {
      await asClerk(() =>
        DocumentApi.saveAsBusiness(biz, `${CARRIER}/${kind}-row`, kind, {}),
      );
      expect(await DocumentApi.listOfKind(kind)).toHaveLength(1);
    }
  });

  it('refuses a business with no durable path to own by', async () => {
    const orphan = await StuffApi.create(() => new BusinessEntity());
    await expect(
      asClerk(() =>
        DocumentApi.saveAsBusiness(orphan, WAYBILL, 'bill-of-lading', {}),
      ),
    ).rejects.toThrow(/no durable path/);
  });

  it('a depot reads exactly its own paper by prefix, and no one else (AC17)', async () => {
    const mine = carrier();
    const theirs = makeStuffAtPath(
      () => new BusinessEntity(),
      '/trade/haulage/idea/depot-business',
    );
    await asClerk(async () => {
      await DocumentApi.saveAsBusiness(
        mine,
        `${CARRIER}/bills-of-lading/one`,
        'bill-of-lading',
        {},
      );
      await DocumentApi.saveAsBusiness(
        theirs,
        '/trade/haulage/idea/depot-business/bills-of-lading/two',
        'bill-of-lading',
        {},
      );
    });
    // Coverage IS market share, structurally: the prefix is the query.
    const ours = await DocumentApi.list(`${CARRIER}/bills-of-lading`);
    expect(ours.map((d) => d.getPath())).toEqual([
      `${CARRIER}/bills-of-lading/one`,
    ]);
  });
});
