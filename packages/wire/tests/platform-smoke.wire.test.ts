/**
 * The harness proving itself, plus the shipped-world checks that were
 * the whole live content of `e2e/tests/drive-wave2.spec.ts`.
 *
 * Every one of the three assertion channels is exercised here, because
 * this file is what breaks first when one of them stops working:
 *
 *   - the ENVELOPE — `look` succeeds; an invented verb refuses with
 *     `command-rejected: unknown-verb`, asserted by kind and reason and
 *     never by the sentence that renders it;
 *   - `mql-query` — the one-shot structured read round-trips over the
 *     socket. ⚠ **This suite is its first live consumer.** The handler
 *     ships, is registered in `inbound/index.ts` and is unit-tested,
 *     but no client sends the message, so nothing had ever driven it
 *     end to end before this file;
 *   - `prose()` — the counted residue, for the facts no descriptor
 *     reaches (a pack roster, a help topic, a channel list).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectNote,
  installedPacks,
} from '../src/harness';

declareFile({
  file: 'platform-smoke.wire.test.ts',
  // The floor: pack zero plus the packs whose content the checks below
  // actually touch. A narrower world than this cannot run the file, and
  // now says so instead of failing on "I don't understand".
  packs: ['platform', 'wiki-starter', 'generic-objects'],
});

let player: Session;
let founder: Session;

beforeAll(async () => {
  player = await Session.open(uniqueHandle('smoke'));
  // The founder holds the PM seat by founder default, so heads the
  // executive, which holds the platform — the authority `pack status`
  // wants, obtained the way production obtains it
  // (`FOUNDER_GOOGLE_EMAIL`, read by `OfficeRegistry` at boot). Nothing
  // here is test-only.
  founder = await Session.open('founder');
}, 120_000);

afterAll(() => {
  player?.close();
  founder?.close();
});

suite('the harness', () => {
  it('walks the roster handshake into the world', async () => {
    const look = await player.cmd('look');
    expectOk(look);
  });

  it('refuses an unknown verb by NOTE, not by sentence', async () => {
    const result = await player.cmd('xyzzy');
    const note = expectNote(result, 'command-rejected', {
      reason: 'unknown-verb',
    });
    // The detail carries the verb the player typed — the machine
    // channel's version of "I don't understand 'xyzzy'".
    expect((note as { detail?: string }).detail).toBe('xyzzy');
  });

  it('reads state structurally over mql-query', async () => {
    const here = await player.queryOne('here', ['displayName']);
    expect(here, 'the one-shot mql-query answered nothing').toBeTruthy();
    const name = (here as { displayName?: string }).displayName;
    expect(typeof name, `here → ${JSON.stringify(here)}`).toBe('string');
    expect(name!.length).toBeGreaterThan(0);
  });

  it('projects a collection, viewer-scoped', async () => {
    // `me` resolves through the same scope-walk a player's own command
    // does — the query cannot see what the player could not.
    const rows = await player.query('me', {
      cardinality: 'one',
      fields: ['displayName'],
    });
    expect(rows.length).toBe(1);
  });

  it('surfaces an mql parse failure as a rejection, not a hang', async () => {
    await expect(player.query('|||not a query|||')).rejects.toThrow(
      /mql-query rejected/
    );
  });
});

suite('the shipped world answers', () => {
  it('lists its installed packs to the founder', async () => {
    // Absorbed from drive-wave2. A prose read: the installer's roster
    // is an operator report with no projected field behind it.
    const said = await founder.prose('pack status');
    const { packs } = installedPacks();
    for (const id of ['platform', 'wiki-starter', 'generic-objects']) {
      expect(packs.has(id), `${id} should be a workspace pack`).toBe(true);
      expect(said, `pack status should name ${id}`).toContain(id);
    }
  });

  it('dispatches a free emote', async () => {
    // drive-wave2's `;wave` check. The emote floor is a real dispatch,
    // so the envelope is the assertion and the prose is not needed.
    expectOk(await player.cmd(';wave'));
  });

  it('serves a command view from the document store', async () => {
    // `help look` proves the store-served `command-view` document is
    // reachable — the wave-2 claim that survives as a world check.
    const said = await founder.prose('help look');
    expect(said.toLowerCase()).toContain('look');
  });

  it('answers config and chat', async () => {
    const config = await founder.prose('config defaultStartLocation');
    expect(config.toLowerCase()).toContain('lounge');
    const chat = await founder.prose('chat list');
    expect(chat).toMatch(/Global/i);
  });

  it('opens a wiki-starter page', async () => {
    const said = await founder.prose('wiki saxonberg');
    expect(said).toMatch(/Saxonberg/i);
  });
});
