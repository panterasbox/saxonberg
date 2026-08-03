/**
 * senseStripAugmenter — pipeline-level behavior tests.
 *
 * Covers:
 *   - flatten/stripTags transparency through `<sense>`.
 *   - `Mml.stripBySense` pure-function strip rules per tag.
 *   - filter / sensorium intersection on `senseStripAugmenter`.
 *   - registration on `VisibleMixin.markupAugmenters`.
 *   - `<detail sense="X">` strip-keep-children-on-miss rule.
 *   - bare `<detail key="X">` defaults to vision sense.
 *
 * Client-side `<sense>` parse transparency lives in
 * `parseMml.test.ts`; BodyPlan.getModalities and
 * PerceptionApi.sensorium live in their own test files.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildAllModalities } from '../../perception/modalities/__tests__/test-helpers';
import {
  VisibleMixin,
  senseStripAugmenter,
  type Visible,
} from '../Visible';
import { DetailedMixin } from '../Detailed';
import Thing from '../../stuff/Thing';
import Species from '../../../obj/species/Species';
import BodyPlan from '../../../obj/species/BodyPlan';
import { OrganismMixin } from '../../species/Organism';
import type { SenseChannel } from '../Perceiver';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { FieldMeta } from '../../mixin';

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

class VisibleDetailedThing extends DetailedMixin(VisibleMixin(Thing)) {
  static fieldMeta: FieldMeta = {};
}

class OrganismActor extends OrganismMixin(Thing) {
  static fieldMeta: FieldMeta = {};
}

function makeViewerWithSensorium(channels: SenseChannel[]): Stuff {
  const bodyPlan = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    `/obj/species/BodyPlan/test-${channels.join('-') || 'sessile'}`,
  );
  bodyPlan.setSensoryPorts(
    channels.map((ch) => ({
      modality: ch,
      count: 1,
      position: 'frontal',
    })),
  );
  const species = withTemplatePath(
    makeStuff(() => new Species()),
    `/obj/species/test/${channels.join('-') || 'sessile'}`,
  );
  species.setBodyPlan(bodyPlan);
  const actor = makeStuff(() => new OrganismActor());
  actor.setSpecies(species);
  return actor;
}

describe('senseStripAugmenter (senses build)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
  });

  describe('Mml transparency through <sense>', () => {
    it('flatten emits children verbatim for <sense>', () => {
      expect(Mml.flatten('<sense channel="smell">garlic</sense>')).toBe(
        'garlic',
      );
    });

    it('stripTags removes the tag and keeps inner text', () => {
      expect(Mml.stripTags('<sense channel="smell">garlic</sense>')).toBe(
        'garlic',
      );
    });
  });

  describe('Mml.stripBySense pure-function behavior', () => {
    it('keeps in-filter <sense> region', () => {
      const out = Mml.stripBySense(
        '<sense channel="vision">A</sense>',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe('<sense channel="vision">A</sense>');
    });

    it('drops out-of-filter <sense> region AND children', () => {
      const out = Mml.stripBySense(
        '<sense channel="smell">B</sense>',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe('');
    });

    it('preserves untagged prose', () => {
      const out = Mml.stripBySense(
        'untagged <sense channel="smell">B</sense> more',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe('untagged  more');
    });

    it('mixed: keeps vision, drops smell, keeps untagged', () => {
      const out = Mml.stripBySense(
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe('<sense channel="vision">A</sense>C');
    });

    it('<detail sense="touch"> stripped on miss keeps inner children', () => {
      const out = Mml.stripBySense(
        '<detail key="bookcase" sense="touch">cool wood</detail>',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe('cool wood');
    });

    it('<detail sense="touch"> preserved on hit', () => {
      const out = Mml.stripBySense(
        '<detail key="bookcase" sense="touch">cool wood</detail>',
        new Set<SenseChannel>(['touch']),
      );
      expect(out).toBe(
        '<detail key="bookcase" sense="touch">cool wood</detail>',
      );
    });

    it('bare <detail> defaults to vision', () => {
      const out = Mml.stripBySense(
        '<detail key="bookcase">leather spines</detail>',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe(
        '<detail key="bookcase">leather spines</detail>',
      );
    });

    it('bare <detail> stripped when vision absent', () => {
      const out = Mml.stripBySense(
        '<detail key="bookcase">leather spines</detail>',
        new Set<SenseChannel>(['touch']),
      );
      expect(out).toBe('leather spines');
    });

    it('nested <sense> inside <sense>: outer drops, inner gone too', () => {
      const out = Mml.stripBySense(
        '<sense channel="smell">a<sense channel="vision">b</sense>c</sense>',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe('');
    });

    it('nested <sense> inside <sense>: outer kept recurses', () => {
      const out = Mml.stripBySense(
        '<sense channel="vision">a<sense channel="smell">b</sense>c</sense>',
        new Set<SenseChannel>(['vision']),
      );
      expect(out).toBe('<sense channel="vision">ac</sense>');
    });
  });

  describe('senseStripAugmenter — filter + sensorium intersection', () => {
    it('filter [vision], full sensorium → vision + untagged kept, smell stripped', () => {
      const viewer = makeViewerWithSensorium([
        'vision',
        'hearing',
        'smell',
      ]);
      const host = makeStuff(() => new Thing());
      const text =
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C';
      const out = senseStripAugmenter(text, host, viewer, {
        filter: ['vision'],
      });
      expect(out).toBe('<sense channel="vision">A</sense>C');
    });

    it('filter [vision], sensorium [smell] → vision stripped despite filter (sensorium gate)', () => {
      const viewer = makeViewerWithSensorium(['smell']);
      const host = makeStuff(() => new Thing());
      const text =
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C';
      const out = senseStripAugmenter(text, host, viewer, {
        filter: ['vision'],
      });
      // vision filter intersected with smell-only sensorium = empty;
      // both regions strip; untagged survives.
      expect(out).toBe('C');
    });

    it('filter [smell] with sightless viewer keeps smell + untagged', () => {
      const viewer = makeViewerWithSensorium(['smell']);
      const host = makeStuff(() => new Thing());
      const text =
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C';
      const out = senseStripAugmenter(text, host, viewer, {
        filter: ['smell'],
      });
      expect(out).toBe('<sense channel="smell">B</sense>C');
    });

    it('filter [vision, smell] (gestalt-style) keeps both for full-sensory viewer', () => {
      const viewer = makeViewerWithSensorium(['vision', 'smell']);
      const host = makeStuff(() => new Thing());
      const text =
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C';
      const out = senseStripAugmenter(text, host, viewer, {
        filter: ['vision', 'smell'],
      });
      expect(out).toBe(
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C',
      );
    });

    it('untagged prose always preserved regardless of filter/sensorium', () => {
      const viewer = makeViewerWithSensorium([]);
      const host = makeStuff(() => new Thing());
      const text = 'plain text with no sense tags';
      const out = senseStripAugmenter(text, host, viewer, {
        filter: ['vision'],
      });
      expect(out).toBe(text);
    });

    it('default-absent opts → falls back to viewer full sensorium', () => {
      const viewer = makeViewerWithSensorium(['vision', 'smell']);
      const host = makeStuff(() => new Thing());
      const text =
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C';
      // No opts → augmenter uses sensorium as the default filter.
      const out = senseStripAugmenter(text, host, viewer);
      expect(out).toBe(
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C',
      );
    });

    it('viewer without a Species (test fixture) → empty sensorium → strips all <sense>', () => {
      const viewer = makeStuff(() => new Thing());
      const host = makeStuff(() => new Thing());
      const text =
        '<sense channel="vision">A</sense><sense channel="smell">B</sense>C';
      const out = senseStripAugmenter(text, host, viewer, {
        filter: ['vision', 'smell'],
      });
      // Empty sensorium intersected with any filter = empty allowed
      // set; only untagged survives.
      expect(out).toBe('C');
    });
  });

  describe('Registration on VisibleMixin', () => {
    it('VisibleMixin.markupAugmenters contains senseStripAugmenter', () => {
      const augmenters = MixinApi.getAllMarkupAugmenters(
        VisibleDetailedThing as unknown as Parameters<
          typeof MixinApi.getAllMarkupAugmenters
        >[0],
      );
      expect(augmenters).toContain(senseStripAugmenter);
    });

    it('end-to-end: getMarkupLong({ filter: [smell] }) strips vision region', () => {
      const viewer = makeViewerWithSensorium(['vision', 'smell']);
      const host = makeStuff(() => new VisibleDetailedThing());
      host.setLongDescription(
        '<sense channel="vision">A bookcase.</sense>' +
          '<sense channel="smell">Old leather.</sense>' +
          ' Untagged tail.',
      );
      const visibleHost = host as unknown as Visible;
      const smellOnly = visibleHost.getMarkupLong(viewer, {
        filter: ['smell'],
      });
      expect(smellOnly).not.toContain('A bookcase.');
      expect(smellOnly).toContain('Old leather.');
      expect(smellOnly).toContain('Untagged tail.');
    });

    it('end-to-end: vision-only authoring renders identically to before', () => {
      // Existing rooms have no <sense> regions — output is unchanged
      // by the senseStripAugmenter. This guards against a regression
      // where the augmenter would touch plain prose.
      const viewer = makeViewerWithSensorium(['vision']);
      const host = makeStuff(() => new VisibleDetailedThing());
      host.setLongDescription('A tall walnut bookcase.');
      const visibleHost = host as unknown as Visible;
      const out = visibleHost.getMarkupLong(viewer, { filter: ['vision'] });
      expect(out).toBe('A tall walnut bookcase.');
    });
  });
});
