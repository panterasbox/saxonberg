/**
 * Tests for the four sense-channel validators
 * (`requiresHearing` / `requiresSmell` / `requiresTouch` /
 * `requiresTaste`). Each gates one of the single-sense verbs on
 * the giver's `PerceptionApi.sensorium` walk.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import requiresHearing from '../requiresHearing';
import requiresSmell from '../requiresSmell';
import requiresTouch from '../requiresTouch';
import requiresTaste from '../requiresTaste';
import { Idea } from '../../../stuff/Idea';
import Thing from '../../../stuff/Thing';
import { OrganismMixin } from '../../../species/Organism';
import Species from '../../../species/Species';
import BodyPlan from '../../../species/BodyPlan';
import type { SenseChannel } from '../../../description/Perceiver';
import {
  CommandApi,
  type CommandContext,
} from '../../../../api/command';
import { CommandDefinition } from '../../CommandDefinition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../security/__tests__/test-setup';
import { StuffApi } from '../../../../api/stuff';
import type { Stuff } from '../../../stuff/Stuff';
import { ContainerMixin } from '../../../spatial/Container';
import { SensorMixin } from '../../../message/Sensor';
import { ContainableMixin } from '../../../spatial/Containable';
import { FocusedMixin } from '../../Focused';
import { CommandGiverMixin } from '../../CommandGiver';
import { NamedMixin } from '../../../description/Named';
import { PerceptibleMixin } from '../../../description/Perceptible';
import { buildAllModalities } from '../../../perception/modalities/__tests__/test-helpers';
import type { FieldMeta } from '../../../mixin';

const Base = OrganismMixin(
  ContainerMixin(
    ContainableMixin(
      SensorMixin(
        FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea)))),
      ),
    ),
  ),
);
class OrganismGiver extends Base {
  static fieldMeta: FieldMeta = {};
}

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

function makeOrganismWith(channels: SenseChannel[]): Stuff {
  const bp = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    `/lib/body-plans/test-${channels.join('-') || 'sessile'}`,
  );
  bp.setSensoryPorts(
    channels.map((ch) => ({
      modality: ch,
      count: 1,
      position: 'frontal',
    })),
  );
  const sp = withTemplatePath(
    makeStuff(() => new Species()),
    `/lib/species/test/${channels.join('-') || 'sessile'}`,
  );
  sp.setBodyPlan(bp);
  const actor = makeStuff(() => new OrganismGiver()) as OrganismGiver & {
    setSpecies: (s: Species) => void;
  };
  actor.setSpecies(sp);
  return actor;
}

function makeContext(giver: Stuff, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as unknown as Parameters<
      typeof CommandApi.createCommandContext
    >[0]['commandGiver'],
    location: makeStuff(() => new Thing()) as never,
    commandText: verb,
    executionId: 't',
    commandId: 'c',
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      '<test>',
    ),
  });
}

describe('requires<channel> validators (senses build)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
  });

  it('requiresHearing passes when giver has hearing', () => {
    const giver = makeOrganismWith(['hearing']);
    expect(requiresHearing(makeContext(giver, 'listen'))).toBeUndefined();
  });

  it('requiresHearing rejects when giver lacks hearing', () => {
    const giver = makeOrganismWith(['vision']);
    expect(requiresHearing(makeContext(giver, 'listen'))).toBe(
      "You can't hear.",
    );
  });

  it('requiresSmell passes when giver has smell', () => {
    const giver = makeOrganismWith(['smell']);
    expect(requiresSmell(makeContext(giver, 'smell'))).toBeUndefined();
  });

  it('requiresSmell rejects when giver lacks smell', () => {
    const giver = makeOrganismWith(['vision', 'hearing']);
    expect(requiresSmell(makeContext(giver, 'smell'))).toBe(
      'You have no sense of smell.',
    );
  });

  it('requiresTouch passes when giver has touch', () => {
    const giver = makeOrganismWith(['touch']);
    expect(requiresTouch(makeContext(giver, 'feel'))).toBeUndefined();
  });

  it('requiresTouch rejects when giver lacks touch', () => {
    const giver = makeOrganismWith(['vision']);
    expect(requiresTouch(makeContext(giver, 'feel'))).toBe(
      "You can't feel anything.",
    );
  });

  it('requiresTaste passes when giver has taste', () => {
    const giver = makeOrganismWith(['taste']);
    expect(requiresTaste(makeContext(giver, 'taste'))).toBeUndefined();
  });

  it('requiresTaste rejects when giver lacks taste', () => {
    const giver = makeOrganismWith(['vision', 'hearing']);
    expect(requiresTaste(makeContext(giver, 'taste'))).toBe(
      'You have no sense of taste.',
    );
  });

  it('all four reject a sessile / non-Organism giver', () => {
    const sessileGiver = makeOrganismWith([]);
    expect(requiresHearing(makeContext(sessileGiver, 'listen'))).toBeDefined();
    expect(requiresSmell(makeContext(sessileGiver, 'smell'))).toBeDefined();
    expect(requiresTouch(makeContext(sessileGiver, 'feel'))).toBeDefined();
    expect(requiresTaste(makeContext(sessileGiver, 'taste'))).toBeDefined();

    const nonOrganism = makeStuff(() => new Thing());
    expect(requiresHearing(makeContext(nonOrganism, 'listen'))).toBeDefined();
    expect(requiresSmell(makeContext(nonOrganism, 'smell'))).toBeDefined();
    expect(requiresTouch(makeContext(nonOrganism, 'feel'))).toBeDefined();
    expect(requiresTaste(makeContext(nonOrganism, 'taste'))).toBeDefined();
  });
});
