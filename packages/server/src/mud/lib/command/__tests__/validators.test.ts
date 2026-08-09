/**
 * Validator unit tests — exercise the per-Stuff and wrapper-shape
 * paths through each shipped validator. Uses the MQL test fixture
 * world so we have a giver, a location, peers, an inventory item,
 * and details. Doors are added inline where needed.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import canReach from '../validators/canReach';
import mustBeContainable from '../validators/mustBeContainable';
import mustBeInInventory from '../validators/mustBeInInventory';
import mustBeInLocation from '../validators/mustBeInLocation';
import mustBeVisible from '../validators/mustBeVisible';
import mustBeSurfaced from '../validators/mustBeSurfaced';
import mustBeAgent from '../validators/mustBeAgent';
import mustBePutTarget from '../validators/mustBePutTarget';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SurfacedMixin } from '../../spatial/Surfaced';
import { Agent } from '../../stuff/Agent';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import {
  CommandApi,
  type CommandContext,
} from '../../../api/command';
import type { Stuff } from '../../stuff/Stuff';
import { CommandDefinition } from '../CommandDefinition';

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

describe('field validators', () => {
  let world: MqlWorld;
  let ctx: CommandContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: '',
      executionId: 'test',
      commandId: 'test',
      verb: 'test',
      command: stubCommand('test'),
    });
  });

  describe('mustBeVisible', () => {
    it('passes a wrapper bound to a Stuff', () => {
      expect(mustBeVisible({ stuff: world.rose, raw: 'rose' }, 'target', ctx)).toBeUndefined();
    });

    it('passes an empty wrapper (controller decides)', () => {
      expect(mustBeVisible({ stuff: null, raw: 'flarp' }, 'target', ctx)).toBeUndefined();
    });

    it('rejects a non-object value', () => {
      expect(mustBeVisible('a string', 'target', ctx)).toMatch(/must be an object/);
    });
  });

  describe('mustBeContainable', () => {
    it('passes Containable Stuffs (rose)', () => {
      expect(
        mustBeContainable({ stuff: [world.rose, world.daisy], raw: 'flowers' }, 'targets', ctx),
      ).toBeUndefined();
    });

    it("rejects a non-Containable (the location itself)", () => {
      expect(
        mustBeContainable({ stuff: world.location, raw: 'square' }, 'target', ctx),
      ).toMatch(/can't be carried/);
    });
  });

  describe('mustBeInInventory', () => {
    it('passes inventory items', () => {
      expect(
        mustBeInInventory({ stuff: [world.apple], raw: 'apple' }, 'targets', ctx),
      ).toBeUndefined();
    });

    it("rejects an item that's in the room, not inventory", () => {
      expect(
        mustBeInInventory({ stuff: [world.rose], raw: 'rose' }, 'targets', ctx),
      ).toMatch(/don't have/);
    });

    it('partial-match: rejects when ANY item is not in inventory', () => {
      expect(
        mustBeInInventory(
          { stuff: [world.apple, world.rose], raw: 'apple, rose' },
          'targets',
          ctx,
        ),
      ).toMatch(/don't have/);
    });

    it('passes empty results — controller produces the no-match line', () => {
      expect(
        mustBeInInventory({ stuff: [], raw: 'flarp' }, 'targets', ctx),
      ).toBeUndefined();
    });
  });

  describe('mustBeInLocation', () => {
    it('passes peers (in the location)', () => {
      expect(
        mustBeInLocation({ stuff: [world.rose, world.daisy], raw: 'flowers' }, 'targets', ctx),
      ).toBeUndefined();
    });

    it("rejects an inventory item (it's not in location.contents)", () => {
      expect(
        mustBeInLocation({ stuff: [world.apple], raw: 'apple' }, 'targets', ctx),
      ).toMatch(/don't see/);
    });
  });

  describe('canReach', () => {
    it('passes inventory items', () => {
      expect(
        canReach({ stuff: world.apple, raw: 'apple' }, 'target', ctx),
      ).toBeUndefined();
    });

    it('passes location-contents (peers)', () => {
      expect(
        canReach({ stuff: world.rose, raw: 'rose' }, 'target', ctx),
      ).toBeUndefined();
    });

    it("passes the location itself when via.exit is set (open north case)", () => {
      // Synthesize the door-via-direction shape — we don't need a
      // real Exit instance for the validator's check; it only
      // peeks at via.exit's truthiness.
      expect(
        canReach(
          { stuff: world.location, raw: 'north', via: { exit: {} as never } },
          'target',
          ctx,
        ),
      ).toBeUndefined();
    });

    it("rejects a Stuff that isn't reachable (foreign Stuff)", () => {
      // A standalone Stuff that isn't in inventory, the location,
      // an exit door, or the location-with-via.exit.
      const foreign = world.location as unknown as Stuff & {
        stuffId: string;
      };
      // Fabricate a foreign id to dodge any accidental match.
      const foreignWrapper = {
        stuff: {
          stuffId: 'foreign-id-not-in-world',
          getPresentation: () => 'a foreign thing',
        } as unknown as Stuff,
        raw: 'foreign',
      };
      expect(canReach(foreignWrapper, 'target', ctx)).toMatch(/can't reach/);
      void foreign;
    });
  });

  describe('mustBeSurfaced', () => {
    class TestSurface extends SurfacedMixin(ContainableMixin(Idea)) {}

    it('rejects non-Surfaced Stuffs (a plain item)', () => {
      expect(
        mustBeSurfaced({ stuff: world.rose, raw: 'rose' }, 'target', ctx),
      ).toMatch(/isn't a surface/);
    });

    it('accepts a Surfaced Stuff', () => {
      const surface = makeStuff(() => new TestSurface());
      expect(
        mustBeSurfaced({ stuff: surface, raw: 'table' }, 'target', ctx),
      ).toBeUndefined();
    });

    it('passes empty MQL results (controller produces the no-match line)', () => {
      expect(
        mustBeSurfaced({ stuff: null, raw: 'flarp' }, 'target', ctx),
      ).toBeUndefined();
    });

    it('rejects a non-object value', () => {
      expect(mustBeSurfaced('a string', 'target', ctx)).toMatch(
        /must be an object/,
      );
    });
  });

  describe('mustBeAgent', () => {
    class TestAgent extends Agent {}

    it('rejects non-Agent Stuffs (a plain item)', () => {
      expect(
        mustBeAgent({ stuff: world.rose, raw: 'rose' }, 'recipient', ctx),
      ).toMatch(/can't accept things/);
    });

    it('accepts an Agent instance', () => {
      const agent = makeStuff(() => new TestAgent());
      expect(
        mustBeAgent({ stuff: agent, raw: 'alice' }, 'recipient', ctx),
      ).toBeUndefined();
    });

    it('passes empty results', () => {
      expect(
        mustBeAgent({ stuff: null, raw: 'flarp' }, 'recipient', ctx),
      ).toBeUndefined();
    });
  });

  describe('mustBePutTarget', () => {
    class TestSurface extends SurfacedMixin(ContainableMixin(Idea)) {}
    class TestContainer extends ContainerMixin(ContainableMixin(Idea)) {}
    class TestPlain extends ContainableMixin(Idea) {}

    it('accepts a Container', () => {
      const chest = makeStuff(() => new TestContainer());
      expect(
        mustBePutTarget({ stuff: chest, raw: 'chest' }, 'target', ctx),
      ).toBeUndefined();
    });

    it('accepts a Surfaced', () => {
      const surface = makeStuff(() => new TestSurface());
      expect(
        mustBePutTarget({ stuff: surface, raw: 'table' }, 'target', ctx),
      ).toBeUndefined();
    });

    it('rejects neither-Container-nor-Surfaced', () => {
      const item = makeStuff(() => new TestPlain());
      expect(
        mustBePutTarget({ stuff: item, raw: 'item' }, 'target', ctx),
      ).toMatch(/can't hold things/);
    });
  });
});
