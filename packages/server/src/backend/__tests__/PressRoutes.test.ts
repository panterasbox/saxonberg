/**
 * PressRoutes REST surface — supertest against a minimal Express app that
 * mirrors Server's auth middleware + `PressRoutes.setup` (the HelpRoutes
 * test harness).
 *
 * Proves the transport contract:
 *   - unauthenticated → 401
 *   - the query (before/limit/realm/kind) is forwarded into PressApi.archive
 *   - the returned Release Documents are projected to ReleaseRow[] (recency
 *     order preserved as archive returns them)
 *   - a bad realm / kind → 400
 *   - the route is registered before the SPA catch-all (matches first)
 *
 * `PressApi.archive` is stubbed (its paging/ordering logic is
 * PressLogic.test.ts's job); these tests assert only that the route wires
 * query → archive → toRow → JSON. The real `PressApi.toRow` projection runs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express, { type Express } from "express";
import session from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { ReleaseRow } from "@saxonberg/types";
import { PressRoutes } from "../PressRoutes";
import { PressApi, Release } from "../../mud/api/press";
import type { ArchiveQuery } from "../../mud/api/press";

function makeRelease(
  fields: Partial<{
    releaseId: string;
    realm: "ooc" | "world";
    kind: "changelog" | "decision" | "event" | "notice";
    headline: string;
    body: string;
    author: string;
    publishedAt: number;
    expiresAt: number;
    pinned: boolean;
  }>
): Release {
  const releaseId = fields.releaseId ?? "b-1";
  return Release.of(`/compact/press/feed/${releaseId}`, "/compact/press", {
    releaseId,
    kind: fields.kind ?? "notice",
    headline: fields.headline ?? "headline",
    body: fields.body ?? "",
    author: fields.author ?? "",
    publishedAt: fields.publishedAt ?? 0,
    expiresAt: fields.expiresAt ?? 0,
    pinned: fields.pinned ?? false,
    retracted: false,
    visibility: null,
    source: '',
  });
}

/**
 * Build the app. When `withCatchAll` is set, a SPA-style `*` fallback is
 * registered AFTER the release routes so we can prove ordering: the API
 * route must still match first.
 */
function makeApp(withCatchAll = false): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({ secret: "test-secret", resave: false, saveUninitialized: false })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user, done) =>
    done(null, { id: (user as { id: string }).id })
  );
  passport.deserializeUser((obj, done) => done(null, obj as Express.User));
  app.post("/test-login", (req, res) => {
    req.login({ id: "u-1" } as Express.User, (err) => {
      if (err) {
        res.status(500).json({ error: "login failed" });
        return;
      }
      res.json({ ok: true });
    });
  });
  PressRoutes.setup(app);
  if (withCatchAll) {
    app.get("*", (_req, res) => {
      res.status(200).json({ sentinel: "catch-all" });
    });
  }
  return app;
}

describe("PressRoutes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("unauthenticated request returns 401", async () => {
    vi.spyOn(PressApi, "archive").mockResolvedValue([]);
    const res = await request(makeApp()).get("/api/press/archive");
    expect(res.status).toBe(401);
  });

  it("forwards before/limit/realm/kind into PressApi.archive", async () => {
    let captured: ArchiveQuery | undefined;
    vi.spyOn(PressApi, "archive").mockImplementation(async (q) => {
      captured = q;
      return [];
    });
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get(
      "/api/press/archive?before=1700&limit=5&realm=world&kind=event"
    );
    expect(res.status).toBe(200);
    expect(captured).toEqual({
      before: 1700,
      limit: 5,
      realm: "world",
      kind: "event",
    });
  });

  it("projects archive rows to ReleaseRow[] in recency-desc order", async () => {
    const rows = [
      makeRelease({ releaseId: "b-new", publishedAt: 300, pinned: true }),
      makeRelease({ releaseId: "b-mid", publishedAt: 200 }),
      makeRelease({ releaseId: "b-old", publishedAt: 100 }),
    ];
    vi.spyOn(PressApi, "archive").mockResolvedValue(rows);
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/press/archive");
    expect(res.status).toBe(200);
    const body = res.body as ReleaseRow[];
    expect(body.map((r) => r.releaseId)).toEqual(["b-new", "b-mid", "b-old"]);
    expect(body[0]?.pinned).toBe(true);
    expect(body[0]?.publishedAt).toBe(300);
  });

  it("pages by before/limit (forwarded numerically)", async () => {
    let captured: ArchiveQuery | undefined;
    vi.spyOn(PressApi, "archive").mockImplementation(async (q) => {
      captured = q;
      return [makeRelease({ releaseId: "b-1", publishedAt: 50 })];
    });
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/press/archive?before=100&limit=1");
    expect(res.status).toBe(200);
    expect(captured?.before).toBe(100);
    expect(captured?.limit).toBe(1);
    expect((res.body as ReleaseRow[]).length).toBe(1);
  });

  it("400s on a bad realm", async () => {
    const spy = vi.spyOn(PressApi, "archive").mockResolvedValue([]);
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/press/archive?realm=bogus");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid");
    expect(spy).not.toHaveBeenCalled();
  });

  it("400s on a bad kind", async () => {
    const spy = vi.spyOn(PressApi, "archive").mockResolvedValue([]);
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/press/archive?kind=bogus");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid");
    expect(spy).not.toHaveBeenCalled();
  });

  it("is registered before the SPA catch-all", async () => {
    vi.spyOn(PressApi, "archive").mockResolvedValue([
      makeRelease({ releaseId: "b-real", publishedAt: 1 }),
    ]);
    const agent = request.agent(makeApp(true));
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/press/archive");
    expect(res.status).toBe(200);
    // The release route matched, not the `*` sentinel.
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as ReleaseRow[])[0]?.releaseId).toBe("b-real");
  });
});
