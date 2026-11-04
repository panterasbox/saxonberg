/**
 * ⭐ A book (paper D14): it opens at a page, a notebook's first write mints
 * its pages under the WRITER's home, a borrower reads and is refused the
 * pen, and a page torn out leaves a gap and a loose sheet.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Book from '../Book';
import Sheet from '../Sheet';
import Holder from '../../../lib/stuff/Holder';
import Good from '../../../lib/stuff/Good';
import Material from '../../../lib/material/Material';
import { BulkableMixin } from '../../../lib/bulk/Bulkable';
import { Quantity } from '../../../lib/quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { DocumentApi } from '../../../api/document';
import { AccessApi } from '../../../api/access';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { StoredDocument } from '../../../lib/document/StoredDocument';

class Pot extends BulkableMixin(Good) {
  static _mixinName = 'BookTestInkPot';
}

const INK = '/stuff/idea/material/_book/ink';
let docs: Map<string, Record<string, unknown>>;

function inkPot(): Pot {
  return makeStuff(() => {
    const p = new Pot();
    p.interiorBulk = true;
    p.setInteriorCapacity(Quantity.of(0.1, 'L'));
    p.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(INK)!);
    p.setBulkAmount('interior', Quantity.of(0.05, 'L'));
    return p;
  });
}

function person(key: string): Holder {
  return makeStuffAtPath(() => new Holder(), `/platform/agent/Avatar/${key}`);
}

function notebook(): Book {
  return makeStuff(() => {
    const b = new Book();
    b.pageCount = 4;
    return b;
  });
}

beforeEach(() => {
  installV1QuantityMarshallers();
  const scene = { topic: () => scene, toSelf: () => scene, toPeers: () => scene, send: () => undefined };
  vi.spyOn(MessageApi, 'scene').mockReturnValue(scene as never);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('ink');
    m.setTags(['ink']);
    return m;
  }, INK);
  docs = new Map();
  vi.spyOn(DocumentApi, 'save').mockImplementation(async (path, _kind, data) => {
    docs.set(path, data);
  });
  vi.spyOn(DocumentApi, 'read').mockImplementation(async (path) => {
    const d = docs.get(path);
    return d ? ({ getData: () => d } as unknown as StoredDocument) : null;
  });
  vi.spyOn(DocumentApi, 'pagesOf').mockImplementation(async (path) => {
    const d = docs.get(path);
    return d ? { title: 'n', pages: d.pages as string[] } : null;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ a notebook', () => {
  it('opens only at a page it has', () => {
    const b = notebook();
    expect(b.openTo(3).ok).toBe(true);
    expect(b.getOpenPage()).toBe(3);
    expect(b.openTo(5)).toMatchObject({ ok: false, reason: 'no-such-page' });
  });

  it('the first write mints its pages under the WRITER\'s home; reading shows the page', async () => {
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
    const ann = person('ann');
    const b = notebook();
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    const out = await b.writePage(ann, 'galls, copperas, gum', 3);
    expect(out.ok).toBe(true);
    expect([...docs.keys()][0]).toMatch(/^\/home\/ann\/books\//);
    await b.refreshMarks(ann);
    expect(b.getMarkText()).toBe('Page 3 of 4: galls, copperas, gum');
  });

  it('⭐ a borrower reads it and is refused the pen', async () => {
    const canAt = vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
    const ann = person('ann');
    const bob = person('bob');
    const b = notebook();
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    await b.writePage(ann, 'mine', 1);
    ContainmentApi.move(b, bob);
    ContainmentApi.move(inkPot(), bob);
    canAt.mockResolvedValue(false);
    expect(await b.writePage(bob, 'also mine', 1)).toMatchObject({ ok: false, reason: 'not-yours-to-write-in' });
    await b.refreshMarks(bob);
    expect(b.getMarkText()).toMatch(/mine/);
  });

  it('⭐ tearing a page out leaves a gap and a loose sheet with its words', async () => {
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
    const ann = person('ann');
    const b = notebook();
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    await b.writePage(ann, 'the recipe', 2);
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => makeStuff(() => new Sheet()) as never);
    const out = await b.tear(ann, 2);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect((out.made[0] as Sheet).getMarkText()).toBe('the recipe');
    expect(b.getMissing()).toEqual([2]);
    await b.refreshMarks(ann);
    expect(b.getMarkText()).toMatch(/torn out/);
    expect(await b.tear(ann, 2)).toMatchObject({ ok: false, reason: 'torn-out' });
  });

  it('⭐ a handwritten page teaches nothing by being read (the recipes slate — D42)', async () => {
    vi.spyOn(AccessApi, 'canAtPath').mockResolvedValue(true);
    const ann = person('ann');
    const b = notebook();
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    await b.writePage(ann, 'bristle — a knot of hog hair', 3);
    expect(await b.teach(ann)).toBeNull();
  });
});
