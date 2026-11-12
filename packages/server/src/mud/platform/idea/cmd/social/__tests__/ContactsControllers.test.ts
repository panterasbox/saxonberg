/**
 * The `contacts` controllers — `remove` and `show` read a player's name
 * off the identity substrate (C73): the live body's presentation, else
 * the stored name — never a per-player template row, which a minted
 * character does not have. `remove` matches the name the entry goes by.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ContactsRemoveController from "../ContactsRemoveController";
import ContactsShowController from "../ContactsShowController";
import { MixinApi } from "../../../../../api/mixin";
import { PlayerApi } from "../../../../../api/player";
import { MessageApi } from "../../../../../api/message";
import { Template } from "../../../../../lib/stuff/Template";
import { makeStuff } from "../../../../../lib/security/__tests__/test-setup";
import type { CommandContext } from "../../../../../api/command";

type Entry = { kind: "avatar"; playerId: string } | { kind: "npc"; templatePath: string };

describe("contacts controllers (C73 — names from the identity substrate)", () => {
  let entries: Entry[];
  let removed: string[];
  let said: string[];
  let note: ReturnType<typeof vi.fn>;
  let ctx: CommandContext;

  beforeEach(() => {
    entries = [
      { kind: "avatar", playerId: "p-aria" },
      { kind: "avatar", playerId: "p-bram" },
      { kind: "npc", templatePath: "/stuff/agent/katie" },
    ];
    removed = [];
    said = [];
    const host = {
      contactsByLabel: () => entries,
      removeContact: (_kind: string, ref: string) => {
        removed.push(ref);
        return true;
      },
    };
    vi.spyOn(MixinApi, "isContacts").mockReturnValue(true as never);
    vi.spyOn(PlayerApi, "findAvatarByPlayerId").mockImplementation(((id: string) =>
      id === "p-aria" ? { getPresentation: () => "Aria" } : undefined) as never);
    vi.spyOn(PlayerApi, "storedNameOf").mockImplementation((async (id: string) =>
      id === "p-bram" ? "Bram" : null) as never);
    vi.spyOn(Template, "findByPaths").mockResolvedValue([
      { path: "/stuff/agent/katie", data: { name: "Katie" } },
    ] as never);
    vi.spyOn(MessageApi, "scene").mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = (m: unknown) => {
        said.push(String(m));
        return b;
      };
      b.send = () => {};
      return b as never;
    });
    note = vi.fn();
    ctx = { commandGiver: host as never, note } as unknown as CommandContext;
  });

  afterEach(() => vi.restoreAllMocks());

  it("remove matches an offline player by their stored name", async () => {
    await makeStuff(() => new ContactsRemoveController()).execute(
      { target: "bram", label: "friends" } as never,
      ctx,
    );
    expect(removed).toEqual(["p-bram"]);
  });

  it("remove matches an online player by their presentation, and an NPC by its row's name", async () => {
    await makeStuff(() => new ContactsRemoveController()).execute(
      { target: "Aria", label: "friends" } as never,
      ctx,
    );
    await makeStuff(() => new ContactsRemoveController()).execute(
      { target: "katie", label: "friends" } as never,
      ctx,
    );
    expect(removed).toEqual(["p-aria", "/stuff/agent/katie"]);
  });

  it("remove still takes the raw id", async () => {
    await makeStuff(() => new ContactsRemoveController()).execute(
      { target: "p-bram", label: "friends" } as never,
      ctx,
    );
    expect(removed).toEqual(["p-bram"]);
  });

  it("show prints names, never player ids", async () => {
    await makeStuff(() => new ContactsShowController()).execute(
      { label: "friends" } as never,
      ctx,
    );
    const text = said.join("\n");
    expect(text).toContain("Aria");
    expect(text).toContain("Bram");
    expect(text).toContain("Katie (NPC)");
    expect(text).not.toContain("p-bram");
    expect(note).not.toHaveBeenCalled();
  });
});
