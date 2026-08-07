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
  it('speech.channel picks chatTemplate', () => {
    expect(pickTemplate('speech.channel')).toBe(chatTemplate);
    expect(pickTemplate('speech.channel')).toBe(chatTemplate);
  });

  it('speech.vocal picks sayTemplate', () => {
    expect(pickTemplate('speech.vocal')).toBe(sayTemplate);
  });

  it('speech.comms picks tellTemplate (longer prefix beats say)', () => {
    expect(pickTemplate('speech.comms')).toBe(tellTemplate);
  });

  it('act.emote picks emoteTemplate', () => {
    expect(pickTemplate('act.emote')).toBe(emoteTemplate);
  });

  it('relay topics (twitch/youtube/kick) pick relayTemplate', () => {
    expect(pickTemplate('speech.relay')).toBe(relayTemplate);
    expect(pickTemplate('speech.relay')).toBe(relayTemplate);
    expect(pickTemplate('speech.relay')).toBe(relayTemplate);
  });

  it('system.* falls through to defaultTemplate (acceptance #5, #6)', () => {
    expect(pickTemplate('shell.result')).toBe(defaultTemplate);
    expect(pickTemplate('session.link')).toBe(defaultTemplate);
  });

  it('sense.survey falls through to defaultTemplate', () => {
    expect(pickTemplate('sense.survey')).toBe(defaultTemplate);
  });

  it('completely unknown topic falls through to defaultTemplate', () => {
    expect(pickTemplate('totally.unknown.topic')).toBe(defaultTemplate);
  });

  it('longest-prefix wins when an ad-hoc registration overlaps', () => {
    const fakeTemplate = (() => null) as never;
    // A longer prefix must beat the registered `speech.channel`.
    const cleanup = _registerTemplateForTest(
      'speech.channel.gossip',
      fakeTemplate,
    );
    try {
      expect(pickTemplate('speech.channel.gossip')).toBe(fakeTemplate);
      expect(pickTemplate('speech.channel')).toBe(chatTemplate);
    } finally {
      cleanup();
    }
  });
});
