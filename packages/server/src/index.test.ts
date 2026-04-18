import { describe, it, expect } from "vitest";

// Basic test - server exports are tested separately
describe("Server", () => {
  it("should export Server class", async () => {
    const { Server } = await import("./index");
    expect(Server).toBeDefined();
  });

  it("should export Application class", async () => {
    const { Application } = await import("./index");
    expect(Application).toBeDefined();
  });

  it("should export Backend class", async () => {
    const { Backend } = await import("./index");
    expect(Backend).toBeDefined();
  });

  it("should export PersistenceManager class", async () => {
    const { PersistenceManager } = await import("./index");
    expect(PersistenceManager).toBeDefined();
  });

  it("should export ConnectionManager class", async () => {
    const { ConnectionManager } = await import("./index");
    expect(ConnectionManager).toBeDefined();
  });

  it("should export ConnectionApi class", async () => {
    const { ConnectionApi } = await import("./index");
    expect(ConnectionApi).toBeDefined();
  });

  it("should export MixinApi class", async () => {
    const { MixinApi } = await import("./index");
    expect(MixinApi).toBeDefined();
  });

  it("should export Mixins constants", async () => {
    const { Mixins } = await import("./index");
    expect(Mixins).toBeDefined();
    expect(Mixins.Named).toBe("NamedMixin");
    expect(Mixins.Gendered).toBe("GenderedMixin");
  });

  it("should export Avatar class", async () => {
    const { Avatar } = await import("./index");
    expect(Avatar).toBeDefined();
  });

  it("should export Interactive class", async () => {
    const { Interactive } = await import("./index");
    expect(Interactive).toBeDefined();
  });

  it("should export Agent class", async () => {
    const { Agent } = await import("./index");
    expect(Agent).toBeDefined();
  });
});
