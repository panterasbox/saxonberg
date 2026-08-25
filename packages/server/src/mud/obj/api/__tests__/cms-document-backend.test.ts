/**
 * CMS third backend ('document') — the path-addressed document store as a
 * browsable/editable backend alongside content + source. Scripts are one
 * `kind` of stored document (kind='msh', data={source}).
 *
 * Exercises the CmsApi surface for the document backend: write (create a
 * script) → read (the source as plain text, kind-driven) → stat
 * (exists/leaf) → listTree (immediate children), plus the go-live on save.
 * Author-tier read gate; a script-kind write funnels through
 * ScriptApi.saveScript (the script chokepoint over DocumentApi.save). Runs
 * inside the runRoot + tagActingAuthor attribution bridge the REST CMS uses.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CmsApi } from "../../../api/cms";
import { AccessApi } from "../../../api/access";
import { ZoneApi } from "../../../api/zone";
import { ExecutionContextApi } from "../../../api/execution-context";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Idea } from "../../../lib/stuff/Idea";
import { Stuff } from "../../../lib/stuff/Stuff";
import { makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";

const OWNER = "/home/test";
const SCRIPT_PATH = "/home/test/scripts/greet";

let scripts: Record<string, unknown>[];
let actor: Stuff;

function runAs<T>(fn: () => T | Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(Stuff, "test", () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  scripts = [];
  WorldClockApi._setNowProviderForTesting(() => 1000);

  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col === "documents") {
      return scripts.filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      );
    }
    return [];
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col === "documents") {
      const i = scripts.findIndex((d) => d.path === doc.path);
      if (i >= 0) scripts[i] = { ...doc };
      else scripts.push({ ...doc, _id: String(scripts.length + 1) });
    }
    return (doc._id as string) ?? "id";
  });
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);

  vi.spyOn(ZoneApi, "resolveZoneForPath").mockResolvedValue(null);
  vi.spyOn(AccessApi, "can").mockResolvedValue(true);
  vi.spyOn(AccessApi, "isAuthor").mockResolvedValue(true);

  actor = makeStuffAtPath(() => new Idea(), OWNER) as unknown as Stuff;
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("CMS document backend (scripts as kind=msh)", () => {
  it("write creates a script and reports go-live", async () => {
    const result = await runAs(() =>
      CmsApi.write("document", SCRIPT_PATH, "ping; stir"),
    );
    expect(result.backend).toBe("document");
    expect(result.reloaded).toBe(true);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.kind).toBe("msh");
    expect((scripts[0]!.data as { source: string }).source).toBe("ping; stir");
  });

  it("read returns the stored source as plain-text leaf", async () => {
    await runAs(() => CmsApi.write("document", SCRIPT_PATH, "ping; stir"));
    const read = await runAs(() => CmsApi.read("document", SCRIPT_PATH));
    expect(read.kind).toBe("leaf");
    expect(read.body).toBe("ping; stir");
    expect(read.language).toBe("plaintext");
  });

  it("stat reflects existence", async () => {
    await runAs(() => CmsApi.write("document", SCRIPT_PATH, "ping"));
    const exists = await runAs(() => CmsApi.stat("document", SCRIPT_PATH));
    expect(exists).toMatchObject({ exists: true, kind: "leaf" });
    const missing = await runAs(() =>
      CmsApi.stat("document", "/home/test/scripts/none"),
    );
    expect(missing.exists).toBe(false);
  });

  it("read of a missing script throws not-found", async () => {
    await expect(
      runAs(() => CmsApi.read("document", "/home/test/scripts/none")),
    ).rejects.toThrow();
  });

  it("listTree lists immediate children of a prefix", async () => {
    await runAs(() => CmsApi.write("document", "/home/test/scripts/greet", "ping"));
    await runAs(() => CmsApi.write("document", "/home/test/scripts/wave", "ping"));
    const listing = await runAs(() =>
      CmsApi.listTree("document", "/home/test/scripts"),
    );
    const names = listing.entries.map((e) => e.name).sort();
    expect(names).toEqual(["greet", "wave"]);
    expect(listing.entries.every((e) => e.kind === "leaf")).toBe(true);
  });
});
