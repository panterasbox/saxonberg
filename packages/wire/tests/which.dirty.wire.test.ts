/**
 * ⭐⭐ The `which` drive — what can I type here, and what gives each verb.
 *
 * The which build's blocking drive (its requirements' § The drive, numbered
 * as there; the docs retire at the sweep, and what it proves lives in
 * command-routing.md and card-surface.md). Every step is `instant` or
 * `staged`; there is no soak drive (no step depends on the clock). The card
 * (steps 12–16) is the browser walk's, `e2e/tests/which-walk.spec.ts`.
 *
 * Step 8 is staged in the PASSAGE (the trap is there, not in the yard — the
 * requirements said the yard). Step 10 stages a phone into the hand.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from "vitest";
import { Session, declareFile, uniqueHandle, plain } from "../src/harness";
import { standIn, fundedAccount, PLAZA, SHOP, PASSAGE, EXITS } from "../src/harness/scaffold";

export const DIRTY_REASON = "buys notebooks off the testbed shop counter (the sweep restocks it to par)";

declareFile({
  file: "which.dirty.wire.test.ts",
  packs: ["platform", "test-fixtures", "trade-shopkeeping", "trade-fishing", "generic-objects"],
  dirtyReason: DIRTY_REASON,
});

const record: string[] = [];
const open: Session[] = [];
const squash = (t: string): string => plain(t).replace(/\s+/g, " ").trim();

async function keep(s: Session): Promise<Session> {
  open.push(s);
  await s.drainProse();
  return s;
}

/** Run a line; the reply as lines (plain) and squashed. */
async function say(s: Session, text: string): Promise<{ status: string; lines: string[]; w: string }> {
  await s.drainProse();
  const r = await s.cmd(text);
  const raw = plain(await r.said());
  const w = squash(raw);
  record.push(`${s.handle}: ${text} → ${r.status} · ${w.slice(0, 400)}`);
  return { status: r.status, lines: raw.split("\n").map((l) => l.trim()).filter(Boolean), w };
}

/** Every verb a `which` reply names: the group lines, the two closing lines. */
function verbsIn(lines: string[]): string[] {
  const out = new Set<string>();
  for (const line of lines) {
    const group = /^([a-z~][\w~-]*(?:, [a-z~][\w~-]*)*) — /.exec(line);
    // The usual line is a COUNT (`which me` lists them); `you:` is that list.
    const closing = /^(?:and anything you're carrying|you): (.+?)$/.exec(line);
    const list = group?.[1] ?? closing?.[1];
    if (!list) continue;
    for (const v of list.split(", ")) out.add(v.trim());
  }
  return [...out];
}

/** Every verb `which` listed, by the session it was listed to (step 11's input). */
const listed = new Map<Session, Set<string>>();
function note(s: Session, lines: string[]): void {
  let set = listed.get(s);
  if (!set) listed.set(s, (set = new Set()));
  for (const v of verbsIn(lines)) set.add(v);
}

afterAll(() => {
  for (const s of open) s.close();
  console.log(`\n── which drive record ──\n${record.join("\n")}\n`);
});

suite("the read — what you can type here", () => {
  let ann: Session;
  beforeAll(async () => {
    ann = await keep(await standIn(PLAZA, "whann"));
  }, 120_000);

  it("1. [instant · player] on the plaza `which` groups verbs by source and ends on the usual line; no shop verb", async () => {
    const { lines, w } = await say(ann, "which");
    note(ann, lines);
    expect(w).toMatch(/What you can type here/);
    expect(w).toMatch(/and the usual: \d+ verbs of your own/);
    // The body's own verbs are counted there and listed by `which me`.
    const mine = await say(ann, "which me");
    note(ann, mine.lines);
    expect(mine.w).toMatch(/you: .*\blook\b/);
    expect(verbsIn(lines)).not.toContain("buy");
  });

  it("2. [instant · player] in the shop `buy` comes from the counter here; walking out takes it away", async () => {
    await say(ann, EXITS.plaza.shop);
    const inShop = await say(ann, "which");
    note(ann, inShop.lines);
    expect(inShop.w).toMatch(/\bbuy\b[^—]*— the counter here/);
    await say(ann, EXITS.shop.plaza);
    const out = await say(ann, "which");
    expect(verbsIn(out.lines)).not.toContain("buy");
    await say(ann, EXITS.plaza.shop);
  });

  it("3. [instant · player] `which counter` lists only what the counter gives", async () => {
    const { lines, w } = await say(ann, "which counter");
    note(ann, lines);
    expect(w).toMatch(/\bbuy\b/);
    expect(w).toMatch(/the counter here/);
    expect(w).not.toMatch(/the usual/);
  });

  it("6. [instant · player] `which ~` lists the ~ words with their meanings; a new list appears; the counter keeps nothing", async () => {
    const words = await say(ann, "which ~");
    expect(words.w).toMatch(/~here — the place you stand in/);
    expect(words.w).toMatch(/~inventory/);
    expect(words.w).toMatch(/~contacts/);
    const bea = await keep(await standIn(SHOP, "whbea"));
    const listedWho = squash(await bea.prose("who"));
    const beaId = new RegExp(`${bea.handle} @(\\S+)`).exec(listedWho)?.[1] ?? "";
    expect(beaId).not.toBe("");
    await say(ann, `contacts add @${beaId} friends`);
    const after = await say(ann, "which ~");
    expect(after.w).toMatch(/~friends — .*\(1 in the world\)/);
    const counter = await say(ann, "which ~ counter");
    expect(counter.w).toMatch(/nothing kept by the counter/);
  });

  it("7. [instant · player] a verb nothing here gives is one line; a non-verb is called one; a name out of reach is refused", async () => {
    const fish = await say(ann, "which --verb fish");
    expect(fish.w).toMatch(/Nothing here gives you `?fish`?\. \(`?help fish`? has its shape\.\)/);
    const flurb = await say(ann, "which --verb flurb");
    expect(flurb.w).toMatch(/no verb 'flurb'/);
    // A name with nothing in reach is refused, never answered as bare
    // `which` (the walk: `which cat` for the cat next door).
    const none = await say(ann, "which zebra");
    expect(none.w).toMatch(/There is no 'zebra' within reach to ask about\./);
    expect(none.w).not.toMatch(/What you can type here/);
  });

  it("9. [instant · player] `query me:~` and `look me:~` are refused, pointing at `which ~`", async () => {
    const q = await say(ann, "query me:~");
    expect(q.w).toMatch(/which ~/);
    const l = await say(ann, "look me:~");
    expect(l.w).toMatch(/which ~/);
  });

  it("11a. [instant · player] the audit's fixes hold: the counter and a person give no throw or ring; throw is the body's own", async () => {
    const counter = await say(ann, "which counter");
    expect(verbsIn(counter.lines)).not.toContain("throw");
    expect(verbsIn(counter.lines)).not.toContain("ring");
    const bea = open.find((s) => s.handle.includes("whbea"))!;
    const person = await say(ann, `which ${bea.handle}`);
    expect(verbsIn(person.lines)).not.toContain("throw");
    const thrown = await say(ann, "which --verb throw");
    expect(thrown.w).toMatch(/you: throw/);
  });
});

suite("what you carry", () => {
  let buyer: Session;
  beforeAll(async () => {
    const handle = uniqueHandle("whbuy");
    await fundedAccount(handle, 400, "wire: which");
    buyer = await keep(await Session.open(handle, { startLocation: SHOP }));
  }, 180_000);

  it("4. [instant · player] a bought notebook is named by the hand it is in; set down, it no longer gives the article's verbs", async () => {
    const bought = await say(buyer, "buy notebook");
    expect(bought.status, bought.w).toBe("ok");
    const held = await say(buyer, "which");
    note(buyer, held.lines);
    expect(held.w).toMatch(/— the notebook (in your (left|right) hand|you're carrying)/);
    expect(held.w).toMatch(/and anything you're carrying: .*\bring\b/);
    // (The testbed shelf is a consignment shelf — `put … on` is refused there.)
    const dropped = await say(buyer, "drop notebook");
    expect(dropped.status, dropped.w).toBe("ok");
    const down = await say(buyer, "which");
    note(buyer, down.lines);
    // Set down, it is no longer a source of the article's verbs (the audit):
    // nothing names it as carried.
    expect(down.w).not.toMatch(/the notebook (in your|you're carrying)/);
  });

  it("5. [instant · player] two notebooks: `which notebook` answers for ONE — the nearest, as the binder always picks — and says where it is", async () => {
    await say(buyer, "get notebook");
    const second = await say(buyer, "buy notebook");
    expect(second.status, second.w).toBe("ok");
    // `which <thing>` is a typed object slot: the binder's one rule (the
    // nearest perceived wins) names it, as for every verb.
    const one = await say(buyer, "which notebook");
    note(buyer, one.lines);
    const named = one.lines.filter((l) => /— the notebook /.test(l));
    expect(named.length, one.w).toBe(1);
    expect(one.w).toMatch(/the notebook (in your (left|right) hand|you're carrying|here)/);
    expect(one.w).not.toMatch(/keywords?/i);
  });

  it("10. [instant · staged] a phone in the hand: its verbs come from the phone you carry", async () => {
    const wiz = await keep(await standIn(SHOP, "whwiz", { wizard: true, parcels: ["/world/testbed"] }));
    void wiz;
    const got = await say(buyer, "which phone");
    if (got.status !== "ok") {
      // No phone in the starting kit here: the wizard clones one into the buyer's hands.
      await say(wiz, `clone /stuff/thing/gear/hollis-pal --into ${buyer.handle}`);
    }
    const all = await say(buyer, "which");
    note(buyer, all.lines);
    expect(all.w).toMatch(/— the phone (in your (left|right) hand|you're carrying)/);
  });
});

suite("the dark and the hidden", () => {
  it("8. [instant · staged] in the unlit passage nothing the dark hides is named; the concealed trap is not a thing to `which`", async () => {
    const s = await keep(await standIn(PASSAGE, "whdark"));
    const all = await say(s, "which");
    expect(all.w).not.toMatch(/blade|trap/i);
    const blade = await say(s, "which blade");
    expect(blade.w).not.toMatch(/— the (blade|sweep)/i);
  });
});

suite("listed ⇒ accepted", () => {
  // Verbs a bare word would really DO something to the session with — logged
  // out, ended — are not typed; that they are verbs is enough here.
  const SKIP = new Set(["quit", "logout", "exit", "suicide", "die", "vomit", "sleep", "embody", "enroll", "afk"]);

  it("11. [instant · player] every verb `which` listed in steps 1–10 is accepted by the line where it was listed (never 'I don't understand')", async () => {
    const typed: string[] = [];
    for (const [s, verbs] of listed) {
      for (const verb of [...verbs].sort()) {
        if (SKIP.has(verb) || verb.startsWith("~")) continue;
        await s.drainProse();
        typed.push(verb);
        // A bare verb may ask for its object ("Arm what?") — asked, it was ACCEPTED.
        let w = "";
        try {
          // ⭐ Typed with an option nothing takes: a verb the line knows fails on
          // its SHAPE (and does nothing — typing `unequip` bare once stripped
          // the body and lost the phone whose verbs were next); a verb it does
          // not know is "I don't understand".
          const { result, prompt } = await s.cmdOrPrompt(`${verb} --which-probe`);
          w = squash(await result.said());
          record.push(`${s.handle}: ${verb} → ${prompt ? "prompt" : result.status} · ${w.slice(0, 160)}`);
        } catch (err) {
          const why = (err as Error).message;
          if (!/raised a PROMPT/.test(why)) throw err;
          record.push(`${s.handle}: ${verb} → prompt (asked for its object)`);
          continue;
        }
        expect(w, `${verb}: ${w}`).not.toMatch(/I don't understand/);
      }
    }
    record.push(`step 11 typed ${typed.length}: ${typed.join(" ")}`);
    expect(typed.length).toBeGreaterThan(10);
  }, 600_000);
});
