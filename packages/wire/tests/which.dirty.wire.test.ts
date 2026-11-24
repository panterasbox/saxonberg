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
    const closing = /^(?:and the usual|and anything you're carrying|you): (.+?)(?: \(you\))?$/.exec(line);
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
    expect(w).toMatch(/and the usual: .*\(you\)/);
    expect(w).toMatch(/\blook\b/);
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

  it("7. [instant · player] a verb nothing here gives is one line; a non-verb is called one", async () => {
    const fish = await say(ann, "which fish");
    expect(fish.w).toMatch(/Nothing here gives you `?fish`?\. \(`?help fish`? has its shape\.\)/);
    const flurb = await say(ann, "which flurb");
    expect(flurb.w).toMatch(/no verb 'flurb'/);
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
    const bea = open.find((s) => s.handle.startsWith("whbea"))!;
    const person = await say(ann, `which ${bea.handle}`);
    expect(verbsIn(person.lines)).not.toContain("throw");
    const thrown = await say(ann, "which throw");
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

  it("4. [instant · player] a bought notebook is named by the hand it is in; set on the shelf, by where it now is", async () => {
    const bought = await say(buyer, "buy notebook");
    expect(bought.status, bought.w).toBe("ok");
    const held = await say(buyer, "which");
    note(buyer, held.lines);
    expect(held.w).toMatch(/— the notebook (in your (left|right) hand|you're carrying)/);
    expect(held.w).toMatch(/and anything you're carrying: .*\bring\b/);
    const put = await say(buyer, "put notebook on shelf");
    const down = await say(buyer, "which");
    note(buyer, down.lines);
    if (put.status === "ok") expect(down.w).toMatch(/the notebook on the shelf|the notebook here/);
    // Set down, it no longer gives the article's verbs (the audit).
    expect(down.w).not.toMatch(/and anything you're carrying/);
  });

  it("5. [instant · player] two notebooks: `which notebook` tells them apart by place — never a keyword list", async () => {
    await say(buyer, "get notebook");
    const second = await say(buyer, "buy notebook");
    expect(second.status, second.w).toBe("ok");
    const both = await say(buyer, "which notebook");
    note(buyer, both.lines);
    const named = both.lines.filter((l) => /— (the notebook|2 notebooks)/.test(l));
    expect(named.length, both.w).toBeGreaterThanOrEqual(1);
    if (named.length > 1) expect(new Set(named).size).toBe(named.length);
    expect(both.w).not.toMatch(/keywords?/i);
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
        const r = await say(s, verb);
        typed.push(verb);
        expect(r.w, `${verb}: ${r.w}`).not.toMatch(/I don't understand/);
      }
    }
    record.push(`step 11 typed ${typed.length}: ${typed.join(" ")}`);
    expect(typed.length).toBeGreaterThan(10);
  }, 600_000);
});
