/**
 * TemplateRegistry — longest-prefix dispatch.
 * Acceptance criteria #5, #6 ride here.
 */

import { describe, it, expect } from 'vitest';
import {
  pickTemplate,
  defaultTemplate,
  _registerTemplateForTest,
} from '../TemplateRegistry';
import { chatTemplate } from '../chatTemplate';
import { sayTemplate } from '../sayTemplate';
import { tellTemplate } from '../tellTemplate';
import { emoteTemplate } from '../emoteTemplate';
import { relayTemplate } from '../relayTemplate';

describe('TemplateRegistry — pickTemplate', () => {
  it('world.chat.* picks chatTemplate', () => {
    expect(pickTemplate('world.chat.gossip')).toBe(chatTemplate);
    expect(pickTemplate('world.chat.trade')).toBe(chatTemplate);
  });

  it('world.speech.say picks sayTemplate', () => {
    expect(pickTemplate('world.speech.say')).toBe(sayTemplate);
  });

  it('world.speech.tell picks tellTemplate (longer prefix beats say)', () => {
    expect(pickTemplate('world.speech.tell')).toBe(tellTemplate);
  });

  it('world.expression.emote picks emoteTemplate', () => {
    expect(pickTemplate('world.expression.emote')).toBe(emoteTemplate);
  });

  it('relay topics (twitch/youtube/kick) pick relayTemplate', () => {
    expect(pickTemplate('world.twitch.message')).toBe(relayTemplate);
    expect(pickTemplate('world.youtube.message')).toBe(relayTemplate);
    expect(pickTemplate('world.kick.message')).toBe(relayTemplate);
  });

  it('system.* falls through to defaultTemplate (acceptance #5, #6)', () => {
    expect(pickTemplate('system.command.info')).toBe(defaultTemplate);
    expect(pickTemplate('system.connection.established')).toBe(defaultTemplate);
  });

  it('world.perception.look falls through to defaultTemplate', () => {
    expect(pickTemplate('world.perception.look')).toBe(defaultTemplate);
  });

  it('completely unknown topic falls through to defaultTemplate', () => {
    expect(pickTemplate('totally.unknown.topic')).toBe(defaultTemplate);
  });

  it('longest-prefix wins when an ad-hoc registration overlaps', () => {
    const fakeTemplate = (() => null) as never;
    const cleanup = _registerTemplateForTest(
      'world.chat.gossip',
      fakeTemplate,
    );
    try {
      expect(pickTemplate('world.chat.gossip')).toBe(fakeTemplate);
      expect(pickTemplate('world.chat.trade')).toBe(chatTemplate);
    } finally {
      cleanup();
    }
  });
});
