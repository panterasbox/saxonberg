import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./index.js";

describe("Server", () => {
  it("should respond to GET / with hello message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello from server");
  });
});
