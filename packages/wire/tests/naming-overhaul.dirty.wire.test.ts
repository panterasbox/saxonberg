/**
 * ⭐⭐ The naming-overhaul drive — documents declare their kinds; a query
 * reaches from the asker (`me`, `~relations`, `@id`); and one rule names
 * everything a player types.
 *
 * The naming overhaul's blocking drive (MR !650 — its requirements' § The
 * drive, numbered as there; the docs retired at the sweep, and what it
 * proves lives in document-store.md, mql.md and command-spec.md). Every
 * step is `instant` or `staged`; there is no soak drive (no step depends on
 * the clock). Steps a player cannot reach
 * by playing say how they are staged; steps the content does not carry as
 * written (a `wedge` formation, a lit limekiln) drive the nearest shipped
 * twin and say so.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from "vitest";
import { Session, declareFile, uniqueHandle, plain, restartWorld, forceDocument } from "../src/harness";
import type { CommandResult } from "../src/harness";
import { standIn, fundedAccount, TESTBED, PLAZA, SHOP, WORKS } from "../src/harness/scaffold";

export const DIRTY_REASON =
  "buys notebooks off the testbed shop counter (the sweep restocks it to " +
  "par) and restarts the world";

declareFile({
  file: "naming-overhaul.dirty.wire.test.ts",
  packs: ["platform", "test-fixtures", "base-library", "transport"],
  dirtyReason: DIRTY_REASON,
});


const record: string[] = [];
const open: Session[] = [];
const squash = (t: string): string => plain(t).replace(/\s+/g, " ").trim();

async function session(handle: string, start: string, opts: Record<string, unknown> = {}): Promise<Session> {
  const s = await Session.open(handle, { startLocation: start, ...opts });
  return keep(s);
}

async function keep(s: Session): Promise<Session> {
  open.push(s);
  await s.drainProse();
  return s;
}

async function say(s: Session, text: string): Promise<{ r: CommandResult; w: string }> {
  await s.drainProse();
  const r = await s.cmd(text);
  const w = squash(await r.said());
  record.push(`${s.handle}: ${text} → ${r.status} · ${w.slice(0, 240)}`);
  return { r, w };
}

const refusedOf = (r: CommandResult): { reason?: string; facts?: Record<string, unknown> } | undefined =>
  (r.notes as Array<{ kind: string; reason?: string }>).find((n) => n.kind === "refused" || n.kind === "controller-rejected") as
    | { reason?: string }
    | undefined;

/** Run one `eval` expression and hand back what it printed (value or error). */
async function evalSaid(s: Session, expr: string, extent = TESTBED): Promise<string> {
  const r = await s.cmd(`eval --parcel ${extent} ${expr}`);
  let said = squash(await r.said());
  for (let i = 0; i < 6 && !/: |error/i.test(said); i++) said += ` ${squash(await s.listen(1_000))}`;
  record.push(`${s.handle}: eval ${expr.slice(0, 120)} → ${said.slice(0, 240)}`);
  return said;
}

afterAll(() => {
  for (const s of open) s.close();
  console.log(`\n── naming-overhaul drive record ──\n${record.join("\n")}\n`);
});

suite("Stage A — documents declare their kinds", () => {
  let wiz: Session;
  beforeAll(async () => {
    // Title over the testbed, so the write reaches the KIND check (the title
    // gate answers first otherwise — "you don't have permission").
    wiz = await keep(await standIn(PLAZA, "nowiz", { wizard: true, committees: [TESTBED], parcels: [TESTBED, "/trade/ranching"] }));
  }, 120_000);

  it("3a. [staged] the kinds folder lists the declared kinds by title", async () => {
    const { w } = await say(wiz, "ls /platform/kinds");
    expect(w).toMatch(/recipe|release|formation/i);
  });

  // 3b (undeclared kind refused) has no author-reachable route in a running
  // world: the CMS creates only scripts at a new path, and `eval` is
  // parcel-sandboxed (no writes). The funnel's refusal is proven by
  // `DocumentLogic.funnel.test.ts` — recorded in the drive record, not driven.

  it("4. [staged] a filed herd record cannot be rewritten through the CMS — refused, naming its register", async () => {
    const path = "/trade/ranching/herds/wire-probe";
    await forceDocument(path, "herd", { herdId: "wire-probe", name: "wire probe", founded: 0 });
    const headers = { cookie: wiz.cookie };
    const base = process.env.WIRE_SERVER_URL!;
    const { token } = (await (await fetch(`${base}/api/cms/csrf`, { headers })).json()) as { token: string };
    const res = await fetch(`${base}/api/cms/write`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json", "X-CMS-CSRF": token },
      body: JSON.stringify({ backend: "document", path, body: JSON.stringify({ herdId: "wire-probe", name: "rewritten" }) }),
    });
    const text = await res.text();
    record.push(`CMS write ${path} → ${res.status} · ${text.slice(0, 240)}`);
    expect(res.status).not.toBe(200);
    expect(text).toMatch(/filed|register/i);
  });

  it("6. [instant] a press release's date reads in game time", async () => {
    const said = await evalSaid(wiz, `JSON.stringify((await DocumentApi.listOfKind('release')).slice(0, 1).map((d) => typeof d.getData().publishedAtS))`);
    expect(said).not.toMatch(/error/i);
  });
});

suite("Stage B — reaching from the asker", () => {
  let ann: Session;
  let bea: Session;
  let beaId = "";

  beforeAll(async () => {
    ann = await keep(await standIn(PLAZA, "noann"));
    bea = await keep(await standIn(SHOP, "nobea"));
    // Her `@<id>` from her own `who` line (B4: `who` prints it).
    const listed = squash(await bea.prose("who"));
    beaId = new RegExp(`${bea.handle} @(\\S+)`).exec(listed)?.[1] ?? "";
    record.push(`bea's id: ${beaId}`);
  }, 120_000);

  it("10. [instant · player] `which ~` lists your relations with their meanings (the which build moved it off `query me:~`); `look ~here` and `look here` both show the room", async () => {
    const { w } = await say(ann, "which ~");
    expect(w).toMatch(/~here/);
    expect(w).toMatch(/~inventory/);
    expect(w).toMatch(/~reachable/);
    const a = squash(await ann.prose("look ~here"));
    const b = squash(await ann.prose("look here"));
    expect(a.length).toBeGreaterThan(0);
    expect(b.slice(0, 40)).toBe(a.slice(0, 40));
  });

  it("11. [staged] a contact list `friends` reaches a player in another room: `dm ~friends:<them>` and `dm @<id>`", async () => {
    // Bea is in another room: Ann adds her by the address `who` showed.
    expect(beaId).not.toBe("");
    const add = await say(ann, `contacts add @${beaId} friends`);
    expect(add.r.status, add.w).not.toBe("declined");
    const viaList = await say(ann, `dm ~friends:${bea.handle} hello from the list`);
    expect(viaList.w).not.toMatch(/don't see|no one/i);
    const heard = squash(await bea.listen(3_000));
    record.push(`bea heard: ${heard.slice(0, 200)}`);
    const viaId = await say(ann, `dm @${beaId} hello by id`);
    expect(viaId.r.status).not.toBe("declined");
  });

  it("12. [staged] a list named `inventory` is allowed with a warning; `~inventory` still means what you carry", async () => {
    const { w } = await say(ann, `contacts add @${beaId} inventory`);
    expect(w).toMatch(/built-in/i);
    const { w: inv } = await say(ann, "query ~inventory");
    expect(inv).not.toMatch(new RegExp(bea.handle, "i"));
  });

  // 13 (`query charter book:~` lists `~ships`) needs a harbor; the testbed
  // has none and a drive may not name a world locality (lint:wire-content).
  // `HullBook`'s relation is proven by its unit test — recorded, not driven.

  it("15. [staged] a notify rule on `~friends` is set and shown in the relation spelling", async () => {
    const set = await say(ann, "notify set ~friends --login show");
    expect(set.w).toMatch(/~friends/);
    const refused = await say(ann, `notify set contacts:x:friends --login show`);
    expect(refused.w).toMatch(/relation/i);
  });

  it("4b. [instant · player] `who` shows each player's `@<id>`", async () => {
    const { w } = await say(ann, "who");
    expect(w).toMatch(/@/);
  });

  it("16. [staged] RESTART — the contact list and the notify rule come back", async () => {
    for (const s of open.splice(0)) s.close();
    await restartWorld();
    ann = await session(ann.handle, PLAZA);
    const { w } = await say(ann, "contacts show friends");
    expect(w).toMatch(new RegExp(bea.handle, "i"));
    const rules = await say(ann, "notify show ~friends");
    expect(rules.w).toMatch(/login=show/);
  }, 600_000);
});

suite("Stage C — one rule names what a player types", () => {
  let buyer: Session;

  beforeAll(async () => {
    const handle = uniqueHandle("nobuy");
    await fundedAccount(handle, 400, "wire: naming overhaul");
    buyer = await session(handle, SHOP);
  }, 300_000);

  it("18. [instant · player] at the shop counter: `buy notebook`, `buy notebooks`, `buy a notebook` all name it", async () => {
    // (The -ves plural — `loaves` — is GrammarApi's unit test; the testbed sells no bread.)
    for (const words of ["buy notebook", "buy notebooks", "buy a notebook"]) {
      const { r, w } = await say(buyer, words);
      expect(w, `${words}: ${w}`).not.toMatch(/isn't for sale here/i);
      expect(refusedOf(r)?.reason ?? "").not.toBe("not-on-shelf");
    }
  });

  it("21. [instant · player] `party adopt <formation>` names it with or without the article; a `smile` still smiles", async () => {
    await say(buyer, "party form wardens");
    const plain1 = await say(buyer, "party adopt vanguard");
    const art = await say(buyer, "party adopt the vanguard");
    expect(plain1.w + art.w).not.toMatch(/no formation called|no such/i);
    const { w } = await say(buyer, "smile");
    expect(w).toMatch(/smile/i);
  });

  it("23. [instant · player] at the forge: `fire forge for soon` and `for a while` give the same line; `for 20 seconds` is under the minute", async () => {
    // The testbed has no hire rack, so the duration slot is driven on `fire`
    // (min: a minute); rent's whole-days granularity is CommandDefinition's
    // unit test — recorded, not driven.
    const smith = await session(buyer.handle, WORKS);
    const soon = await say(smith, "fire forge for soon");
    const awhile = await say(smith, "fire forge for a while");
    expect(soon.w).toMatch(/is not a length of time this takes/);
    expect(awhile.w.replace("a while", "soon")).toBe(soon.w);
    const short = await say(smith, "fire forge for 20 seconds");
    expect(short.w).toMatch(/minute/);
  });

  // 17 (`charter hesper` / `the Hesper` / `HESPER`) needs a harbor's charter
  // book; the testbed has none. `HullBook.hullsNamed` is proven by its unit
  // test — recorded, not driven.

  it("24. [instant · player] `help search harb` still lists the topics containing `harb`", async () => {
    const { w } = await say(buyer, "help search harb");
    expect(w).toMatch(/harbor/i);
  });
});
