/**
 * The wire session — one player, one socket, the same handshake the
 * client walks.
 *
 * `test-login` for a session cookie, the WebSocket the client opens,
 * the roster that arrives unbidden, `play <playerId>`, and then the
 * command strings a person types. No browser, no test doubles, no
 * `StuffApi` reach-arounds — if a wire test can do it, a player can.
 *
 * ⭐⭐ **Everything waits on a frame, never on a clock.** The five drive
 * scripts this replaces slept a fixed 1400ms after each command, which
 * is both slower than the world and less reliable than it: a slow act
 * read as silence and a fast one wasted a second. Every dispatch emits
 * exactly one `dispatch-response` envelope — including an async
 * command's detached body, which emits the same single envelope late
 * from its `finally` — so "send, then await the next dispatch-response"
 * is an exact completion signal. There are no `setTimeout`s in the
 * happy path below.
 *
 * The three channels a wire test may assert on, and what each owns
 * (plan D1):
 *
 *   1. `cmd()` → the ENVELOPE. Did the act succeed, and if not, which
 *      note kind and which reason. Never assert a refusal by its prose.
 *   2. `query()` → `mql-query`, the one-shot structured read. State:
 *      what is here, what it is called, what its gauges say. Runs AS
 *      THE PLAYER (viewer-scoped), so perception, concealment and
 *      belief stay honest — a wire test cannot see what its actor
 *      could not.
 *   3. `prose()` → the rendered lines, MML stripped. The residue: facts
 *      no `subscribableFields` descriptor reaches. Every call is
 *      COUNTED and the run reports the census per file.
 *
 * ⚠ A wire file may not add a descriptor to make itself assertable. A
 * state a flow needs and the projection cannot reach is a card-surface
 * finding, recorded like a `dirtiesWorld` reason — the descriptor
 * serves the card first and the test second.
 */

import WebSocket from 'ws';
import type {
  DispatchResponseEnvelope,
  MqlQueryResultEnvelope,
  MqlQueryErrorEnvelope,
  ActivityUpdateEnvelope,
  PromptEnvelope,
  Note,
  StuffRefRecord,
  StuffDetailRecord,
  StuffDetailFocusRecord,
} from '@saxonberg/types';
import { countProseRead } from './registry';
import { assertPacksPresent } from './world';

/** Where the world is. Attach mode's default is the dev server. */
export const SERVER_URL = (): string =>
  process.env.WIRE_SERVER_URL ?? 'http://localhost:2010';

const WS_URL = (): string => SERVER_URL().replace(/^http/, 'ws');

/** How long any single frame may take to arrive before we call it lost. */
const FRAME_TIMEOUT_MS = Number(process.env.WIRE_FRAME_TIMEOUT ?? 30_000);

export type QueryRecord =
  | StuffRefRecord
  | StuffDetailRecord
  | StuffDetailFocusRecord;

/** What `cmd()` hands back: the envelope, plus the lines it produced. */
export interface CommandResult {
  /** The dispatch's own outcome — the assertion surface for outcomes. */
  status: DispatchResponseEnvelope['outcome']['status'];
  /** Every note but the ubiquitous `prompt-refresh`. */
  notes: Note[];
  /** The command as typed, for failure messages. */
  text: string;
  /**
   * The prose the frames carried, MML stripped.
   *
   * ⚠⚠ **`await` it, and await it before the next command.** Unlike the
   * envelope, prose is not done when the dispatch is: scenes reach the
   * socket independently, so a line can land *after* the
   * dispatch-response that reports the outcome. This settles the socket
   * first — see {@link Session.cmd}'s note — which is why it is async
   * where everything else on this object is a plain value.
   *
   * ⚠ Reading it is a prose read and is COUNTED. Reach for `notes` or
   * `query()` first.
   */
  said(): Promise<string>;
}

interface Pending<T> {
  resolve: (value: T) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** A parsed frame off the socket — an envelope or a message frame. */
type AnyFrame = {
  type?: unknown;
  topic?: unknown;
  body?: unknown;
  payload?: unknown;
  queryId?: unknown;
  engagementId?: unknown;
  promptId?: unknown;
  outcome?: unknown;
  result?: unknown;
  reason?: unknown;
  detail?: unknown;
};

/**
 * One socket message can carry several concatenated JSON objects, so
 * parse greedily rather than assuming one frame per message. (Kept from
 * `drive-cooking.ts`, where the assumption cost a debugging round.)
 */
function splitFrames(raw: string): AnyFrame[] {
  const out: AnyFrame[] = [];
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
          out.push(JSON.parse(raw.slice(start, i + 1)) as AnyFrame);
        } catch {
          /* not a frame */
        }
        start = -1;
      }
    }
  }
  return out;
}

/**
 * Strip MML tags so a prose read sees what the player sees.
 *
 * ⚠ A tag becomes a SPACE, not nothing. Deleting it outright welds the
 * text on either side into one word: `<b>expert</b><i>business-admin</i>`
 * renders as `expertbusiness-admin`, and `\bexpert\b` then does not
 * match. That cost a real diagnosis — a competence sweep counted one
 * band where the world had answered with two — and it is the kind of
 * bug that makes a test wrong in the safe-looking direction.
 */
export const plain = (s: string): string =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');

/** POST the test-auth seam and return the session cookie header. */
async function login(
  handle: string,
  opts: { startLocation?: string; wizard?: boolean } = {}
): Promise<string> {
  const server = SERVER_URL();
  const res = await fetch(`${server}/auth/test-login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.TEST_AUTH_TOKEN
        ? { 'x-test-auth': process.env.TEST_AUTH_TOKEN }
        : {}),
    },
    body: JSON.stringify({
      handle,
      withCharacter: true,
      ...(opts.startLocation ? { startLocation: opts.startLocation } : {}),
      ...(opts.wizard ? { wizard: true } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(
      `wire: /auth/test-login answered ${res.status} at ${server}. ` +
        `Is the server running with AUTH_MODE=test?`
    );
  }
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!cookie) throw new Error('wire: test-login set no session cookie');
  return cookie;
}

export class Session {
  private ws!: WebSocket;
  private readonly proseFrames: string[] = [];

  /** One command in flight per session — correlation is by ORDER (D2). */
  private pendingDispatch: Pending<DispatchResponseEnvelope> | null = null;
  private readonly pendingQueries = new Map<
    string,
    Pending<MqlQueryResultEnvelope>
  >();
  private readonly activity: ActivityUpdateEnvelope[] = [];
  private readonly activityWaiters: (() => void)[] = [];
  private readonly prompts: PromptEnvelope[] = [];
  private readonly promptWaiters: (() => void)[] = [];
  /** Frames seen before anyone asked — the roster arrives unbidden. */
  private readonly identity: AnyFrame[] = [];
  private identityWaiters: (() => void)[] = [];

  private queryCounter = 0;
  private closed = false;
  /** When the socket last carried anything — the prose channel's clock. */
  private lastFrameAt = 0;
  /** Snapshot the in-flight command's prose before the buffer is drained. */
  private captureLast: (() => void) | null = null;

  /** The handle this session logged in as — for failure messages. */
  public handle = '';

  /**
   * Open a session and walk the roster handshake into the world.
   *
   * ⚠ A fresh socket lands on the CHARACTER-SELECT layer, not in the
   * world: `look` there answers "I don't understand 'look'". The roster
   * arrives on a `session.identity` frame and the button the client
   * draws sends `play <playerId>`. This walks the same handshake.
   */
  static async open(
    handle: string,
    opts: { startLocation?: string; wizard?: boolean } = {}
  ): Promise<Session> {
    await assertPacksPresent();
    const cookie = await login(handle, opts);
    const s = new Session();
    s.handle = handle;
    s.ws = new WebSocket(WS_URL(), { headers: { cookie } });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`wire: socket never opened at ${WS_URL()}`)),
        FRAME_TIMEOUT_MS
      );
      s.ws.once('open', () => {
        clearTimeout(timer);
        resolve();
      });
      s.ws.once('error', (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
    s.ws.on('message', (data) => s.receive(String(data)));

    const playerId = await s.awaitRoster();
    await s.enterWorld(playerId);
    s.proseFrames.length = 0;
    return s;
  }

  /**
   * `play <playerId>` — ⚠⚠ **the one send in this harness that cannot be
   * awaited**, and the reason is worth stating because it looks like a
   * bug in everything else.
   *
   * `PlayController` awaits `Login.playCharacter`, which transfers the
   * Interactive to the Avatar and DESTRUCTS the Login — and only then
   * does the dispatch emit its response, on a giver that is gone and
   * whose reader has moved. So the envelope has nowhere to land.
   * Everywhere else "await the next dispatch-response" is exact; here
   * there is nothing to await.
   *
   * So the arrival is PROBED, and the probe has a real success
   * condition rather than a guessed duration: `look` is an unknown verb
   * at the character-select layer and `ok` in the world, so **a `look`
   * that succeeds IS the handoff**. The only clock is the settle below,
   * which waits for the socket to go quiet so the handoff's own frames
   * cannot be mistaken for the probe's answer.
   */
  private async enterWorld(playerId: string): Promise<void> {
    this.ws.send(
      JSON.stringify({ type: 'command', payload: { text: `play ${playerId}` } })
    );
    await this.settle();
    const deadline = Date.now() + FRAME_TIMEOUT_MS;
    for (;;) {
      const look = await this.cmd('look');
      if (look.status === 'ok') return;
      if (Date.now() > deadline) {
        throw new Error(
          `wire: '${this.handle}' never reached the world after ` +
            `play ${playerId} — look still answers ${look.status}. ` +
            `(Is the avatar placeless, or the roster entry stale?)`
        );
      }
      await pause(250);
    }
  }

  /** Wait for the socket to fall quiet, so a probe reads its own answer. */
  private async settle(quietMs = 400, capMs = 15_000): Promise<void> {
    const deadline = Date.now() + capMs;
    for (;;) {
      const since = Date.now() - this.lastFrameAt;
      if (this.lastFrameAt > 0 && since >= quietMs) return;
      if (Date.now() > deadline) return;
      await pause(Math.max(50, quietMs - since));
    }
  }

  /** Route one socket message into the channel that is waiting for it. */
  private receive(raw: string): void {
    this.lastFrameAt = Date.now();
    for (const frame of splitFrames(raw)) {
      const type = typeof frame.type === 'string' ? frame.type : null;
      if (type === 'dispatch-response') {
        const p = this.pendingDispatch;
        this.pendingDispatch = null;
        if (p) {
          clearTimeout(p.timer);
          p.resolve(frame as unknown as DispatchResponseEnvelope);
        }
        continue;
      }
      if (type === 'mql-query-result' || type === 'mql-query-error') {
        const id = typeof frame.queryId === 'string' ? frame.queryId : '';
        const p = this.pendingQueries.get(id);
        if (!p) continue;
        this.pendingQueries.delete(id);
        clearTimeout(p.timer);
        if (type === 'mql-query-error') {
          p.reject(
            new Error(
              `wire: mql-query rejected (${String(frame.reason)})` +
                (frame.detail ? `: ${String(frame.detail)}` : '')
            )
          );
        } else {
          p.resolve(frame as unknown as MqlQueryResultEnvelope);
        }
        continue;
      }
      if (type === 'activity-update') {
        this.activity.push(frame as unknown as ActivityUpdateEnvelope);
        this.drain(this.activityWaiters);
        continue;
      }
      if (type === 'prompt') {
        this.prompts.push(frame as unknown as PromptEnvelope);
        this.drain(this.promptWaiters);
        continue;
      }
      if (type !== null) continue; // some other envelope; not ours

      // A message frame. `shell.diagnostic` is the command ECHO — a
      // drive that greps the raw stream matches its own input and reads
      // as green. Drop only that; `shell.error` and `shell.result` are
      // prose the player reads.
      const topic = typeof frame.topic === 'string' ? frame.topic : '';
      if (topic === 'session.identity') {
        this.identity.push(frame);
        this.drain(this.identityWaiters);
        continue;
      }
      if (topic === 'shell.diagnostic') continue;
      if (typeof frame.body === 'string') this.proseFrames.push(frame.body);
    }
  }

  private drain(waiters: (() => void)[]): void {
    const pending = waiters.splice(0, waiters.length);
    for (const w of pending) w();
  }

  /** Wait for the roster frame and return the first character's id. */
  private async awaitRoster(): Promise<string> {
    const deadline = Date.now() + FRAME_TIMEOUT_MS;
    for (;;) {
      for (const frame of this.identity) {
        const chars = (frame.payload as { characters?: { playerId?: string }[] })
          ?.characters;
        const id = chars?.[0]?.playerId;
        if (id) return id;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `wire: no character on the roster for '${this.handle}' — ` +
            `test-login provisioned none, or char-gen intercepted.`
        );
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 250);
        this.identityWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  /**
   * Type a command and await its dispatch-response.
   *
   * One command in flight per session: the prose buffer is drained
   * before the send, so the frames this returns are this command's.
   *
   * ⚠⚠⚠ **The envelope ends the DISPATCH, not the OUTPUT — and this cost
   * a long diagnosis twice.** `emitDispatchResponse` fires when the
   * command finishes, but a controller's scenes travel to the socket on
   * their own, so a line can arrive after the envelope that reports the
   * outcome. Read the buffer the instant the envelope lands and you get
   * the PREVIOUS command's tail: `fulfill` answered "you drop
   * something", `read board` answered with a movement line, and `bank`
   * answered nothing at all. It looked exactly like an off-by-one in
   * the correlation — it is not; correlation is exact. Prose is simply
   * a second, slower channel.
   *
   * So outcomes stay clock-free (the envelope is exact, and every
   * `expectOk` / `expectNote` uses it) and only `said()` pays a bounded
   * settle. A test that asserts structurally pays nothing at all, which
   * is one more reason to prefer `notes` and `query()`.
   */
  async cmd(text: string): Promise<CommandResult> {
    if (this.pendingDispatch) {
      throw new Error(
        `wire: '${text}' was sent while another command is still in ` +
          `flight on session '${this.handle}'. Correlation is by ORDER, ` +
          `so one command per session at a time — await the previous ` +
          `cmd() first, or open a second session.`
      );
    }
    this.captureLast?.();
    this.captureLast = null;
    this.proseFrames.length = 0;
    const envelope = await new Promise<DispatchResponseEnvelope>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingDispatch = null;
          reject(
            new Error(
              `wire: no dispatch-response for '${text}' within ` +
                `${FRAME_TIMEOUT_MS}ms (session '${this.handle}')`
            )
          );
        }, FRAME_TIMEOUT_MS);
        this.pendingDispatch = { resolve, reject, timer };
        this.ws.send(
          JSON.stringify({ type: 'command', payload: { text } })
        );
      }
    );
    let snapshot: string[] | null = null;
    const capture = (): void => {
      if (snapshot === null) snapshot = this.proseFrames.slice();
    };
    // If the next command starts before anyone reads this one's prose,
    // take what there is rather than losing it to the buffer drain.
    this.captureLast = capture;

    return {
      status: envelope.outcome.status,
      notes: envelope.outcome.notes.filter((n) => n.kind !== 'prompt-refresh'),
      text,
      said: async () => {
        countProseRead();
        if (snapshot === null) {
          await this.settle(200, 4_000);
          capture();
        }
        return plain((snapshot ?? []).join('\n'));
      },
    };
  }

  /**
   * Run a command and read its PROSE. A counted call — the census in
   * the run report is how the residue stays visible (D1).
   */
  async prose(text: string): Promise<string> {
    const result = await this.cmd(text);
    return await result.said();
  }

  /**
   * The structured state read: one-shot MQL, projected over the same
   * `subscribableFields` descriptors the card surface renders, resolved
   * as this player.
   *
   * ⚠ `fields` names PROJECTED fields, not arbitrary properties — a
   * field no descriptor declares comes back absent, not as an error.
   * That absence is a card-surface finding, never a reason to add a
   * descriptor from a test.
   */
  async query(
    query: string,
    opts: {
      cardinality?: 'one' | 'many';
      fields?: string[] | 'ref' | 'detail';
      detailKey?: string;
    } = {}
  ): Promise<QueryRecord[]> {
    const queryId = `wire-${++this.queryCounter}-${Date.now().toString(36)}`;
    const envelope = await new Promise<MqlQueryResultEnvelope>(
      (resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingQueries.delete(queryId);
          reject(
            new Error(
              `wire: no mql-query answer for '${query}' within ` +
                `${FRAME_TIMEOUT_MS}ms`
            )
          );
        }, FRAME_TIMEOUT_MS);
        this.pendingQueries.set(queryId, { resolve, reject, timer });
        this.ws.send(
          JSON.stringify({
            type: 'mql-query',
            payload: {
              type: 'mql-query',
              queryId,
              query,
              cardinality: opts.cardinality ?? 'many',
              ...(opts.fields ? { fields: opts.fields } : {}),
              ...(opts.detailKey ? { detailKey: opts.detailKey } : {}),
            },
          })
        );
      }
    );
    return envelope.result;
  }

  /** `query(..., cardinality: 'one')` — the record, or null. */
  async queryOne(
    query: string,
    fields?: string[] | 'ref' | 'detail'
  ): Promise<QueryRecord | null> {
    const rows = await this.query(query, { cardinality: 'one', ...(fields ? { fields } : {}) });
    return rows[0] ?? null;
  }

  /**
   * Await an engagement's own completion frame.
   *
   * An engagement outlives its dispatch — the command returns `ok` with
   * an `engagement-started` note carrying the id, and the outcome lands
   * later on the activity channel. This is how a wire test waits out a
   * durative act without knowing its duration.
   */
  async awaitActivity(
    engagementId: string,
    timeoutMs = FRAME_TIMEOUT_MS
  ): Promise<Note[]> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      for (const env of this.activity) {
        if (env.engagementId !== engagementId) continue;
        const done = env.outcome.notes.find(
          (n) =>
            n.kind === 'engagement-completed' || n.kind === 'engagement-cancelled'
        );
        if (done) return env.outcome.notes;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `wire: engagement ${engagementId} never completed within ${timeoutMs}ms`
        );
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 250);
        this.activityWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  /** The prompt the world is waiting on, if any has arrived. */
  async awaitPrompt(timeoutMs = FRAME_TIMEOUT_MS): Promise<PromptEnvelope> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const next = this.prompts.shift();
      if (next) return next;
      if (Date.now() > deadline) {
        throw new Error(`wire: no prompt arrived within ${timeoutMs}ms`);
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 250);
        this.promptWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  /** Answer an open prompt the way the client's control would. */
  answerPrompt(promptId: string, response: unknown): void {
    this.ws.send(
      JSON.stringify({
        type: 'prompt-response',
        payload: { promptId, response },
      })
    );
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ws.close();
  }
}

/** The harness's only sleep, used where a frame cannot be awaited. */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A handle nothing else in the run will collide with. */
export function uniqueHandle(prefix: string): string {
  return `wire-${prefix}-${Date.now().toString(36)}-${Math.floor(
    Math.random() * 1e4
  ).toString(36)}`;
}
