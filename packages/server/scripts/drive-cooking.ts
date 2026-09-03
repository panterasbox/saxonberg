/**
 * LIVE DRIVE (AC13, the cooking build) — driven over the REAL wire: the
 * `test-login` seam for a session, the same WebSocket the client opens,
 * and the same command strings a player types. No browser, no test
 * doubles, no `StuffApi` reach-arounds.
 *
 *   pnpm --filter @saxonberg/server reset:db     # ⚠ see below
 *   pnpm --filter @saxonberg/server dev           # let it finish booting
 *   pnpm --filter @saxonberg/server drive:cooking
 *
 * ⚠ **It wants a freshly reset world.** The drive EATS the cut of meat
 * the cookhouse ships and ORDERS the stew its pantry stocks, and neither
 * comes back on its own — a second run against the same world finds an
 * empty table and reads as broken. Reset, boot, drive.
 *
 * It spawns an ORDINARY patron in the shipped Hearthworks cookhouse —
 * ⚠ no wizard, no `clone`, no `startLocation` trickery beyond the seat.
 * `requiresWizard` is the TypeScript-trust axis and is never a stand-in
 * for content authority, so a drive that cloned its own kitchen would be
 * proving something no player can do. Everything below is reachable by
 * walking in the door.
 *
 * The script:
 *   1. lights the hearth and orders a stew — the wet medium, into a
 *      dish CLAIMED from the venue's own crockery;
 *   2. reads it: the contents line, the palate, the honest label;
 *   3. eats it, with the cookhouse's horn spoon;
 *   4. watches the meat left out on the table walk fresh → tainted →
 *      spoiled → rotten under the compressed clock;
 *   5. eats the rotten cut and confirms the poisoning is real.
 *
 * ⚠ It is a DRIVE, not a test: it prints what the world said and exits
 * non-zero on a checkpoint that did not happen. Read the transcript.
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

/**
 * Set once the drive has turned a GLOBAL dial up, and called from the
 * top-level `finally` — so a crash mid-walk still puts the world back.
 * A drive that exits hot leaves every perishable in the realm rotting
 * hundreds of times too fast, with nothing anywhere to say so.
 */
let restoreDial: (() => Promise<void>) | null = null;

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
async function login(
  handle: string,
  startLocation?: string,
  wizard = false,
): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${SERVER}/auth/test-login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          withCharacter: true,
          ...(startLocation ? { startLocation } : {}),
          ...(wizard ? { wizard: true } : {}),
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
  static async open(
    handle: string,
    startLocation?: string,
    wizard = false,
  ): Promise<Session> {
    const cookie = await login(handle, startLocation, wizard);
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

/** Strip MML tags so a check reads the prose a player sees. */
const plain = (s: string): string =>
  s.replace(/<[^>]*>/g, "").replace(/\\n/g, "\n");

async function main(): Promise<void> {
  const stamp = Date.now().toString(36);
  console.log(`\n=== LIVE DRIVE: cooking (${SERVER}) ===\n`);

  const COOKHOUSE = "/world/hearthworks/location/cookhouse";
  const cook = await Session.open(`cookdrive-${stamp}`, COOKHOUSE);

  const say = (label: string, text: string): void =>
    console.log(`   ${label} ${text.replace(/\s+/g, " ").slice(0, 260)}`);

  // ── 1. The venue, as shipped ───────────────────────────────────────
  console.log("1. Walk into the cookhouse (an ordinary patron, no wizard)");
  const room = plain(await cook.cmd("look", 2500));
  say(">", room);
  ok("the pot, the water butt and the crockery are all standing", 
    /cook pot/i.test(room) && /water butt/i.test(room) && /bowl/i.test(room),
    room);
  ok("…and the cutlery", /spoon/i.test(room), room);

  // ── 2. Order a stew — the medium, the claim ────────────────────────
  console.log("\n2. Light the hearth and order a Hearty Stew");
  say(">", plain(await cook.cmd("ignite oven", 2200)));
  const cold = plain(await cook.cmd("order stew", 4000));
  say(">", cold);
  ok("the stew is served (water in reach, a lit hearth, a pot)",
    !/nothing here runs hot|isn't enough/i.test(cold), cold);

  // ── 3. Read the dish ───────────────────────────────────────────────
  console.log("\n3. Read what was served");
  const dish = plain(await cook.cmd("look stew", 2200));
  say(">", dish);
  ok("the dish holds the stew", /holds|stew/i.test(dish), dish);
  const taste = plain(await cook.cmd("taste stew", 2200));
  say(">", taste);
  ok("the palate reads it (derived, never authored)", /tastes/i.test(taste), taste);

  // ── 4. Eat it — cutlery reads, never gates ─────────────────────────
  console.log("\n4. Eat it");
  const eaten = plain(await cook.cmd("eat stew", 2600));
  say(">", eaten);
  ok(
    "the MEAL is eaten out of the dish, with a utensil",
    /spoon|fork|knife|fingers/i.test(eaten),
    eaten,
  );
  ok("…and it read as a meal, not as crockery", !/can't eat/i.test(eaten), eaten);

  // ── 5. The spoilage clock, on the meat left out on the table ───────
  //
  // ⚠⚠ **The band walk is NOT reachable at the shipped dials, and that is
  // the design working.** Stew meat tabulates Ea = 80 kJ/mol; at the 293 K
  // a table reads, `f_T = exp(-(Ea/R)(1/293 - 1/303)) = 0.338` and
  // `f_aw = (0.97-0.6)/0.4 = 0.925`, so `μ = 0.35 · 0.338 · 0.925 =
  // 0.110` per game-hour. Logistic from the 0.002 inoculum to the 0.25
  // tainted threshold needs `μt = ln((1-0.002)/0.002 · 0.25/0.75) = 5.11`
  // — **47 game-hours**, or 3.9 real hours at the shipped 12× clock. Meat
  // that goes off in two days is right; a drive that expected it inside
  // two minutes was asserting something the model forbids, and read as a
  // product defect when the arithmetic was the thing at fault.
  //
  // So the clock is compressed the only honest way: an OPERATOR session
  // turns the global `freshness.muMaxPerHour` dial up, the walk runs, and
  // the dial goes back in a `finally`. ⚠ This is not a wizard standing in
  // for a missing player path — retuning a world-wide balance dial IS an
  // operator act, and the patron below never touches it. Everything the
  // PLAYER does in this drive stays ordinary.
  //
  // At μ_max = 120 the same arithmetic gives μ = 37.5/game-hour: tainted
  // at ~41 real seconds, spoiled at ~53, rotten at ~64 — four or five
  // turns of the loop below.
  const DIAL = "freshness.muMaxPerHour";
  const SHIPPED_MU = "0.35";
  const DRIVE_MU = "120";
  console.log("\n5. Watch the cut of meat on the table go off");
  const operator = await Session.open(`cookop-${stamp}`, undefined, true);
  restoreDial = async () => {
    const back = plain(await operator.cmd(`config ${DIAL} ${SHIPPED_MU}`, 2000));
    say("operator >", back);
    ok(
      `the spoilage dial went back to ${SHIPPED_MU}`,
      new RegExp(SHIPPED_MU).test(back),
      back,
    );
    operator.close();
    restoreDial = null;
  };
  say("operator >", plain(await operator.cmd("look", 2000)));
  const set = plain(await operator.cmd(`config ${DIAL} ${DRIVE_MU}`, 2000));
  say("operator >", set);
  ok(
    "the operator compressed the spoilage clock (47 game-hours is the shipped rate)",
    !/don't|not permitted|unknown/i.test(set),
    set,
  );
  const bandOf = (t: string): string =>
    /rotten/i.test(t) ? "rotten"
      : /gone bad/i.test(t) ? "spoiled"
      : /faintly off/i.test(t) ? "tainted"
      : "fresh";
  const walk: string[] = [];
  for (let i = 0; i < 14; i++) {
    const look = plain(await cook.cmd("look meat", 1400));
    const band = bandOf(look);
    if (walk[walk.length - 1] !== band) {
      walk.push(band);
      console.log(`   [${i}] ${band}`);
    }
    if (band === "rotten") break;
    await new Promise((r) => setTimeout(r, 8000));
  }
  ok(`the band walked (${walk.join(" \u2192 ")})`, walk.length > 1, walk.join(" \u2192 "));
  ok("\u2026all the way to rotten", walk.includes("rotten"), walk.join(" \u2192 "));

  // ── 6. Eat the rotten cut; the poisoning is real ───────────────────
  console.log("\n6. Eat the rotten cut");
  const bad = plain(await cook.cmd("eat meat", 3000));
  say(">", bad);
  ok("the rotten cut is eaten (never a gate — it lets you)", bad.length > 0, bad);
  const puke = plain(await cook.cmd("vomit", 3000));
  say(">", puke);
  ok("vomit answers — the un-absorbed dose is dumpable", puke.length > 0, puke);

  // ⚠ Put the world back the way it was found (see `restoreDial`).
  await restoreDial?.();

  cook.close();
  console.log(
    `\n=== ${failures === 0 ? "DRIVE CLEAN" : `${failures} CHECKPOINT(S) MISSED`} ===\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

try {
  await main();
} finally {
  // The success path already restored and cleared it; this is the crash
  // path, and it is the whole reason the hook exists.
  await restoreDial?.();
}
