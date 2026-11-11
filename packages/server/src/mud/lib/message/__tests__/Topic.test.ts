/**
 * The topic vocabulary as documents (documents path identity, D13): three
 * tiers of resolution, the communicative flag, the snapshot, a cold read
 * that throws, the one memoized warm — and `Scene.send` queuing IN ORDER
 * behind that warm while the vocabulary is cold, losing nothing.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type TopicCatalogue from '../../../platform/idea/TopicCatalogue';
import { DocumentApi } from '../../../api/document';
import { DiagnosticApi } from '../../../api/diagnostics';
import { MessageApi } from '../../../api/message';
import { DocumentNotResidentError } from '../../errors';
import type { StoredDocument } from '../../document/StoredDocument';
import { SensorMixin } from '../Sensor';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';

class Listener extends SensorMixin(ContainableMixin(NamedMixin(Idea))) {
  public received: MessageFrame[] = [];
  protected override handleMessage(frame: unknown): void {
    this.received.push(frame as MessageFrame);
  }
}

const DOCS = [
  { path: '/platform/topics/speech', data: { family: '', label: 'Speech', description: 'Words.', communicative: true, address: 'ambient' } },
  { path: '/platform/topics/speech.say', data: { family: 'speech', label: 'Say', description: 'Said aloud.', communicative: true } },
  { path: '/platform/topics/sense', data: { family: '', label: 'Sense', description: 'Perceived.' } },
];

function asDocs(): StoredDocument[] {
  return DOCS.map(
    (d) => ({ getPath: () => d.path, getKind: () => 'topic', getData: () => d.data }) as unknown as StoredDocument,
  );
}

let saved: ReturnType<TopicCatalogue['snapshot']>;
beforeEach(() => {
  saved = MessageApi.topics().snapshot();
});
afterEach(() => {
  vi.restoreAllMocks();
  // Put the bootstrap's vocabulary back for the next file's scenes.
  MessageApi.topics().install(saved.map((d) => ({ path: `/platform/topics/${d.topic}`, data: { ...d } })));
});

describe('Topic — the vocabulary', () => {
  beforeEach(() => MessageApi.topics().install(DOCS));

  it('an authored descriptor reads verbatim; its key is the path leaf', () => {
    expect(MessageApi.topics().descriptor('speech.say').label).toBe('Say');
    expect(MessageApi.topics().descriptor('speech.say').topic).toBe('speech.say');
  });

  it('an unseeded leaf inherits its nearest authored ancestor', () => {
    const d = MessageApi.topics().descriptor('speech.say.loudly');
    expect(d.family).toBe('speech.say');
    expect(d.label).toBe('Say (Loudly)');
  });

  it('an unauthored key derives a default — and records a diagnostic, once', async () => {
    const rec = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined as never);
    expect(MessageApi.topics().descriptor('invented').label).toBe('Invented');
    MessageApi.topics().descriptor('invented');
    // The report is fire-and-forget (the diagnostics Api is reached by a
    // deferred import — a static edge would cycle): let it land.
    await vi.waitFor(() => expect(rec).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(rec).toHaveBeenCalledTimes(1);
  });

  it('isCommunicative reads the authored flag', () => {
    expect(MessageApi.topics().isCommunicative('speech')).toBe(true);
    expect(MessageApi.topics().isCommunicative('sense')).toBe(false);
  });

  it('the snapshot is the authored descriptors only', () => {
    expect(MessageApi.topics().snapshot().map((d) => d.topic).sort()).toEqual(['sense', 'speech', 'speech.say']);
  });

  it('⚠ a synchronous read while the vocabulary is cold throws DocumentNotResidentError', () => {
    MessageApi.topics().invalidate();
    expect(() => MessageApi.topics().descriptor('speech')).toThrow(DocumentNotResidentError);
  });
});

describe('Topic — the one warm (D13)', () => {
  it('warms from the documents once, however many callers ask', async () => {
    MessageApi.topics().invalidate();
    const list = vi.spyOn(DocumentApi, 'listOfKind').mockResolvedValue(asDocs());
    const a = MessageApi.topics().warming();
    const b = MessageApi.topics().warming();
    expect(a).not.toBeNull();
    await Promise.all([a, b]);
    expect(list).toHaveBeenCalledTimes(1);
    expect(MessageApi.topics().warming()).toBeNull();
    expect(MessageApi.topics().descriptor('speech.say').label).toBe('Say');
  });

  it('⭐ scenes sent while cold are queued, then delivered IN ORDER when the warm lands — none lost', async () => {
    MessageApi.topics().invalidate();
    let land!: () => void;
    const gate = new Promise<void>((r) => (land = r));
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async () => {
      await gate;
      return asDocs();
    });
    const listener = makeStuff(() => new Listener());
    const delivered = (): string[] => listener.received.map((f) => String(f.body));
    const send = (text: string): void => {
      MessageApi.scene(listener).topic('speech.say').toSelf(text).send();
    };
    send('one');
    send('two');
    send('three');
    expect(delivered()).toEqual([]);
    expect(MessageApi.topicsWarming()).not.toBeNull();
    land();
    await MessageApi.topicsWarming();
    await new Promise((r) => setTimeout(r, 0));
    expect(delivered()).toEqual(['one', 'two', 'three']);
    // …and once warm, a scene is delivered synchronously, as before.
    send('four');
    expect(delivered()).toEqual(['one', 'two', 'three', 'four']);
  });
});
