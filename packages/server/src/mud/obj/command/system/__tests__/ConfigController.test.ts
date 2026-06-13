/**
 * ConfigController — list / show / set behavior over a warmed AppSettings
 * (PersistenceManager stubbed; no MongoDB), plus the developer-gate wiring.
 *
 * Output is captured by spying `Mml.fromMarkup` (it calls through), so we
 * read the rendered lines without standing up the scene transport.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import ConfigController from "../ConfigController";
import { AppApi } from "../../../../api/app";
import { AppSettings } from "../../../../lib/config/AppSettings";
import { AppSettingKeys } from "../../../../lib/config/keys";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";
import requiresDeveloper from "../../../../lib/command/validators/requiresDeveloper";
import { AccessApi } from "../../../../api/access";
import type { CommandContext, CommandModel } from "../../../../api/command";

function stubPM() {
  let findResult: Record<string, unknown>[] = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "save").mockResolvedValue("inserted-id" as never);
  vi.spyOn(pm, "find").mockImplementation(async () => findResult);
  return { setFindResult: (d: Record<string, unknown>[]) => (findResult = d) };
}

describe("ConfigController", () => {
  let ctrl: ConfigController;
  let ctx: CommandContext;
  let output: string[];
  let note: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const pm = stubPM();
    pm.setFindResult([]); // fresh DB → seeded from registry
    AppSettings._resetForTesting();
    await AppSettings.loadOrSeed();

    ctrl = makeStuff(() => new ConfigController());

    // Capture rendered markup; let fromMarkup still build a real Mml.
    output = [];
    const realFromMarkup = Mml.fromMarkup.bind(Mml);
    vi.spyOn(Mml, "fromMarkup").mockImplementation((s: string) => {
      output.push(s);
      return realFromMarkup(s);
    });
    // No-op scene chainable (we assert on captured markup, not transport).
    vi.spyOn(MessageApi, "scene").mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.send = () => {};
      return b as never;
    });

    note = vi.fn();
    ctx = {
      commandGiver: {} as never,
      note,
    } as unknown as CommandContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    AppSettings._resetForTesting();
  });

  function run(model: Partial<CommandModel & { key: string; value: string }>) {
    return ctrl.execute(model as never, ctx);
  }

  it("lists every registry key with its current value", async () => {
    await run({});
    const text = output.join("\n");
    expect(text).toContain(`${AppSettingKeys.defaultStartLocation} = /domain/lounge/warren`);
    expect(text).toContain(`${AppSettingKeys.evacuationFallback} = /domain/void`);
  });

  it("shows a single setting", async () => {
    await run({ key: AppSettingKeys.evacuationFallback });
    expect(output.join("\n")).toContain(
      `${AppSettingKeys.evacuationFallback} = /domain/void`,
    );
  });

  it("sets a known key, persists, and reflects the new value without restart", async () => {
    await run({
      key: AppSettingKeys.defaultStartLocation,
      value: "/domain/somewhere",
    });
    expect(AppApi.setting(AppSettingKeys.defaultStartLocation)).toBe(
      "/domain/somewhere",
    );
    const text = output.join("\n");
    expect(text).toContain("set to /domain/somewhere");
    expect(text).not.toContain("not a known setting");
    // A set succeeded — no rejection note.
    expect(note).not.toHaveBeenCalled();
  });

  it("sets an unregistered key (open namespace) with a soft prose note, status ok", async () => {
    await run({ key: "motd", value: "hello world" });
    expect(AppApi.setting("motd")).toBe("hello world");
    const text = output.join("\n");
    expect(text).toContain("set to hello world");
    expect(text).toContain("not a known setting");
    // Soft note is prose only — NOT a controller-rejected envelope note.
    expect(note).not.toHaveBeenCalled();
  });
});

describe("config verb — developer gate", () => {
  it("config.yaml gates the verb with the requiresDeveloper validator", () => {
    const path = fileURLToPath(
      new URL("../../../../cmd/system/config.yaml", import.meta.url),
    );
    const view = YAML.parse(readFileSync(path, "utf-8"));
    expect(view.verbs).toContain("config");
    expect(view.validators).toContain(
      "/lib/command/validators/requiresDeveloper",
    );
  });

  it("requiresDeveloper rejects a non-developer and allows a developer", () => {
    const ctx = { verb: "config", commandGiver: {} } as unknown as CommandContext;
    // allowed=false → a denial string; allowed=true → undefined (pass).
    expect(requiresDeveloper(ctx, false)).toMatch(/permission/);
    expect(requiresDeveloper(ctx, true)).toBeUndefined();
  });

  it("the gate's preload reads AccessApi.isDeveloper", async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    vi.spyOn(AccessApi, "isDeveloper").mockResolvedValue(true as never);
    await expect(requiresDeveloper.preload!(ctx)).resolves.toBe(true);
    vi.restoreAllMocks();
  });
});
