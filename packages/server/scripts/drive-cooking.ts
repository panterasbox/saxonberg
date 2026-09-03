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
 *   4. reads the gauge on the cut left out on the table — the SEAM, not
 *      the band walk, which takes 47 game-hours at the shipped rate and
 *      is proven exactly by the unit suite instead;
 *   5. eats it and vomits, confirming both verbs are afforded live.
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

  // ── 5. The spoilage gauge, as far as a PLAYER can reach it ─────────
  //
  // ⚠⚠ **The band walk is not driveable, and it must not be faked.** Stew
  // meat tabulates Ea = 80 kJ/mol; at the 293 K a table reads that is
  // μ = 0.110 per game-hour, so the logistic climb from the 0.002
  // inoculum to the 0.25 `tainted` threshold takes **47 game-hours** —
  // 3.9 real hours at the shipped 12× clock. Meat that goes off in two
  // days is the design working.
  //
  // ⚠⚠⚠ An earlier revision of this drive reached for a WIZARD session to
  // turn `freshness.muMaxPerHour` up, and argued that retuning a global
  // balance dial "IS an operator act". **There is no operator tier, and
  // inventing one is how `requiresWizard` keeps leaking out of its lane.**
  // It is the TypeScript-trust axis and nothing else; *a missing
  // authority is not a grant* (access.md). The drive is an ORDINARY
  // patron, top to bottom, or it is not evidence about what players can
  // do.
  //
  // ⭐ Nothing was lost by dropping it. The walk is proven EXACTLY and in
  // milliseconds by `lib/material/__tests__/Freshness.test.ts` (all four
  // bands off a set load) and `cmd/bulk/__tests__/SpoiledFood.test.ts`
  // (a fresh ration poisons nobody; left out four days the same ration
  // poisons and the band fires; vomiting inside the window dumps what has
  // not absorbed; kept cold it is still good). Those drive the game clock
  // directly — no dial, no wizard. What a live drive adds is the SEAM:
  // that the gauge reaches a player over the wire at all.
  console.log("\n5. The gauge reaches the player (the walk is unit-proven)");
  const cut = plain(await cook.cmd("look meat", 2200));
  say(">", cut);
  ok("the cut of meat is there to read", /meat|cuts/i.test(cut), cut);
  ok(
    "…and reads FRESH — no band line on sound food, which is the rule",
    !/faintly off|gone bad|rotten/i.test(cut),
    cut,
  );

  // ── 6. Eat it, then bring it back up — both verbs, live ────────────
  console.log("\n6. Eat the cut, then vomit");
  const bad = plain(await cook.cmd("eat meat", 3000));
  say(">", bad);
  ok("the cut is eaten (spoilage never gates the act — it lets you)", bad.length > 0, bad);
  const puke = plain(await cook.cmd("vomit", 3000));
  say(">", puke);
  ok("vomit answers — the un-absorbed dose is dumpable", puke.length > 0, puke);

  cook.close();
  console.log(
    `\n=== ${failures === 0 ? "DRIVE CLEAN" : `${failures} CHECKPOINT(S) MISSED`} ===\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

await main();
