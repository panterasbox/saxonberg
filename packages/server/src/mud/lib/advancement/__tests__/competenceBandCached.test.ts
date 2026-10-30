/**
 * `competenceBandCached` + `warmCompetenceDigest` — the SYNC face of one
 * Discipline's band (field population D10).
 *
 * A crop's banded read is a markup augmenter, and the augmenter contract
 * is sync. So the band it reads must already be folded when `look`
 * renders: the per-command preload awaits `warmCompetenceDigest`, and the
 * augmenter takes `competenceBandCached`. The one property that matters
 * is that the two faces agree — after the warm, the sync band IS the
 * async band.
 *
 * ⚠ Paths are synthetic (`/test/**`) — a kernel test proves the kernel.
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
import { DerivedStandingCache } from '../../standing/DerivedStandingCache';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class Reader extends AdvancementMixin(PersonaMixin(Idea)) {
  static _mixinName = 'Reader';
}

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
  DerivedStandingCache._clearAllForTesting();
  rows = [];
  // ⚠ Every competence read short-circuits to the FLOOR when the store
  // is not connected, which would make each assertion here vacuous.
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

function seed(owner: string, discipline: string, band: 'novice' | 'competent' | 'expert'): void {
  const run = Competence.seedRunFor(band);
  if (!run) throw new Error(`no seed run for ${band}`);
  for (let i = 0; i < run.count; i++) {
    rows.push({
      owner,
      discipline,
      difficulty: run.difficulty,
      outcome: 'success',
      when: null,
      kind: 'claim',
    });
  }
}

describe('competenceBandCached', () => {
  it('⭐ after the warm, the sync band equals competenceBandFor', async () => {
    const hand = makeStuffAtPath(() => new Reader(), '/test/agent/farm-hand');
    seed('/test/agent/farm-hand', 'horticulture', 'competent');
    await hand.warmCompetenceDigest();
    const async = await hand.competenceBandFor('horticulture');
    expect(async).not.toBe(CompetenceBand.FLOOR);
    expect(hand.competenceBandCached('horticulture')).toBe(async);
  });

  it('reads the FLOOR before any fold, never a guess upward', () => {
    const hand = makeStuffAtPath(() => new Reader(), '/test/agent/cold-hand');
    seed('/test/agent/cold-hand', 'horticulture', 'expert');
    expect(hand.competenceBandCached('horticulture')).toBe(CompetenceBand.FLOOR);
  });

  it('reads the FLOOR for a Discipline with no evidence', async () => {
    const hand = makeStuffAtPath(() => new Reader(), '/test/agent/smith');
    seed('/test/agent/smith', 'smithing', 'expert');
    await hand.warmCompetenceDigest();
    expect(hand.competenceBandCached('horticulture')).toBe(CompetenceBand.FLOOR);
    expect(hand.competenceBandCached('smithing')).toBe('expert');
  });

  it('the warm folds once — a second warm does not re-read the ledger', async () => {
    const hand = makeStuffAtPath(() => new Reader(), '/test/agent/steady');
    seed('/test/agent/steady', 'horticulture', 'novice');
    await hand.warmCompetenceDigest();
    const calls = vi.mocked(TranscriptEntry.find).mock.calls.length;
    await hand.warmCompetenceDigest();
    expect(vi.mocked(TranscriptEntry.find).mock.calls.length).toBe(calls);
  });
});
