/**
 * ⭐ The ledger: a book that holds no record of its own — it
 * reads the house's papers each time it is read, so it is never stale, and
 * burning it loses nothing the documents do not keep.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import RegisterBook from '../RegisterBook';
import { StuffApi } from '../../../api/stuff';
import { DocumentApi } from '../../../api/document';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { StoredDocument } from '../../../lib/document/StoredDocument';

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const doc = (path: string, kind: string): StoredDocument =>
  ({ getPath: () => path, getKind: () => kind, getData: () => ({}) }) as unknown as StoredDocument;

describe('⭐ a register book', () => {
  it('reads its page off the house\'s papers, and leaves editions out', async () => {
    let papers = [doc('/w/shop/warehouse-receipts/a1', 'warehouse-receipt')];
    vi.spyOn(DocumentApi, 'list').mockImplementation(async () => papers);
    vi.spyOn(DocumentApi, 'pagesOf').mockImplementation(async (p) => ({ title: `paper ${p.split('/').pop()}`, pages: ['x'] }));
    const book = makeStuff(() => new RegisterBook());
    book.setRegisterPrefix('/w/shop/');
    await book.refreshMarks(book);
    expect(book.getMarkText()).toMatch(/The book of shop\..*paper a1/);
    papers = [...papers, doc('/w/shop/warehouse-receipts/a2', 'warehouse-receipt'), doc('/w/shop/warehouse-receipts/a1/editions/h', 'edition')];
    await book.refreshMarks(book);
    expect(book.getMarkText()).toMatch(/paper a2/);
    expect(book.getMarkText()).not.toMatch(/edition/);
  });

  it('is fixed where it lies', () => {
    expect(makeStuff(() => new RegisterBook()).isFixedInPlace()).toBe(true);
  });
});
