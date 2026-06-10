/**
 * Wave 5: prompt.format setting + renderPromptRefresh helper.
 *
 * - The setting is registered on EnvironmentMixin with default
 *   `{{ focus }}>`.
 * - renderPromptRefresh reads it (or falls back to default for
 *   non-Environment givers).
 * - ProseApi.format renders the template against
 *   `{ focus: giver.getFocus?.() ?? '' }`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptApi, buildPromptContext } from '../prompt';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Idea } from '../../lib/stuff/Idea';
import { EnvironmentMixin } from '../../lib/shell/Environment';
import { FocusedMixin } from '../../lib/command/Focused';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SensorMixin } from '../../lib/message/Sensor';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// A giver with Environment + Focused + CommandGiver. Real Avatars
// have all three; we compose the minimum here.
class TestGiver extends SensorMixin(
  EnvironmentMixin(
    FocusedMixin(
      CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
    ),
  ),
) {
  static _mixinName = 'TestGiver';
}

// Plain Idea with no Environment / Focused.
class Plain extends Idea {
  static persistentFields: string[] = [];
}

describe('prompt.format — setting registration', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it('EnvironmentMixin registers prompt.format with default `{{ focus }}>`', () => {
    const giver = makeStuff(() => new TestGiver());
    const schema = giver.describeSetting('prompt.format');
    expect(schema).toBeDefined();
    expect(schema!.default).toBe('{{ focus }}>');
    expect(giver.getSetting('prompt.format')).toBe('{{ focus }}>');
  });

  it('setting is mutable via setSetting + round-trips', () => {
    const giver = makeStuff(() => new TestGiver());
    giver.setSetting('prompt.format', '{{ focus }} ready>', giver);
    expect(giver.getSetting('prompt.format')).toBe('{{ focus }} ready>');
  });
});

describe('buildPromptContext', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it('exposes focus for Focused givers', () => {
    const giver = makeStuff(() => new TestGiver());
    expect(buildPromptContext(giver)).toEqual({ focus: 'here' });
    giver.setFocus('thermometer');
    expect(buildPromptContext(giver)).toEqual({ focus: 'thermometer' });
  });

  it('focus is empty string for non-Focused givers', () => {
    const obj = makeStuff(() => new Plain());
    expect(buildPromptContext(obj)).toEqual({ focus: '' });
  });
});

describe('renderPromptRefresh', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it('renders default `{{ focus }}>` template against giver focus', () => {
    const giver = makeStuff(() => new TestGiver());
    const note = PromptApi.renderPromptRefresh(giver);
    expect(note).toEqual({ kind: 'prompt-refresh', rendered: 'here>' });
  });

  it('renders the configured format string', () => {
    const giver = makeStuff(() => new TestGiver());
    giver.setSetting('prompt.format', '{{ focus }} ready>', giver);
    giver.setFocus('thermometer');
    const note = PromptApi.renderPromptRefresh(giver);
    expect(note.rendered).toBe('thermometer ready>');
  });

  it('non-Environment giver falls through to default template', () => {
    const obj = makeStuff(() => new Plain());
    const note = PromptApi.renderPromptRefresh(obj);
    // No EnvironmentMixin → bare default → focus is empty → result `>`.
    expect(note.rendered).toBe('>');
  });

  it('broken template falls back to default-rendered output', () => {
    const giver = makeStuff(() => new TestGiver());
    // Liquid is forgiving — but unknown variables just render empty.
    // Verify a malformed template still produces *something* usable.
    giver.setSetting('prompt.format', '{{ unclosed', giver);
    const note = PromptApi.renderPromptRefresh(giver);
    expect(typeof note.rendered).toBe('string');
    expect(note.rendered.length).toBeGreaterThan(0);
  });
});
