/**
 * ⭐ W5c — the one readiness routine: an Api declares the dictionaries its
 * reads stand on (`static needs`), the call gate makes every ASYNC static
 * await them, and a sync static is untouched (it cannot wait; its reach is
 * a setter or an act that called `StuffApi.ready`).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SecurityApi } from "../../../api/security";
import { StuffApi } from "../../../api/stuff";

const NEED = "/test/idea/SomeDictionary";

afterEach(() => vi.restoreAllMocks());

describe("an Api's declared needs", () => {
  it("an async static awaits them before it runs; a sync static does not", async () => {
    const order: string[] = [];
    let resident = false;
    vi.spyOn(StuffApi, "findByTemplatePath").mockImplementation(
      ((p: string) => (p === NEED && resident ? ({} as never) : null)) as never,
    );
    // As the real one: resolves at once for a resident singleton, loads a cold one.
    vi.spyOn(StuffApi, "singleton").mockImplementation((async (p: string) => {
      if (!resident) order.push(`load ${p}`);
      resident = true;
      return {} as never;
    }) as never);

    class NeedyApi {
      static readonly needs: readonly string[] = [NEED];
      static async read(): Promise<string> {
        order.push("read");
        return "ok";
      }
      static peek(): string {
        order.push("peek");
        return "sync";
      }
    }
    SecurityApi.decorateApiClass(NeedyApi);

    // Sync stays sync, and loads nothing.
    expect(NeedyApi.peek()).toBe("sync");
    expect(order).toEqual(["peek"]);

    // Async: the load lands first, then the body.
    expect(await NeedyApi.read()).toBe("ok");
    expect(order).toEqual(["peek", `load ${NEED}`, "read"]);

    // Resident: no second load.
    await NeedyApi.read();
    expect(order.filter((o) => o.startsWith("load"))).toHaveLength(1);
  });

  it("StuffApi.ready takes an Api or a path and resolves once every need is resident", async () => {
    const loaded: string[] = [];
    vi.spyOn(StuffApi, "findByTemplatePath").mockReturnValue(null as never);
    vi.spyOn(StuffApi, "singleton").mockImplementation((async (p: string) => {
      loaded.push(p);
      return {} as never;
    }) as never);
    await StuffApi.ready({ needs: ["/a"] }, "/b");
    expect(loaded.sort()).toEqual(["/a", "/b"]);
  });
});
