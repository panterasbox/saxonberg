/**
 * ⭐ The live rung (paper D5): a screen showing a document reads it at READ
 * time — an edit shows, a retraction reads as withdrawn — where a printed
 * copy keeps what it said.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Tablet from '../../../platform/thing/Tablet';
import { StuffApi } from '../../../api/stuff';
import { DocumentApi } from '../../../api/document';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { StoredDocument } from '../../document/StoredDocument';

let body = 'Wheat is dear.';
let retracted = false;

beforeEach(() => {
  body = 'Wheat is dear.';
  retracted = false;
  vi.spyOn(DocumentApi, 'read').mockImplementation(async () =>
    ({ getData: () => ({ retracted }) }) as unknown as StoredDocument,
  );
  vi.spyOn(DocumentApi, 'pagesOf').mockImplementation(async () => ({ title: 'Prices', pages: [`PRICES\n\n${body}`] }));
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ a screen shows a document live', () => {
  it('reads the document as it stands now', async () => {
    const t = makeStuff(() => new Tablet());
    t.show({ kind: 'document', path: '/x/feed/r1', title: '"Prices"' });
    expect(String(await t.readScreen(t))).toMatch(/Wheat is dear/);
    body = 'Wheat is cheap.';
    expect(String(await t.readScreen(t))).toMatch(/Wheat is cheap/);
  });

  it('a retraction reads as withdrawn by its publisher', async () => {
    const t = makeStuff(() => new Tablet());
    t.show({ kind: 'document', path: '/x/feed/r1', title: '"Prices"' });
    retracted = true;
    expect(String(await t.readScreen(t))).toMatch(/withdrawn by its publisher/);
  });

  it('a screen narrowed to cards refuses a document', () => {
    const t = makeStuff(() => new Tablet());
    t.setShows(['card']);
    expect(t.acceptsSource({ kind: 'document', path: '/x', title: 'x' })).toBe(false);
  });
});
