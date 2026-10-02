/**
 * `seededBandFor` — ⭐⭐⭐ **what an author wrote down about you, as
 * distinct from what your hands have learned.**
 *
 * The whole build's knowledge story rests on these two reads being
 * different questions:
 *
 * - `competenceBandFor` — what you can currently express, from every
 *   Transcript row you own;
 * - `seededBandFor` — what your **dossier** licensed, from `claim`-kind
 *   rows only.
 *
 * ⚠⚠ Only a dossier writes `claim` rows. That one fact is what makes the
 * authored shortcut structurally unavailable to a player: Mara can mix a
 * Manhattan the first time anybody orders one, and a player who has
 * hand-built twenty gin-tonics still cannot, because *the hands learn* and
 * a player has no author.
 */
/**
 * ⚠ Paths are synthetic (`/test/**`). A kernel test proves the KERNEL, so it
 * must not name shipped content — a test of real rows lives beside them
 * (`src/mud/world/**`). `lint:test-content` enforces it, and caught these
 * four on their first run.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { AdvancementMixin } from '../Advancement';
import { PersonaMixin } from '../../character/Persona';
import { StuffApi } from '../../../api/stuff';
import TranscriptEntry from '../TranscriptEntry';
import { Competence } from '../Competence';
import { CompetenceBand } from '../CompetenceBand';
import { PersistApi } from '../../../api/persist';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class Learner extends AdvancementMixin(PersonaMixin(Idea)) {
  static _mixinName = 'Learner';
}

/** Rows as the ledger would hold them — `kind` is the whole point here. */
interface Row {
  owner: string;
  discipline: string;
  difficulty: string;
  outcome: string;
  when: number | null;
  kind?: string;
}

let rows: Row[] = [];

beforeEach(() => {
  StuffApi.clearAll();
  rows = [];
  // ⚠ Both competence reads short-circuit to the FLOOR when the store is
  // not connected — which is the honest answer in production and makes
  // every assertion here vacuous without this. The exact shape of
  // `check-mass`'s warning: the weakest evidence producing the strongest
  // claim.
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(TranscriptEntry, 'find').mockImplementation(
    async (query: Record<string, unknown>) =>
      rows.filter((r) =>
        Object.entries(query).every(
          ([k, v]) => (r as unknown as Record<string, unknown>)[k] === v,
        ),
      ) as never,
  );
});

afterEach(() => vi.restoreAllMocks());

function seed(
  owner: string,
  discipline: string,
  band: 'novice' | 'competent' | 'proficient' | 'expert',
  kind: 'claim' | 'deed',
): void {
  const run = Competence.seedRunFor(band);
  if (!run) throw new Error(`no seed run for ${band}`);
  for (let i = 0; i < run.count; i++) {
    rows.push({
      owner,
      discipline,
      difficulty: run.difficulty,
      outcome: 'success',
      when: null,
      kind,
    });
  }
}

describe('seededBandFor', () => {
  it('⭐ folds the dossier: an authored proficient reads proficient', async () => {
    const mara = makeStuffAtPath(() => new Learner(), '/test/agent/authored-barkeep');
    seed('/test/agent/authored-barkeep', 'mixology', 'proficient', 'claim');
    expect(await mara.seededBandFor('mixology')).toBe('proficient');
  });

  it('⭐⭐⭐ IGNORES lived deeds — a player with twenty successes is seeded at the FLOOR', async () => {
    const player = makeStuffAtPath(
      () => new Learner(),
      '/platform/agent/Avatar/p1',
    );
    // Twenty hand-built successes, every one a `deed`.
    for (let i = 0; i < 20; i++) {
      rows.push({
        owner: '/platform/agent/Avatar/p1',
        discipline: 'mixology',
        difficulty: 'standard',
        outcome: 'success',
        when: null,
        kind: 'deed',
      });
    }
    // Their LIVED band is real and high…
    expect(await player.competenceBandFor('mixology')).not.toBe(
      CompetenceBand.FLOOR,
    );
    // …and their SEEDED band is the floor, because nobody authored them.
    expect(await player.seededBandFor('mixology')).toBe(CompetenceBand.FLOOR);
  });

  it('answers the floor for a discipline the dossier never mentioned', async () => {
    const mara = makeStuffAtPath(() => new Learner(), '/test/agent/authored-barkeep');
    seed('/test/agent/authored-barkeep', 'mixology', 'expert', 'claim');
    expect(await mara.seededBandFor('smithing')).toBe(CompetenceBand.FLOOR);
  });

  it('⚠ and a claim in one discipline does not leak into another', async () => {
    const who = makeStuffAtPath(() => new Learner(), '/test/agent/someone');
    seed('/test/agent/someone', 'bartending', 'expert', 'claim');
    expect(await who.seededBandFor('bartending')).toBe('expert');
    expect(await who.seededBandFor('mixology')).toBe(CompetenceBand.FLOOR);
  });
});

describe('what a band licenses — the shipped ladder', () => {
  /**
   * ⭐ The partner read `canMake` applies: a seeded history is *made of*
   * work at one difficulty, and it licenses nothing harder. These are the
   * seeder's own constants, asserted so a change to them is a decision
   * rather than a surprise.
   */
  it('competent is easy work, proficient is standard, expert is hard', () => {
    expect(Competence.seedRunFor('competent')?.difficulty).toBe('easy');
    expect(Competence.seedRunFor('proficient')?.difficulty).toBe('standard');
    expect(Competence.seedRunFor('expert')?.difficulty).toBe('hard');
  });

  it('⚠⚠ untrained is an EMPTY run — it licenses nothing at all', () => {
    const run = Competence.seedRunFor('untrained');
    expect(run?.count).toBe(0);
    // A zero-count run that still licensed `easy` would make every
    // dossier-less person a competent maker, silently.
  });

  it('⭐ and NOTHING reaches formidable — the hardest work is hand-only, for everybody', () => {
    for (const band of ['novice', 'competent', 'proficient', 'expert'] as const) {
      expect(Competence.seedRunFor(band)?.difficulty).not.toBe('formidable');
    }
  });
});
