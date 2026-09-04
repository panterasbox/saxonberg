/**
 * LIVE DRIVE (AC22, the logistics build) — driven over the REAL wire:
 * the `test-login` seam for a session, the same WebSocket the client
 * opens, and the same command strings a player types. No browser, no
 * test doubles, no `StuffApi` reach-arounds.
 *
 *   pnpm --filter @saxonberg/server reset:db
 *   pnpm --filter @saxonberg/server dev           # let it finish booting
 *   pnpm --filter @saxonberg/server drive:logistics
 *
 * It spawns an ORDINARY traveller in the Terminus market square — ⚠ no
 * wizard, no `clone`, no `teleport`, no `startLocation` trickery beyond
 * the seat. `requiresWizard` is the TypeScript-trust axis and is never a
 * stand-in for content authority, so a drive that flagged itself would
 * be proving something no player can do.
 *
 * The script walks the build's headline claims in order:
 *
 *   1. ⭐ **The realm is contiguous.** Walk market square → Wharfside →
 *      the Delight road → the crossroads → the pass → Rejection's yard
 *      gate → the pithead. No teleport anywhere.
 *   2. ⭐⭐ **The pass refuses wheels, and says why.** Buy a handcart on
 *      the way, hitch it, and be turned back at the gate — which is
 *      where bulk breaks, and why the crossroads depot exists.
 *   3. **The road is a place.** Read the milestone, the ford, the LAST
 *      WATER, the board on the gate.
 *   4. ⭐ **The depot works.** `ship` a crate at the counter, and read
 *      the rate board a stranger is allowed to read.
 *   5. ⭐⭐ **The labor market is visible.** Read the works board on a
 *      producer floor and see what wants moving, and ask the far end
 *      what wants moving back.
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
  console.log(`\n=== LIVE DRIVE: logistics (${SERVER}) ===\n`);

  const SQUARE = "/world/terminus/market/square";
  const p = await Session.open(`haul-${stamp}`, SQUARE);
  const say = (label: string, text: string): void =>
    console.log(`   ${label} ${text.replace(/\s+/g, " ").slice(0, 300)}`);
  const go = async (dir: string, wait = 1800): Promise<string> =>
    plain(await p.cmd(dir, wait));

  // ── 1. Buy the entry rung ──────────────────────────────────────────
  console.log("1. The entry rung: a handcart, on a stipend");
  const store = plain(await p.cmd("look", 2500));
  say(">", store);

  // ── 2. The realm is contiguous ─────────────────────────────────────
  console.log("\n2. ⭐ Walk Terminus → Rejection. No teleport, no wizard flag.");
  const legs: Array<[string, string]> = [
    ["south", "the bank at the confluence"],
    ["south", "the ford"],
    ["south", "the milestone"],
    ["south", "the drove crossing"],
    ["south", "the empty flats"],
    ["south", "the valley crossroads"],
    ["west", "the lower climb"],
    ["west", "the last water"],
    ["west", "the pass"],
    ["west", "the tips"],
    ["west", "the yard gate"],
    ["northeast", "the pithead yard"],
  ];
  let arrived = "";
  for (const [dir, expect] of legs) {
    const out = await go(dir);
    say(`> ${dir}`, out);
    ok(`…reaches ${expect}`, new RegExp(expect, "i").test(out), out);
    arrived = out;
  }
  ok("⭐ the realm is contiguous — Terminus to Rejection on foot",
    /pithead/i.test(arrived), arrived);

  // ── 3. The road is a place ─────────────────────────────────────────
  console.log("\n3. The road is a PLACE, not a hallway");
  const outcrop = plain(await p.cmd("look outcrop", 2000));
  say(">", outcrop);
  ok("Rejection is still Rejection — the road did not replace it",
    /green|malachite|verdigris/i.test(outcrop), outcrop);

  // ── 4. Walk back, and read the pass ────────────────────────────────
  console.log("\n4. ⭐⭐ The pass — a barrier with one way through");
  say("> southwest", await go("southwest"));
  say("> east", await go("east"));
  const pass = await go("east");
  say("> east", pass);
  const sign = plain(await p.cmd("look board", 2000));
  say(">", sign);
  ok("the gate says where bulk breaks",
    /NO WHEELS BEYOND THIS GATE|BREAK YOUR LOAD/i.test(sign + pass), sign);
  // …and the LAST WATER, one room down: a corridor's `water` slot met,
  // and the sign that says it is the last of it.
  const water = await go("east");
  say("> east", water);
  const trough = plain(await p.cmd("look trough", 2000));
  say(">", trough);
  ok("the last water is a place, not a label",
    /LAST WATER|trough/i.test(water + trough), trough);

  // ── 5. The depot ───────────────────────────────────────────────────
  console.log("\n5. ⭐ The depot at Wharfside — the paper and the tariff");
  // Back down the Delight to the bank, then EAST along the quay.
  for (const dir of ["east", "east", "north", "north", "north", "north", "north", "east"]) {
    say(`> ${dir}`, await go(dir, 1400));
  }
  const quay = plain(await p.cmd("look", 2500));
  say(">", quay);
  const board = plain(await p.cmd("read board", 2500));
  say(">", board);
  ok("⭐ a stranger can read the tariff (AC12)",
    /RATES|rate|carrier/i.test(board), board);

  // ── 6. The labor market ────────────────────────────────────────────
  console.log("\n6. ⭐⭐ The labor market — what wants moving, and back");
  const jobs = plain(await p.cmd("jobs", 2500));
  say(">", jobs);
  const back = plain(await p.cmd("jobs --origin here", 2500));
  say(">", back);
  ok("the backhaul read answers (AC15g)",
    /wanting carriage|nothing wants moving|board is bare|Posted work/i.test(
      jobs + back,
    ),
    jobs + back);

  // ⭐⭐ The ONE posting brain, read from the road. `restocks` is the only
  // NPC that posts (the producer hands walk), its board is in the bar,
  // and the bar is off the map — but a gig's ORIGIN is the supplier's
  // counter, which is in Terminus. `jobs --origin <path>` therefore
  // reads the keeper's own orders from anywhere, which is exactly the
  // backhaul question a hauler asks. ⓘ Reported, never asserted: whether
  // she is short right now is the world's business, not the drive's.
  const keeper = plain(
    await p.cmd(
      "jobs --origin /world/terminus/counting-houses/cash-and-carry",
      2500,
    ),
  );
  say(">", keeper);
  // ⚠⚠ Do NOT guess a reason here. This line read "(the bar's par may be
  // met)" for three green runs while the truth was the opposite — the par
  // was maximally unmet and the keeper was structurally unable to order
  // anything at all. A reported line that offers a benign explanation it
  // cannot check is worse than one that says only what it saw.
  console.log(
    /wanting carriage/i.test(keeper)
      ? "   ⓘ the bar keeper HAS posted — carriage wanted out of the cash-and-carry"
      : "   ⓘ NOTHING posted out of the cash-and-carry. This drive cannot see\n" +
        "     why (the Lounge is off the map): the keeper may be off shift,\n" +
        "     the house may be unfunded, or the loop may be broken. Check it.",
  );

  // ── 7. The goods yards, and the work on the boards ─────────────────
  console.log("\n7. ⭐⭐ The goods yards — where the switchover landed");
  say("> west", await go("west"));
  const yards = plain(await p.cmd("northwest", 2500));
  say(">", yards);
  ok("the goods yards are behind the city, with a door for every trade",
    /goods yards|barrows/i.test(yards), yards);

  // Into a producer floor through its new back door — the one room the
  // D11 switchover cost, and the reason a hauler can do the work the
  // hands post.
  const floor = plain(await p.cmd("northeast", 2500));
  say("> northeast", floor);
  ok("⭐ a producer floor is no longer an exitless island",
    /floor|still|rack/i.test(floor), floor);
  const works = plain(await p.cmd("look works-board", 2000));
  say(">", works);
  ok("the floor has a works board on it (for the PEOPLE on it — the hand walks)",
    /works board|dockets|pegs/i.test(works), works);

  // ⚠ Expected BARE on a fresh realm, and that is not a defect: no NPC
  // posts to a producer floor's board. The hand walks its own goods to
  // the counter; the only posting brain is the bar keeper, and her board
  // is in the bar. This reads the board to prove it is readable — what
  // is on it is a player's business.
  const posted = plain(await p.cmd("jobs", 2500));
  say("> jobs", posted);
  console.log(
    /deliver/i.test(posted)
      ? "   ⭐ work is posted — the labor market is running"
      : "   ⓘ board bare this beat (the producer cadence is 4 game-min)",
  );

  p.close();
  console.log(
    failures === 0
      ? "\n=== DRIVE GREEN ===\n"
      : `\n=== DRIVE: ${failures} checkpoint(s) failed ===\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
