/**
 * `look --peek` tests — exercises the dispatcher's phase-effects
 * substrate against a `look`-shaped YAML. The peek option declares
 * `effects: [{phase: focus-update, action: skip}]`; the dispatcher
 * honors it by bypassing the focus-update step for the bound arg
 * while still updating pronoun memory.
 *
 * The peek flag rides the dispatcher's focus-update phase (not the
 * controller). The controller's prose-rendering branches are
 * unchanged; verifying focus side-effects is enough to prove the
 * gate works. Prose is exercised separately in `LookController.test.ts`
 * and the integration tests in `command-pronoun.test.ts` /
 * `command-empty-resolve.test.ts`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CommandApi, type CommandContext } from "../../../../api/command";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { ContainmentApi } from "../../../../api/containment";
import { Idea } from "../../../../lib/stuff/Idea";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import { DetailedMixin } from "../../../../lib/description/Detailed";
import { FocusedMixin } from "../../../../lib/command/Focused";
import { NamedMixin } from "../../../../lib/description/Named";
import { PerceptibleMixin } from "../../../../lib/description/Perceptible";
import { StuffApi } from "../../../../api/stuff";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";
import type Location from "../../../../lib/stuff/Location";
import type Interactive from "../../../Interactive";

class TestLocation extends ContainerMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}
class TestThing extends ContainableMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(
    FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
  )
) {}

/**
 * Mirror the production `look.yaml`: drill-first scope, `extend`
 * focus update, plus the `--peek` boolean option that declares a
 * `focus-update / skip` effect against the dispatcher.
 */
function lookCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      "verbs: [look]",
      "controller: LookController",
      "description: examine",
      "args:",
      "  - name: target",
      "    type: object",
      "    required: false",
      '    scope: ["$focus", "reachable"]',
      "    updates_focus: extend",
      "options:",
      "  peek:",
      "    type: boolean",
      '    description: "Render prose without changing focus"',
      "    effects:",
      "      - { phase: focus-update, action: skip }",
    ].join("\n"),
    "<test>"
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  command: CommandDefinition,
  text: string
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as unknown as CommandContext["commandGiver"],
    interactive: {} as Interactive,
    location,
    commandText: text,
    executionId: "test-exec",
    commandId: "test-cmd",
    verb: command.getPrimaryVerb(),
    command,
  });
}

describe("look --peek (focus-update/skip phase effect)", () => {
  let location: TestLocation;
  let giver: TestGiver;
  let rose: TestThing;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName("Town Square");
    location.addKeyword("square");

    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName("player");
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    rose = makeStuff(() => new TestThing()) as TestThing;
    rose.setName("rose");
    rose.addKeyword("rose");
    ContainmentApi.move(
      rose as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  it("look rose --peek leaves focus unchanged", async () => {
    giver.setFocus("here");
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      "look rose --peek"
    );
    await CommandApi.resolveAndValidate(
      { target: "rose", peek: true },
      ctx
    );
    // Without --peek, `updates_focus: extend` would replace focus
    // with `rose` (extend on a non-detail target replaces rather
    // than appending). With --peek the gate skips the update.
    expect(giver.getFocus()).toBe("here");
  });

  it("look rose (no peek) replaces focus with rose", async () => {
    giver.setFocus("here");
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      "look rose"
    );
    await CommandApi.resolveAndValidate({ target: "rose" }, ctx);
    // Extend semantics: looking at a non-detail Stuff replaces the
    // focus rather than chaining `here:rose`. See
    // `updatePlayerFocus` in `api/command.ts`.
    expect(giver.getFocus()).toBe("rose");
  });

  it("look rose --peek with no prior focus leaves the default 'here'", async () => {
    // Default Focused.getFocus() is 'here'. A peek pass shouldn't
    // disturb it.
    expect(giver.getFocus()).toBe("here");
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      "look rose --peek"
    );
    await CommandApi.resolveAndValidate(
      { target: "rose", peek: true },
      ctx
    );
    expect(giver.getFocus()).toBe("here");
  });

  it("peek=false explicitly is treated as not skipping (extend fires)", async () => {
    // A boolean option absent from the model coerces to undefined;
    // explicit `false` is also falsy. Both leave the gate open, so
    // the focus update fires.
    giver.setFocus("here");
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      "look rose"
    );
    await CommandApi.resolveAndValidate(
      { target: "rose", peek: false },
      ctx
    );
    // Same replace-on-extend behavior as above.
    expect(giver.getFocus()).toBe("rose");
  });

  it("peek still updates pronoun memory even when focus is skipped", async () => {
    // The dispatcher's peek gate is focus-only; pronoun memory still
    // captures the referent so `look it` after `look rose --peek`
    // works.
    giver.setFocus("here");
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      "look rose --peek"
    );
    await CommandApi.resolveAndValidate(
      { target: "rose", peek: true },
      ctx
    );
    // Focus untouched.
    expect(giver.getFocus()).toBe("here");
    // Pronoun memory captured: a follow-up `look it` would
    // substitute the rose's stored fragment ('rose'), proving the
    // gate didn't accidentally block pronoun memory too. The
    // default routing slot is 'it' for non-animate things.
    const memo = giver.getPronounMemory();
    expect(memo.readFragment("it")).toBe("rose");
  });

  it("look --peek with no target arg is a no-op for focus", async () => {
    // `look --peek` alone: no target token, default fills as
    // '$focus'. The dispatcher still runs the resolve+focus path on
    // the default; peek prevents the focus update. (Default-resolves
    // currently land the giver's focus referent.)
    giver.setFocus("here");
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      "look --peek"
    );
    // Mimic the matcher: peek=true, target as the resolved-from-
    // default fragment (`here` after $focus expansion).
    await CommandApi.resolveAndValidate(
      { target: "here", peek: true },
      ctx
    );
    expect(giver.getFocus()).toBe("here");
  });
});
