/**
 * Fast-travel cascade + lounge seating — integration over the in-memory
 * lounge domain store. Proves: resolving the eager root terminal (the
 * boot-manifest sim) stands the lounge host up and self-seats the node into
 * it (FixtureMixin → `seatIn` → the lounge Warren); and its `postRegister`
 * cascade brings the rest of the network (the University Avenue node + its
 * room) live from that one seed — with no registry and no manual loading.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import LoungeWarren from "../../../domain/lounge/LoungeWarren";
import { LoungePaths } from "../../../domain/lounge/paths";
import Avatar from "../../../obj/Avatar";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { AppSettings } from "../../config/AppSettings";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { FastTravel } from "../FastTravel";
import { makeStuff } from "../../security/__tests__/test-setup";
import {
  installStore,
  loungeDocs,
  flush,
  type Doc,
} from "../../../domain/lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const UA_TERMINAL = "/domain/eternal/university-avenue-terminal";
const UA_ROOM = "/domain/eternal/university-avenue/plaza";

const fastTravelDocs: Doc[] = [
  {
    path: LoungePaths.terminal,
    class: "/domain/lounge/LoungeTerminal",
    hydratorClass: PH,
    data: {
      seatIn: LoungeWarren.WARREN_PATH,
      shortDescription: "a Teleport Authority terminal",
      keywords: ["lounge"],
      directionality: "both",
      routes: [{ to: UA_TERMINAL }],
    },
  },
  {
    path: UA_TERMINAL,
    class: "/domain/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: {
      seatIn: UA_ROOM,
      shortDescription: "a Teleport Authority terminal",
      keywords: ["university-avenue", "campus"],
      directionality: "both",
      routes: [{ to: LoungePaths.terminal }],
    },
  },
  {
    path: UA_ROOM,
    class: "/lib/stuff/VoidLocation",
    hydratorClass: PH,
    data: { shortDescription: "University Avenue" },
  },
];

async function land(): Promise<Avatar> {
  const avatar = makeStuff(() => new Avatar());
  await (
    avatar as unknown as { applyStartLocation(r: string): Promise<void> }
  ).applyStartLocation(LoungeWarren.WARREN_PATH);
  return avatar;
}

// Boot-manifest sim: resolving the eager root terminal runs its postRegister
// — self-seat into the lounge Warren's host (standing the host up) plus the
// network cascade.
async function bootNetwork(): Promise<Stuff & FastTravel> {
  return StuffApi.singleton<Stuff & FastTravel>(LoungePaths.terminal);
}

function hostOf(avatar: Avatar): Stuff & Container {
  return (
    avatar as unknown as { getContainer(): Stuff & Container }
  ).getContainer();
}

describe("fast-travel cascade + lounge seating", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    installStore(loungeDocs(fastTravelDocs));
    // Warm an (empty) AppSettings cache so a host destruct's content-
    // evacuation lookup (`evacuationFallback`) resolves rather than throwing
    // — the migration test force-destroys a host that holds the terminal.
    await AppSettings.warm();
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("seats the lounge node in the host and cascades the network live", async () => {
    await bootNetwork();
    const avatar = await land();
    await flush();

    const host = hostOf(avatar);
    expect(host).toBeTruthy();

    const node = host.getContents().find((s) => MixinApi.isFastTravel(s)) as
      | (Stuff & FastTravel)
      | undefined;
    expect(node).toBeTruthy();
    expect(node!.getDirectionality()).toBe("both");

    // The cascade loaded the rest of the network from that one seated node.
    expect(StuffApi.findByTemplatePath(UA_TERMINAL)).toBeTruthy();
    expect(StuffApi.findByTemplatePath(UA_ROOM)).toBeTruthy();
  });

  it("the lounge node arrival room resolves to the live warren host", async () => {
    await bootNetwork();
    const avatar = await land();
    await flush();
    const host = hostOf(avatar);
    const node = host
      .getContents()
      .find((s) => MixinApi.isFastTravel(s)) as Stuff & FastTravel;
    const arrival = await node.getArrivalRoom();
    expect(arrival).toBe(host);
  });

  it("re-seats the lounge node into the new host after host migration", async () => {
    await bootNetwork();
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host1 = await warren.getHost();
    const terminal1 = host1
      .getContents()
      .find((s) => MixinApi.isFastTravel(s)) as Stuff;
    expect(terminal1).toBeTruthy();

    // A survivor satellite so the host ROLE migrates (rather than the graph
    // standing up empty), then force-destroy the host.
    await (
      warren as unknown as { spawnMember(): Promise<Stuff & Container> }
    ).spawnMember();
    StuffApi.destruct(host1 as unknown as Stuff);
    expect((host1 as Stuff).isDestroyed()).toBe(true);

    // Next host resolution migrates to the survivor and re-seats the fixture.
    const host2 = await warren.getHost();
    await flush();
    expect(host2).not.toBe(host1);

    // The terminal followed the host: it's seated in the new host, and there
    // is still exactly one across the store.
    const node2 = host2.getContents().find((s) => MixinApi.isFastTravel(s));
    expect(node2).toBeTruthy();
    expect(StuffApi.findAllByTemplatePath(LoungePaths.terminal)).toHaveLength(
      1,
    );
  });
});
