/**
 * ⭐ A book is its leaves (paper D14, D44): it opens at a page, whoever holds
 * it writes on the leaf in their own hand, a reader sees each hand as they
 * know its writer, and a page torn out takes the leaf's words with it.
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
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Pot extends BulkableMixin(Good) {
  static _mixinName = 'BookTestInkPot';
}

const INK = '/stuff/idea/material/_book/ink';

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
  vi.spyOn(DocumentApi, 'pagesOf').mockImplementation(async (path) =>
    path === '/editions/primer' ? { title: 'A Primer', pages: ['A is for anvil.', 'B is for bellows.'] } : null,
  );
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

  it('⭐ writing goes on the leaf, in the writer\'s hand; no document is made', async () => {
    const save = vi.spyOn(DocumentApi, 'save');
    const ann = person('ann');
    const b = notebook();
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    const out = await b.writePage(ann, 'galls, copperas, gum', 3);
    expect(out.ok).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect(b.getLeaf(3)!.passages).toEqual([{ text: 'galls, copperas, gum', hand: '/platform/agent/Avatar/ann' }]);
    await b.refreshMarks(ann);
    expect(b.getMarkText()).toBe('Page 3 of 4: (in your hand) galls, copperas, gum');
  });

  it('⭐ a borrower can write in it too, and each reader sees the hands as they know them', async () => {
    const ann = person('ann');
    const bob = person('bob');
    const b = notebook();
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    await b.writePage(ann, 'mine', 1);
    ContainmentApi.move(b, bob);
    ContainmentApi.move(inkPot(), bob);
    expect(await b.writePage(bob, 'and mine', 1)).toMatchObject({ ok: true });
    await b.refreshMarks(bob);
    expect(b.getMarkText()).toBe('Page 1 of 4: (in a hand you do not know) mine / (in your hand) and mine');
    await b.refreshMarks(ann);
    expect(b.getMarkText()).toBe('Page 1 of 4: (in your hand) mine / (in a hand you do not know) and mine');
  });

  it('refuses a writer who is not holding it, and a full page', async () => {
    const ann = person('ann');
    const b = notebook();
    b.roomPerPage = 10;
    ContainmentApi.move(inkPot(), ann);
    expect(await b.writePage(ann, 'hi', 1)).toMatchObject({ ok: false, reason: 'not-holding' });
    ContainmentApi.move(b, ann);
    expect(await b.writePage(ann, 'twelve chars', 1)).toMatchObject({ ok: false, reason: 'full' });
  });

  it('⭐ tearing a page out takes the leaf\'s words with it and leaves a stub', async () => {
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
    expect(await b.writePage(ann, 'more', 2)).toMatchObject({ ok: false, reason: 'torn-out' });
  });

  it('⭐ a handwritten page teaches nothing by being read (the recipes slate — D42)', async () => {
    const ann = person('ann');
    const b = notebook();
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    await b.writePage(ann, 'bristle — a knot of hog hair', 3);
    expect(await b.teach(ann)).toBeNull();
  });
});

describe('⭐ a printed book', () => {
  it('each leaf reads its edition page; it takes no writing; a torn leaf stays printed', async () => {
    const ann = person('ann');
    const b = notebook();
    b.bindEdition('/editions/primer', 2);
    ContainmentApi.move(b, ann);
    ContainmentApi.move(inkPot(), ann);
    b.openTo(2);
    await b.refreshMarks(ann);
    expect(b.getMarkText()).toBe('Page 2 of 2: B is for bellows.');
    expect(await b.writePage(ann, 'notes', 1)).toMatchObject({ ok: false, reason: 'printed' });
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => makeStuff(() => new Sheet()) as never);
    const out = await b.tear(ann, 1);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    await (out.made[0] as Sheet).refreshMarks(ann);
    expect((out.made[0] as Sheet).getMarkText()).toMatch(/A is for anvil/);
  });
});
