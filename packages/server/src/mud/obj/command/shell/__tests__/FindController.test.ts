/**
 * FindController tests.
 *
 * The dispatcher binds `query` (a `type: objects` greedy positional)
 * as an `MqlManyResult` before the controller runs, so the tests
 * synthesize that wrapper directly — parse / permission paths are
 * covered by `command-pronoun.test.ts` and `mql.test.ts`.
 *
 * Acceptance criteria from the inspection-pane Wave 5 plan:
 *   - one match → single row carrying the display name
 *   - many matches → one row per match
 *   - empty result → friendly "no matches" line
 *   - admin viewers see a template-path suffix per row
 *   - non-admin viewers do NOT see template paths
 *   - the giver's focus is unchanged after the verb fires (the
 *     load-bearing "find does not touch focus" assertion)
 *   - no subscription state is registered (snapshot semantics)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import FindController from '../FindController';
import { Idea } from '../../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { FocusedMixin } from '../../../../lib/command/Focused';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { PerceptibleMixin } from '../../../../lib/description/Perceptible';
import { VisibleMixin } from '../../../../lib/description/Visible';
import { AuthorMixin } from '../../../../lib/shell/Author';
import CartesianLocation from '../../../../lib/spatial/CartesianLocation';
import { ContainmentApi } from '../../../../api/containment';
import { MqlSubscriptionApi } from '../../../../api/mql-subscription';
import type { MqlManyResult } from '../../../../api/mql';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import { Stuff } from '../../../../lib/stuff/Stuff';
import type Interactive from '../../../Interactive';
import type Location from '../../../../lib/stuff/Location';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';

// Standard giver — Sensor (so Scene.toSelf delivers), Focused (so
// `getFocus()` exists for the "focus unchanged" assertion), command
// surface, containment. No AuthorMixin → the admin gate is off.
const TestGiverBase = FocusedMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(SensorMixin(Idea))))
);
class TestGiver extends TestGiverBase {
  public received: Array<{ topic?: string; body?: string }> = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as { topic?: string; body?: string });
  }
}

// Admin giver — adds `AuthorMixin` so `MixinApi.isAuthor` is true.
// All other compositional state matches `TestGiver`.
const TestAdminGiverBase = AuthorMixin(
  FocusedMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(SensorMixin(Idea))))
  )
);
class TestAdminGiver extends TestAdminGiverBase {
  public received: Array<{ topic?: string; body?: string }> = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as { topic?: string; body?: string });
  }
}

class TestThing extends ContainableMixin(
  VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}

function makeModel(fields: ModelData = {}): CommandModel {
  return { ...fields };
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>'
  );
}

function makeContext(
  giver: TestGiver | TestAdminGiver,
  location: Location,
  raw: string
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: `find ${raw}`,
    executionId: 'test-execution',
    commandId: 'test-command',
    verb: 'find',
    command: stubCommand('find'),
  });
}

function queryField(stuff: Stuff[], raw: string): MqlManyResult {
  return { stuff, raw };
}

function namedThing(name: string): Stuff {
  const t = makeStuff(() => new TestThing()) as unknown as Stuff & {
    setName: (n: string) => void;
    addKeyword: (k: string) => void;
  };
  t.setName(name);
  t.addKeyword(name);
  return t as unknown as Stuff;
}

describe('FindController', () => {
  let giver: TestGiver;
  let location: CartesianLocation;
  let controller: FindController;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    location.setShortDescription('Town Square');
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
    controller = makeStuff(() => new FindController());
  });

  it('renders one row carrying the display name for a single match', () => {
    const apple = namedThing('apple');
    controller.execute(
      makeModel({ query: queryField([apple], 'apple') } as ModelData),
      makeContext(giver, location, 'apple')
    );
    const body = giver.received[0]?.body ?? '';
    expect(body).toContain('apple');
    // `Mml.item` emits a `<item stuff-id="...">` tag wrapping the
    // display name. Just checking the name + tag shape — the prose
    // surface, not the structure.
    expect(body).toContain('<item');
  });

  it('renders one row per match for a multi-match result', () => {
    const a = namedThing('apple');
    const b = namedThing('apricot');
    const c = namedThing('avocado');
    controller.execute(
      makeModel({ query: queryField([a, b, c], 'a*') } as ModelData),
      makeContext(giver, location, 'a*')
    );
    const body = giver.received[0]?.body ?? '';
    expect(body).toContain('apple');
    expect(body).toContain('apricot');
    expect(body).toContain('avocado');
    // Three `<item>` tags, one per row.
    const itemCount = (body.match(/<item /g) ?? []).length;
    expect(itemCount).toBe(3);
  });

  it('renders a friendly "no matches" line on empty result', () => {
    controller.execute(
      makeModel({ query: queryField([], 'unicorn') } as ModelData),
      makeContext(giver, location, 'unicorn')
    );
    const body = giver.received[0]?.body ?? '';
    expect(body.toLowerCase()).toContain('no matches');
    expect(body).toContain('unicorn');
  });

  it('does not change focus (load-bearing "find does not touch focus")', () => {
    giver.setFocus('bookcase');
    const apple = namedThing('apple');
    controller.execute(
      makeModel({ query: queryField([apple], 'apple') } as ModelData),
      makeContext(giver, location, 'apple')
    );
    expect(giver.getFocus()).toBe('bookcase');
  });

  it('does not install subscription state (snapshot semantics)', () => {
    const before = MqlSubscriptionApi._getRegistrySizeForTesting();
    const apple = namedThing('apple');
    controller.execute(
      makeModel({ query: queryField([apple], 'apple') } as ModelData),
      makeContext(giver, location, 'apple')
    );
    const after = MqlSubscriptionApi._getRegistrySizeForTesting();
    expect(after).toBe(before);
  });

  it('does NOT render template paths for non-admin viewers', () => {
    const apple = namedThing('apple');
    Stuff._stampTemplatePath(apple, '/obj/apple');
    controller.execute(
      makeModel({ query: queryField([apple], 'apple') } as ModelData),
      makeContext(giver, location, 'apple')
    );
    const body = giver.received[0]?.body ?? '';
    expect(body).not.toContain('/obj/apple');
  });

  describe('admin viewer', () => {
    let admin: TestAdminGiver;

    beforeEach(() => {
      admin = makeStuff(() => new TestAdminGiver());
      ContainmentApi.move(admin, location);
    });

    it('appends template path per row for admin viewers', () => {
      const apple = namedThing('apple');
      Stuff._stampTemplatePath(apple, '/obj/apple');
      const adminController = makeStuff(() => new FindController());
      adminController.execute(
        makeModel({ query: queryField([apple], 'apple') } as ModelData),
        makeContext(admin, location, 'apple')
      );
      const body = admin.received[0]?.body ?? '';
      expect(body).toContain('apple');
      expect(body).toContain('/obj/apple');
    });

    it('admin: template-path-less Stuff renders bare display name (no suffix)', () => {
      // Transient / bootstrap Stuff with no clone-pipeline stamp.
      const orphan = namedThing('orphan');
      const adminController = makeStuff(() => new FindController());
      adminController.execute(
        makeModel({ query: queryField([orphan], 'orphan') } as ModelData),
        makeContext(admin, location, 'orphan')
      );
      const body = admin.received[0]?.body ?? '';
      expect(body).toContain('orphan');
      // No bare parens (no `(...)` text from a null template path).
      expect(body).not.toMatch(/\(\)/);
      expect(body).not.toContain('null');
    });

    it('admin: multi-match output includes all template paths', () => {
      const a = namedThing('apple');
      const b = namedThing('apricot');
      Stuff._stampTemplatePath(a, '/obj/apple');
      Stuff._stampTemplatePath(b, '/obj/apricot');
      const adminController = makeStuff(() => new FindController());
      adminController.execute(
        makeModel({ query: queryField([a, b], 'a*') } as ModelData),
        makeContext(admin, location, 'a*')
      );
      const body = admin.received[0]?.body ?? '';
      expect(body).toContain('/obj/apple');
      expect(body).toContain('/obj/apricot');
    });
  });
});
