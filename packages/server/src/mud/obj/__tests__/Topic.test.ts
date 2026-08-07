import { describe, it, expect, afterEach } from 'vitest';
import Topic from '../Topic';
import { Idea } from '../../lib/stuff/Idea';
import { StuffApi } from '../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';

describe('Topic', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('extends Idea', () => {
    const t = makeStuff(() => new Topic());
    expect(t).toBeInstanceOf(Idea);
  });

  it('round-trips the four persistent string fields', () => {
    const t = makeStuff(() => new Topic());
    t.setTopic('speech.vocal');
    t.setFamily('world.speech');
    t.setLabel('Say');
    t.setDescription('Speaking aloud.');

    expect(t.getTopic()).toBe('speech.vocal');
    expect(t.getFamily()).toBe('world.speech');
    expect(t.getLabel()).toBe('Say');
    expect(t.getDescription()).toBe('Speaking aloud.');
  });

  it('setTopic rejects empty strings', () => {
    const t = makeStuff(() => new Topic());
    expect(() => t.setTopic('')).toThrow(TypeError);
  });

  it('setLabel rejects empty strings', () => {
    const t = makeStuff(() => new Topic());
    expect(() => t.setLabel('')).toThrow(TypeError);
  });

  it('setDescription rejects empty strings', () => {
    const t = makeStuff(() => new Topic());
    expect(() => t.setDescription('')).toThrow(TypeError);
  });

  it('setFamily accepts an empty string (root topics)', () => {
    const t = makeStuff(() => new Topic());
    t.setFamily('');
    expect(t.getFamily()).toBe('');
  });

  it('participates in findByTemplatePath via path stamping', () => {
    const t = makeStuffAtPath(
      () => new Topic(),
      '/obj/Topic/speech.vocal',
    );
    expect(
      StuffApi.findByTemplatePath('/obj/Topic/speech.vocal'),
    ).toBe(t);
  });

  it('declares TEMPLATE_PATH_PREFIX = /obj/Topic/', () => {
    expect(Topic.TEMPLATE_PATH_PREFIX).toBe('/obj/Topic/');
  });
});
