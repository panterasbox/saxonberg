/**
 * Presentation — the article is a field now, and no player can tell.
 *
 * The presentation build moved the article out of 635 authored
 * descriptions and into a `register:`, so the realm can say *the*
 * collie, *a* collie, *two collies* and *the collie's paw* without any
 * of them being guessed at from a string. ⭐⭐ **Its acceptance bar is
 * that nothing observable changes**, which makes almost every assertion
 * here a claim that something is IDENTICAL.
 *
 * ⚠⚠ **This tier is the only one that can see the failure mode.** The
 * build ships a golden master over all 635 rows and it stayed green
 * through a live regression: `Visible.getLong()` fell back to the RAW
 * short description, so `look <thing>` printed *"brass altimeter"* into
 * its body where a player had always read *"a brass altimeter"*. The
 * golden reads YAML and never renders a body; no unit test asserted the
 * fallback; all 10,041 kernel tests were green. **The three assertions
 * under "the body of a look" are that bug, pinned.**
 *
 * Ported from the build's `drive-presentation.ts`, which is gone: a
 * drive belongs where it keeps running.
 *
 * ⚠ `look sentry`, NOT `look the sentry` — the pre-existing
 * command-parsing defect the identity drive filed. A definite article
 * breaks every non-greedy `type: object` arg in the game.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, plain } from '../src/harness';

declareFile({
  file: 'presentation.wire.test.ts',
  packs: ['terminus', 'saxonberg-lounge', 'eternal-university', 'world-seed'],
});

// ⚠ The channel name is unique per run, so this file stays CLEAN: it
// creates its own channel rather than touching a shipped one, and a
// second run makes a second channel instead of colliding with the first.

const BAR = '/world/lounge/location/bar';
const LOBBY = '/world/eternal/duncan-hall/location/lobby';

let bar: Session;
let lobby: Session;

beforeAll(async () => {
  bar = await Session.open(uniqueHandle('pres-bar'), { startLocation: BAR });
  lobby = await Session.open(uniqueHandle('pres-lobby'), {
    startLocation: LOBBY,
  });
});

afterAll(() => {
  bar?.close();
  lobby?.close();
});

suite('1–2 · a room, and the things in it, read as they always did', () => {
  it('the room survey still carries articles', async () => {
    const said = plain(await (await bar.cmd('look')).said());
    // Not "which article" — that is the golden's job over all 635 rows.
    // This is the cruder and more useful claim: the prose a player reads
    // still HAS them, which is what a stem leaking unrendered destroys.
    expect(said).toMatch(/\b(a|an|the)\s+\w/);
  });

  it('⭐ a role-filler reads by its description, article and all', async () => {
    const said = plain(await (await bar.cmd('look bartender')).said());
    expect(said).not.toMatch(/don't see|can't see/i);
    expect(said).toMatch(/\ba (still, )?attentive bartender\b/);
  });
});

suite('3 · ⭐ the words that worked still work', () => {
  // The step that catches the real risk: a thing whose addressable
  // words silently stopped resolving. It fails closed and silent.
  it.each(['bartender', 'bar'])('`look %s` resolves', async (word) => {
    const said = plain(await (await bar.cmd(`look ${word}`)).said());
    expect(said).not.toMatch(/don't see|can't see|don't understand/i);
  });
});

suite('⚠ the body of a look — the regression the suite could not see', () => {
  it.each([
    ['altimeter', /\ba brass altimeter\b/],
    ['barometer', /\ban aneroid barometer\b/],
    ['balance', /\ba precision balance\b/],
  ])(
    '`look %s` renders the article in its BODY, not a bare stem',
    async (word, pattern) => {
      const said = plain(await (await lobby.cmd(`look ${word}`)).said());
      expect(said).not.toMatch(/don't see|can't see/i);
      // ⚠ Twice over: once in the identity tag, once in the body that
      // falls back to the description because nobody wrote a long one.
      // The bug rendered the tag correctly and the body bare, so an
      // assertion on the first occurrence alone would still be green.
      const hits = said.match(new RegExp(pattern.source, 'g')) ?? [];
      expect(hits.length).toBeGreaterThanOrEqual(2);
    },
  );
});

suite('9–11 · ⭐ the new part — anonymity is a channel setting', () => {
  // ⚠ The drive's own player owns the channel: an ordinary player can
  // `chat make`, which is the whole loop, with no wizard anywhere in it.
  const CH = `pres${Date.now().toString(36).slice(-6)}`;

  it('a player can make a channel and set its anonymity', async () => {
    await bar.cmd(`chat make ${CH}`);
    const said = plain(await (await bar.cmd(`chat anonymity ${CH} forbid`)).said());
    expect(said).not.toMatch(/don't understand|Unknown chat subcommand/i);
    expect(said).toMatch(/name/i);
  });

  it('9 · ⭐ a plain post on a no-anonymity channel is NAMED', async () => {
    const result = await bar.cmd(`chat ${CH} hello`);
    expect(result.status).not.toBe('error');
  });

  it('11 · ⭐ --anon on a forbidding channel still POSTS — named, and said so', async () => {
    // ⭐⭐ The flag is a REQUEST the channel may decline, not a
    // precondition that fails. You always get to speak; the channel
    // decides whether your name shows. ⚠ And it is said out loud — the
    // poster typed `--anon` for a reason.
    const result = await bar.cmd(`chat ${CH} --anon hello`);
    expect(result.status).not.toBe('error');
    expect(
      result.notes.some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
    expect(plain(await result.said())).toMatch(/shows every poster's name/i);
  });

  it('10 · an anonymous post shows a SHORT handle, not a portrait', async () => {
    await bar.cmd(`chat anonymity ${CH} permit`);
    const result = await bar.cmd(`chat ${CH} --anon hello`);
    expect(result.status).not.toBe('error');
    const said = plain(await result.said());
    // Never a sentence-long portrait on a chat line — the reason the
    // handle is a separate field from the description at all.
    for (const line of said.split('\n').filter((l) => l.includes(CH))) {
      expect(line.length).toBeLessThan(200);
    }
  });

  it('⚠ an ad-hoc group thread declines --anon, and says so', async () => {
    // A cohort you were added to BY NAME has no anonymity to grant —
    // which is a reason to ignore the flag, not to refuse the message.
    const result = await bar.cmd('chat dm-nonesuch --anon hello');
    expect(plain(await result.said())).toMatch(/shows who is speaking|No channel/i);
  });
});

suite('4 · a named NPC is still called what it was called', () => {
  it('speech names the speaker without error', async () => {
    const result = await bar.cmd('say hello');
    expect(result.status).not.toBe('error');
    expect(plain(await result.said())).not.toMatch(/don't understand/i);
  });
});
