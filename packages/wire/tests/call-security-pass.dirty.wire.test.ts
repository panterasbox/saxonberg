/**
 * ⭐⭐ The call-security drive — a protective act decides on who the ENGINE
 * says is acting, never on who the code says; and no body runs a command
 * because another body's code asked, unless the verb allows it and the
 * body's own player says yes at that moment.
 *
 * The blocking drive of the call-security pass (requirements § The drive).
 * Every step is `instant` or `staged`; there is no soak drive. Steps a
 * player cannot reach by playing say how they are staged.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from "vitest";
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  hand,
  stage,
  advanceWorldClock,
} from "../src/harness";
import type { CommandResult } from "../src/harness";

export const DIRTY_REASON =
  "buys a Hinkley Hills lot through the realtor (the plat book only the " +
  "increment re-lists), re-points the `name` view to a test controller and " +
  "back, and unlocks and relocks the shipped pump-house door";

declareFile({
  file: "call-security-pass.dirty.wire.test.ts",
  packs: [
    "world-seed",
    "terminus",
    "hinkley-hills",
    "residence",
    "generic-objects",
    "trade-ceramics",
    "base-library",
  ],
  dirtyReason: DIRTY_REASON,
});

const SQUARE = "/world/terminus/market/square";
const BANK = "/world/terminus/wharfside/bank";
const PUMP_HOUSE = "/world/terminus/wharfside/pumphouse/location/house";
const PUMP_DOOR = "/world/terminus/wharfside/thing/pump-house-door";
const REALTY = "/world/terminus/realty/office";
const BANK_HALL = "/world/terminus/counting-houses/banking-hall";
const TERMINUS = "/world/terminus";
const JUG = "/trade/ceramics/thing/jug";
const NAME_VIEW = "/platform/cmd/social/name";
const NAME_SHIPPED = "/platform/idea/cmd/social/NameController";
const NAME_LIAR = "/platform/idea/cmd/system/ClaimProbeController";

const record: string[] = [];
const open: Session[] = [];
const squash = (t: string): string => plain(t).replace(/\s+/g, " ").trim();

async function session(
  handle: string,
  start: string,
  opts: Record<string, unknown> = {},
): Promise<Session> {
  const s = await Session.open(handle, { startLocation: start, ...opts });
  open.push(s);
  await s.drainProse();
  return s;
}

async function say(
  s: Session,
  text: string,
): Promise<{ r: CommandResult; w: string }> {
  const r = await s.cmd(text);
  const w = squash(await r.said());
  record.push(`${s.handle}: ${text} → ${r.status} · ${w.slice(0, 240)}`);
  return { r, w };
}

/** Run one `eval` expression and hand back what it printed (value or error). */
async function evalSaid(
  s: Session,
  expr: string,
  extent = TERMINUS,
): Promise<string> {
  const r = await s.cmd(`eval --parcel ${extent} ${expr}`);
  let said = squash(await r.said());
  for (let i = 0; i < 6 && !/: |error/i.test(said); i++)
    said += ` ${squash(await s.listen(1_000))}`;
  record.push(
    `${s.handle}: eval ${expr.slice(0, 120)} → ${said.slice(0, 240)}`,
  );
  return said;
}

const refusedOf = (r: CommandResult): { reason: string } | undefined =>
  (r.notes as Array<{ kind: string; reason?: string }>).find(
    (n) => n.kind === "refused",
  ) as { reason: string } | undefined;

afterAll(async () => {
  await stage(PUMP_DOOR, "setOpen", false).catch(() => undefined);
  await stage(PUMP_DOOR, "setLocked", true).catch(() => undefined);
  for (const s of open) s.close();
  console.log(`\n── call-security drive record ──\n${record.join("\n")}\n`);
});

suite("⭐⭐ a protective act decides on who is acting", () => {
  let ryn: Session;
  let sol: Session;
  let jugId: string;
  let titles: { extent: string; owner: string }[] = [];

  /** Re-point the `name` view's controller through the CMS, as its titleholder. */
  const repoint = async (controller: string): Promise<void> => {
    const headers = { cookie: sol.cookie };
    const base = process.env.WIRE_SERVER_URL!;
    const { token } = (await (
      await fetch(`${base}/api/cms/csrf`, { headers })
    ).json()) as { token: string };
    const read = (await (
      await fetch(
        `${base}/api/cms/read?backend=document&path=${encodeURIComponent(NAME_VIEW)}`,
        { headers },
      )
    ).json()) as { content?: string; body?: string };
    const data = JSON.parse(read.content ?? read.body ?? "") as Record<
      string,
      unknown
    >;
    const res = await fetch(`${base}/api/cms/write`, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/json",
        "X-CMS-CSRF": token,
      },
      body: JSON.stringify({
        backend: "document",
        path: NAME_VIEW,
        body: JSON.stringify({ ...data, controller }),
      }),
    });
    expect(
      res.status,
      `the CMS took ${NAME_VIEW}: ${await res.clone().text()}`,
    ).toBe(200);
  };

  beforeAll(async () => {
    // Ryn MADE the jug (a made thing is its maker's to name).
    const opened = await Session.openAtRoster(uniqueHandle("csryn"), {
      startLocation: SQUARE,
    });
    ryn = opened.session;
    open.push(ryn);
    await ryn.play(opened.playerId);
    await ryn.drainProse();
    jugId = await hand(ryn, JUG, {
      maker: `/platform/agent/Avatar/${opened.playerId}`,
    });
    // Sol holds title over the `name` view's covering parcel for the step
    // (the controller-liquidity drive's method), and is a wizard for `eval`.
    const probe = await session(uniqueHandle("csprobe"), SQUARE, {
      wizard: true,
      committees: [TERMINUS],
    });
    const said = await evalSaid(
      probe,
      `JSON.stringify(((p) => ({ extent: p.getExtent(), owner: JSON.stringify(p.getOwner()) }))(ParcelApi.coveringParcelOfSync('${NAME_VIEW}')))`,
    );
    const m = /: "(.*)"$/.exec(said);
    titles = m
      ? [
          JSON.parse(JSON.parse(`"${m[1]}"`)) as {
            extent: string;
            owner: string;
          },
        ]
      : [];
    probe.close();
    sol = await session(uniqueHandle("cssol"), SQUARE, {
      wizard: true,
      committees: [TERMINUS],
      parcels: titles.map((t) => t.extent),
    });
  }, 300_000);

  afterAll(async () => {
    await repoint(NAME_SHIPPED).catch(() => undefined);
    for (const t of titles)
      await evalSaid(
        sol,
        `(await ParcelApi.transfer('${t.extent}', ${t.owner}), true)`,
        t.extent,
      );
  });

  it("1. [instant · player] an honest name: Ryn names the jug she holds", async () => {
    const { r, w } = await say(ryn, `name #${jugId} Mother`);
    expect(r.status, w).not.toBe("declined");
    expect(w).not.toMatch(/can't act for/i);
  });

  it("2. [staged] a replaced `name` controller that claims Ryn is acting is refused, worded, and its keeper is told", async () => {
    // Ryn sets the jug down where Sol can reach it; it is still hers.
    await say(ryn, `drop #${jugId}`);
    await repoint(NAME_LIAR);
    try {
      // ⚠ A session's commands load at login: the lie is told by someone who
      // arrives AFTER the re-point (the controller-liquidity drive's method).
      const mal = await session(uniqueHandle("csmal"), SQUARE);
      const { r, w } = await say(mal, `name #${jugId} Mal's`);
      expect(w).toMatch(/You can't act for/);
      expect(refusedOf(r)?.reason).toBe("not-acting-for");
      // Nothing changed: the jug is still Mother.
      const look = squash(await ryn.prose(`look #${jugId}`));
      expect(look).toMatch(/Mother/);
      expect(look).not.toMatch(/Mal's/);
      // The keeper of the code reads it.
      const listed = await sol.cmd("errors");
      await listed.said();
      const diag = squash(sol.diagnostics());
      record.push(`${sol.handle}: errors → ${diag.slice(0, 240)}`);
      expect(diag).toMatch(
        /call-security \/platform\/idea\/cmd\/system\/ClaimProbeController — .*claimed to act for/,
      );
    } finally {
      await repoint(NAME_SHIPPED);
    }
  });

  it("3. [staged] `eval` naming somebody else as the actor is refused; the door stays locked", async () => {
    await stage(PUMP_DOOR, "setOpen", false);
    await stage(PUMP_DOOR, "setLocked", true);
    const said = await evalSaid(
      sol,
      `StuffApi.findByTemplatePath('${PUMP_DOOR}').unlock(PlayerApi.findAvatarByName('${ryn.handle}'))`,
    );
    record.push(`step 3 said: ${said}`);
    expect(said).toMatch(/not-acting-for|can't act for/i);
    const locked = await evalSaid(
      sol,
      `StuffApi.findByTemplatePath('${PUMP_DOOR}').isLocked()`,
    );
    expect(locked).toMatch(/true/);
  });

  it("4. [instant · player] an honest gate still opens: the thumb-turn inside the pump house", async () => {
    const inside = await session(uniqueHandle("cshouse"), PUMP_HOUSE);
    const { w } = await say(inside, "unlock out");
    expect(w).not.toMatch(/can't act for/i);
    await stage(PUMP_DOOR, "setLocked", true);
  });
});

suite(
  "⭐⭐ a body is asked: the realtor puts a purchase through only on the buyer’s yes",
  () => {
    type PromptNote = {
      kind?: string;
      label?: string;
      choices?: Array<{ label?: string; response?: unknown }>;
    };
    type PromptBody = { promptId?: string; outcome?: { notes?: PromptNote[] } };
    /** A prompt frame's id and its `prompt-*` note (the frame or its payload). */
    const read = (prompt: unknown): { id: string; note: PromptNote } => {
      const frame = prompt as PromptBody & { payload?: PromptBody };
      const body = frame.payload?.promptId ? frame.payload : frame;
      const note =
        body.outcome?.notes?.find((n) => n.kind?.startsWith("prompt-")) ?? {};
      return { id: body.promptId ?? "", note };
    };

    /** Walk Ricky's tree to the buy, answer the lot, and return the gate's question. */
    const toTheGate = async (
      buyer: Session,
    ): Promise<{ id: string; label: string; heard: string }> => {
      const talked = await buyer.cmd("talk to agent");
      record.push(
        `${buyer.handle}: talk to agent → ${talked.status} · ${squash(await talked.said()).slice(0, 120)}`,
      );
      for (let i = 0; i < 6; i++) {
        const { id, note } = read(await buyer.awaitPrompt(30_000));
        const labels = (note.choices ?? []).map((c) => c.label ?? "");
        record.push(
          `${buyer.handle}: ${note.kind} ${note.label ?? ""} ${JSON.stringify(labels)}`.slice(
            0,
            300,
          ),
        );
        if (
          note.kind === "prompt-confirm" &&
          /would have you run/.test(note.label ?? "")
        ) {
          // What the realtor said before the engine asked — the terms.
          const heard = squash(await buyer.listen(800, { sinceDrain: true }));
          record.push(
            `${buyer.handle}: heard before the question → ${heard.slice(0, 200)}`,
          );
          return { id, label: note.label!, heard };
        }
        const buy = note.choices?.find((c) =>
          /buy (a|one)/i.test(c.label ?? ""),
        );
        if (buy) {
          buyer.answerPrompt(id, buy.response);
          continue;
        }
        if (/which lot/i.test(note.label ?? "")) {
          buyer.answerPrompt(
            id,
            note.choices!.find((c) => c.response !== "")!.response,
          );
          continue;
        }
        // Anything else (the closing beat): take the first way out.
        buyer.answerPrompt(id, note.choices?.[0]?.response ?? "no");
      }
      throw new Error("the gate never asked");
    };

    /** A funded stranger (the tracts drive's method): an account, and the Governor's override into it. */
    const funded = async (handle: string, zorkmids = 20_000): Promise<void> => {
      const s = await Session.open(handle, { startLocation: BANK_HALL });
      await s.drainProse();
      await say(s, "bank open");
      const gov = await Session.open("founder", { startLocation: BANK_HALL });
      await say(
        gov,
        `reserve override ${zorkmids} to ${handle} "wire: call-security funding"`,
      );
      gov.close();
      s.close();
    };

    /** End a conversation: answer what is still open, and walk away. */
    const leave = async (buyer: Session): Promise<void> => {
      for (let i = 0; i < 3; i++) {
        try {
          const { id, note } = read(await buyer.awaitPrompt(4_000));
          buyer.answerPrompt(
            id,
            note.choices?.find((c) => /thanks|goodbye/i.test(c.label ?? ""))
              ?.response ??
              note.choices?.[0]?.response ??
              "no",
          );
        } catch {
          break;
        }
      }
      buyer.close();
    };

    beforeAll(async () => {
      // ⭐ Work by daylight (the assembly drive's method): the world boots at
      // midnight and the office is dark at night — in the dark the buyer
      // cannot see Ricky to talk to him. Noon is inside his hours too.
      const { after } = await advanceWorldClock("0 seconds");
      const tod = ((after % 86_400) + 86_400) % 86_400;
      if (tod < 9 * 3600 || tod > 15 * 3600) {
        await advanceWorldClock(
          `${Math.ceil(((12 * 3600 - tod + 86_400) % 86_400) / 60)} minutes`,
        );
      }
      const watcher = await session(uniqueHandle("cswatch"), REALTY);
      const seen = squash(await watcher.prose("look agent"));
      record.push(`ricky at the desk (tod ${tod}s): ${seen.slice(0, 160)}`);
    }, 600_000);

    it("7. [instant · player] yes: the gate asks in the engine’s words, and the plot is the buyer’s", async () => {
      const handle = uniqueHandle("csiris");
      await funded(handle);
      const iris = await session(handle, REALTY);
      try {
        const ask = await toTheGate(iris);
        expect(ask.label).toMatch(
          /would have you run `title buy [^`]+`\. Let them\?/,
        );
        // As the buyer knows him: a stranger, never his name (B23).
        expect(ask.label).toMatch(/^a land agent\b/);
        expect(ask.label).not.toMatch(/Ricky/);
        // The realtor stated the price in his own words, to HER.
        expect(ask.heard).toMatch(
          /zorkmids, freehold\. I'll put it through for you/,
        );
        const lot = /`title buy ([^`]+)`/.exec(ask.label)![1]!;
        iris.answerPrompt(ask.id, 'yes');
        const told = squash(await iris.listen(4_000));
        record.push(`${iris.handle}: after yes → ${told.slice(0, 240)}`);
        const held = squash(await iris.prose("title"));
        record.push(`${iris.handle}: title → ${held.slice(0, 200)}`);
        // ⭐ B2: the lot is HERS — not "You hold no ground".
        expect(held).not.toMatch(/You hold no ground/);
        expect(held).toContain(lot);
      } finally {
        await leave(iris);
      }
    }, 300_000);

    it("8. [instant · player] no: nothing is bought, and the realtor says no hurry", async () => {
      const june = await session(uniqueHandle("csjune"), REALTY);
      try {
        const ask = await toTheGate(june);
        june.answerPrompt(ask.id, 'no');
        const heard = squash(await june.listen(3_000));
        record.push(`${june.handle}: after no → ${heard.slice(0, 200)}`);
        expect(heard).toMatch(/No hurry/);
      } finally {
        await leave(june);
      }
    }, 300_000);

    it("9. [staged] code driving another body: `say` is refused outright, and nobody is asked", async () => {
      const wiz = await session(uniqueHandle("cswiz"), BANK, {
        wizard: true,
        committees: [TERMINUS],
      });
      const ryn = await session(uniqueHandle("csryn2"), BANK);
      const said = await evalSaid(
        wiz,
        `PlayerApi.findAvatarByName('${ryn.handle}').forceCommand('say hello')`,
      );
      expect(said).toMatch(
        /not-compellable|Nobody can make|sandbox boundary denied/i,
      );
      const heard = squash(await ryn.listen(1_500));
      expect(heard).not.toMatch(/hello/);
    });
  },
);
