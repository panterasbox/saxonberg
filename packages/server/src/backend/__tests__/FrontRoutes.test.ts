/**
 * FrontRoutes — the front page's anonymous read (stream arrival D14), by
 * supertest against a bare Express app with `FrontRoutes.setup`.
 *
 * Proves the transport contract: anonymous 200 with no `set-cookie`; the
 * query forwarded as a name (by pattern) and a carrier (by list); any
 * other key or carrier a 400; a malformed name is a link naming nothing;
 * a world that cannot answer is `{}`. The named-else-featured rule itself
 * is `StreamLogic.program.test.ts`'s (frontListing).
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import type { ProgramListing } from "@saxonberg/types";
import { FrontRoutes } from "../FrontRoutes";
import { StreamApi } from "../../mud/api/stream";

const SHOW: ProgramListing = {
  name: "cafe-hour",
  title: "The Cafe Hour",
  live: true,
  feeds: { twitch: "adaplays" },
};

let app: Express;
let calls: Array<[string | undefined, string | undefined]>;

beforeEach(() => {
  calls = [];
  vi.spyOn(StreamApi, "frontListing").mockImplementation(async (w, c) => {
    calls.push([w, c]);
    return SHOW;
  });
  app = express();
  FrontRoutes.setup(app);
});

afterEach(() => vi.restoreAllMocks());

describe("GET /api/front", () => {
  it("answers anonymously, sets no cookie", async () => {
    const res = await request(app).get("/api/front");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ show: SHOW });
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(calls).toEqual([[undefined, undefined]]);
  });

  it("forwards a well-formed name and a carrier", async () => {
    await request(app).get("/api/front?watch=Other-Show&carrier=kick");
    expect(calls).toEqual([["other-show", "kick"]]);
  });

  it("a malformed name is a link naming nothing — the featured program answers", async () => {
    await request(app).get("/api/front?watch=not%20a%20name&carrier=twitch");
    expect(calls).toEqual([[undefined, "twitch"]]);
  });

  it("refuses an unknown key or carrier", async () => {
    expect((await request(app).get("/api/front?channel=someone")).status).toBe(400);
    expect((await request(app).get("/api/front?watch=x1&carrier=vimeo")).status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("no featured program → no show band", async () => {
    vi.spyOn(StreamApi, "frontListing").mockResolvedValue(null);
    expect((await request(app).get("/api/front")).body).toEqual({});
  });

  it("a world that cannot answer is {} and a logged reason", async () => {
    vi.spyOn(StreamApi, "frontListing").mockRejectedValue(new Error("world down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await request(app).get("/api/front");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});
