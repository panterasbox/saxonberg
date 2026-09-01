/**
 * HelpCatalogue — the boot-warmed help index, driven through injectable
 * `warm({ commandDefs, surface })` fixtures (no disk, no boot).
 *
 * Covers: both projectors warm; command body == getHelpText(); the
 * COMPLETE mixin roster (every Mixins entry → a topic); the Container
 * mixin's typed relations (confers / composes / consumed-by); a real
 * api-member body (signature + summary); cross-subdivision search +
 * typeahead; and the surface-absent degrade path (one warning).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HelpCatalogue, { type AuthorSurface } from "../idea/HelpCatalogue";
import { Mixins } from "../../lib/mixin";
import { StuffApi } from "../../api/stuff";
import { makeStuff } from "../../lib/security/__tests__/test-setup";
import type { CommandDefinition } from "../../lib/command/CommandDefinition";

/** A duck-typed CommandDefinition sufficient for the commands projector. */
function fakeDef(
  verbs: string[],
  description: string,
  helpText: string
): CommandDefinition {
  return {
    verbs,
    description,
    getPrimaryVerb: () => verbs[0] ?? "",
    getHelpText: () => helpText,
  } as unknown as CommandDefinition;
}

const COMMANDS: CommandDefinition[] = [
  fakeDef(
    ["look", "l"],
    "Look at your surroundings",
    "LOOK: Look at your surroundings\n\nSyntax:\n  look [item]"
  ),
  fakeDef(
    ["move", "go"],
    "Move an item somewhere",
    "MOVE: Move an item somewhere\n\nSyntax:\n  move item"
  ),
];

const SURFACE: AuthorSurface = {
  consumer: [
    // Container mixin (stuff-methods, face === concept).
    {
      kind: "stuff-method",
      module: "lib/spatial/Container",
      face: "Container",
      name: "getContents",
      qualified: "lib/spatial/Container#Container.getContents",
      signature: "getContents(): Stuff[]",
      summary: "The items this container holds.",
      signatureTypes: ["Stuff"],
    },
    {
      kind: "stuff-method",
      module: "lib/spatial/Container",
      face: "Container",
      name: "addContainable",
      qualified: "lib/spatial/Container#Container.addContainable",
      signature: "addContainable(item: Containable): void",
      summary: "Add an item to this container.",
      signatureTypes: ["Containable"],
    },
    // ContainmentApi (api-static).
    {
      kind: "api-static",
      module: "api/containment",
      face: "ContainmentApi",
      name: "move",
      qualified: "api/containment#ContainmentApi.move",
      signature: "move(item: Stuff & Containable, to: Container): void",
      summary: "Move an item into a container.",
      signatureTypes: ["Container", "Containable"],
    },
  ],
  extension: [],
  types: [{ id: 900, name: "Grade", module: "lib/craft/Grade", kind: 128 }],
};

async function warmed(): Promise<HelpCatalogue> {
  const cat = makeStuff(() => new HelpCatalogue());
  // `schema: []` — the collection projector has its own file; this one
  // is about the command and api projectors, and loading 48 docs plus
  // their owner classes here would be cost with no assertion. Empty
  // rather than `null` so the degrade WARNING stays this file's other
  // test's business.
  await cat.warm({ commandDefs: COMMANDS, surface: SURFACE, schema: [] });
  return cat;
}

describe("HelpCatalogue", () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("builds a command topic whose body equals getHelpText()", async () => {
    const cat = await warmed();
    const topic = cat.getTopic("command.look");
    expect(topic).not.toBeNull();
    expect(topic!.body).toBe(COMMANDS[0]!.getHelpText());
    expect(topic!.summary).toBe("Look at your surroundings");
    expect(topic!.keywords).toContain("l"); // alias in the typeahead corpus
  });

  it("emits a topic for EVERY Mixins registry entry (complete roster)", async () => {
    const cat = await warmed();
    for (const value of Object.values(Mixins)) {
      const concept = value.endsWith("Mixin")
        ? value.slice(0, -"Mixin".length)
        : value;
      expect(
        cat.getTopic(`mixin.${concept}`),
        `missing mixin topic for ${concept}`
      ).not.toBeNull();
    }
  });

  it("degrades an undocumented mixin to a bare topic", async () => {
    const cat = await warmed();
    // Bank has no authored consumer members in the fixture surface.
    const bank = cat.getTopic("mixin.Bank");
    expect(bank).not.toBeNull();
    expect(bank!.body).toContain("(no authored documentation)");
  });

  it("carries confers / composes / consumed-by on the Container mixin", async () => {
    const cat = await warmed();
    const container = cat.getTopic("mixin.Container");
    expect(container).not.toBeNull();
    const kinds = new Set(container!.relations.map((r) => r.kind));
    expect(kinds).toContain("confers");
    expect(kinds).toContain("composes");
    expect(kinds).toContain("consumed-by");
    // composes → Containable; consumed-by → ContainmentApi.
    expect(
      container!.relations.some(
        (r) => r.kind === "composes" && r.targetId === "mixin.Containable"
      )
    ).toBe(true);
    expect(
      container!.relations.some(
        (r) => r.kind === "consumed-by" && r.targetId === "api.ContainmentApi"
      )
    ).toBe(true);
  });

  it("renders a real api-member body (signature + summary)", async () => {
    const cat = await warmed();
    const topic = cat.findApiTopic("ContainmentApi.move");
    expect(topic).not.toBeNull();
    // The body is escaped to valid MML at assembly, so the `&` in the
    // signature is carried as the `&amp;` entity (the client decodes it).
    expect(topic!.body).toContain(
      "move(item: Stuff &amp; Containable, to: Container): void"
    );
    expect(topic!.body).toContain("Move an item into a container.");
    // method-of → the api landing; requires → the mixin/type it names.
    expect(topic!.relations.some((r) => r.kind === "method-of")).toBe(true);
    expect(
      topic!.relations.some(
        (r) => r.kind === "requires" && r.targetId === "mixin.Container"
      )
    ).toBe(true);
  });

  it("searches across summary+body and resolves both subdivisions", async () => {
    const cat = await warmed();
    // 'item' appears in the `move` command body AND the ContainmentApi
    // member summary/body.
    const groups = cat.search("item");
    const kinds = groups.map((g) => g.kind);
    expect(kinds).toContain("command");
    expect(kinds).toContain("api");
  });

  it("typeahead matches across title+keywords+kind", async () => {
    const cat = await warmed();
    // 'contain' is a prefix of the Container mixin title.
    const hits = cat.typeaheadMatch("contain");
    expect(hits.some((h) => h.id === "mixin.Container")).toBe(true);
    // kind token match.
    expect(cat.typeaheadMatch("command").length).toBeGreaterThan(0);
  });

  it("exposes categories with per-kind counts", async () => {
    const cat = await warmed();
    const cats = cat.categories();
    const command = cats.find((c) => c.kind === "command");
    expect(command?.count).toBe(2);
    expect(cats.some((c) => c.kind === "mixin")).toBe(true);
  });

  it("degrades when author-surface is absent (one warning, no api topics)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cat = makeStuff(() => new HelpCatalogue());
    await cat.warm({ commandDefs: COMMANDS, surface: null, schema: [] });

    expect(cat.getTopic("command.look")).not.toBeNull(); // commands unaffected
    expect(cat.listByKind("mixin")).toEqual([]);
    expect(cat.listByKind("api")).toEqual([]);
    expect(cat.listByKind("type")).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain("author-surface.json absent");
  });
});
