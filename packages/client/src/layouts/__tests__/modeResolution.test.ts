/**
 * The frame resolves from the cockpit's TWO axes.
 *
 * ⚠⚠ **`noLayoutKey` is the load-bearing half.** Deleting
 * `LAYOUT_REGISTRY` is easy; keeping it deleted is the part that needs a
 * test, because `cockpit.layout` is still on the wire and reading it is
 * always the shortest path back.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { LEGACY_LAYOUT_MIGRATION } from "@saxonberg/types";
import { resolveMode, MODE_REGISTRY } from "../modes";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../..");

/** The ONE file allowed to name the legacy key: the migration itself. */
const MIGRATION_SITE = resolve(SRC, "layouts/modes.ts");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** Strip comments — a doc comment explaining the retirement is fine. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("⚠⚠ the layout key is retired", () => {
  const files = walk(SRC);

  it("nothing references LAYOUT_REGISTRY", () => {
    const offenders = files.filter((f) =>
      code(readFileSync(f, "utf8")).includes("LAYOUT_REGISTRY"),
    );
    expect(offenders.map((f) => f.slice(SRC.length + 1))).toEqual([]);
  });

  it("only the migration reads cockpit.layout", () => {
    const offenders = files.filter(
      (f) =>
        f !== MIGRATION_SITE &&
        code(readFileSync(f, "utf8")).includes('"cockpit.layout"'),
    );
    // App.tsx passes the key straight into `resolveMode`, which is the
    // migration; anything else reading it is the old frame coming back.
    expect(
      offenders
        .map((f) => f.slice(SRC.length + 1))
        .filter((f) => f !== "App.tsx"),
    ).toEqual([]);
  });
});

describe("resolveMode", () => {
  it("renders the stored mode's stored arrangement", () => {
    const r = resolveMode("watch", { watch: "streamer" }, null);
    expect(r.mode).toBe("watch");
    expect(r.arrangement).toBe("streamer");
    expect(r.def).toBe(MODE_REGISTRY.watch!["streamer"]);
    expect(r.fallbackFrom).toBeNull();
  });

  it("falls to the mode's shipped default when no arrangement is stored", () => {
    const r = resolveMode("watch", {}, null);
    expect(r.arrangement).toBe("viewer");
  });

  it("⭐ keeps watch's two arrangements apart", () => {
    // The whole reason the axes are two: `livestream-viewer` and
    // `streamer` were never different activities. A single-axis registry
    // cannot express this.
    const viewer = resolveMode("watch", { watch: "viewer" }, null);
    const streamer = resolveMode("watch", { watch: "streamer" }, null);
    expect(viewer.def).not.toBe(streamer.def);
  });

  describe("the legacy migration", () => {
    it.each(Object.keys(LEGACY_LAYOUT_MIGRATION))(
      "lands a player whose only state is `%s` in the right place",
      (name) => {
        const expected =
          LEGACY_LAYOUT_MIGRATION[name as keyof typeof LEGACY_LAYOUT_MIGRATION];
        // ⚠ `cockpit.mode` is deliberately null for a legacy player —
        // the server reads that null as its cue to migrate rather than
        // assuming `play`, and the client has to do the same or it lands
        // everyone in the world layout regardless of what they saved.
        const r = resolveMode(null, undefined, name as never);
        if (MODE_REGISTRY[expected.mode]?.[expected.arrangement]) {
          expect(r.mode).toBe(expected.mode);
          expect(r.arrangement).toBe(expected.arrangement);
        } else {
          // A legacy name whose target has no component yet still falls
          // back VISIBLY rather than pretending.
          expect(r.fallbackFrom).not.toBeNull();
        }
      },
    );

    it("does not consult the legacy key once a mode is set", () => {
      // The key is a migration cue, never a live source of truth — a
      // player who has moved on must not be dragged back by a stale
      // projection the server is still painting.
      const r = resolveMode("chat", { chat: "default" }, "streamer");
      expect(r.mode).toBe("chat");
    });
  });

  it("⚠ falls back VISIBLY for a mode with no surface", () => {
    // `govern` has no component. A silent substitution would make an
    // unbuilt mode indistinguishable from a finished one.
    const r = resolveMode("govern", {}, null);
    expect(r.fallbackFrom).toEqual({ mode: "govern", arrangement: "default" });
    expect(r.mode).toBe("play");
  });

  it("floors to play when nothing at all is known", () => {
    const r = resolveMode(null, undefined, null);
    expect(r.mode).toBe("play");
    expect(r.fallbackFrom).toBeNull();
  });
});
