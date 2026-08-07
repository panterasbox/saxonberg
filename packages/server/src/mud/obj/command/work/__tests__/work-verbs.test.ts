/**
 * The `work` verb surface — JobController (board-afforded, dispatch-on-
 * subcommand) + FulfillController (self-afforded, travels with the
 * courier), driven as the dispatcher would (actor from context) over the
 * real ContractApi/BankingApi and the shared in-memory harness. Also pins
 * the affordance split (board affords `job` to peers; the wallet update affords
 * `fulfill`) and the help text on both YAML views.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import JobController from "../JobController";
import FulfillController from "../FulfillController";
import JobBoard from "../../../JobBoard";
import CredentialWalletUpdate from "../../../CredentialWalletUpdate";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { ContractApi } from "../../../../api/contract";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { MessageApi } from "../../../../api/message";
import { ContainmentApi } from "../../../../api/containment";
import { ExecutionContextApi } from "../../../../api/execution-context";
import { Idea } from "../../../../lib/stuff/Idea";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../lib/message/Sensor";
import type { CommandContext } from "../../../../api/command";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../lib/banking/__tests__/banking-test-harness";

class Person extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static _mixinName = "Person";
}
class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = "TestRoom";
}
class TestCrate extends ContainableMixin(Idea) {
  static _mixinName = "TestCrate";
}

const BOARD = "/domain/terminus/terminal/job-board";
const HERE = "/domain/test/bar-room";
const DEST = "/domain/test/bar";
const CRATE = "/obj/test/crate";
const POSTER = "/obj/Avatar/poster";
const COURIER = "/obj/Avatar/courier";

let sent: string[];

function muteScenes(): void {
  sent = [];
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: unknown) => {
      sent.push(String(body));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

function ctx(
  giver: Stuff,
  extra: Record<string, unknown> = {},
): CommandContext & { note: ReturnType<typeof vi.fn> } {
  return {
    commandGiver: giver,
    note: vi.fn(),
    ...extra,
  } as unknown as CommandContext & { note: ReturnType<typeof vi.fn> };
}

async function asGiver<T>(giver: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "work.test", () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return fn();
  });
}

describe("work verbs", () => {
  let room: TestRoom;
  let dest: TestRoom;
  let board: JobBoard;
  let poster: Person;
  let courier: Person;
  let crate: TestCrate;

  beforeEach(async () => {
    installV1QuantityMarshallers();
    installBankingHarness();
    muteScenes();
    room = makeStuffAtPath(() => new TestRoom(), HERE);
    dest = makeStuffAtPath(() => new TestRoom(), DEST);
    board = makeStuffAtPath(() => new JobBoard(), BOARD);
    poster = makeStuffAtPath(() => new Person(), POSTER);
    courier = makeStuffAtPath(() => new Person(), COURIER);
    crate = makeStuffAtPath(() => new TestCrate(), CRATE);
    ContainmentApi.move(board as never, room);
    ContainmentApi.move(poster, room);
    ContainmentApi.move(courier, room);
    ContainmentApi.move(crate, room);
    const acct = await asGiver(poster, () =>
      BankingApi.ensureVenueAccount(
        POSTER,
        BankingApi.defaultCustodianBank(),
        "", Currency.compact()),
    );
    await BankingApi.mint(acct, Money.of(100, Currency.compact()));
    // The courier is a player (the /obj/Avatar/ namespace): players hold
    // their own accounts (never silently signed up at settle).
    await BankingApi.ensureVenueAccount(
      COURIER,
      BankingApi.defaultCustodianBank(),
      "", Currency.compact());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    teardownBankingHarness();
  });

  function job(): JobController {
    return makeStuff(() => new JobController());
  }
  function fulfill(): FulfillController {
    return makeStuff(() => new FulfillController());
  }

  async function postGig(
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const c = ctx(poster);
    await asGiver(poster, () =>
      job().execute(
        {
          subcommand: "post",
          item: { stuff: crate, raw: "crate" },
          destination: DEST,
          reward: 25,
          ...extra,
        } as never,
        c,
      ),
    );
    const gigs = await ContractApi.openGigsOn(BOARD);
    return gigs[gigs.length - 1]?.contractId ?? "";
  }

  it("post → browse: the gig lists on THIS board, not another", async () => {
    const id = await postGig();
    expect(id).not.toBe("");
    sent = [];
    await asGiver(courier, () =>
      job().execute({ subcommand: undefined } as never, ctx(courier)),
    );
    expect(sent.join("\n")).toContain("deliver crate to bar");
    expect(sent.join("\n")).toContain("25 credits");
    // A second board elsewhere shows nothing.
    expect(await ContractApi.openGigsOn("/domain/other/board")).toHaveLength(
      0,
    );
  });

  it("post builds a template-bound condition from a plain exemplar", async () => {
    const id = await postGig();
    const record = await ContractApi.contractById(id);
    expect(record?.clause?.condition.item).toEqual({
      kind: "template",
      path: CRATE,
    });
    expect(record?.clause?.condition.destinationPath).toBe(DEST);
    // Exclusive by default: funds checked, not yet escrowed.
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(0);
  });

  it("post --bounty escrows immediately", async () => {
    const id = await postGig({ bounty: true });
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(25);
  });

  it("claim → deliver → complete pays out through the verb path", async () => {
    const id = await postGig();
    const claimCtx = ctx(courier);
    await asGiver(courier, () =>
      job().execute({ subcommand: "claim", id: id.slice(0, 8) } as never, claimCtx),
    );
    expect(claimCtx.note).not.toHaveBeenCalled();
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(25);

    // Before delivery: complete refuses with the not-done prose.
    const early = ctx(courier);
    await asGiver(courier, () =>
      job().execute({ subcommand: "complete" } as never, early),
    );
    expect(early.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "contract-refused" }),
    );

    ContainmentApi.move(crate, dest);
    const done = ctx(courier);
    await asGiver(courier, () =>
      job().execute({ subcommand: "complete" } as never, done),
    );
    expect(done.note).not.toHaveBeenCalled();
    const acct = await BankingApi.primaryAccountIdOf(COURIER);
    expect(acct && BankingApi.balanceOf(acct).minor).toBe(25);
    expect((await ContractApi.contractById(id))?.state).toBe("settled");
  });

  it("a second claim is refused through the verb path", async () => {
    const id = await postGig();
    await asGiver(courier, () =>
      job().execute({ subcommand: "claim", id } as never, ctx(courier)),
    );
    const rivalCtx = ctx(poster);
    await asGiver(poster, () =>
      job().execute({ subcommand: "claim", id } as never, rivalCtx),
    );
    expect(rivalCtx.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "contract-refused" }),
    );
  });

  it("fulfill at the destination seals; abandon reverts + reopens", async () => {
    const id = await postGig();
    await asGiver(courier, () =>
      job().execute({ subcommand: "claim", id } as never, ctx(courier)),
    );
    ContainmentApi.move(crate, dest);
    ContainmentApi.move(courier, dest);
    const seal = ctx(courier);
    await asGiver(courier, () => fulfill().execute({} as never, seal));
    expect(seal.note).not.toHaveBeenCalled();
    expect(
      (await ContractApi.eventsFor(id)).map((e) => e.event),
    ).toContain("fulfilled");

    // Abandon (bare — single active claim resolves board-side).
    ContainmentApi.move(courier, room);
    const quit = ctx(courier);
    await asGiver(courier, () =>
      job().execute({ subcommand: "abandon" } as never, quit),
    );
    expect(quit.note).not.toHaveBeenCalled();
    expect((await ContractApi.contractById(id))?.state).toBe("open");
    expect(BankingApi.escrowBalanceOf(id).minor).toBe(0);
  });

  it("job away from any board refuses; unknown subcommand refuses", async () => {
    const nowhere = makeStuffAtPath(() => new TestRoom(), "/domain/test/void");
    ContainmentApi.move(courier, nowhere);
    const lost = ctx(courier);
    await asGiver(courier, () =>
      job().execute({ subcommand: undefined } as never, lost),
    );
    expect(lost.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-board" }),
    );
    const weird = ctx(poster);
    await asGiver(poster, () =>
      job().execute({ subcommand: "frobnicate" } as never, weird),
    );
    expect(weird.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "unknown-subcommand" }),
    );
  });

  it("bare fulfill refuses with no claim, and with several claims", async () => {
    const none = ctx(courier);
    await asGiver(courier, () => fulfill().execute({} as never, none));
    expect(none.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-claim" }),
    );
    const idA = await postGig();
    const idB = await postGig();
    for (const id of [idA, idB]) {
      await asGiver(courier, () =>
        job().execute({ subcommand: "claim", id } as never, ctx(courier)),
      );
    }
    const many = ctx(courier);
    await asGiver(courier, () => fulfill().execute({} as never, many));
    expect(many.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "ambiguous-claim" }),
    );
  });

  it("affordance split: the board affords job; the wallet affords fulfill", () => {
    // A board standing in the room grants `job` SIDEWAYS to the people
    // in it — `peers` under the directional model.
    expect(JobBoard.commandContributions.peers).toContain("work/job.yaml");
    expect(JobBoard.commandContributions.self).not.toContain(
      "work/fulfill.yaml",
    );
    expect(CredentialWalletUpdate.commandContributions.self).toContain(
      "work/fulfill.yaml",
    );
    // resolveIn: reachable-peers path (no commandSource in the context).
    const found = JobBoard.resolveIn(ctx(courier) as never);
    expect(found).toBe(board);
  });

  it("both YAML views parse and carry help text (the help criterion)", () => {
    for (const name of ["job", "fulfill"] as const) {
      const raw = readFileSync(
        fileURLToPath(new URL(`../../../../cmd/work/${name}.yaml`, import.meta.url)),
        "utf8",
      );
      const def = CommandDefinition.fromYaml(raw, `${name}.yaml`);
      expect(def.getHelpText().length).toBeGreaterThan(40);
    }
  });
});
