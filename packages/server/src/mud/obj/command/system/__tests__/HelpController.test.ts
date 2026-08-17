/**
 * HelpController — every form renders off the index through HelpApi, on
 * the `shell.result` topic.
 *
 * Covers: bare `help` landing; fallthrough `help look`; legacy `help verb
 * look`; `help api ContainmentApi.move` (real signature + summary, not the
 * old placeholder); `help search <q>` grouped by kind; and the
 * unknown-command rejection note.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { HelpTopic } from "@saxonberg/types";
import HelpController from "../HelpController";
import { CommandApi, type CommandModel } from "../../../../api/command";
import type { CommandContext } from "../../../../api/command";
import type { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { HelpApi } from "../../../../api/help";
import { StuffApi } from "../../../../api/stuff";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";

function topic(id: string, body: string): HelpTopic {
  return {
    id,
    kind: id.startsWith("command.") ? "command" : "api",
    title: id.split(".").slice(1).join("."),
    summary: "",
    keywords: [],
    body,
    relations: [],
    spoiler: false,
    source: { subdivision: "api", ref: id },
  };
}

describe("HelpController", () => {
  let topicName: string | undefined;
  let selfBody: unknown;

  beforeEach(() => {
    topicName = undefined;
    selfBody = undefined;
    vi.spyOn(MessageApi, "scene").mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = (t: string) => {
        topicName = t;
        return b;
      };
      // ⭐ `meta({ carded: true })` — the marker `shell.result` filters on.
      b.meta = () => b;
      b.toSelf = (body: unknown) => {
        selfBody = body;
        return b;
      };
      b.send = () => {};
      return b as never;
    });
    vi.spyOn(HelpApi, "index").mockReturnValue({
      entries: [],
      categories: [
        { kind: "command", title: "Commands", count: 3 },
        { kind: "mixin", title: "Mixins", count: 90 },
      ],
    });
    vi.spyOn(HelpApi, "commandTopic").mockImplementation((verb: string) =>
      verb === "look" ? topic("command.look", "LOOK: Look around\n\nSyntax:\n  look [item]") : null
    );
    vi.spyOn(HelpApi, "apiTopic").mockImplementation((target: string) =>
      target === "ContainmentApi.move"
        ? topic(
            "api.ContainmentApi.move",
            "move(item: Stuff & Containable, to: Container): void\n\nMove an item into a container."
          )
        : null
    );
    vi.spyOn(HelpApi, "search").mockReturnValue({
      query: "channel",
      groups: [
        {
          kind: "command",
          hits: [{ id: "command.chat", kind: "command", title: "chat", summary: "talk on a channel", keywords: [] }],
        },
        {
          kind: "mixin",
          hits: [{ id: "mixin.Forums", kind: "mixin", title: "Forums", summary: "channel boards", keywords: [] }],
        },
      ],
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function run(model: Partial<CommandModel>): { topic?: string; body: string } {
    const ctrl = makeStuff(() => new HelpController());
    const ctx = CommandApi.createCommandContext({
      commandGiver: {} as never,
      location: null,
      commandText: "help",
      executionId: "e",
      commandId: "c",
      verb: "help",
      command: undefined as unknown as CommandDefinition,
    });
    ctrl.execute(model as CommandModel, ctx as CommandContext);
    return { topic: topicName, body: (selfBody as Mml)?.toString() ?? "" };
  }

  it("bare `help` renders the landing/index on shell.result", () => {
    const out = run({});
    expect(out.topic).toBe("shell.result");
    expect(out.body).toContain("Commands");
    expect(out.body).toContain("90"); // mixin count from the index
  });

  it("fallthrough `help look` renders the command topic", () => {
    const out = run({ topic: "look" });
    expect(out.body).toContain("LOOK: Look around");
  });

  it("legacy `help verb look` still resolves the command topic", () => {
    const out = run({ subcommand: "verb", name: "look" });
    expect(out.body).toContain("LOOK: Look around");
  });

  it("`help api ContainmentApi.move` renders a real signature + summary", () => {
    const out = run({ subcommand: "api", target: "ContainmentApi.move" });
    expect(out.body).toContain("move(item: Stuff & Containable, to: Container): void");
    expect(out.body).toContain("Move an item into a container.");
    expect(out.body).not.toContain("not yet indexed");
  });

  it("`help search` renders results grouped by kind", () => {
    const out = run({ subcommand: "search", query: "channel" });
    expect(out.body).toContain("command:");
    expect(out.body).toContain("chat");
    expect(out.body).toContain("mixin:");
    expect(out.body).toContain("Forums");
  });

  it("an unknown command emits a controller-rejected note", () => {
    const ctrl = makeStuff(() => new HelpController());
    const notes: { kind: string }[] = [];
    const ctx = CommandApi.createCommandContext({
      commandGiver: {} as never,
      location: null,
      commandText: "help nope",
      executionId: "e",
      commandId: "c",
      verb: "help",
      command: undefined as unknown as CommandDefinition,
    });
    const realNote = ctx.note.bind(ctx);
    vi.spyOn(ctx, "note").mockImplementation((n) => {
      notes.push(n as { kind: string });
      realNote(n);
    });
    ctrl.execute({ topic: "nope" } as CommandModel, ctx as CommandContext);
    expect(notes.some((n) => n.kind === "controller-rejected")).toBe(true);
  });
});
