/**
 * Transitive-closure proof (wizard-authority AC4).
 *
 * The code-field gate gates only the **direct** code-naming fields
 * (`class` / `hydratorClass` / `behaviors[].brain`). The **transitive**
 * reference fields (`exits[].destination`, `adornments[].template`,
 * `props[]`, `cast[]`, `container`, …) get no per-field gate — they are closed
 * *by construction*: every template a transitive field can resolve to
 * must itself have passed the `class` gate, so a reference can only ever
 * instantiate a wizard-vetted-or-protowizard-safe class.
 *
 * This test proves the two halves:
 *  1. a protowizard CAN add a transitive reference to a template they
 *     may edit (the reference write is ungated); but
 *  2. the protowizard CANNOT create the dangerous-class *target* that
 *     reference would point at (the direct `class` gate blocks it),
 *     so the reference can never resolve to protowizard-authored code.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TemplateApi, TemplateError } from "../../../../api/template";
import { AccessApi } from "../../../../api/access";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { StuffApi } from "../../../../api/stuff";
import Avatar from "../../../agent/Avatar";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../../../lib/security/__tests__/test-setup";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";

const IDEA = "/lib/stuff/Idea";
const DANGEROUS = "/platform/location/CartesianLocation"; // any leaf w/ a class
const HOST_PATH = "/world/gallery/room";
const TARGET_PATH = "/world/gallery/trap";
const ALICE = "/platform/agent/Avatar/alice";

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
  // Non-wizard author throughout.
  vi.spyOn(AccessApi, "isWizard").mockResolvedValue(false as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function asAlice<T>(fn: () => Promise<T>): Promise<T> {
  const alice = makeStuffAtPath(() => new Avatar(), ALICE);
  alice.setPlayerId("alice");
  return withRootContext(null, "cms.write", () => {
    ExecutionContextApi.tagActingAuthor(alice);
    return fn();
  });
}

describe("transitive-closure (protowizard cannot reach code via a reference)", () => {
  it("a protowizard CAN add a transitive reference but CANNOT create the dangerous-class target", async () => {
    // A wizard-made host template the protowizard may edit (class Idea).
    col("content").push({
      _id: String(nextId++),
      path: HOST_PATH,
      class: IDEA,
      data: {},
    });

    // 1. The protowizard adds a transitive `exits[].destination` pointing
    //    at the would-be trap — the reference write is ungated (class,
    //    hydrator, brains all unchanged).
    await expect(
      asAlice(() =>
        TemplateApi.saveTemplate(HOST_PATH, IDEA, {
          exits: [{ destination: TARGET_PATH }],
        })
      )
    ).resolves.toBeTruthy();

    // 2. But the protowizard cannot create the dangerous-class *target*
    //    the reference points at — the direct `class` gate rejects it.
    await expect(
      asAlice(() => TemplateApi.saveTemplate(TARGET_PATH, DANGEROUS, {}))
    ).rejects.toBeInstanceOf(TemplateError);

    // Closure-by-construction: the target template was never created, so
    // the dangling reference can only ever resolve to a gate-passed class.
    expect(col("content").some((d) => d.path === TARGET_PATH)).toBe(false);
  });
});
