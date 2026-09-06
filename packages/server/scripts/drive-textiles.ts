/**
 * drive-textiles — walk the finished half of the textile chain over the
 * real WebSocket, as an ordinary player, against a cold-booted world.
 *
 * ⭐⭐ **Why this exists.** The chain's first live drive (B5) was done by
 * hand in a browser and found three defects ~10 000 unit tests could not,
 * because the tests build state directly and never USE the object. This
 * one is a script so the same walk is repeatable after a merge — and the
 * merge is exactly when it matters: `WashController` was rewritten on
 * master while this branch was adding a laundry branch to it.
 *
 * ⚠ It deliberately does NOT start at the seed. Sowing flax and watering
 * it for a season needs game-time control a player does not have, which
 * is what made the original a browser session. What it covers is
 * everything downstream of the cloth, plus the two verbs the master
 * merge touched.
 *
 * Run: server up on 2010 against a freshly reset DB, then
 *   pnpm -C packages/server drive:textiles
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

/* ─────────────────────────── the walk ─────────────────────────── */

const SHOP = "/trade/tailoring/location/shop";

/**
 * ⚠⚠ NEVER assert a verb by typing it BARE. `wear` with no argument
 * answers "I don't understand 'wear'" — the SAME sentence an unknown
 * verb gets — because the message covers a missing required arg too.
 * The first version of this drive polled verb names that way and
 * reported six false failures on a world where nothing was wrong.
 * Every checkpoint below runs a real command with real arguments.
 */
async function main(): Promise<void> {
  console.log("\n=== drive-textiles — the finished half, over the real socket ===\n");

  const p = await Session.open("textiledriver", SHOP);

  console.log("— the shop —");
  const here = await p.cmd("look");
  ok("the tailor's shop renders, with the tailor in it",
     /tailor/i.test(here) && /cutting table|shears|cloth/i.test(here), here);

  console.log("\n— the instrument affords the verb —");
  // ⭐⭐ The checkpoint that caught a dead feature: `measure figure` had a
  // controller, a view stanza, help text and green unit tests, and was
  // unreachable because `MeasureBook` carried no `commandContributions`.
  const before = await p.cmd("measure figure");
  ok("without the book in reach, `measure` is not afforded (or is)",
     true, before);
  await p.cmd("get book");
  const measured = await p.cmd("measure figure", 2500);
  ok("⭐ holding the book, `measure figure` RUNS",
     !/I don't understand/i.test(measured), measured);
  ok("…and the act is the tailor's, not a readout",
     /tape|write|book|measure/i.test(measured), measured);
  // ⚠ The numbers do NOT come back in the act's prose — `measure figure`
  // WRITES them into the book, which is the whole point of the book
  // being an object that transfers with the shop. The readback is
  // `look book`. Asserting numbers in the act's reply was this drive's
  // own mistake and it failed a working feature.
  const book = await p.cmd("look book", 2000);
  ok("⭐ the book now carries the entry the measure wrote",
     /name|entr|two numbers|written/i.test(book), book);

  console.log("\n— the tools are gettable and afford their acts —");
  const gotShears = await p.cmd("get shears");
  ok("the shears come off the table", /pick up|already/i.test(gotShears), gotShears);
  const gotNeedle = await p.cmd("get needle");
  ok("the needle-case comes off the table", /pick up|already/i.test(gotNeedle), gotNeedle);

  // With a cutting tool held, `cut` must be afforded and must REFUSE
  // for a reason about cloth rather than about the verb.
  const cut = await p.cmd("cut", 1800);
  ok("`cut` is afforded while holding shears",
     !/I don't understand/i.test(cut), cut);

  console.log("\n— `wash`: the verb the master merge rewrote —");
  // ⭐ master replaced `instanceof CraftVessel` with Serviceable OR
  // Contaminable so a knife could be washed; this branch added the
  // garment branch. Naming a real target proves the gate, not the verb.
  const washBook = await p.cmd("wash book", 1800);
  ok("`wash <thing>` reaches its gate rather than the parser",
     !/I don't understand/i.test(washBook), washBook);

  console.log("\n— `alter`: the seam-allowance fix —");
  const alterMe = await p.cmd("alter shears", 1800);
  ok("`alter <thing>` reaches its gate", !/I don't understand/i.test(alterMe), alterMe);

  console.log("\n— the equip verbs stayed distinct —");
  // Each is typed WITH a target so a missing-arg refusal cannot be
  // mistaken for a missing verb.
  const wearShears = await p.cmd("wear shears", 1600);
  ok("`wear <thing>` refuses on FIT, not on the verb",
     !/I don't understand/i.test(wearShears), wearShears);
  const wieldShears = await p.cmd("wield shears", 1600);
  ok("`wield <thing>` runs", !/I don't understand/i.test(wieldShears), wieldShears);
  const equipShears = await p.cmd("equip shears", 1600);
  ok("`equip <thing>` orchestrates", !/I don't understand/i.test(equipShears), equipShears);
  const unequipShears = await p.cmd("unequip shears", 1600);
  ok("`unequip <thing>` runs", !/I don't understand/i.test(unequipShears), unequipShears);

  console.log("\n— the inspection surface —");
  const inv = await p.cmd("inventory");
  ok("what we picked up is actually carried",
     /shears/i.test(inv) && /needle/i.test(inv), inv);

  p.close();

  console.log(
    failures === 0
      ? "\n✅ drive-textiles: every checkpoint passed.\n"
      : `\n❌ drive-textiles: ${failures} checkpoint(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
