/**
 * The client surface — the wire half of the blocking drive (requirements
 * steps 1–11). The browser half (12–23) is the Playwright specs.
 *
 * ⭐ Every outcome is read off the ENVELOPE the client renders from:
 * `card-opened` / `card-touched` / `card-arranged` and the subject card's
 * `segments` and `result`. Prose is read only where a line is the fact.
 *
 * Steps 5–8 are staged (a wizard sets the scene); the rest are a player's
 * own acts.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  hand,
  WINTER_COAT,
  type CapturedEnvelope,
} from '../src/harness';

export const DIRTY_REASON =
  'kills a named lounge NPC (Sloane) to stage a corpse (step 7); she does ' +
  'not return until the world reboots';

declareFile({
  file: 'client-surface.dirty.wire.test.ts',
  packs: ['saxonberg-lounge', 'trade-hospitality', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

const BAR = '/world/lounge/location/bar';
const PINT = '/trade/hospitality/thing/pint';
// (the pint's maker line is quiet on an unused glass — B3 — so step 6
// reads ownership, which speaks on any good)

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
let b: Session; // another person in the bar
let c: Session; // a bystander
/** The room card, as step 1 bound it — step 11 walks out and watches it. */
let hereCard: Card | undefined;

/** The subject card a command opened or touched. */
async function subjectCard(s: Session): Promise<Card> {
  const isSubject = (e: Card): boolean => e.cardId === 'subject' || e.segments !== undefined;
  const opened = s.envelopesOf<Card>('card-opened').filter(isSubject);
  if (opened.length > 0) return opened[opened.length - 1]!;
  const touched = s.envelopesOf<Card>('card-touched').filter((e) => e.segments !== undefined);
  if (touched.length > 0) return touched[touched.length - 1]!;
  return s.awaitEnvelope<Card>('card-opened', isSubject, 10_000);
}

const allText = (segs: Seg[] | undefined): string => (segs ?? []).map((g) => g.text).join('\n');

/** A wizard runs `code` against `target` in the bar's parcel (writes are real). */
async function stage(target: string, code: string): Promise<string> {
  const f = await Session.open('founder', { startLocation: BAR, wizard: true });
  try {
    const r = await f.cmd(`eval --parcel /world/lounge --on ${target} return ${code}`);
    return (await r.said()).trim();
  } finally {
    f.close();
  }
}

async function stuffIdOf(s: Session): Promise<string> {
  const me = await s.queryOne('me', ['displayName']);
  return (me as { stuffId: string }).stuffId;
}

beforeAll(async () => {
  a = await Session.open(uniqueHandle('cs-a'), { startLocation: BAR });
  b = await Session.open(uniqueHandle('cs-b'), { startLocation: BAR });
  c = await Session.open(uniqueHandle('cs-c'), { startLocation: BAR });
}, 180_000);

afterAll(() => {
  a?.close();
  b?.close();
  c?.close();
});

suite('the room by look (steps 1–4)', () => {
  it('1 · look in the bar: segments with a shape and a source; light, exits; the room card is the `here` role', async () => {
    await a.cmd('look');
    const card = await subjectCard(a);
    expect(card.segments?.length, 'segments').toBeGreaterThan(0);
    for (const seg of card.segments!) {
      expect(['prose', 'state', 'list', 'notice']).toContain(seg.shape);
      expect(seg.sources.length).toBeGreaterThan(0);
    }
    expect(card.segments!.some((g) => g.shape === 'prose')).toBe(true);
    expect(card.segments!.some((g) => g.sources.some((s) => s.name === 'Light'))).toBe(true);
    expect(card.role).toBe('here');
    hereCard = card;
  });

  it('2 · look back-bar: what is on it arrives as list segments, identical things grouped', async () => {
    await a.cmd('look back-bar');
    const card = await subjectCard(a);
    const lists = (card.segments ?? []).filter((g) => g.shape === 'list');
    expect(lists.length, allText(card.segments)).toBeGreaterThan(0);
    const items = lists.flatMap((l) => l.items ?? []);
    // Grouping: no two chips are the same row holding the same matter.
    const labels = items.map((i) => i.label);
    expect(new Set(labels).size, labels.join(', ')).toBe(labels.length);
    expect(items.length).toBeLessThan(50);
  });

  it('3 · look pint (unused): no "one piece", no verdict on an unused glass', async () => {
    await hand(a, PINT);
    await a.cmd('look me:i:pint');
    const card = await subjectCard(a);
    const text = allText(card.segments);
    expect(text).not.toMatch(/one piece/i);
    expect(text).not.toMatch(/It looks (poor|fair|fine|exceptional|masterful)/);
  });

  it('4 · look tablet: the screen line is there', async () => {
    await a.cmd('look tablet');
    const card = await subjectCard(a);
    expect((card.segments ?? []).some((g) => g.sources.some((s) => s.name === 'Screen'))).toBe(true);
  });
});

suite('privacy on the wire (steps 5–8, staged)', () => {
  it('5 · look another person: no pockets, no mass; worn things named; a presence line', async () => {
    await hand(b, WINTER_COAT);
    const coat = await b.queryOne('me:i:greatcoat', ['displayName']);
    await b.cmd(`wear #${(coat as { stuffId: string }).stuffId}`);
    await hand(b, PINT); // held — in view
    await b.cmd('sit'); // a posture other than standing: the presence line says it
    const bId = await stuffIdOf(b);
    await a.cmd(`look #${bId}`);
    const card = await subjectCard(a);
    const rec = card.result?.[0] ?? {};
    expect(rec.mass, 'mass of another person').toBeUndefined();
    const worn = (rec.worn as { displayName?: string }[] | undefined) ?? [];
    expect(worn.length).toBeGreaterThan(0);
    for (const w of worn) expect(w.displayName).not.toBe('something');
    // Contents are only what they hold in view.
    const held = (card.segments ?? []).find((g) => g.heading === 'Holding')?.items ?? [];
    const heldIds = new Set(held.map((i) => i.stuffId));
    for (const c2 of (rec.contents as { stuffId: string }[] | undefined) ?? []) {
      expect(heldIds.has(c2.stuffId), `pocket item on the wire: ${c2.stuffId}`).toBe(true);
    }
    const presence = (card.segments ?? []).find((g) => g.sources.some((s) => s.name === 'Presence'));
    expect(presence?.text, allText(card.segments)).toMatch(/^Now: .*sit/);
  });

  it('6 · "Owned by" and "Made by" name B as A knows them, not their true name', async () => {
    const bId = await stuffIdOf(b);
    const bName = String(
      ((await b.queryOne('me', ['displayName'])) as { displayName?: string }).displayName ?? '',
    );
    expect(bName.length).toBeGreaterThan(0);
    // B's own pint (handed in step 5 — a fresh good is its holder's), set
    // down on the bar, with B stamped as its maker and the glass used (an
    // unused glass gives no verdict, so no maker line — B3).
    const pint = (await b.queryOne('me:i:pint', ['displayName'])) as { stuffId: string };
    expect((await b.cmd(`drop #${pint.stuffId}`)).status).toBe('ok');
    await stage(
      `#${pint.stuffId}`,
      `(this.setMaker(StuffApi.findById('${bId}').getIdentityPath()), this.markUsed(), 'ok')`,
    );
    await a.cmd(`look #${pint.stuffId}`);
    const card = await subjectCard(a);
    const text = allText(card.segments);
    const owned = (card.segments ?? []).find((g) => g.heading === 'Owned by');
    expect(owned, text).toBeDefined();
    expect(owned!.text).not.toContain(bName);
    expect(text).toMatch(/Made by /);
    expect(text).not.toContain(bName);
  });

  it('7 · a named NPC\'s corpse reads as a stranger to A and does not answer to the name', async () => {
    // Sloane never introduces herself, so A has never met her.
    await stage('sloane', `ConditionApi.die(this, 'hypothermia')`);
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

  it('8 · a fight seen by a bystander: the combat line is there and reads through the fog', async () => {
    expect((await a.cmd('attack tiefling')).status).toBe('ok');
    const aId = await stuffIdOf(a);
    c.clearCaptures();
    await c.cmd(`look #${aId}`);
    const text = allText((await subjectCard(c)).segments);
    // The line is present while the fight is; the unit tests pin the fog.
    expect(text).toMatch(/In combat — /);
    await a.cmd('fight yield');
  });
});

suite('the card registry (steps 9–11)', () => {
  it('9 · a card link by id names exactly that thing, not the first match', async () => {
    const rows = await a.query('stool', { fields: ['displayName'] });
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const third = (rows[2] as { stuffId: string }).stuffId;
    a.clearCaptures();
    await a.cmd(`look #${third}`);
    const card = await subjectCard(a);
    expect(card.subjectId ?? (card.result?.[0]?.stuffId as string)).toBe(third);
  });

  it('10 · cockpit card actions each change the card and echo; a saved layout restores it', async () => {
    await a.cmd('who');
    const who = a.lastCard<Card>('card-opened');
    expect(who?.cardId).toBe('who');
    for (const action of ['grow', 'shrink', 'minimize', 'restore', 'pin']) {
      const r = await a.cmd(`cockpit card ${action} who`);
      expect(r.status, action).toBe('ok');
      expect(a.envelopesOf('card-arranged').length + a.envelopesOf('card-pinned').length, action).toBeGreaterThan(0);
    }
    const moved = await a.cmd('cockpit card move who 1 0');
    expect(moved.status).toBe('ok');
    expect(a.lastCard<Card>('card-arranged')?.placed).toEqual({ col: 1, row: 0 });
    expect((await a.cmd('cockpit layout save wide')).status).toBe('ok');
    expect((await a.cmd('cockpit card close who')).status).toBe('ok');
    await a.cmd('cockpit layout wide');
    const back = a.envelopesOf<Card>('card-opened').find((e) => e.cardId === 'who');
    expect(back?.placed).toEqual({ col: 1, row: 0 });
  });

  it('10b · terminals are cards: `cockpit terminal --beside` opens a second terminal with its own bar', async () => {
    await a.cmd('cockpit mode explore');
    // Retarget the primary: its card-touched carries its bar.
    await a.cmd('cockpit terminal All');
    const primary = a.envelopesOf<Card>('card-touched').find((e) => e.payload?.kind === 'terminal');
    expect(primary?.payload?.primary).toBe(true);
    await a.cmd('cockpit terminal "#general" --beside');
    const beside = a.lastCard<Card>('card-opened');
    expect(beside?.cardId).toBe('terminal');
    expect(beside?.payload?.barId).toMatch(/^bar-/);
    expect(beside?.payload?.barId).not.toBe(primary?.payload?.barId);
  });

  it('11 · walking out rebinds the room card — never a second one', async () => {
    // (Bare `look` reads your focus once you have one, so the room card is
    // the one step 1 bound.)
    const here = hereCard!;
    expect(here, 'the here card').toBeDefined();
    a.clearCaptures();
    expect((await a.cmd('south')).status).toBe('ok');
    // Arrival runs `look`: the same instance, a new subject.
    const rebound = await a.awaitEnvelope<Card>(
      'card-touched',
      (e) => e.instanceId === here.instanceId && e.subjectId !== undefined,
      15_000,
    );
    expect(rebound.subjectId).not.toBe(here.subjectId);
    expect(a.envelopesOf<Card>('card-opened').filter((e) => e.role === 'here')).toHaveLength(0);
  });
});
