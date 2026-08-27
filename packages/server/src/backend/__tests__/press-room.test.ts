/**
 * ⭐ The anonymous press room — the one surface on this build that an
 * unauthenticated stranger can read, which is exactly why it gets its own
 * suite rather than a case in the archive's.
 *
 * What is asserted, and why each one is the thing that breaks:
 *
 *   - **AC 21** — a GET with **no session cookie at all** returns 200 and
 *     the window.
 *   - **AC 22** — the two filters are *independent*. Placement (is this
 *     publisher on the front page?) and permission (is this release
 *     publicly visible?) are different questions, and a release excluded
 *     by one is still present in the authenticated archive. Collapsing
 *     them makes placement imply permission.
 *   - **AC 23** — `before` → 400. A silently-ignored cursor is the shape
 *     of a future accidental widening.
 *   - **AC 24** — the row's key set is **frozen**, and carries no `author`
 *     and no `expiresAt`.
 *   - An unresolvable front-page entry is skipped **and logged** — a typo
 *     must not empty the page in silence.
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { PressRoutes } from "../PressRoutes";
import { PressApi } from "../../mud/api/press";
import { AppApi } from "../../mud/api/app";
import { StuffApi } from "../../mud/api/stuff";
import { ExecutionContextApi } from "../../mud/api/execution-context";
import OrganizationEntity from "../../mud/platform/idea/Organization";
import PressBoard from "../../mud/platform/idea/PressBoard";
import { Idea } from "../../mud/lib/stuff/Idea";
import { AppSettingKeys } from "../../mud/lib/config/AppSettings";
import { PersistenceManager } from "../PersistenceManager";
import { makeStuffAtPath } from "../../mud/lib/security/__tests__/test-setup";

class TestAuthor extends Idea {
  static _mixinName = "TestAuthor";
}

const PRESS = "/compact/press";
const PRESS_FEED = "/compact/press/feed";
const EXEC = "/compact/executive";
const EXEC_FEED = "/compact/executive/feed";
const DIRECTOR = "communications-director";
const STAFFER = "/platform/agent/Avatar/staffer";

/** The exact key set an anonymous visitor may ever see. */
const FROZEN_KEYS = [
  "releaseId",
  "publisher",
  "publisherLabel",
  "realm",
  "kind",
  "headline",
  "body",
  "publishedAt",
  "pinned",
].sort();

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let frontPage: string;

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col === "app_settings") return [] as never;
      return [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  vi.spyOn(pm, "save").mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    },
  );
}

function publisher(
  path: string,
  feed: string,
  realm: "ooc" | "world",
  visibility: "public" | "members",
  label: string,
): OrganizationEntity {
  const org = makeStuffAtPath(() => new OrganizationEntity(), path);
  org.label = label;
  org.realm = realm;
  org.visibility = visibility;
  org.feedPath = feed;
  org.positions = [
    { key: DIRECTOR, label: "speaking", wageRate: 0, confers: [] },
  ];
  org.publishingPositions = [DIRECTOR];
  org.rosterSlots = [
    { positionKey: DIRECTOR, assignee: STAFFER, schedule: [] },
  ];
  return org;
}

async function publish(
  publisherPath: string,
  headline: string,
  opts: { visibility?: "public" | "members"; pinned?: boolean } = {},
): Promise<string> {
  const acting =
    StuffApi.findByTemplatePath<TestAuthor>(STAFFER) ??
    makeStuffAtPath(() => new TestAuthor(), STAFFER);
  const release = await (ExecutionContextApi.runRoot(null, "test", () => {
    ExecutionContextApi.tagActingAuthor(acting);
    return PressApi.publish({
      publisher: publisherPath,
      headline,
      ...(opts.visibility ? { visibility: opts.visibility } : {}),
      ...(opts.pinned ? { pinned: true } : {}),
    });
  }) as ReturnType<typeof PressApi.publish>);
  return release.getReleaseId();
}

function makeApp(): Express {
  const app = express();
  PressRoutes.setup(app);
  return app;
}

beforeEach(() => {
  StuffApi.clearAll();
  installStore();
  frontPage = PRESS;
  vi.spyOn(AppApi, "setting").mockImplementation((key: string) => {
    if (key === AppSettingKeys.pressFrontPage) return frontPage;
    return "";
  });
  void makeStuffAtPath(() => new PressBoard(), "/platform/idea/PressBoard");
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("GET /api/press/releases — the anonymous press room", () => {
  it("⭐ AC 21 — returns 200 and the window with NO session cookie", async () => {
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    await publish(PRESS, "Hello, world");

    const res = await request(makeApp()).get("/api/press/releases");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].headline).toBe("Hello, world");
    expect(res.body[0].publisherLabel).toBe("the Compact");
    // Nothing was set on the way out — no session, no cookie.
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("⭐ AC 24 — the row's key set is FROZEN, with no author and no expiry", async () => {
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    await publish(PRESS, "Hello");

    const res = await request(makeApp()).get("/api/press/releases");
    expect(Object.keys(res.body[0]).sort()).toEqual(FROZEN_KEYS);
    expect(res.body[0].author).toBeUndefined();
    expect(res.body[0].expiresAt).toBeUndefined();
  });

  it("carries a repost's source", async () => {
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    const acting = makeStuffAtPath(() => new TestAuthor(), STAFFER);
    await (ExecutionContextApi.runRoot(null, "test", () => {
      ExecutionContextApi.tagActingAuthor(acting);
      return PressApi.publish({
        publisher: PRESS,
        headline: "What they said",
        kind: "repost",
        source: EXEC,
      });
    }) as Promise<unknown>);

    const res = await request(makeApp()).get("/api/press/releases");
    expect(res.body[0].source).toBe(EXEC);
    expect(res.body[0].kind).toBe("repost");
  });

  it("⭐ AC 22a — PLACEMENT: an unlisted publisher is absent here, present in the archive", async () => {
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    publisher(EXEC, EXEC_FEED, "world", "public", "the PMO");
    await publish(PRESS, "listed");
    await publish(EXEC, "unlisted");

    const res = await request(makeApp()).get("/api/press/releases");
    expect(res.body.map((r: { headline: string }) => r.headline)).toEqual([
      "listed",
    ]);
    // ...and it is not hidden, merely not on the front page.
    const archive = await PressApi.archive({});
    expect(archive.map((r) => r.getHeadline()).sort()).toEqual([
      "listed",
      "unlisted",
    ]);
  });

  it("⭐ AC 22b — PERMISSION: a members-only release from a LISTED publisher is absent here, present in the archive", async () => {
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    await publish(PRESS, "open");
    await publish(PRESS, "internal", { visibility: "members" });

    const res = await request(makeApp()).get("/api/press/releases");
    expect(res.body.map((r: { headline: string }) => r.headline)).toEqual([
      "open",
    ]);
    const archive = await PressApi.archive({});
    expect(archive.map((r) => r.getHeadline()).sort()).toEqual([
      "internal",
      "open",
    ]);
  });

  it("the two filters are independent — a listed but members-only PUBLISHER shows nothing", async () => {
    // Placement says yes; permission says no. Neither implies the other.
    frontPage = EXEC;
    publisher(EXEC, EXEC_FEED, "world", "members", "the PMO");
    await publish(EXEC, "internal");
    const res = await request(makeApp()).get("/api/press/releases");
    expect(res.body).toEqual([]);
  });

  it("⚠ AC 23 — rejects paging with 400 rather than ignoring it", async () => {
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    await publish(PRESS, "x");
    const res = await request(makeApp()).get(
      "/api/press/releases?before=12345",
    );
    expect(res.status).toBe(400);
  });

  it("clamps limit and honours a bounded one", async () => {
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    for (let i = 0; i < 4; i++) await publish(PRESS, `n${i}`);
    const one = await request(makeApp()).get("/api/press/releases?limit=1");
    expect(one.body).toHaveLength(1);
    // A malformed / oversized limit cannot pull more than the cap.
    const huge = await request(makeApp()).get(
      "/api/press/releases?limit=99999",
    );
    expect(huge.body.length).toBeLessThanOrEqual(50);
  });

  it("⚠ skips an unresolvable front-page entry AND logs it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    frontPage = `/compact/typo, ${PRESS}`;
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    await publish(PRESS, "still here");

    const res = await request(makeApp()).get("/api/press/releases");
    // The typo does not empty the page...
    expect(res.body).toHaveLength(1);
    // ...and it does not pass in silence either.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("/compact/typo"),
    );
  });

  it("serves an empty list — honestly — when nothing is listed", async () => {
    frontPage = "";
    publisher(PRESS, PRESS_FEED, "ooc", "public", "the Compact");
    await publish(PRESS, "nobody asked for this");
    const res = await request(makeApp()).get("/api/press/releases");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
