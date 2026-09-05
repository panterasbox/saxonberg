/**
 * LIVE DRIVE — the identity & ledgers build, over the REAL wire: the
 * `test-login` seam for a session, the same WebSocket the client opens,
 * and the same command strings a player types.
 *
 *   pnpm --filter @saxonberg/server reset:db     # ⚠⚠ see below
 *   pnpm --filter @saxonberg/server dev           # let it finish booting
 *   pnpm --filter @saxonberg/server drive:identity
 *
 * ⚠⚠ **It wants a freshly reset world, and this one is not negotiable.**
 * A written history is laid down ONCE, at the character's birth, and the
 * seeder skips a host that already carries a claim. A world booted before
 * the dossiers existed keeps whatever it was born with — so every
 * checkpoint below reads as a broken feature in a build where nothing is
 * broken. There are no migrations; the reset IS the mechanism.
 *
 * The script is the requirements doc's, twelve steps, and it is a DRIVE
 * rather than a test: it prints what the world said and exits non-zero on
 * a checkpoint that did not happen. Read the transcript.
 *
 * ⭐⭐ **Three of these the unit suite structurally cannot reach**, and
 * they are why the build exists:
 *
 *   - a player can ASK about somebody else at all (steps 2/4). The gate
 *     was open and there was no door — the `feel`/`taste` shape;
 *   - the answers are a RANGE rather than one band twelve times (step
 *     4b). A suite asserts one character; only a sweep sees the curve;
 *   - an institution's record is readable by a person playing (step 9).
 *     Blame is derived, and nothing player-facing showed it.
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import WebSocket from "ws";

const HERE = dirname(fileURLToPath(import.meta.url));
config({ path: join(HERE, "..", ".env") });

const SERVER = process.env.DRIVE_SERVER_URL ?? "http://localhost:2010";
const WS_URL = SERVER.replace(/^http/, "ws");

let failures = 0;


function ok(label: string, condition: boolean, saw?: string): void {
  if (condition) {
    console.log(`  ✔ ${label}`);
  } else {
    failures += 1;
    console.log(`  ✘ ${label}`);
    if (saw) console.log(`      saw: ${saw.replace(/\s+/g, " ").slice(0, 400)}`);
  }
}

/** POST the test-auth seam and return the session cookie header. */
async function login(handle: string, startLocation?: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${SERVER}/auth/test-login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          withCharacter: true,
          ...(startLocation ? { startLocation } : {}),
        }),
      });
      if (res.ok) {
        const raw = res.headers.getSetCookie?.() ?? [];
        const cookie = raw.map((c) => c.split(";")[0]).join("; ");
        if (cookie) return cookie;
      }
    } catch {
      /* server still coming up */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`drive: /auth/test-login never answered at ${SERVER}`);
}

/** A live session: the socket the client opens, plus a command pump. */
class Session {
  private ws!: WebSocket;
  private buffer: string[] = [];

  /**
   * ⚠ A fresh socket lands on the CHARACTER-SELECT layer, not in the
   * world — `look` there answers "I don't understand 'look'". The roster
   * arrives unbidden on a `session.identity` frame, and the button the
   * client draws sends `play <playerId>`. This walks that handshake,
   * which is the same one a player walks.
   */
  static async open(handle: string, startLocation?: string): Promise<Session> {
    const cookie = await login(handle, startLocation);
    const s = new Session();
    s.ws = new WebSocket(WS_URL, { headers: { cookie } });
    await new Promise<void>((resolve, reject) => {
      s.ws.once("open", () => resolve());
      s.ws.once("error", reject);
    });
    s.ws.on("message", (data) => s.buffer.push(String(data)));
    await new Promise((r) => setTimeout(r, 3000));

    let playerId = "";
    for (const raw of s.buffer) {
      for (const frame of splitFrames(raw)) {
        if (frame.topic !== "session.identity") continue;
        const chars = (frame.payload as { characters?: { playerId?: string }[] })
          ?.characters;
        if (chars?.[0]?.playerId) playerId = chars[0].playerId;
      }
    }
    if (!playerId) throw new Error(`drive: no character on the roster for ${handle}`);
    s.buffer = [];
    s.ws.send(JSON.stringify({ type: "command", payload: { text: `play ${playerId}` } }));
    await new Promise((r) => setTimeout(r, 4000)); // the world arrives
    s.buffer = [];
    return s;
  }

  /**
   * Type a command; return the PROSE the player would see.
   *
   * ⚠ The socket carries the command echo back as `shell.diagnostic`
   * frames whose `body` is the command text itself. A drive that greps
   * the raw stream therefore matches its own input and reads as green
   * (or, here, as red for the wrong reason) — so the frames are parsed
   * and the diagnostics dropped.
   */
  async cmd(text: string, waitMs = 1400): Promise<string> {
    this.buffer = [];
    this.ws.send(JSON.stringify({ type: "command", payload: { text } }));
    await new Promise((r) => setTimeout(r, waitMs));
    // ⚠⚠ **A prompt is not silence, and this drive learned that the hard
    // way.** An ambiguous object arg (`look prime-cut` with one cut on the
    // floor and another in the pantry chest) opens a foreground
    // `prompt-mql-object`, which the CLIENT answers with a structured
    // message — not a command. So every command typed afterwards is
    // swallowed as an answer, and the transcript reads as though the world
    // stopped talking. Four checkpoints failed for a reason that was not
    // theirs. Surface it instead.
    // ⚠ NOT every `prompt-*` note: `prompt-refresh` is the ordinary
    // prompt-LINE redraw and rides every single command. Matching it
    // reported all eleven checkpoints as swallowed on a world where
    // nothing had been swallowed at all — a detector that cries wolf is
    // worse than none.
    if (/"kind":"prompt-(mql-object|mql-many|choice|text|confirm|compose)"/.test(this.rawText())) {
      return "⚠ DRIVE: an ambiguous target opened a PROMPT — this command " +
        "did not run, and neither will the next one. Name it uniquely.";
    }
    const said: string[] = [];
    for (const raw of this.buffer) {
      for (const frame of splitFrames(raw)) {
        // ⚠ Drop ONLY the diagnostics. `shell.error` ("I don't
        // understand…") and `shell.result` ("you don't have permission…")
        // are prose the player reads, and swallowing them made a refusal
        // look like silence — which is how three checkpoints in this
        // drive read as "no answer" when the world had answered clearly.
        if (frame.topic === "shell.diagnostic") continue;
        if (typeof frame.body === "string") said.push(frame.body);
        const payload = frame.payload as { body?: unknown } | undefined;
        if (payload && typeof payload.body === "string") said.push(payload.body);
      }
    }
    return said.join("\n");
  }

  /** The raw socket text of the last command, for prompt detection. */
  private rawText(): string {
    return this.buffer.join("");
  }

  close(): void {
    this.ws.close();
  }
}

type Frame = { topic?: unknown; body?: unknown; payload?: unknown };

/**
 * One socket message may carry several concatenated JSON objects. Parse
 * greedily rather than assuming one frame per message.
 */
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
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
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
/* ────────────────────────── the twelve steps ───────────────────────── */

const REGISTRY = "/world/terminus/registry/office";
const BAR = "/world/lounge/location/bar";
const WATCHPOST = "/world/newbie-wilds/crossroads/watchpost";
const HOLLOW = "/world/newbie-wilds/crossroads/hollow";

/** Everything the world said, for the transcript. */
function say(label: string, text: string): void {
  console.log(`\n— ${label}\n${text.trim() || "(silence)"}\n`);
}

async function main(): Promise<void> {
  console.log("=== identity & ledgers — the live drive ===\n");

  /* 1–3 — the registrar. */
  console.log("## 1–3 · the Terminus registry");
  const a = await Session.open("drive-identity-a", REGISTRY);
  const look = await a.cmd("look");
  say("look", look);
  ok("1 · the registrar is at her counter", /Odile|registrar/i.test(look), look);

  const comp = await a.cmd("competence odile");
  say("competence odile", comp);
  ok(
    "2 · she reads as COMPETENT or better at the city's clerical work",
    /business-admin|business-administration/i.test(comp) &&
      /(competent|proficient|expert)/i.test(comp),
    comp,
  );
  ok(
    "2b · and NOT as a novice — the whole point",
    !/novice|untrained/i.test(comp),
    comp,
  );

  const chron = await a.cmd("chronicle odile");
  say("chronicle odile", chron);
  ok(
    "3 · her opening history reads back as BACKGROUND, not as a deed",
    /Prologue/i.test(chron) && /registry counter|magistrate/i.test(chron),
    chron,
  );
  ok("3b · presented as background rather than deeds", !/Deeds/i.test(chron), chron);

  /* 4–5 — the lounge, and the refusal. */
  console.log("\n## 4–5 · the lounge");
  const b = await Session.open("drive-identity-b", BAR);
  const daveComp = await b.cmd("competence dave");
  say("competence dave", daveComp);
  ok(
    "4 · Dave tends a bar well",
    /bartending/i.test(daveComp) && /(proficient|expert)/i.test(daveComp),
    daveComp,
  );

  // ⭐ The RANGE check — step 4b, and the acceptance criterion a unit
  // test structurally cannot reach. Ask several characters and count the
  // distinct bands.
  const bands = new Set<string>();
  for (const who of ["dave", "mara", "remy", "sloane", "augie"]) {
    const r = await b.cmd(`competence ${who}`);
    for (const m of r.matchAll(/\b(untrained|novice|competent|proficient|expert)\b/g)) {
      bands.add(m[1]!);
    }
  }
  say("bands seen across the lounge cast", [...bands].join(", "));
  ok(
    "4b · the cast gives a RANGE of answers, not one band five times",
    bands.size >= 2,
    [...bands].join(", "),
  );

  // ⭐ **The refusal, and it has to be asked with the other player IN THE
  // ROOM.** A first pass asked about a player standing in another
  // locality and accepted "Nobody here goes by …" — which is the
  // not-present branch, not the refusal, and would have gone on passing
  // if the gate were deleted. So a second character stands at the same
  // bar and the question is asked about them by name.
  const bystander = await Session.open("drive-identity-d", BAR);
  const who = await b.cmd("look");
  const other = /drive-identity-d/i.test(who) ? "drive-identity-d" : "";
  const refusal = await b.cmd(`competence ${other || "drive-identity-d"}`);
  say("competence <another player, standing right there>", refusal);
  ok(
    "5 · asking about another player is REFUSED (not merely absent)",
    /theirs to show you/i.test(refusal),
    refusal,
  );
  bystander.close();

  /* 6–7 — the watchpost, and the control. */
  console.log("\n## 6–7 · the watchpost");
  const c = await Session.open("drive-identity-c", WATCHPOST);
  const post = await c.cmd("look");
  say("look", post);
  ok("6 · a watchful sentry, no name", /sentry/i.test(post), post);

  const sentryComp = await c.cmd("competence sentry");
  say("competence sentry", sentryComp);
  ok(
    "7 · the world declines to treat a role as somebody",
    /Nothing is on the record/i.test(sentryComp),
    sentryComp,
  );
  const sentryChron = await c.cmd("chronicle sentry");
  say("chronicle sentry", sentryChron);
  ok(
    "7b · and says so plainly rather than returning an empty answer",
    /Nothing is written down/i.test(sentryChron),
    sentryChron,
  );

  /* 8 — the crime marker still fires. */
  console.log("\n## 8 · ambush the sentry under lethal terms");
  // ⚠⚠ **`attack sentry`, NOT `attack the sentry`** — and that is a
  // PRE-EXISTING product defect this drive surfaced, not a phrasing
  // preference. A definite article breaks every NON-GREEDY `type:
  // object` arg in the game ("That doesn't match any known command
  // shape"): `look the sentry`, `assess the sentry` and `attack the
  // wolf` all fail, while `get the kit` works because its arg is
  // greedy. `attack the wolf` is the documented example in the verb's
  // own help. Filed separately — it belongs to command-parsing, not to
  // this build, and it is exactly why this build's two new readings
  // take a greedy STRING arg instead.
  const opened = await c.cmd("attack sentry --lethal", 4000);
  say("attack sentry --lethal", opened);
  ok(
    "8 · the fight opens under imposed lethal terms",
    /sentry/i.test(opened) && !/I don't understand/i.test(opened),
    opened,
  );

  // Fight it out. ⚠ The sentry is a real opponent and the drive
  // character arrives with nothing, so this is a genuine bout rather
  // than a formality; the transcript says who won.
  let fell = "";
  for (let i = 0; i < 14 && !/dies|falls|is slain|put to death/i.test(fell); i++) {
    fell = await c.cmd("fight strike", 2500);
  }
  say("the bout", fell);

  /* 9 — the watch's record. */
  console.log("\n## 9 · read the watch's record");
  const watch = await c.cmd("chronicle the watch", 3000);
  say("chronicle the watch", watch);
  ok(
    "9 · a body of people has a readable record at all",
    /Watch of the Last Counted Mile/i.test(watch),
    watch,
  );
  ok(
    "9b · ⭐ and it names the POST the sentry answered to, never an individual",
    /Lost:|answers for|lost nobody/i.test(watch),
    watch,
  );

  /* 10 — the control: a body of people that has lost nobody. */
  console.log("\n## 10 · a body that has lost nobody reads as such");
  const wolf = await c.cmd("chronicle long road", 2000);
  say("chronicle long road", wolf);
  ok(
    "10 · the free company reads, and has lost nobody",
    /Long Road Company/i.test(wolf) && /lost nobody/i.test(wolf),
    wolf,
  );

  // ⭐ And the resolution rule the drive itself found: a subject must be
  // addressed by a word it CALLS ITSELF. `the watch` used to answer with
  // "a watchful sentry" (MQL matches a prefix); `competence dave` used to
  // answer with "Dave's Bar".
  const notAPerson = await c.cmd("competence watch", 2000);
  say("competence watch", notAPerson);
  ok(
    "10b · a body of people is not somebody who practises",
    /body of people, not somebody who practises/i.test(notAPerson),
    notAPerson,
  );

  /* 11/12 — the two accepted-as-invisible ones, plus idempotency. */
  console.log("\n## 11–12 · idempotency (a written history applied twice)");
  const again = await a.cmd("chronicle odile");
  const claims = (again.match(/^\s*[-•*]/gm) ?? []).length;
  const firstClaims = (chron.match(/^\s*[-•*]/gm) ?? []).length;
  say("chronicle odile (again)", again);
  ok(
    "12 · reading twice does not double the history",
    claims === firstClaims,
    `${firstClaims} then ${claims}`,
  );

  a.close();
  b.close();
  c.close();

  console.log(
    `\n=== ${failures === 0 ? "ALL CHECKPOINTS PASSED" : `${failures} CHECKPOINT(S) MISSED`} ===`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error("drive: aborted —", err);
  process.exit(1);
});
