/**
 * AppStore — the one app store (stream arrival D21): the apps packs
 * PUBLISHED, one `app-listing` document each, by the listing's word. An app
 * not listed (the person's own wallet) is not in it; a listing that names
 * no App row is refused as malformed; nothing searches the template table.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../../../api/document';
import { TemplateApi } from '../../../api/template';
import { Template } from '../../../lib/stuff/Template';
import { StoredDocument } from '../../../lib/document/StoredDocument';

function listing(path: string, app: unknown): StoredDocument {
  const d = new StoredDocument();
  d.path = path;
  d.kind = 'app-listing';
  d.data = { app };
  return d;
}

let docs: StoredDocument[];

beforeEach(() => {
  TemplateApi.appStore().forget();
  docs = [
    listing('/platform/apps/messages', '/platform/idea/app/messages'),
    listing('/platform/apps/broadcast', '/platform/idea/app/broadcast'),
    listing('/trade/games/apps/chess', '/trade/games/idea/chess-app'),
  ];
  vi.spyOn(DocumentApi, 'listOfKind').mockImplementation((async (kind: string) =>
    docs.filter((d) => d.getKind() === kind)) as never);
  vi.spyOn(DocumentApi, 'findByKey').mockImplementation((async (_k: string, _key: string, q: { eq: string }) =>
    docs.filter((d) => d.getPath().endsWith(`/${q.eq}`))) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  TemplateApi.appStore().forget();
});

describe('the app store', () => {
  it('lists what the packs published, in key order', async () => {
    expect((await TemplateApi.appStore().published()).map((a) => a.key)).toEqual(['broadcast', 'chess', 'messages']);
  });

  it('looks a key up by its word, and names the App row to install', async () => {
    expect(await TemplateApi.appStore().lookup('Broadcast')).toEqual({
      found: { key: 'broadcast', path: '/platform/idea/app/broadcast' },
    });
    expect(await TemplateApi.appStore().lookup('wallet')).toEqual({ missing: true });
  });

  it('a listing that names no App row is malformed', () => {
    expect(() => TemplateApi.appStore().parse({ app: 'messages' }, '/platform/apps/x')).toThrow(/App row/);
  });

  it('never searches the template table', async () => {
    const scans = [
      vi.spyOn(Template, 'findByPathInfix'),
      vi.spyOn(Template, 'findWhereDataHas'),
      vi.spyOn(Template, 'findByClass'),
    ];
    await TemplateApi.appStore().published();
    await TemplateApi.appStore().lookup('chess');
    for (const s of scans) expect(s).not.toHaveBeenCalled();
  });
});
