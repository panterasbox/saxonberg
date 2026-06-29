/**
 * HelpRoutes REST surface — supertest against a minimal Express app that
 * mirrors Server's auth middleware + `HelpRoutes.setup`.
 *
 * Proves the transport contract against the `@saxonberg/types` DTOs:
 *   - the index slice + categories shape
 *   - a per-kind topic list (+ 400 on a bad kind)
 *   - a single full topic by id (+ 404 on a miss)
 *   - search results grouped by kind (+ 400 on a blank query)
 *   - unauthenticated → 401
 *
 * `HelpApi`'s reads are stubbed (its logic is help.test.ts's job); these
 * tests assert only that the route wires query → HelpApi → JSON.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express, { type Express } from "express";
import session from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";
import request from "supertest";
import type {
  HelpIndexResult,
  HelpKindListResult,
  HelpTopic,
  HelpSearchResult,
} from "@saxonberg/types";
import { HelpRoutes } from "../HelpRoutes";
import { HelpApi } from "../../mud/api/help";

function makeApp(): Express {
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
  HelpRoutes.setup(app);
  return app;
}

const TOPIC: HelpTopic = {
  id: "command.look",
  kind: "command",
  title: "look",
  summary: "Look around",
  keywords: ["look"],
  body: "LOOK: Look around",
  relations: [],
  spoiler: false,
  source: { subdivision: "commands", ref: "look" },
};

const INDEX: HelpIndexResult = {
  entries: [
    { id: TOPIC.id, kind: "command", title: "look", summary: "Look around", keywords: ["look"] },
  ],
  categories: [{ kind: "command", title: "Commands", count: 1 }],
};

const KIND_LIST: HelpKindListResult = {
  kind: "command",
  topics: INDEX.entries,
};

const SEARCH: HelpSearchResult = {
  query: "look",
  groups: [{ kind: "command", hits: INDEX.entries }],
};

describe("HelpRoutes", () => {
  beforeEach(() => {
    vi.spyOn(HelpApi, "index").mockReturnValue(INDEX);
    vi.spyOn(HelpApi, "listKind").mockReturnValue(KIND_LIST);
    vi.spyOn(HelpApi, "search").mockReturnValue(SEARCH);
    vi.spyOn(HelpApi, "fullTopic").mockImplementation((id: string) =>
      id === TOPIC.id ? TOPIC : null
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/help/index returns the index slice + categories", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/index");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(INDEX);
  });

  it("GET /api/help/kind returns a per-kind topic list", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/kind?kind=command");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(KIND_LIST);
  });

  it("GET /api/help/kind 400s on a bad kind", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/kind?kind=bogus");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid");
  });

  it("GET /api/help/topic returns a single full topic", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/topic?id=command.look");
    expect(res.status).toBe(200);
    expect(res.body.topic).toEqual(TOPIC);
  });

  it("GET /api/help/topic 404s on a miss", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/topic?id=command.nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not-found");
  });

  it("GET /api/help/topic 400s on a missing id", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/topic");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid");
  });

  it("GET /api/help/search returns results grouped by kind", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/search?q=look");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(SEARCH);
    expect(res.body.groups[0].kind).toBe("command");
  });

  it("GET /api/help/search 400s on a blank query", async () => {
    const agent = request.agent(makeApp());
    await agent.post("/test-login").expect(200);
    const res = await agent.get("/api/help/search?q=");
    expect(res.status).toBe(400);
  });

  it("unauthenticated request returns 401", async () => {
    const res = await request(makeApp()).get("/api/help/index");
    expect(res.status).toBe(401);
  });
});
