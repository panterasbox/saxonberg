/**
 * MaterialCatalogue — the self-warming material roster (the boot()-
 * retirement shape, MaturationProfileCatalogue precedent): onCreate
 * stands up every `Material` row and skips the FolderZone folders, and
 * the platform pack's boot manifest is what makes it EAGER (asserted
 * on the pack.yaml — the wiring is the part that silently rots).
 * Plus the residency veto: a culled material would be a null read
 * until the next process, so it is never culled.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import MaterialCatalogue from "../idea/MaterialCatalogue";
import { StuffApi } from "../../api/stuff";
import { Template } from "../../lib/stuff/Template";
import Material from "../../lib/material/Material";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("the roster warm", () => {
  it("onCreate stands up Material rows and skips the FolderZone folders", async () => {
    vi.spyOn(Template, "findByPathInfix").mockResolvedValue([
      { path: "/stuff/idea/material/wood", class: "/platform/idea/FolderZone" },
      { path: "/stuff/idea/material/wood/oak", class: "/platform/idea/material/Material" },
      { path: "/stuff/idea/material/element/uranium", class: "/platform/idea/material/RadioactiveMaterial" },
      // ⭐ A `Muscle` row warms for the same reason uranium does: the
      // filter is "its class extends `Material`", never a list of classes
      // or of roots. ⚠ Asserted because the reference-Idea roster has gone
      // inert THREE times in this repo — a muscle nothing warms is a cut
      // with no texture, silently.
      { path: "/stuff/idea/material/tissue/muscles/loin", class: "/platform/idea/material/Muscle" },
    ] as unknown as Template[]);
    const stood: string[] = [];
    vi.spyOn(StuffApi, "singleton").mockImplementation(async (path: string) => {
      stood.push(path);
      return makeStuff(() => new Material()) as never;
    });

    const catalogue = makeStuff(() => new MaterialCatalogue());
    await catalogue.onCreate();
    expect(stood).toEqual([
      "/stuff/idea/material/wood/oak",
      "/stuff/idea/material/element/uranium",
      "/stuff/idea/material/tissue/muscles/loin",
    ]);
    expect(Template.findByPathInfix).toHaveBeenCalledWith("/idea/material/");
  });

  it("tolerates a single failed standup and continues (the preloadAnatomy shape)", async () => {
    vi.spyOn(Template, "findByPathInfix").mockResolvedValue([
      { path: "/stuff/idea/material/bad", class: "/platform/idea/material/Material" },
      { path: "/stuff/idea/material/good", class: "/platform/idea/material/Material" },
    ] as unknown as Template[]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(StuffApi, "singleton").mockImplementation(async (path: string) => {
      if (path.endsWith("bad")) throw new Error("boom");
      return makeStuff(() => new Material()) as never;
    });
    const catalogue = makeStuff(() => new MaterialCatalogue());
    expect(await catalogue.warm()).toBe(1);
  });

  it("the platform pack boots it eagerly (the wiring assert)", () => {
    const src = readFileSync(
      fileURLToPath(
        new URL("../../../../../content/platform/pack.yaml", import.meta.url),
      ),
      "utf-8",
    );
    expect(src).toMatch(/template: \/platform\/idea\/MaterialCatalogue/);
  });
});

describe("Material residency veto", () => {
  it("a material reference singleton is never culled", () => {
    const m = makeStuff(() => new Material());
    const verdict = m.canEvict({} as never);
    expect(verdict.ok).toBe(false);
  });
});
