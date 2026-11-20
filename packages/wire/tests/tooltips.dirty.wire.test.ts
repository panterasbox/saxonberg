/**
 * ⭐ The tooltips build's wire drive — requirements step 11, and the server
 * half of steps 5–7 (the tooltips requirements, retired at the sweep; the
 * build is documented in `docs/subsystems/tooltips.md`).
 *
 * What it proves over the real socket, asserted on what the CLIENT receives:
 *  (a) a reachable thing in the light: every asked field, `kind` and the
 *      level-2 `path` included, no `dark`;
 *  (b) the dark: `dark: true` once, every sight field gone, the name what
 *      the viewer perceives;
 *  (c) reach is the SERVER's: a bare `#id` for someone in another place
 *      describes nothing — whatever the query text says;
 *  (d) the wiki excerpt honors the appetite exactly as `wiki <page>` does —
 *      a level-1 span collapsed at 0 and open at 1;
 *  (e) a span above the reader's ceiling is absent from both;
 *  (f) no such page → `doc: null`;
 *  (g) `settings set spoiler.appetite` reaches the client without a
 *      reconnect.
 *
 * Paces: every step `instant`. No soak drive — nothing here waits on the
 * clock. The browser half (hover, lock, nest, touch) is the walk:
 * `e2e/tests/tooltips-walk.spec.ts`.
 */

import { describe as suite, it, expect, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, plain } from '../src/harness';

export const DIRTY_REASON =
  'mints fresh characters, writes a uniquely named wiki page it cannot ' +
  'delete as a player, and sets a character setting';

declareFile({
  file: 'tooltips.dirty.wire.test.ts',
  packs: ['world-seed', 'terminus', 'newbie-wilds', 'base-library', 'generic-objects'],
  dirtyReason: DIRTY_REASON,
});

const BANK = '/world/terminus/wharfside/bank';
const SQUARE = '/world/terminus/market/square';
// The Delve is unlit — pitch black by day (the navigation-server drive's note).
const CORRIDOR_1 = '/world/newbie-wilds/delve/corridor-1';

const FIELDS = ['displayName', 'kind', 'quantity', 'shortDescription', 'illustration', 'illustrationShape', 'path'];

const record: string[] = [];
const open: Session[] = [];
afterAll(() => {
  for (const s of open) s.close();
  // eslint-disable-next-line no-console
  console.log(`\n[tooltips drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

async function at(handle: string, start: string, opts: { committees?: string[] } = {}): Promise<Session> {
  const s = await Session.open(uniqueHandle(handle), { startLocation: start, ...opts });
  open.push(s);
  await s.drainProse();
  return s;
}

async function idOf(s: Session): Promise<string> {
  const me = await s.queryOne('me', ['displayName']);
  return String(me!.stuffId);
}

suite('tooltips — the wire drive', () => {
  it('(a) a reachable person in the light: kind, the level-2 path, no `dark`', async () => {
    const a = await at('tip-a', BANK);
    const b = await at('tip-b', BANK);
    const env = await a.queryEnvelope(`#${await idOf(b)}`, { cardinality: 'one', fields: FIELDS });
    const rec = env.result[0] as Record<string, unknown> | undefined;
    record.push(`(a) lit: ${JSON.stringify(rec)} dark=${String(env.dark)}`);
    expect(env.dark).toBeUndefined();
    expect(rec?.kind).toBe('agent');
    expect(rec?.path).toMatchObject({ spoiler: 2 });
    expect(typeof (rec?.path as { path?: unknown })?.path).toBe('string');
  }, 120_000);

  it('(b) the dark: `dark` said once, sight fields gone', async () => {
    const a = await at('tip-dark-a', CORRIDOR_1);
    const b = await at('tip-dark-b', CORRIDOR_1);
    const env = await a.queryEnvelope(`#${await idOf(b)}`, { cardinality: 'one', fields: FIELDS });
    const rec = env.result[0] as Record<string, unknown> | undefined;
    record.push(`(b) dark: ${JSON.stringify(rec)} dark=${String(env.dark)}`);
    expect(env.dark).toBe(true);
    expect(rec).toBeDefined();
    expect(rec).not.toHaveProperty('shortDescription');
    expect(rec).not.toHaveProperty('illustration');
    expect(rec).not.toHaveProperty('path');
    expect(rec?.kind).toBe('agent');
    // What `look` prints in the same dark, for the record (plan W2 / Risks 3).
    record.push(`(b) look in the dark → ${plain(await (await a.cmd('look')).said()).replace(/\s+/g, ' ').slice(0, 140)}`);
  }, 120_000);

  it('(c) reach is the server\'s: a bare #id for someone elsewhere describes nothing', async () => {
    const a = await at('tip-far-a', BANK);
    const b = await at('tip-far-b', SQUARE);
    const env = await a.queryEnvelope(`#${await idOf(b)}`, { cardinality: 'one', fields: 'detail' });
    record.push(`(c) out of reach: ${env.result.length} records`);
    expect(env.result).toEqual([]);
  }, 120_000);

  const page = `tipwire${Date.now().toString(36)}`;

  it('(d)(e)(f) the wiki excerpt: the appetite collapses, the ceiling deletes, a missing page is null', async () => {
    const author = await at('tip-wiki-ed', SQUARE, { committees: ['/wiki:owner'] });
    const body = [
      `The lead says <spoiler level="1">TIPLEVELONE</spoiler> and <spoiler level="3">TIPLEVELTHREE</spoiler>.`,
      '',
      '## More',
      'TIPBELOWTHELEAD',
    ].join('\n');
    const made = author.cmd(`wiki create ${page} --title "Tip ${page}"`);
    const prompt = await author.awaitPrompt(15_000).catch(() => null);
    const id = (prompt as { promptId?: string } | null)?.promptId;
    if (id) author.answerPrompt(id, body);
    const r = await made;
    expect(r.status, JSON.stringify(r.notes)).toBe('ok');

    const reader = await at('tip-wiki-reader', SQUARE);
    const at0 = await reader.wikiExcerpt(page);
    record.push(`(d) appetite 0 → ${JSON.stringify(at0.doc?.prose)}`);
    expect(at0.doc?.header?.name).toBe(`Tip ${page}`);
    expect(at0.doc?.prose).toContain('<spoiler level="1">');
    expect(at0.doc?.prose).not.toContain('TIPLEVELTHREE');
    expect(at0.doc?.prose).not.toContain('TIPBELOWTHELEAD');
    expect(at0.doc?.command).toBe(`wiki main:${page}`);

    await reader.cmd('settings set spoiler.appetite 1');
    const at1 = await reader.wikiExcerpt(page);
    record.push(`(d) appetite 1 → ${JSON.stringify(at1.doc?.prose)}`);
    expect(at1.doc?.prose).toContain('TIPLEVELONE');
    expect(at1.doc?.prose).not.toContain('<spoiler level="1">');
    expect(at1.doc?.prose).not.toContain('TIPLEVELTHREE');

    // The page read says the same about the same spans, for the same reader.
    const read = plain(await (await reader.cmd(`wiki ${page}`)).said());
    expect(read).toContain('TIPLEVELONE');
    expect(read).not.toContain('TIPLEVELTHREE');

    const none = await reader.wikiExcerpt(`nosuch${page}`);
    expect(none.doc).toBeNull();
  }, 180_000);

  it('(g) the appetite reaches the client when it is set — no reconnect', async () => {
    const s = await at('tip-appetite', BANK);
    await s.cmd('settings set spoiler.appetite 2');
    const delta = await s.awaitEnvelope('subscription-delta', (e) => JSON.stringify(e).includes('spoiler.appetite'));
    record.push(`(g) pushed: ${JSON.stringify(delta).slice(0, 160)}`);
    expect(JSON.stringify(delta)).toContain('spoiler.appetite');
  }, 120_000);
});
