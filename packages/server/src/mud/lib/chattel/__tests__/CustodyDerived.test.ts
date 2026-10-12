/**
 * ⭐⭐ Custody is DERIVED by the movement primitive (assembly build,
 * MR !361): `ContainmentApi.move` titles a FRESH good by derivation and
 * never retitles one that already exists — so taking a thing stays theft.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../../../platform/idea/ChattelRegistry";
import Good from "../../stuff/Good";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { ExecutionContextApi } from "../../../api/execution-context";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { Idea } from "../../stuff/Idea";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Document } from "../../persistence/Document";
import { makeStuffAtPath, withRootContext } from "../../security/__tests__/test-setup";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { Containable } from "../../spatial/Containable";
import type { Chattel } from "../Chattel";
import type { FieldMeta } from "../../mixin";

class Thing1 extends Good {}
class Room extends ContainerMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}
class Person extends ContainerMixin(ContainableMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}

const ALICE = "/platform/agent/Avatar/alice";
let n = 0;
const good = (): Thing1 => makeStuffAtPath(() => new Thing1(), `/test/thing/good-${++n}`);
const room = (path: string): Room => makeStuffAtPath(() => new Room(), path);
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

async function ownerOf(g: Thing1): Promise<string | null> {
  const o = await (g as unknown as Stuff & Chattel).chattelOwner();
  return o?.templatePath ?? null;
}

/** Run `fn` as Alice's act with no command frame — a deferred consequence. */
function asAlice<T>(alice: Stuff, fn: () => T): Promise<T> {
  return withRootContext(null, "custody.test", async () => {
    ExecutionContextApi.tagActingAuthor(alice);
    const out = fn();
    await settle();
    return out;
  }) as Promise<T>;
}

type Doc = Record<string, unknown> & { _id?: string };
function installStore(): void {
  const store = new Map<string, Doc[]>();
  let id = 0;
  const col = (c: string): Doc[] => {
    let arr = store.get(c);
    if (!arr) store.set(c, (arr = []));
    return arr;
  };
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save: vi.fn(async (c: string, doc: Doc) => {
      const arr = col(c);
      const key = doc._id ?? String(++id);
      const i = arr.findIndex((d) => d._id === key);
      if (i >= 0) arr[i] = { ...doc, _id: key };
      else arr.push({ ...doc, _id: key });
      return key;
    }),
    find: vi.fn(async (c: string, q: Record<string, unknown>) =>
      col(c).filter((d) => Object.keys(q).every((k) => d[k] === q[k])),
    ),
    findById: vi.fn(async (c: string, i: string) => col(c).find((d) => d._id === i) ?? null),
    delete: vi.fn(async () => undefined),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  Document.setMarshallerResolver(() => undefined, async () => undefined);
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  const reg = makeStuffAtPath(() => new ChattelRegistry(), "/platform/idea/ChattelRegistry");
  await reg.onCreate();
});
afterEach(() => vi.restoreAllMocks());

describe("custody derived by the movement primitive", () => {
  it("⭐ a FRESH good made in the course of a person's act is theirs", async () => {
    const alice = makeStuffAtPath(() => new Person(), ALICE);
    const yard = room("/test/Yard");
    const g = good();
    await asAlice(alice, () =>
      ContainmentApi.move(g as unknown as Stuff & Containable, yard as unknown as Stuff & Container),
    );
    await settle();
    expect(await ownerOf(g)).toBe(ALICE);
  });

  it("⚠ a good that already EXISTS is never retitled by being moved — taking it is theft", async () => {
    const alice = makeStuffAtPath(() => new Person(), ALICE);
    const shelf = room("/test/Shelf");
    const yard = room("/test/Yard");
    const g = good();
    // Stood up by nobody (a restock): untitled.
    ContainmentApi.move(g as unknown as Stuff & Containable, shelf as unknown as Stuff & Container);
    await settle();
    await asAlice(alice, () =>
      ContainmentApi.move(g as unknown as Stuff & Containable, yard as unknown as Stuff & Container),
    );
    await settle();
    expect((g as unknown as Stuff & Chattel).getChattelId()).toBe("");
  });

  it("a good stamped before it arrives keeps that title (a customer's paper)", async () => {
    const alice = makeStuffAtPath(() => new Person(), ALICE);
    const bob = makeStuffAtPath(() => new Person(), "/platform/agent/Avatar/bob");
    const yard = room("/test/Yard");
    const g = good();
    await (g as unknown as Stuff & Chattel).stampChattel(bob);
    await asAlice(alice, () =>
      ContainmentApi.move(g as unknown as Stuff & Containable, yard as unknown as Stuff & Container),
    );
    await settle();
    expect(await ownerOf(g)).toBe("/platform/agent/Avatar/bob");
  });
});
