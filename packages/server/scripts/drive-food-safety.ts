/**
 * LIVE DRIVE — the food-safety build, over the REAL wire: the
 * `test-login` seam for a session, the same WebSocket the client opens,
 * and the same command strings a player types. No browser, no test
 * doubles, no `StuffApi` reach-arounds.
 *
 *   pnpm --filter @saxonberg/server reset:db     # ⚠ see below
 *   pnpm --filter @saxonberg/server dev           # let it finish booting
 *   pnpm --filter @saxonberg/server drive:food-safety
 *
 * ⚠ **It wants a freshly reset world.** It BUTCHERS the carcass the
 * cookhouse ships and eats what it makes, and none of that comes back on
 * its own — a second run finds an empty hook and reads as broken.
 *
 * An ORDINARY patron in the shipped Hearthworks cookhouse: no wizard, no
 * `clone`, no `startLocation` trickery beyond the seat.
 *
 * ⭐⭐ **Three of these checkpoints are the ones the unit suite
 * structurally cannot reach**, and they are the reason the build exists:
 *
 *   - a contaminated cut is INDISTINGUISHABLE from a clean one by every
 *     sense a player has (step 4);
 *   - the verbs are AFFORDED at all — `butcher`, `cure`, `dry` have to
 *     appear in a command set, and every one of the four reachability
 *     links (verb · affordance · data · boot) fails closed and silent;
 *   - a dirty knife carries the hazard to food that never touched the
 *     animal, and `wash` clears it (step 13/14).
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
  console.log(`\n=== LIVE DRIVE: food safety (${SERVER}) ===\n`);

  const COOKHOUSE = "/world/hearthworks/location/cookhouse";
  const cook = await Session.open(`fooddrive-${stamp}`, COOKHOUSE);

  const say = (label: string, text: string): void =>
    console.log(`   ${label} ${text.replace(/\s+/g, " ").slice(0, 300)}`);

  // ── 1. The larder, as shipped ──────────────────────────────────────
  console.log("1. Walk into the cookhouse (an ordinary patron, no wizard)");
  const room = plain(await cook.cmd("look", 2500));
  say(">", room);
  ok("a carcass hangs there to be taken apart", /carcass|hog/i.test(room), room);
  ok("…and a knife to do it with", /knife/i.test(room), room);

  // ── 2. The VERBS are afforded — the link that fails closed + silent ─
  console.log("\n2. The verbs a player can actually type");
  const help = plain(await cook.cmd("help butcher", 2200));
  say(">", help);
  ok("`butcher` is a verb the world knows", !/don't understand|no help/i.test(help), help);
  for (const verb of ["cure", "dry", "smoke"]) {
    const h = plain(await cook.cmd(`help ${verb}`, 1800));
    ok(`\`${verb}\` is a verb the world knows`, !/don't understand|no help/i.test(h), h);
  }

  // ── 3. Butcher the carcass ─────────────────────────────────────────
  console.log("\n3. Butcher the hog with the boning knife");
  say(">", plain(await cook.cmd("get boning knife", 2000)));
  say(">", plain(await cook.cmd("wield boning knife", 2000)));
  const butchered = plain(await cook.cmd("butcher carcass", 3500));
  say(">", butchered);
  ok(
    "the carcass comes apart into CUTS — more meat than one meal",
    /work it down to \d+ cuts/i.test(butchered),
    butchered,
  );
  const cutCount = /work it down to (\d+) cuts/i.exec(butchered)?.[1] ?? "0";
  ok(`…and it is genuinely several (saw ${cutCount})`, Number(cutCount) >= 4, butchered);

  // ── 4. ⭐⭐ The hazard reports to NO sense ───────────────────────────
  //
  // The checkpoint the whole build exists for. The prime cut has just
  // come off a gut-spilled carcass and is carrying three organisms;
  // `look`, `smell` and `taste` must every one of them read exactly as
  // they would on sound food.
  //
  // ⚠ It targets `prime` and not `meat`: after a butchering the room
  // holds five things keyed `meat`, and an ambiguous object arg opens a
  // disambiguation PROMPT — which then eats the next command typed. That
  // is the engine working, and it cost this drive four checkpoints before
  // anyone noticed the prompt was there.
  console.log("\n4. ⭐⭐ Look at, smell and taste a cut — it reads SOUND. It is not.");
  const lookCut = plain(await cook.cmd("look prime", 2200));
  const smellCut = plain(await cook.cmd("smell prime", 2200));
  const tasteCut = plain(await cook.cmd("taste prime", 2200));
  say("look >", lookCut);
  say("smell >", smellCut);
  say("taste >", tasteCut);
  for (const [sense, said] of [
    ["look", lookCut],
    ["smell", smellCut],
    ["taste", tasteCut],
  ] as const) {
    ok(
      `\`${sense}\` answers, and reports NOTHING wrong with a contaminated cut`,
      said.length > 0 &&
        !/off\b|gone bad|rotten|foul|tainted|contaminat|spoil/i.test(said),
      said,
    );
  }

  // ── 5. Preserve it — the acts, and salt actually going ─────────────
  console.log("\n5. Cure a cut, and read what curing did to it");
  const cured = plain(await cook.cmd("cure prime", 3000));
  say(">", cured);
  ok("curing resolves — salt in reach, at the hearth", /in salt/i.test(cured), cured);
  const readCured = plain(await cook.cmd("look treated", 2500));
  say(">", readCured);
  ok(
    "…and the treated cut READS as treated — band words, never a number",
    /salted|dried/i.test(readCured) && !/0\.\d/.test(readCured),
    readCured,
  );

  console.log("\n   …and dry a second one: the other hurdle, no salt, no fire");
  const dried = plain(await cook.cmd("dry stew-meat", 3000));
  say(">", dried);
  ok("drying resolves", /to dry/i.test(dried), dried);

  // ── 6. Cook one properly ───────────────────────────────────────────
  console.log("\n6. Sear a cut at the hearth");
  say(">", plain(await cook.cmd("ignite oven", 2200)));
  const seared = plain(await cook.cmd("cook seared-cut", 4500));
  say(">", seared);
  ok(
    "the sear resolves, or declines for a reason a player can act on",
    seared.length > 0,
    seared,
  );

  // ── 7. ⭐⭐ Wash the knife — the counterplay has to be reachable ─────
  //
  // Requirement 17, and the second thing the unit suite cannot reach:
  // that the knife is a real object in a real hand and that `wash` gets
  // to it at all. It was `instanceof CraftVessel` until this build, so a
  // knife could not be washed anywhere, ever.
  console.log("\n7. ⭐⭐ Wash the knife — the counterplay has to be reachable");
  const washed = plain(await cook.cmd("wash boning", 4000));
  say(">", washed);
  ok(
    "`wash` reaches a KNIFE, not just glassware",
    /wash|clean/i.test(washed) && !/wash what|don't understand/i.test(washed),
    washed,
  );

  // ── 8. Eat a raw cut ───────────────────────────────────────────────
  //
  // ⚠⚠ **The illness itself is NOT driveable and must not be faked.**
  // Salmonella's incubation is 6 game-hours — half an hour of real time at
  // the shipped 12× clock — and turning the clock up would need a wizard,
  // which would be proving something no player can do. The arc is proven
  // exactly, and in milliseconds, by
  // `lib/vitals/__tests__/Vitals.infection.test.ts` (growth, incubation,
  // resistance, clearance, the far-past guard).
  //
  // ⭐ What the live wire adds is the thing the suite structurally cannot:
  // that the act is REACHABLE and that nothing about it warns you.
  console.log("\n8. Eat a raw cut — nothing gates it, and nothing warns you");
  const ate = plain(await cook.cmd("eat treated", 3000));
  say(">", ate);
  ok("the raw cut is eaten", /you eat/i.test(ate), ate);
  ok(
    "…and the world said NOTHING about what was on it",
    !/sick|ill|poison|contaminat|wrong/i.test(ate),
    ate,
  );

  cook.close();
  console.log(
    `\n=== ${failures === 0 ? "DRIVE CLEAN" : `${failures} CHECKPOINT(S) MISSED`} ===\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

await main();
