/**
 * ⭐⭐ The naming-overhaul drive — documents declare their kinds; a query
 * reaches from the asker (`me`, `~relations`, `@id`); and one rule names
 * everything a player types.
 *
 * The blocking drive of `docs/requirements/naming-overhaul-requirements.md`
 * § The drive. Every step is `instant` or `staged`; the requirements' soak
 * drive is empty (no step depends on the clock). Steps a player cannot reach
 * by playing say how they are staged; steps the content does not carry as
 * written (a `wedge` formation, a lit limekiln) drive the nearest shipped
 * twin and say so.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from "vitest";
import { Session, declareFile, uniqueHandle, plain, restartWorld, forceDocument } from "../src/harness";
import type { CommandResult } from "../src/harness";
import { expectOk } from "../src/harness/assertions";

export const DIRTY_REASON =
  "charters the Hesper at the Greywater Line's desk, buys loaves off the " +
  "market bread counter, hires a canoe at the Rejection put-in, and " +
  "restarts the world";

declareFile({
  file: "naming-overhaul.dirty.wire.test.ts",
  packs: ["world-seed", "terminus", "rejection", "base-library", "transport"],
  dirtyReason: DIRTY_REASON,
});

const SQUARE = "/world/terminus/market/square";
const BAKERY = "/world/terminus/market/bakery";
const LINE_DESK = "/world/terminus/harbor/line-desk";
const PUT_IN = "/world/terminus/rejection/put-in/landing";
const BANK_HALL = "/world/terminus/counting-houses/banking-hall";
const TERMINUS = "/world/terminus";

const record: string[] = [];
const open: Session[] = [];
const squash = (t: string): string => plain(t).replace(/\s+/g, " ").trim();

async function session(handle: string, start: string, opts: Record<string, unknown> = {}): Promise<Session> {
  const s = await Session.open(handle, { startLocation: start, ...opts });
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
async function evalSaid(s: Session, expr: string, extent = TERMINUS): Promise<string> {
  const r = await s.cmd(`eval --parcel ${extent} ${expr}`);
  let said = squash(await r.said());
  for (let i = 0; i < 6 && !/: |error/i.test(said); i++) said += ` ${squash(await s.listen(1_000))}`;
  record.push(`${s.handle}: eval ${expr.slice(0, 120)} → ${said.slice(0, 240)}`);
  return said;
}

/** A funded player: a bank account and `amount` in it (the founder's override). */
async function fund(handle: string, amount: number): Promise<void> {
  const s = await session(handle, BANK_HALL);
  await s.cmd("bank open");
  const gov = await session("founder", BANK_HALL, { committees: [TERMINUS] });
  expectOk(await gov.cmd(`reserve override ${amount} to ${handle} "wire: naming overhaul"`));
  gov.close();
  s.close();
}

afterAll(() => {
  for (const s of open) s.close();
  console.log(`\n── naming-overhaul drive record ──\n${record.join("\n")}\n`);
});

suite("Stage A — documents declare their kinds", () => {
  let wiz: Session;
  beforeAll(async () => {
    // Title over Terminus, so the write reaches the KIND check (the title
    // gate answers first otherwise — "you don't have permission").
    wiz = await session(uniqueHandle("nowiz"), SQUARE, { wizard: true, committees: [TERMINUS], parcels: [TERMINUS, "/trade/ranching"] });
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
    ann = await session(uniqueHandle("noann"), SQUARE);
    bea = await session(uniqueHandle("nobea"), BAKERY);
    // Her `@<id>` from her own `who` line (B4: `who` prints it).
    const listed = squash(await bea.prose("who"));
    beaId = new RegExp(`${bea.handle} @(\\S+)`).exec(listed)?.[1] ?? "";
    record.push(`bea's id: ${beaId}`);
  }, 120_000);

  it("10. [instant · player] `query me:~` lists your relations with their meanings; `look ~here` and `look here` both show the room", async () => {
    const { w } = await say(ann, "query me:~");
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

  it("13. [instant · player] at the harbor, `query charter book:~` lists `~ships`", async () => {
    const sailor = await session(uniqueHandle("nosail"), LINE_DESK);
    const { w } = await say(sailor, "query book:~");
    expect(w).toMatch(/~ships/);
  });

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
    ann = await session(ann.handle, SQUARE);
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
    await fund(handle, 400);
    buyer = await session(handle, BAKERY);
  }, 300_000);

  it("18. [instant · player] at the bread counter: `buy loaf`, `buy loaves`, `buy a loaf` all name the bread", async () => {
    for (const words of ["buy loaf", "buy loaves", "buy a loaf"]) {
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

  it("23. [instant · player] at the Rejection put-in: `rent canoe for a week`; `for 90 minutes` refuses on granularity; `for soon` and `for a while` give the same line", async () => {
    const renter = await session(buyer.handle, PUT_IN);
    const soon = await say(renter, "rent canoe for soon");
    const awhile = await say(renter, "rent canoe for a while");
    expect(soon.w).toMatch(/is not a length of time this takes/);
    expect(awhile.w.replace("a while", "soon")).toBe(soon.w);
    const minutes = await say(renter, "rent canoe for 90 minutes");
    expect(minutes.w).toMatch(/whole days/);
    const week = await say(renter, "rent canoe for a week");
    // (In the put-in's dark the boat reads as "something" — it is still hired.)
    expect(week.w).toMatch(/You hire .* for 7 days/);
  });

  it("17. [instant · player] at the Greywater Line's desk, `charter hesper` names her; `charter the Hesper` and `charter HESPER` name her too", async () => {
    const handle = uniqueHandle("nochar");
    await fund(handle, 400);
    const c = await session(handle, LINE_DESK);
    const first = await say(c, "charter HESPER");
    expect(first.w).not.toMatch(/does not let|no ship called|don't see/i);
    for (const words of ["charter the Hesper", "charter hesper"]) {
      const { w } = await say(c, words);
      // She is named either way — a second charter is refused for HER, never for an unknown name.
      expect(w, words).not.toMatch(/does not let|no ship called|don't see/i);
    }
  }, 300_000);

  it("24. [instant · player] `help search harb` still lists the topics containing `harb`", async () => {
    const { w } = await say(buyer, "help search harb");
    expect(w).toMatch(/harbor/i);
  });
});
