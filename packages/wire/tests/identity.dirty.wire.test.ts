/**
 * Identity & the ledgers — who a character IS, who may ask, and what a
 * body of people answers for.
 *
 * Ported from `packages/server/scripts/drive-identity.ts`. Three of its
 * checkpoints are ones the unit suite structurally cannot reach, and
 * they are why the build existed:
 *
 *   - that a player can ASK about somebody else at all. The gate was
 *     open and there was no door — the `feel`/`taste` failure shape;
 *   - that the answers are a RANGE rather than one band twelve times. A
 *     suite asserts one character; only a sweep sees the curve;
 *   - that an institution's record is readable by a person playing.
 *     Blame is derived, and nothing player-facing showed it.
 *
 * ⚠⚠ **`attack sentry`, NOT `attack the sentry`** — a pre-existing
 * command-parsing defect this drive surfaced. A definite article breaks
 * every NON-GREEDY `type: object` arg in the game ("That doesn't match
 * any known command shape"): `look the sentry` and `attack the wolf`
 * both fail, while `get the kit` works because its arg is greedy. It is
 * filed against command-parsing, and it is why the identity build's two
 * readings take a greedy STRING arg instead.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
} from '../src/harness';

/**
 * ⭐⭐ **Why this file cannot run twice.**
 *
 * A written history is laid down ONCE, at a character's birth, and the
 * seeder skips a host that already carries a claim. It also kills a
 * shipped sentry, who does not come back.
 *
 * The dossier half is not a restocking question — it is a statement
 * about when identity is minted, and re-running against a world that
 * already has these characters reads as a broken feature in a build
 * where nothing is broken. There are no migrations; the reset IS the
 * mechanism.
 */
export const DIRTY_REASON =
  'a written history is laid down once at birth and the seeder skips a ' +
  'host that already has one; it also kills a sentry who does not return';

declareFile({
  file: 'identity.dirty.wire.test.ts',
  packs: ['terminus', 'saxonberg-lounge', 'newbie-wilds', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

const REGISTRY = '/world/terminus/registry/office';
const BAR = '/world/lounge/location/bar';
const WATCHPOST = '/world/newbie-wilds/crossroads/watchpost';

let a: Session; // the registry
let b: Session; // the lounge
let c: Session; // the watchpost

beforeAll(async () => {
  a = await Session.open(uniqueHandle('ident-a'), { startLocation: REGISTRY });
  b = await Session.open(uniqueHandle('ident-b'), { startLocation: BAR });
  c = await Session.open(uniqueHandle('ident-c'), { startLocation: WATCHPOST });
  // Each scene opens the way a player's does. (This was first added on a
  // guess that perceiving the room is what makes an NPC nameable; it is
  // NOT — see the finding on `competence` below, which reproduces with
  // and without it. Kept because it is what a player does.)
  await Promise.all([a.cmd('look'), b.cmd('look'), c.cmd('look')]);
}, 180_000);

afterAll(() => {
  a?.close();
  b?.close();
  c?.close();
});

suite('the Terminus registry', () => {
  it('the registrar is at her counter', async () => {
    const rows = await a.query('peers', { fields: ['displayName'] });
    const names = rows
      .map((r) => String((r as { displayName?: string }).displayName ?? ''))
      .join(' | ');
    expect(names).toMatch(/Odile|registrar/i);
  });

  /*
   * ⚠⚠⚠ **FINDING — `competence <name>` cannot resolve most NPCs, and
   * this is a PRODUCT defect, not a stale test.**
   *
   * Observed on master @ 1fc8b26f5, against a world booted from a fresh
   * database:
   *
   *   - `peers` at the registry returns `the deed desk | Odile | …`.
   *     Odile is standing there, projected under that exact name.
   *   - `competence odile` answers *"Nobody here goes by 'odile'"*.
   *     So does `competence registrar`.
   *   - At the watchpost, `peers` returns `a watchful sentry`, and
   *     `competence sentry` answers the same way.
   *   - At the bar, `peers` returns `… | Dave | Mara | …`. `competence
   *     dave` WORKS and returns three disciplines; `competence mara`
   *     answers "Nobody here goes by 'mara'".
   *   - `look` at the registry does not mention Odile at all, though
   *     `peers` does.
   *
   * So subject resolution succeeds for Dave and fails for Odile, Mara
   * and the sentry, all of whom are present. Running the SHIPPED
   * `drive-identity.ts` unmodified reproduces it: 6 of its 18
   * checkpoints fail, and they are exactly these.
   *
   * ⓘ What is NOT established: whether this is a regression and from
   * where. `design/dossier` is in flight in a sibling worktree and
   * touches this area, which makes it a likely neighbour but not a
   * finding. Reported, not diagnosed.
   *
   * The affected checkpoints below are marked `it.fails` — they assert
   * the behaviour the identity build shipped, they document that it is
   * currently broken, and **they will start failing the moment somebody
   * fixes it**, which is the only kind of marker that cleans itself up.
   */
  it.fails('she reads as COMPETENT or better at the city’s clerical work', async () => {
    const comp = await a.prose('competence odile');
    expect(comp).toMatch(/business-admin|business-administration/i);
    expect(comp).toMatch(/competent|proficient|expert/i);
    // ⭐ And NOT a novice — the whole point of an authored dossier.
    expect(comp).not.toMatch(/novice|untrained/i);
  });

  it.fails('her opening history reads as BACKGROUND, not as a deed', async () => {
    const chron = await a.prose('chronicle odile');
    expect(chron).toMatch(/Prologue/i);
    expect(chron).toMatch(/registry counter|magistrate/i);
    expect(chron, 'seeded evidence is not a deed').not.toMatch(/Deeds/i);
  });

  it('reading twice does not double the history', async () => {
    const first = await a.prose('chronicle odile');
    const again = await a.prose('chronicle odile');
    const bullets = (s: string): number => (s.match(/^\s*[-•*]/gm) ?? []).length;
    expect(bullets(again)).toBe(bullets(first));
  });
});

suite('the lounge', () => {
  it('Dave tends a bar well', async () => {
    const daveComp = await b.prose('competence dave');
    expect(daveComp).toMatch(/bartending/i);
    expect(daveComp).toMatch(/proficient|expert/i);
  });

  it('⭐ the cast gives a RANGE of answers, not one band five times', async () => {
    // The acceptance criterion a unit test structurally cannot reach:
    // it asserts one character, and only a sweep sees the curve.
    const bands = new Set<string>();
    for (const who of ['dave', 'mara', 'remy', 'sloane', 'augie']) {
      const r = await b.prose(`competence ${who}`);
      for (const m of r.matchAll(
        /\b(untrained|novice|competent|proficient|expert)\b/g
      )) {
        bands.add(m[1]!);
      }
    }
    expect(
      bands.size,
      `bands seen across the lounge cast: ${[...bands].join(', ')}`
    ).toBeGreaterThanOrEqual(2);
  }, 120_000);

  it('⭐ asking about another player is REFUSED, not merely absent', async () => {
    /*
     * ⚠ The refusal has to be asked with the other player IN THE ROOM. A
     * first pass asked about a player standing in another locality and
     * accepted "Nobody here goes by …" — which is the not-present
     * branch, not the refusal, and would have gone on passing if the
     * gate were deleted.
     *
     * ⭐ And they have to INTRODUCE themselves first, which is the belief
     * layer working: an un-introduced player reads as *a human*, so
     * there is no name to ask about until they give one. It is also why
     * the question cannot be asked by login handle — the world has never
     * heard it.
     */
    const handle = uniqueHandle('ident-d');
    const bystander = await Session.open(handle, { startLocation: BAR });
    try {
      const said = await bystander.prose('introduce');
      expect(said, 'until they introduce there is no name to ask about').toMatch(
        /introduce yourself as/i
      );
      const refusal = await b.prose(`competence ${handle}`);
      expect(refusal).toMatch(/theirs to show you/i);
    } finally {
      bystander.close();
    }
  }, 120_000);
});

suite('the watchpost', () => {
  it('a watchful sentry, no name', async () => {
    const rows = await c.query('peers', { fields: ['displayName'] });
    expect(
      rows
        .map((r) => String((r as { displayName?: string }).displayName ?? ''))
        .join(' | ')
    ).toMatch(/sentry/i);
  });

  it.fails('the world declines to treat a ROLE as somebody', async () => {
    expect(await c.prose('competence sentry')).toMatch(/Nothing is on the record/i);
    // …and says so plainly rather than returning an empty answer.
    expect(await c.prose('chronicle sentry')).toMatch(/Nothing is written down/i);
  });

  it.fails('a body of people has a readable record, naming the POST not the person', async () => {
    const opened = await c.cmd('attack sentry --lethal');
    expectOk(opened);
    // A genuine bout: the sentry is a real opponent and this character
    // arrives with nothing.
    for (let i = 0; i < 14; i++) {
      const round = await c.cmd('fight strike');
      if (/dies|falls|is slain|put to death/i.test(await round.said())) break;
    }
    const watch = await c.prose('chronicle the watch');
    expect(watch).toMatch(/Watch of the Last Counted Mile/i);
    // ⭐ It names the POST the sentry answered to, never an individual.
    expect(watch).toMatch(/Lost:|answers for|lost nobody/i);
  }, 300_000);

  it('a body that has lost nobody reads as such', async () => {
    const company = await c.prose('chronicle long road');
    expect(company).toMatch(/Long Road Company/i);
    expect(company).toMatch(/lost nobody/i);
  });

  it('⭐ a subject must be addressed by a word it CALLS ITSELF', async () => {
    // The resolution rule the drive itself found: `the watch` used to
    // answer with "a watchful sentry" (MQL matches a prefix), and
    // `competence dave` used to answer with "Dave's Bar".
    expect(await c.prose('competence watch')).toMatch(
      /body of people, not somebody who practises/i
    );
  });
});
