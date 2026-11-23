/**
 * ⭐⭐ The call-security drive — the CONTENT half (test-world-lifecycle D8).
 *
 * Steps 7 and 8 of the call-security pass's drive, moved here unchanged when
 * the file was split: a body is asked before the realtor puts a purchase
 * through, which needs Terminus's realty office, Ricky and the Hinkley Hills
 * plat book — no scaffold place sells land. The kernel steps are in
 * `call-security-pass.wire.test.ts`. Build 2's to move.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from "vitest";
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  advanceWorldClock,
} from "../src/harness";
import type { CommandResult } from "../src/harness";

export const DIRTY_REASON =
  "buys a Hinkley Hills lot through the realtor (the plat book only the " +
  "increment re-lists)";

declareFile({
  file: "call-security-pass-content.dirty.wire.test.ts",
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

const REALTY = "/world/terminus/realty/office";
const BANK_HALL = "/world/terminus/counting-houses/banking-hall";

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

afterAll(async () => {
  for (const s of open) s.close();
  console.log(`\n── call-security (content) drive record ──\n${record.join("\n")}\n`);
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

  },
);
