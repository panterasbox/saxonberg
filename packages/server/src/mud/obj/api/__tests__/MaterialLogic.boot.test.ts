/**
 * MaterialApi.boot — the boot-time roster warm that closes the live
 * materials gap: every authored `/lib/material/**` Material stands up as
 * a live singleton (folder rows — FolderZones — are the zone substrate's,
 * skipped), so the sync resolve-on-read seams hit from the first frame.
 * Plus the residency veto: a culled material would be a null read until
 * the next process, so it is never culled.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { MaterialApi } from "../../../api/material";
import { StuffApi } from "../../../api/stuff";
import { Template } from "../../../lib/stuff/Template";
import Material from "../../../lib/material/Material";
import { makeStuff } from "../../../lib/security/__tests__/test-setup";

afterEach(() => vi.restoreAllMocks());

describe("MaterialApi.boot — the roster warm", () => {
  it("stands up Material rows and skips the FolderZone folders", async () => {
    vi.spyOn(Template, "findDescendants").mockResolvedValue([
      { path: "/lib/material/wood", class: "/lib/zone/FolderZone" },
      { path: "/lib/material/wood/oak", class: "/lib/material/Material" },
      { path: "/lib/material/element/uranium", class: "/lib/material/RadioactiveMaterial" },
    ] as unknown as Template[]);
    const stood: string[] = [];
    vi.spyOn(StuffApi, "singleton").mockImplementation(async (path: string) => {
      stood.push(path);
      return makeStuff(() => new Material()) as never;
    });

    const count = await MaterialApi.boot();
    expect(count).toBe(2);
    expect(stood).toEqual([
      "/lib/material/wood/oak",
      "/lib/material/element/uranium",
    ]);
  });

  it("tolerates a single failed standup and continues (the preloadAnatomy shape)", async () => {
    vi.spyOn(Template, "findDescendants").mockResolvedValue([
      { path: "/lib/material/bad", class: "/lib/material/Material" },
      { path: "/lib/material/good", class: "/lib/material/Material" },
    ] as unknown as Template[]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(StuffApi, "singleton").mockImplementation(async (path: string) => {
      if (path.endsWith("bad")) throw new Error("boom");
      return makeStuff(() => new Material()) as never;
    });
    expect(await MaterialApi.boot()).toBe(1);
  });
});

describe("Material residency veto", () => {
  it("a material reference singleton is never culled", () => {
    const m = makeStuff(() => new Material());
    const verdict = m.canEvict({} as never);
    expect(verdict.ok).toBe(false);
  });
});
