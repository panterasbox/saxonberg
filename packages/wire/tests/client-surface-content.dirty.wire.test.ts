/**
 * The client surface — the CONTENT half of step 7 (test-world-lifecycle D8,
 * split from `client-surface.wire.test.ts`, unchanged): a NAMED NPC's
 * corpse reads as a stranger to a player who never met her, and does not
 * answer to her name. It needs a named person (a `Cast` — Sloane, the
 * lounge bartender); the testbed ships only unnamed `Extra`s, so this step
 * stays on placeholder content until a named person stands somewhere a
 * drive may harm one. Build 2's to move.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  type CapturedEnvelope,
} from '../src/harness';

export const DIRTY_REASON =
  'kills a named lounge NPC (Sloane) to make a corpse (step 7); she does ' +
  'not return until the world reboots';

declareFile({
  file: 'client-surface-content.dirty.wire.test.ts',
  packs: ['saxonberg-lounge', 'trade-hospitality', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

const BAR = '/world/lounge/place/bar';

interface Seg {
  shape: string;
  sources: { kind: string; name: string }[];
  text: string;
  heading?: string;
  items?: { stuffId: string; label: string; count: number; members?: unknown[] }[];
}
type Card = CapturedEnvelope & {
  instanceId: string;
  cardId: string;
  role?: string;
  subjectId?: string;
  segments?: Seg[];
  result?: Record<string, unknown>[];
  payload?: { kind: string; barId?: string; primary?: boolean };
  size?: string;
  placed?: { col: number; row: number };
};

let a: Session; // the looker

/** The subject card a command opened or touched. */
async function subjectCard(s: Session): Promise<Card> {
  const isSubject = (e: Card): boolean => e.cardId === 'subject' || e.segments !== undefined;
  const opened = s.envelopesOf<Card>('card-opened').filter(isSubject);
  if (opened.length > 0) return opened[opened.length - 1]!;
  const touched = s.envelopesOf<Card>('card-touched').filter((e) => e.segments !== undefined);
  if (touched.length > 0) return touched[touched.length - 1]!;
  return s.awaitEnvelope<Card>('card-opened', isSubject, 10_000);
}

/** A wizard runs `code` against `target` in the bar's parcel (writes are real). */
async function stage(target: string, code: string): Promise<string> {
  const f = await Session.open('founder', { startLocation: BAR, wizard: true, committees: ['/world/lounge'] });
  try {
    const r = await f.cmd(`eval --parcel /world/lounge --on ${target} return ${code}`);
    const said = (await r.said()).trim();
    // A stage that matched nothing must say so, not pass on to a step
    // that then waits for a card that cannot come.
    expect(r.status, `stage --on ${target}: ${JSON.stringify(r.notes)} ${said}`).toBe('ok');
    return said;
  } finally {
    f.close();
  }
}

beforeAll(async () => {
  a = await Session.open(uniqueHandle('cs-a'), { startLocation: BAR });
}, 180_000);

afterAll(() => {
  a?.close();
});

suite('privacy on the wire (step 7, staged)', () => {
  it('7 · a named NPC\'s corpse reads as a stranger to A and does not answer to the name', async () => {
    // Sloane never introduces herself, so A has never met her — and nor
    // has the founder, so the stage names her by what she looks like.
    // ⚠ `beginDying` with a one-second window, not `ConditionApi.die`: the
    // scheduler performs the death OUTSIDE the eval, so the corpse is minted
    // where the world mints corpses (a death run inside a field-parcel eval
    // is refused at the corpse's applier and leaves no body at all).
    await stage('bartender', `(this.beginDying('exsanguination', 1), 'dying')`);
    let found = false;
    for (let i = 0; i < 30 && !found; i++) {
      await new Promise((r) => setTimeout(r, 1_000));
      found = (await a.query('body', { fields: ['displayName'] })).length > 0;
    }
    expect(found, 'a body in the bar within 30s').toBe(true);
    a.clearCaptures();
    await a.cmd('look body');
    const card = await subjectCard(a);
    const title = String(card.result?.[0]?.displayName ?? '');
    expect(title).toMatch(/body of/);
    expect(title).not.toMatch(/Sloane/i);
    a.clearCaptures();
    const byName = await a.cmd('look sloane');
    const named = a.lastCard<Card>('card-opened');
    expect(String(named?.result?.[0]?.displayName ?? ''), `look sloane: ${byName.status}`).not.toMatch(/body/);
  });
});
