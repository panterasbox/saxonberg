/**
 * TemplateLogic code-field gate (wizard-authority Phase 2).
 *
 * The gate at `saveTemplate` rejects a non-wizard (protowizard) write
 * that introduces or changes a direct code-naming field
 * (`class` / `hydratorClass` / `behaviors[].brain`). Wizard-ness is
 * controlled by spying `AccessApi.isWizard`; the acting author is a real
 * `Avatar` (the gate narrows on `instanceof Avatar`), planted via the
 * `runRoot` + `tagActingAuthor` bridge (the CMS/REST shape).
 *
 * The gate is author-*source*-agnostic: it acts on whatever
 * `ExecutionContextApi.getActingAuthor()` returns. That function's other
 * branch — the in-world command-giver resolution (single non-forced giver
 * → that Avatar; forced/inconsistent → null) — is covered directly in
 * `execution-context.test.ts`, so injecting the author via the runRoot
 * branch here proves the gate's allow-ladder + delta rule for both paths.
 *
 * Mongo is faked collection-aware (domain + authoring_events).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TemplateApi, TemplateError } from "../../../api/template";
import { AccessApi } from "../../../api/access";
import { ExecutionContextApi } from "../../../api/execution-context";
import { StuffApi } from "../../../api/stuff";
import Avatar from "../../Avatar";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../../lib/security/__tests__/test-setup";
import { PersistenceManager } from "../../../../backend/PersistenceManager";

const LEAF = "/obj/location/Room";
const OTHER_LEAF = "/obj/Prop";
const FOLDER = "/obj/FolderZone";
const HYDRATOR = "/obj/persistence/PersistentHydrator";
const OTHER_HYDRATOR = "/lib/persistence/SomeOtherHydrator";
const PATH = "/domain/gallery/widget";
const ALICE = "/obj/Avatar/alice";

let stores: Map<string, Record<string, unknown>[]>;
let nextId = 1;

function col(name: string): Record<string, unknown>[] {
  let a = stores.get(name);
  if (!a) {
    a = [];
    stores.set(name, a);
  }
  return a;
}

/** Seed an existing domain template doc. */
function seedTemplate(doc: Record<string, unknown>): void {
  col("content").push({ _id: String(nextId++), ...doc });
}

beforeEach(() => {
  stores = new Map();
  nextId = 1;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (c: string, q: Record<string, unknown>) =>
      col(c).filter((d) =>
        Object.entries(q).every(([k, v]) =>
          typeof v === "string" ? d[k] === v : true
        )
      ) as never
  );
  vi.spyOn(pm, "save").mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? String(nextId++);
      const arr = col(c);
      const idx = arr.findIndex((d) => d._id === id);
      if (idx >= 0) arr[idx] = { ...doc, _id: id };
      else arr.push({ ...doc, _id: id });
      return id;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** Run `fn` as the given acting Avatar (the CMS/runRoot shape). */
function asAuthor<T>(avatar: Avatar | null, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "cms.write", () => {
    if (avatar) ExecutionContextApi.tagActingAuthor(avatar);
    return fn();
  });
}

function makeAlice(): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), ALICE);
  av.setPlayerId("alice");
  return av;
}

describe("TemplateLogic code-field gate", () => {
  it("rejects a non-wizard introducing a class on a fresh path; a wizard succeeds", async () => {
    const alice = makeAlice();

    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);
    await expect(
      asAuthor(alice, () => TemplateApi.saveTemplate(PATH, LEAF, {}))
    ).rejects.toBeInstanceOf(TemplateError);

    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(true as never);
    await expect(
      asAuthor(alice, () => TemplateApi.saveTemplate(PATH, LEAF, {}))
    ).resolves.toBeTruthy();
  });

  it("allows a non-wizard cosmetic edit (same class/hydrator/brains, changed data)", async () => {
    seedTemplate({
      path: PATH,
      class: LEAF,
      hydratorClass: HYDRATOR,
      data: { description: "old" },
    });
    const alice = makeAlice();
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);

    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate(
          PATH,
          LEAF,
          { description: "new" },
          HYDRATOR
        )
      )
    ).resolves.toBeTruthy();
  });

  it("rejects a non-wizard changing the class on an existing template", async () => {
    seedTemplate({ path: PATH, class: LEAF, data: {} });
    const alice = makeAlice();
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);

    await expect(
      asAuthor(alice, () => TemplateApi.saveTemplate(PATH, OTHER_LEAF, {}))
    ).rejects.toThrow(/class/);
  });

  it("rejects a non-wizard changing the hydratorClass on an existing template", async () => {
    seedTemplate({
      path: PATH,
      class: LEAF,
      hydratorClass: HYDRATOR,
      data: {},
    });
    const alice = makeAlice();
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);

    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate(PATH, LEAF, {}, OTHER_HYDRATOR)
      )
    ).rejects.toThrow(/hydratorClass/);
  });

  it("rejects a non-wizard adding a brain not in the existing set", async () => {
    seedTemplate({
      path: PATH,
      class: LEAF,
      data: { behaviors: [{ brain: "/lib/behavior/idles" }] },
    });
    const alice = makeAlice();
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);

    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate(PATH, LEAF, {
          behaviors: [
            { brain: "/lib/behavior/idles" },
            { brain: "/lib/behavior/wanders" },
          ],
        })
      )
    ).rejects.toThrow(/behaviors\[\]\.brain/);
  });

  it("allows a non-wizard reordering / preserving the brain set", async () => {
    seedTemplate({
      path: PATH,
      class: LEAF,
      data: {
        behaviors: [
          { brain: "/lib/behavior/idles" },
          { brain: "/lib/behavior/wanders" },
        ],
      },
    });
    const alice = makeAlice();
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);

    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate(PATH, LEAF, {
          // reordered + a cosmetic field added
          color: "blue",
          behaviors: [
            { brain: "/lib/behavior/wanders" },
            { brain: "/lib/behavior/idles" },
          ],
        })
      )
    ).resolves.toBeTruthy();
  });

  it("allows a null acting author (system / bootstrap) to introduce a class", async () => {
    // No tagged author → getActingAuthor() is null → provisioning allow.
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);
    await expect(
      withRootContext(null, "system.save", () =>
        TemplateApi.saveTemplate(PATH, LEAF, {})
      )
    ).resolves.toBeTruthy();
  });

  it("allows a non-wizard mkdir-shaped folder scaffold; rejects a non-folder class", async () => {
    const alice = makeAlice();
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);

    // mkdir shape: FolderZone, empty data, no hydrator → allowed.
    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate("/domain/gallery/sub", FOLDER, {})
      )
    ).resolves.toBeTruthy();

    // A non-folder (leaf) class on a fresh path is NOT a scaffold.
    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate("/domain/gallery/leaf", LEAF, {})
      )
    ).rejects.toThrow(/class/);
  });

  it("rejects smuggling a non-standard hydrator or a brain under a folder class", async () => {
    const alice = makeAlice();
    vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);

    // Folder class but a non-standard hydrator → not a scaffold; the
    // hydratorClass clause keeps the carve-out tight.
    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate("/domain/gallery/sub", FOLDER, {}, OTHER_HYDRATOR)
      )
    ).rejects.toThrow(/hydratorClass|class/);

    // Folder class but a brain in the data → not a scaffold; the
    // no-behaviors clause keeps the carve-out tight.
    await expect(
      asAuthor(alice, () =>
        TemplateApi.saveTemplate("/domain/gallery/sub2", FOLDER, {
          behaviors: [{ brain: "/lib/behavior/idles" }],
        })
      )
    ).rejects.toThrow(/class|behaviors\[\]\.brain/);
  });
});
