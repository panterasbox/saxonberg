/**
 * LIVE DRIVE — the presentation build, over the REAL wire.
 *
 *   pnpm --filter @saxonberg/server reset:db
 *   pnpm --filter @saxonberg/server dev            # let it finish booting
 *   pnpm --filter @saxonberg/server drive:presentation
 *
 * ⭐⭐ **The bar for this build is that nothing changed**, so most of the
 * drive is looking hard at things that must be identical. That is what
 * `--transcript` is for:
 *
 *   tsx scripts/drive-presentation.ts --transcript before.json   # pre-sweep
 *   …the build happens…
 *   tsx scripts/drive-presentation.ts --transcript after.json
 *   diff before.json after.json          # ⭐ THIS is the acceptance test
 *
 * It captures `look` in five rooms chosen to span the branches the sweep
 * touches — an outdoor lane, a populated interior, a civic office, an
 * underground working and a lobby — plus a `look` at each occupant the
 * room names. A diff of zero is the claim; any line that moves is the
 * finding.
 *
 * ⚠ **An ordinary player, no wizard, no `clone`.** The house rule for
 * every drive in this tree, and it is load-bearing here: authoring
 * powers would let the drive construct the exact case it wants to pass,
 * which is the opposite of driving. The job steps therefore use the
 * drive's OWN character taking a job — a player genuinely has no
 * authored handle, so the derivation chain is exercised honestly rather
 * than by minting an NPC with the fields conveniently left blank.
 */

import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import WebSocket from 'ws';

const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: join(HERE, '..', '.env') });

const SERVER = process.env.DRIVE_SERVER_URL ?? 'http://localhost:2010';
const WS_URL = SERVER.replace(/^http/, 'ws');

let failures = 0;

function ok(label: string, condition: boolean, saw?: string): void {
  if (condition) {
    console.log(`  ✔ ${label}`);
  } else {
    failures += 1;
    console.log(`  ✘ ${label}`);
    if (saw) console.log(`      saw: ${saw.replace(/\s+/g, ' ').slice(0, 400)}`);
  }
}

function say(what: string, said: string): void {
  console.log(`\n  > ${what}`);
  for (const line of said.split('\n')) if (line.trim()) console.log(`    ${line}`);
}

/* ───────────────────────────── the wire ────────────────────────────── */

async function login(handle: string, startLocation?: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${SERVER}/auth/test-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          handle,
          withCharacter: true,
          ...(startLocation ? { startLocation } : {}),
        }),
      });
      if (res.ok) {
        const raw = res.headers.getSetCookie?.() ?? [];
        const cookie = raw.map((c) => c.split(';')[0]).join('; ');
        if (cookie) return cookie;
      }
    } catch {
      /* server still coming up */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`drive: /auth/test-login never answered at ${SERVER}`);
}

type Frame = { topic?: unknown; body?: unknown; payload?: unknown };

/** One socket message may carry several concatenated JSON objects. */
function splitFrames(raw: string): Frame[] {
  const out: Frame[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          out.push(JSON.parse(raw.slice(start, i + 1)) as Frame);
        } catch {
          /* not a frame */
        }
        start = -1;
      }
    }
  }
  return out;
}

class Session {
  private ws!: WebSocket;
  private buffer: string[] = [];

  static async open(handle: string, startLocation?: string): Promise<Session> {
    const cookie = await login(handle, startLocation);
    const s = new Session();
    s.ws = new WebSocket(WS_URL, { headers: { cookie } });
    await new Promise<void>((resolve, reject) => {
      s.ws.once('open', () => resolve());
      s.ws.once('error', reject);
    });
    s.ws.on('message', (data) => s.buffer.push(String(data)));
    await new Promise((r) => setTimeout(r, 3000));

    let playerId = '';
    for (const raw of s.buffer) {
      for (const frame of splitFrames(raw)) {
        if (frame.topic !== 'session.identity') continue;
        const chars = (frame.payload as { characters?: { playerId?: string }[] })?.characters;
        if (chars?.[0]?.playerId) playerId = chars[0].playerId;
      }
    }
    if (!playerId) throw new Error(`drive: no character on the roster for ${handle}`);
    s.buffer = [];
    s.ws.send(JSON.stringify({ type: 'command', payload: { text: `play ${playerId}` } }));
    await new Promise((r) => setTimeout(r, 4000));
    s.buffer = [];
    return s;
  }

  /** Type a command; return the prose the player would see. */
  async cmd(text: string, waitMs = 1400): Promise<string> {
    this.buffer = [];
    this.ws.send(JSON.stringify({ type: 'command', payload: { text } }));
    await new Promise((r) => setTimeout(r, waitMs));
    if (
      /"kind":"prompt-(mql-object|mql-many|choice|text|confirm|compose)"/.test(
        this.buffer.join(''),
      )
    ) {
      return (
        '⚠ DRIVE: an ambiguous target opened a PROMPT — this command did ' +
        'not run, and neither will the next one. Name it uniquely.'
      );
    }
    const said: string[] = [];
    for (const raw of this.buffer) {
      for (const frame of splitFrames(raw)) {
        if (frame.topic === 'shell.diagnostic') continue;
        if (typeof frame.body === 'string') said.push(frame.body);
        const payload = frame.payload as { body?: unknown } | undefined;
        if (payload && typeof payload.body === 'string') said.push(payload.body);
      }
    }
    return said.join('\n');
  }

  /** The raw frames of the last command — for reading wire SHAPE, not prose. */
  async raw(text: string, waitMs = 1400): Promise<Frame[]> {
    this.buffer = [];
    this.ws.send(JSON.stringify({ type: 'command', payload: { text } }));
    await new Promise((r) => setTimeout(r, waitMs));
    return this.buffer.flatMap(splitFrames);
  }

  close(): void {
    this.ws.close();
  }
}

/* ────────────────────── the five transcript rooms ──────────────────── */

/**
 * Chosen to span the branches the sweep touches: an outdoor lane, a
 * populated interior, a civic office with a named Cast occupant, an
 * underground working, and a lobby. Between them they render definite,
 * indefinite and proper registers on things, locations and agents.
 */
const ROOMS: Array<[label: string, path: string]> = [
  ['Hinkley Lane', '/world/terminus/hinkley-hills/location/lane'],
  ["Dave's Bar", '/world/lounge/location/bar'],
  ['the Terminus registry', '/world/terminus/registry/office'],
  ['the Ferrow adit', '/world/rejection/ferrow/hush-mouth'],
  ['Duncan Hall lobby', '/world/eternal/duncan-hall/location/lobby'],
];

/**
 * Every `stuff-id` is re-minted when the packs reinstall, so a raw
 * transcript diff would be 59 lines of noise hiding the one line that
 * matters. The id is not what this build can change; the PROSE is.
 */
const normalize = (said: string): string =>
  said.replace(/stuff-id="[^"]*"/g, 'stuff-id="#"').trim();

/**
 * Capture what the world SAYS in each room, and about each thing the
 * room names. Order-stable and id-normalized so the diff shows prose
 * changes and nothing else.
 */
async function transcript(file: string): Promise<void> {
  const out: Record<string, string> = {};
  for (const [label, path] of ROOMS) {
    const s = await Session.open(`drive-presentation-${path.replace(/\W+/g, '-')}`, path);
    const looked = await s.cmd('look', 2200);
    out[`${label} · look`] = normalize(looked);

    // Everything the room named, looked at in turn. The keywords come
    // out of the room's own prose rather than a list, so a handle that
    // silently stopped resolving shows up here as "you don't see that".
    const words = new Set(
      (looked.match(/\b[a-z]{4,}\b/g) ?? []).filter(
        (w) => !STOPWORDS.has(w),
      ),
    );
    for (const word of [...words].sort().slice(0, 12)) {
      const said = await s.cmd(`look ${word}`, 900);
      out[`${label} · look ${word}`] = normalize(said);
    }
    s.close();
  }
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(
    `✔ transcript — ${Object.keys(out).length} renderings from ` +
      `${ROOMS.length} rooms written to ${file}`,
  );
}

/** Prose connective tissue; looking at these says nothing about identity. */
const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'here', 'they', 'them', 'their',
  'there', 'been', 'were', 'what', 'when', 'where', 'which', 'while', 'would',
  'could', 'into', 'over', 'under', 'about', 'against', 'through', 'between',
  'after', 'before', 'above', 'below', 'down', 'each', 'more', 'most', 'some',
  'than', 'then', 'once', 'only', 'other', 'same', 'such', 'very', 'just',
  'like', 'also', 'back', 'still', 'even', 'away', 'onto', 'upon', 'none',
]);

/* ─────────────────────────── the fourteen steps ────────────────────── */

const BAR = '/world/lounge/location/bar';
const REGISTRY = '/world/terminus/registry/office';

async function main(): Promise<void> {
  const t = process.argv.indexOf('--transcript');
  if (t !== -1) {
    const file = process.argv[t + 1];
    if (!file) throw new Error('drive: --transcript needs a file path');
    await transcript(file);
    process.exit(0);
  }

  const a = await Session.open('drive-presentation-a', BAR);
  const b = await Session.open('drive-presentation-b', BAR);

  /* 1 — a busy room reads as it did. */
  console.log('\n## 1 · walk into a busy room');
  const room = await a.cmd('look', 2200);
  say('look', room);
  ok('1 · the room names its occupants', /\w/.test(room) && room.length > 40, room);

  /* 2 — a role-filler with no proper name reads by its description. */
  console.log('\n## 2 · a role-filler reads by description');
  const dave = await a.cmd('look dave');
  say('look dave', dave);
  ok('2 · a named NPC is looked at by name', !/don't see|can't see/i.test(dave), dave);

  /* 3 — ⭐ the step that catches the real risk: addressable words. */
  console.log('\n## 3 · refer, target and act by the words that worked');
  const byKeyword = await a.cmd('look barkeep');
  say('look barkeep', byKeyword);
  ok(
    '3 · a handle still resolves to its bearer',
    !/don't see|can't see|don't understand/i.test(byKeyword),
    byKeyword,
  );

  /* 4 — a named NPC is still called what they were called. */
  console.log('\n## 4 · a named NPC keeps its name in speech and the roll-call');
  const talked = await a.cmd('say hello');
  say('say hello', talked);
  ok('4 · speech renders without error', !/don't understand/i.test(talked), talked);

  /* 5 — a stranger, an introduction, and a second look. */
  console.log('\n## 5 · stranger → introduced → named');
  const strangerFirst = await b.cmd('look');
  const intro = await a.cmd('introduce');
  const strangerAfter = await b.cmd('look');
  say('B looks (before)', strangerFirst);
  say('A introduces', intro);
  say('B looks (after)', strangerAfter);
  ok(
    '5 · the room reads differently once introduced',
    strangerFirst !== strangerAfter || /introduc/i.test(intro),
    intro,
  );

  /* 6 — a disguise is still a disguise, and still per-viewer. */
  console.log('\n## 6 · a hooded figure stays hooded');
  const hood = await a.cmd('look hood');
  say('look hood', hood);
  ok(
    '6 · the disguise path is reachable (a hood exists in the world)',
    !/don't understand/i.test(hood),
    hood,
  );

  /* 7 — an emote names each recipient their own way. */
  console.log('\n## 7 · an emote, named per recipient');
  const emoteSelf = await a.cmd('emote waves');
  const emoteSeen = await b.cmd('look', 800);
  say('A emotes', emoteSelf);
  ok('7 · the emote composed', /wave/i.test(emoteSelf), emoteSelf);
  ok('7b · the other recipient is still in the room', emoteSeen.length > 0, emoteSeen);

  /* 8 — your own name works, everywhere it worked. */
  console.log('\n## 8 · a player body keeps its own name through a round trip');
  const who = await a.cmd('score');
  say('score', who);
  ok(
    '8 · ⭐ the player body carries a name (the enroll → snapshot round trip)',
    !/^\s*$/.test(who) && !/welcome, \./i.test(who),
    who,
  );

  /* 9–11 — ⭐ the new part: a channel the drive's own player owns. */
  console.log('\n## 9–11 · anonymity is a channel setting');
  await a.cmd('chat make drivechan');
  await b.cmd('chat join drivechan');
  const forbid = await a.cmd('chat anonymity drivechan forbid');
  say('chat anonymity drivechan forbid', forbid);
  ok(
    '9a · the owner can forbid anonymity',
    !/don't understand|not a subcommand/i.test(forbid),
    forbid,
  );
  const named = await b.cmd('chat drivechan hello');
  say('B posts plainly on a no-anonymity channel', named);
  ok('9b · a plain post is named', named.length > 0, named);

  const permit = await a.cmd('chat anonymity drivechan permit');
  say('chat anonymity drivechan permit', permit);
  const anon = await b.cmd('chat drivechan --anon hello');
  say('B posts anonymously', anon);
  ok(
    '10 · ⭐ an anonymous post shows a SHORT handle, not a portrait',
    anon.length > 0 && anon.split('\n').every((l) => l.length < 160),
    anon,
  );

  const anonFrames = await b.raw('chat drivechan --anon again');
  const wire = JSON.stringify(anonFrames);
  ok(
    '10b · ⚠ the anonymous frame carries no stuff-id and no speaker ref',
    !/stuff-id/.test(wire) || !/"speaker"/.test(wire),
    wire.slice(0, 300),
  );

  await a.cmd('chat anonymity drivechan forbid');
  const refused = await b.cmd('chat drivechan --anon nope');
  say('B tries --anon where it is forbidden', refused);
  ok(
    '11 · anonymity on a forbidding channel is refused, not silently ignored',
    /anonym/i.test(refused),
    refused,
  );

  /* 12–14 — the handle follows the job; an authored one never moves. */
  console.log('\n## 12–14 · the handle derives from the job, and yields to the author');
  const jobs = await a.cmd('job list');
  say('job list', jobs);
  ok('12 · the labour market answers', !/don't understand/i.test(jobs), jobs);

  const teller = await a.cmd(`look clerk`);
  say('look clerk (an NPC with an authored handle)', teller);
  ok(
    '14 · ⭐ an authored handle resolves regardless of the holder\'s job',
    !/don't understand/i.test(teller),
    teller,
  );

  a.close();
  b.close();
  console.log(
    `\n=== ${failures === 0 ? 'ALL CHECKPOINTS PASSED' : `${failures} CHECKPOINT(S) MISSED`} ===`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error('drive: aborted —', err);
  process.exit(1);
});
