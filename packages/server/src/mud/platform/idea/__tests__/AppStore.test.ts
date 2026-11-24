/**
 * AppStore — the one app store (stream arrival D21): the published `App`
 * rows of every root, by their leaf. Unpublished rows (the person's own
 * wallet, calendar, forums) are never in it; a published row in a second
 * root is; two published rows with one leaf are reported and neither is
 * installable; a row whose class is not an app is not an app.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Template } from '../../../lib/stuff/Template';
import { StuffApi } from '../../../api/stuff';
import { TemplateApi } from '../../../api/template';
import App from '../App';
import ForumsApp from '../ForumsApp';
import BroadcastApp from '../BroadcastApp';

type Row = { path: string; class: string; data: Record<string, unknown> };
let rows: Row[];

const CLASSES: Record<string, unknown> = {
  '/platform/idea/App': App,
  '/platform/idea/ForumsApp': ForumsApp,
  '/platform/idea/BroadcastApp': BroadcastApp,
  '/platform/idea/Biome': class NotAnApp {},
};

beforeEach(() => {
  TemplateApi.appStore().forget();
  rows = [
    { path: '/platform/idea/app/messages', class: '/platform/idea/App', data: { published: true } },
    { path: '/platform/idea/app/broadcast', class: '/platform/idea/BroadcastApp', data: { published: true } },
    { path: '/platform/idea/app/forums', class: '/platform/idea/ForumsApp', data: {} },
    { path: '/platform/idea/app/wallet', class: '/platform/idea/App', data: { published: false } },
    { path: '/trade/games/idea/app/chess', class: '/platform/idea/App', data: { published: true } },
    { path: '/stuff/idea/app/weather', class: '/platform/idea/Biome', data: { published: true } },
  ];
  vi.spyOn(Template, 'findByPathInfix').mockImplementation((async () => rows) as never);
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation((async (p: string) => CLASSES[p]) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  TemplateApi.appStore().forget();
});

describe('the app store', () => {
  it('lists the published app rows of every root — and nothing unpublished or not an app', async () => {
    const keys = (await TemplateApi.appStore().published()).map((a) => a.key);
    expect(keys).toEqual(['broadcast', 'chess', 'messages']);
  });

  it('looks a key up by its leaf', async () => {
    expect(await TemplateApi.appStore().lookup('Broadcast')).toEqual({
      found: { key: 'broadcast', path: '/platform/idea/app/broadcast' },
    });
    expect(await TemplateApi.appStore().lookup('wallet')).toEqual({ missing: true });
  });

  it('two published rows with one leaf: reported by both paths, neither installable', async () => {
    rows.push({ path: '/trade/games/idea/app/messages', class: '/platform/idea/App', data: { published: true } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await TemplateApi.appStore().lookup('messages')).toEqual({
      collision: ['/platform/idea/app/messages', '/trade/games/idea/app/messages'],
    });
    expect((await TemplateApi.appStore().published()).map((a) => a.key)).not.toContain('messages');
    expect(warn).toHaveBeenCalled();
  });

  it('reads the table once, lazily', async () => {
    await TemplateApi.appStore().published();
    await TemplateApi.appStore().lookup('chess');
    expect(Template.findByPathInfix).toHaveBeenCalledTimes(1);
  });
});
