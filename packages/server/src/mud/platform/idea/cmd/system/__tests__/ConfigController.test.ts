/**
 * ConfigController — list / show / set behavior over a warmed AppSettings
 * (PersistenceManager stubbed; no MongoDB), plus the developer-gate wiring.
 *
 * Output is captured by spying `Mml.fromMarkup` (it calls through), so we
 * read the rendered lines without standing up the scene transport.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import ConfigController from "../ConfigController";
import { AppApi } from "../../../../../api/app";
import { AppSettings, AppSettingKeys } from "../../../../../lib/config/AppSettings";
import { MessageApi } from "../../../../../api/message";
import { Mml } from "../../../../../api/mml";
import { PersistenceManager } from "../../../../../../backend/PersistenceManager";
import { makeStuff } from "../../../../../lib/security/__tests__/test-setup";
import requiresPrimeMinister from "../../../../../lib/command/validators/requiresPrimeMinister";
import { CompactApi } from "../../../../../api/compact";
import type { CommandContext, CommandModel } from "../../../../../api/command";
import { AuthorMixin } from "../../../../../lib/shell/Author";
import { Idea } from "../../../../../lib/stuff/Idea";

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
    // Warm the cache from a seeded row (the seeder's job in real boot).
    pm.setFindResult([
      {
        _id: "r",
        values: {
          [AppSettingKeys.defaultStartLocation]: "/world/lounge/idea/warren",
          [AppSettingKeys.evacuationFallback]: "/platform/location/void",
        },
      },
    ]);
    AppSettings._resetForTesting();
    await AppSettings.warm();

    ctrl = makeStuff(() => new ConfigController());
    vi.spyOn(CompactApi, "holdsOffice").mockResolvedValue(true as never);

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

  it("lists every known key with its current value", async () => {
    await run({});
    const text = output.join("\n");
    expect(text).toContain(`${AppSettingKeys.defaultStartLocation} = /world/lounge/idea/warren`);
    expect(text).toContain(`${AppSettingKeys.evacuationFallback} = /platform/location/void`);
  });

  it("shows a single setting", async () => {
    await run({ key: AppSettingKeys.evacuationFallback });
    expect(output.join("\n")).toContain(
      `${AppSettingKeys.evacuationFallback} = /platform/location/void`,
    );
  });

  it("sets a known key, persists, and reflects the new value without restart", async () => {
    await run({
      key: AppSettingKeys.defaultStartLocation,
      value: "/world/somewhere",
    });
    expect(AppApi.setting(AppSettingKeys.defaultStartLocation)).toBe(
      "/world/somewhere",
    );
    const text = output.join("\n");
    expect(text).toContain("set to /world/somewhere");
    expect(text).not.toContain("not a known setting");
    // A set succeeded — no rejection note.
    expect(note).not.toHaveBeenCalled();
  });

  it("⭐ refuses a Tier C key, naming the seat and its verb (wizard-axis D11)", async () => {
    const before = AppApi.setting(AppSettingKeys.bankingSalesTaxRate);
    await run({ key: AppSettingKeys.bankingSalesTaxRate, value: "0.1" });
    expect(AppApi.setting(AppSettingKeys.bankingSalesTaxRate)).toBe(before);
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "controller-rejected", reason: "tier-c" }),
    );
    const said = output.join("\n");
    expect(said).toContain("Minister of Finance");
    expect(said).toContain("treasury set");
  });

  it("the listing marks a Tier C key with its seat", async () => {
    await AppApi.setSetting(ctx.commandGiver, AppSettingKeys.bankingWithdrawalDailyCap, "500", "central-bank-governor");
    await run({});
    expect(output.join("\n")).toContain("banking.withdrawalDailyCap = 500  [C: central-bank-governor]");
  });

  it("⭐ a direct write by a non-PM is refused on the model, nothing written (D9)", async () => {
    vi.mocked(CompactApi.holdsOffice).mockResolvedValue(false as never);
    const r = await AppApi.setSetting(ctx.commandGiver, AppSettingKeys.defaultStartLocation, "/x");
    expect(r).toMatchObject({ ok: false, reason: "not-seated" });
    expect(AppApi.setting(AppSettingKeys.defaultStartLocation)).toBe("/world/lounge/idea/warren");
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

describe("config verb — the Prime Minister's (wizard-axis D12)", () => {
  it("config.yaml gates the verb with requiresPrimeMinister, never the wizard axis", () => {
    const path = fileURLToPath(
      new URL("../../../../../../../../content/platform/content/platform/cmd/system/config.yaml", import.meta.url),
    );
    const view = YAML.parse(readFileSync(path, "utf-8"));
    expect(view.verbs).toContain("config");
    expect(view.validators).toEqual(["/lib/command/validators/requiresPrimeMinister"]);
  });

  it("a seatless wizard is refused, naming the Prime Minister", async () => {
    const ctx = { verb: "config", commandGiver: {} } as unknown as CommandContext;
    vi.spyOn(CompactApi, "holdsOffice").mockResolvedValue(false as never);
    expect(await requiresPrimeMinister.preload!(ctx)).toBe(false);
    expect(requiresPrimeMinister(ctx, false)).toMatch(/Prime Minister/);
    vi.restoreAllMocks();
  });
});

describe('⚠⚠ `config` is actually AFFORDED (the binder, not the controller)', () => {
  it('the operator command surface offers `config`', () => {
    // ⭐ This is the assertion whose absence let the verb ship
    // UNREACHABLE. Everything above is green and always was: the view
    // parses, the gate rejects a non-wizard, the controller lists and
    // sets. None of it asked the one question that matters — *can
    // anybody type the word* — because the suite loads `config.yaml`
    // by path and calls `ConfigController` directly, which skips the
    // binder. A live drive typed `config freshness.muMaxPerHour 120`
    // as a WIZARD and the world answered "I don't understand
    // 'config'". Same shape as `eat`/`vomit` in this build and
    // `feel`/`taste` before them.
    const contributed = (
      AuthorMixin(Idea) as unknown as {
        commandContributions?: { self?: string[] };
      }
    ).commandContributions?.self;
    expect(contributed).toContain('platform/cmd/system/config.yaml');
  });
});
