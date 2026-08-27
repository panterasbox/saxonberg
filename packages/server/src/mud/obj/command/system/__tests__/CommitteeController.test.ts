/**
 * CommitteeController — the `committee` verb over a spied CompactApi:
 * bare show (group/subdivision/members/channel-link), explicit path
 * arg, the no-committee rejection, and `channel` (ensure + name /
 * no-committee rejection).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CommitteeController from "../CommitteeController";
import { CompactApi } from "../../../../api/compact";
import { MessageApi } from "../../../../api/message";
import { StuffApi } from "../../../../api/stuff";
import { ShadowApi } from "../../../../api/shadow";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { NPC } from "../../../../lib/npc/NPC";
import Location from "../../../../lib/stuff/Location";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../lib/security/__tests__/test-setup";

class TestLocation extends Location {}

let captured: string[];

function captureScenes(): void {
  captured = [];
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: { toString(): string }) => {
      captured.push(String(body));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function ctx(
  giver: Stuff,
  location: Stuff
): CommandContext & { note: ReturnType<typeof vi.fn> } {
  return {
    commandGiver: giver,
    location,
    note: vi.fn(),
  } as unknown as CommandContext & { note: ReturnType<typeof vi.fn> };
}

async function run(
  giver: Stuff,
  model: CommandModel,
  context: CommandContext
): Promise<void> {
  await withRootContext(null, "committee-verb.test", () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return makeStuff(() => new CommitteeController()).execute(
      model as never,
      context
    );
  });
}

const COMMITTEE = {
  kind: "group" as const,
  name: "terminus",
  groupRef: "managed:g1",
  subdivisionPath: "/world/terminus/registry",
};

describe("CommitteeController", () => {
  let giver: Stuff;
  let room: Stuff;

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    room = makeStuffAtPath(
      () => new TestLocation(),
      "/world/terminus/registry/office"
    );
    giver = makeStuff(() => new NPC());
    captureScenes();
    vi.spyOn(CompactApi, "committeeMembersOf").mockResolvedValue([]);
    vi.spyOn(CompactApi, "committeeChannelOf").mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bare `committee` shows the committee over where you stand", async () => {
    const spy = vi
      .spyOn(CompactApi, "committeeOf")
      .mockResolvedValue(COMMITTEE);
    await run(giver, {} as CommandModel, ctx(giver, room));
    expect(spy).toHaveBeenCalledWith("/world/terminus/registry/office");
    const out = captured.join("\n");
    expect(out).toContain("Committee of record: terminus");
    expect(out).toContain("/world/terminus/registry");
    expect(out).toContain("none online");
    expect(out).toContain("mudcmd:committee channel");
  });

  it("`committee <path>` asks about the explicit path", async () => {
    const spy = vi
      .spyOn(CompactApi, "committeeOf")
      .mockResolvedValue(COMMITTEE);
    await run(
      giver,
      { path: "/world/lounge" } as CommandModel,
      ctx(giver, room)
    );
    expect(spy).toHaveBeenCalledWith("/world/lounge");
  });

  it("rejects honestly when the subdivision is personally held", async () => {
    vi.spyOn(CompactApi, "committeeOf").mockResolvedValue(null);
    const context = ctx(giver, room);
    await run(giver, {} as CommandModel, context);
    expect(captured.join("\n")).toContain("personally held");
    expect(context.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-committee" })
    );
  });

  it("`committee channel` ensures and names the channel", async () => {
    vi.spyOn(CompactApi, "ensureCommitteeChannel").mockResolvedValue({
      name: "terminus-committee",
    });
    await run(
      giver,
      { subcommand: "channel" } as CommandModel,
      ctx(giver, room)
    );
    expect(captured.join("\n")).toContain(
      "The committee's channel is terminus-committee"
    );
  });

  it("`committee channel` rejects when there is no committee", async () => {
    vi.spyOn(CompactApi, "ensureCommitteeChannel").mockResolvedValue(null);
    const context = ctx(giver, room);
    await run(
      giver,
      { subcommand: "channel" } as CommandModel,
      context
    );
    expect(context.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-committee" })
    );
  });
});
