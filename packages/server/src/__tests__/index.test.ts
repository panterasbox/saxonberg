import { describe, it, expect } from "vitest";

// Basic test - server exports are tested separately
describe("Server", () => {
  it("should export Server class", async () => {
    const { Server } = await import("..");
    expect(Server).toBeDefined();
  });

  it("should export Application class", async () => {
    const { Application } = await import("..");
    expect(Application).toBeDefined();
  });

  it("should export Backend class", async () => {
    const { Backend } = await import("..");
    expect(Backend).toBeDefined();
  });

  it("should export PersistenceManager class", async () => {
    const { PersistenceManager } = await import("..");
    expect(PersistenceManager).toBeDefined();
  });

  it("should export ConnectionManager class", async () => {
    const { ConnectionManager } = await import("..");
    expect(ConnectionManager).toBeDefined();
  });

  it("should export ConnectionApi class", async () => {
    const { ConnectionApi } = await import("..");
    expect(ConnectionApi).toBeDefined();
  });

  it("should export MixinApi class", async () => {
    const { MixinApi } = await import("..");
    expect(MixinApi).toBeDefined();
  });

  it("should export Mixins constants", async () => {
    const { Mixins } = await import("..");
    expect(Mixins).toBeDefined();
    expect(Mixins.Named).toBe("NamedMixin");
    expect(Mixins.Gendered).toBe("GenderedMixin");
  });

  it("should export Avatar class", async () => {
    const { Avatar } = await import("..");
    expect(Avatar).toBeDefined();
  });

  it("should export Interactive class", async () => {
    const { Interactive } = await import("..");
    expect(Interactive).toBeDefined();
  });

  it("should export Agent class", async () => {
    const { Agent } = await import("..");
    expect(Agent).toBeDefined();
  });
});
