/**
 * The venue-records carve-out (bar-fight P9): a venue's Business
 * proprietor/staff may write the venue's OWN `records/` subtree —
 * `<operatingLocation>/records/…` — and NOTHING else, while the parcel's
 * wizard-managed title-holder keeps full authority over the whole parcel.
 * Additive and narrow: it is scoped to the records namespace of a location
 * the Business actually operates.
 */
import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import AccessRegistry from "../idea/AccessRegistry";
import GroupRegistry from "../idea/GroupRegistry";
import Avatar from "../agent/Avatar";
import { AccessApi } from "../../api/access";
import { ParcelApi } from "../../api/parcel";
import { EmploymentApi } from "../../api/employment";
import { GroupApi } from "../../api/group";
import { StuffApi } from "../../api/stuff";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import type { Stuff } from "../../lib/stuff/Stuff";
import { EmploymentLogic } from '../idea/api/EmploymentLogic';
import { MixinApi } from '../../api/mixin';

type Doc = Record<string, unknown> & { _id?: string };
function installInMemoryStore(): void {
  const store: Doc[] = [];
  let seq = 0;
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save: vi.fn(async (_c: string, doc: Doc) => {
      const id = doc._id ?? `id-${++seq}`;
      const i = store.findIndex((d) => d._id === id);
      if (i >= 0) store[i] = { ...doc, _id: id };
      else store.push({ ...doc, _id: id });
      return id;
    }),
    find: vi.fn(async (_c: string, q: Doc) =>
      store.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)),
    ),
    findById: vi.fn(async (_c: string, id: string) => store.find((d) => d._id === id) ?? null),
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

const BAR_LOC = "/world/lounge/location/bar";
const RECORDS = "/world/lounge/location/bar/records/eighty-six";
const DAVE = "/platform/agent/Avatar/dave";

async function bootRegistry(): Promise<AccessRegistry> {
  const groups = makeStuffAtPath(
    () => new GroupRegistry(),
    "/platform/idea/GroupRegistry",
  );
  await groups.postRegister();
  const reg = makeStuffAtPath(
    () => new AccessRegistry(),
    "/platform/idea/AccessRegistry",
  );
  await reg.postRegister();
  return reg;
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(
    () => new Avatar(),
    `/platform/agent/Avatar/${playerId}`,
  );
  av.setPlayerId(playerId);
  return av;
}

describe("AccessRegistry — the venue-records carve-out", () => {
  let dave: Avatar;
  let stranger: Avatar;

  beforeEach(async () => {
    StuffApi.clearAll();
    installInMemoryStore();
    await bootRegistry();
    dave = makeAvatar("dave");
    stranger = makeAvatar("stranger");
    // The whole parcel is titled to the wizard-managed `lounge` group, and
    // neither Dave nor the stranger is a member (they aren't wizards).
    vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
      kind: "group",
      groupId: "lounge",
    } as never);
    vi.spyOn(ParcelApi, "resolveOwnerRef").mockResolvedValue("lounge" as never);
    vi.spyOn(GroupApi, "isMember").mockResolvedValue(false as never);
    // The bar Business operates the bar location; Dave is its proprietor.
    // The org face (F4): the registry asks the BUSINESS OBJECT.
    const bar = {
      stuffId: "bar-business",
      employs: () => false,
      hasProprietor: async (subject: Stuff | null) =>
        subject?.getIdentityPath() === DAVE,
    } as unknown as Stuff;
    vi.spyOn(EmploymentApi, "businessAt").mockImplementation((loc) =>
      loc === BAR_LOC ? (bar as never) : null,
    );
    vi.spyOn(MixinApi, "isOrganization").mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("the proprietor may write the bar's own records subtree", async () => {
    expect(await AccessApi.canAtPath(dave, "write-document" as never, RECORDS)).toBe(
      true,
    );
  });

  it("a stranger may NOT — not staff, not the parcel's group", async () => {
    expect(
      await AccessApi.canAtPath(stranger, "write-document" as never, RECORDS),
    ).toBe(false);
  });

  it("the carve-out is narrow: NOT the rest of the venue (only records/)", async () => {
    // A doc under the bar location but NOT under records/ — denied.
    expect(
      await AccessApi.canAtPath(
        dave,
        "write-document" as never,
        "/world/lounge/location/bar/menu",
      ),
    ).toBe(false);
  });

  it("the carve-out is narrow: NOT another venue's records", async () => {
    // A records path whose operating location has no Business → denied.
    expect(
      await AccessApi.canAtPath(
        dave,
        "write-document" as never,
        "/world/lounge/location/lounge/records/x",
      ),
    ).toBe(false);
  });
});
