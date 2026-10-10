/**
 * BodyRegister (drilling D2) — **two straws in one glass.**
 *
 * The claims, in order of how load-bearing they are:
 *
 *  1. ⭐⭐⭐ **Remaining is capacity less the SUM of every straw.** Two
 *     wellheads into one body do not each see a full reservoir, which is
 *     the fact the polity has to be able to argue about and therefore
 *     the fact the model has to carry before anybody can.
 *  2. ⚠ **A read writes nothing**, and a body nobody has bored has no
 *     document at all — which is what makes *every structure in the
 *     realm is already a reservoir* free.
 *  3. **Capacity is never stored.** The record holds the draw and
 *     nothing else, so no copy of it can outlive an edit to the row.
 *  4. ⭐ **Recharge is ZERO.** Nothing here decays back toward full; the
 *     register has no half-life and no reconcile-on-read, deliberately —
 *     that is depletion, the degenerate case of a recharge law, and the
 *     reason an oil country is a boom with an end in it.
 *  5. The prefix is the security boundary, not the kind tag.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import BodyRegister, {
  BODY_KIND,
  BODY_PREFIX,
  BODY_REGISTER_PATH,
  type BodyRef,
} from '../idea/BodyRegister';
import Deposit, { type FluidBody } from '../idea/Deposit';

const REF: BodyRef = { address: 'terminus/rejection', key: 'salt-leg' };
const STRAW_A = '/trade/drilling/thing/Wellhead/rejection/spring';
const STRAW_B = '/trade/drilling/thing/Wellhead/rejection/flat';

/** An in-memory document store behind the register's transport. */
let docs: Map<string, { kind: string; data: Record<string, unknown> }>;
let writes = 0;
function installDocuments(): void {
  docs = new Map();
  writes = 0;
  vi.spyOn(DocumentApi, 'saveToRegister').mockImplementation((async (
    _register: unknown,
    path: string,
    data: Record<string, unknown>,
  ) => {
    writes += 1;
    docs.set(path, { kind: BODY_KIND, data: { ...data } });
  }) as never);
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path: string) => {
    const doc = docs.get(path);
    return doc === undefined
      ? null
      : ({
          getPath: () => path,
          getKind: () => doc.kind,
          getData: () => doc.data,
        } as never);
  });
}

function register(): BodyRegister {
  return makeStuffAtPath(
    () => new BodyRegister(),
    BODY_REGISTER_PATH,
  ) as BodyRegister;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  installDocuments();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('the register declares its own book and nobody else\'s', () => {
  it('names its prefix, its owner and the one kind it may write', () => {
    const reg = register();
    expect(reg.getRegisterPrefix()).toBe(BODY_PREFIX);
    expect(reg.getRegisterOwner()).toBe('/system/ground');
    expect(reg.getRegisterKind()).toBe(BODY_KIND);
    // The owner must be a prefix of the register's own template path: a
    // register keeps its own book. Asserted because the document store
    // enforces it at write time and a mismatch would fail at runtime.
    expect(BODY_REGISTER_PATH.startsWith(reg.getRegisterOwner())).toBe(true);
    expect(reg.getRegisterPrefix().startsWith(reg.getRegisterOwner())).toBe(true);
  });

  it('is never culled — it is the register itself', () => {
    const veto = register().canEvict({} as never);
    expect(veto.ok).toBe(false);
  });
});

describe('⚠ a body nobody has bored has no document', () => {
  it('reads null, sums zero, lists no straws, and writes nothing', async () => {
    const reg = register();
    expect(await reg.read(REF)).toBeNull();
    expect(await reg.drawnFrom(REF)).toBe(0);
    expect(await reg.drawnBy(REF, STRAW_A)).toBe(0);
    expect(await reg.strawsIn(REF)).toEqual([]);
    expect(writes).toBe(0);
    expect(docs.size).toBe(0);
  });

  it('a draw of nothing is still nothing — no document is minted', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 0, 100);
    await reg.recordDraw(REF, STRAW_A, -5, 100);
    expect(writes).toBe(0);
  });
});

describe('⭐⭐⭐ two straws, one glass', () => {
  it('sums every straw, and each straw can also be read alone', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 400, 1000);
    await reg.recordDraw(REF, STRAW_B, 150, 2000);
    await reg.recordDraw(REF, STRAW_A, 100, 3000);

    expect(await reg.drawnFrom(REF)).toBe(650);
    expect(await reg.drawnBy(REF, STRAW_A)).toBe(500);
    expect(await reg.drawnBy(REF, STRAW_B)).toBe(150);
    expect(await reg.strawsIn(REF)).toEqual([STRAW_B, STRAW_A].sort());
  });

  it('⭐⭐⭐ the SECOND straw sees the first one\'s withdrawal', async () => {
    // The whole reason this is a register and not a field on the
    // wellhead. A capacity read by either owner is the same number.
    const d = makeStuffAtPath(() => new Deposit(), '/test/deposit') as Deposit;
    const body: FluidBody = {
      key: 'salt-leg',
      fluid: '/stuff/idea/material/bulk/salt-water',
      trap: {
        crest: [0, 0, -110],
        strike: 0,
        alongExtent: 300,
        acrossExtent: 300,
        closureM: 30,
      },
      charge: true,
      capacityL: 1000,
    };
    d.setFluids([body]);

    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 700, 1000);
    const remaining = d.capacityOf(body) - (await reg.drawnFrom(REF));
    expect(remaining).toBe(300);

    // B now drills into the same body and finds 300 L, not 1000.
    await reg.recordDraw(REF, STRAW_B, 300, 2000);
    expect(d.capacityOf(body) - (await reg.drawnFrom(REF))).toBe(0);
  });

  it('⚠ capacity is NOT in the record — only the draw is', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 400, 1000);
    const stored = docs.get(`${BODY_PREFIX}/terminus/rejection/salt-leg`)!.data;
    expect(Object.keys(stored).sort()).toEqual(['bodyRef', 'drawn', 'since']);
    expect(JSON.stringify(stored)).not.toMatch(/capacit/i);
  });

  it('⭐ recharge is zero: a thousand game-days later it is still gone', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 400, 1000);
    // No reconcile, no half-life, nothing to pass time TO. The register
    // has no read that takes `now` at all, which is the assertion.
    expect(await reg.drawnFrom(REF)).toBe(400);
    expect(await reg.drawnFrom(REF)).toBe(400);
  });

  it('`since` is the first straw\'s moment and does not move', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 10, 1234);
    await reg.recordDraw(REF, STRAW_B, 10, 99_999);
    expect((await reg.read(REF))!.since).toBe(1234);
  });

  it('a read writes nothing', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 10, 100);
    const before = writes;
    await reg.read(REF);
    await reg.drawnFrom(REF);
    await reg.strawsIn(REF);
    expect(writes).toBe(before);
  });
});

describe('the path, and the prefix as the boundary', () => {
  it('keeps the address\'s slashes, so a country\'s book is a prefix read', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 1, 0);
    expect([...docs.keys()]).toEqual([
      '/system/ground/bodies/terminus/rejection/salt-leg',
    ]);
  });

  it('two bodies under one locality are two documents', async () => {
    const reg = register();
    await reg.recordDraw(REF, STRAW_A, 1, 0);
    await reg.recordDraw({ ...REF, key: 'gas-cap' }, STRAW_A, 1, 0);
    expect(docs.size).toBe(2);
  });

  it('refuses an unusable ref rather than filing under a bad path', async () => {
    const reg = register();
    await reg.recordDraw({ address: '', key: 'x' }, STRAW_A, 10, 0);
    await reg.recordDraw({ address: 'a/b', key: '' }, STRAW_A, 10, 0);
    // ⚠ A key with a slash would reach outside its own body's document.
    await reg.recordDraw({ address: 'a/b', key: '../other' }, STRAW_A, 10, 0);
    expect(writes).toBe(0);
  });

  it('⚠ a document outside the prefix is not this register\'s, whatever it says', async () => {
    docs.set('/home/somebody/bodies/terminus/rejection/salt-leg', {
      kind: BODY_KIND,
      data: { bodyRef: REF, drawn: { [STRAW_A]: 999 }, since: 0 },
    });
    // The register reads by its own path, so a forged document elsewhere
    // is simply not found — the prefix is the boundary.
    expect(await register().read(REF)).toBeNull();
  });

  it('⚠ a document at the right path with the WRONG kind is refused', async () => {
    docs.set(`${BODY_PREFIX}/terminus/rejection/salt-leg`, {
      kind: 'herd',
      data: { bodyRef: REF, drawn: { [STRAW_A]: 999 }, since: 0 },
    });
    expect(await register().read(REF)).toBeNull();
  });

  it('reads a malformed record defensively rather than throwing', async () => {
    docs.set(`${BODY_PREFIX}/terminus/rejection/salt-leg`, {
      kind: BODY_KIND,
      data: { drawn: { a: 'nonsense', b: -4, c: 12 } },
    });
    const record = (await register().read(REF))!;
    expect(record.drawn).toEqual({ c: 12 });
    expect(record.since).toBe(0);
  });
});
