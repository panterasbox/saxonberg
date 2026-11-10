/**
 * The broadcast feed's wire shapes, as Rodney reads them.
 *
 * ⚠ A MIRROR of `packages/types/src/index.ts` (`StreamShow`,
 * `StreamStateEnvelope`, `StreamEventEnvelope`, `RelayChatEnvelope`, …),
 * inlined because Rodney builds on its own and does not depend on the
 * workspace types package. Change both together; the server is the source.
 */

export type StreamPhase = 'offline' | 'starting' | 'live' | 'standby' | 'ending';

export interface StreamReason {
  key: string;
  label: string;
  copy: string;
  privacy: boolean;
  scene: string | null;
}

export type StreamForeground = 'saxonberg' | 'other-tab' | 'other-app';

export interface StreamClientFacts {
  foreground: StreamForeground | null;
  mode: string | null;
  layout: string | null;
  lastVerb: string | null;
}

export interface StreamAgendaItem {
  title: string;
  done: boolean;
}

export interface StreamRotation {
  pinned: string | null;
  skip: string[];
}

export type StreamPanelWhen = 'always' | 'world' | 'money' | 'community' | 'wiki' | 'client';

export interface StreamPanelRow {
  key: string;
  weight: number;
  seconds: number;
  when: StreamPanelWhen;
  title?: string;
  body?: string;
}

export interface StreamBuild {
  sha: string;
  /** ISO 8601. */
  at: string;
}

export interface StreamShow {
  phase: StreamPhase;
  reason: StreamReason | null;
  startsAt: number | null;
  awayUntil: number | null;
  endsAt: number | null;
  topic: string | null;
  agenda: StreamAgendaItem[];
  current: number;
  client: StreamClientFacts | null;
  rotation: StreamRotation;
  playersOnline: number;
  build: StreamBuild | null;
  panels: StreamPanelRow[];
}

export interface StreamStateEnvelope {
  type: 'stream-state';
  frameId: number;
  state: StreamShow;
}

export interface StreamEventEnvelope {
  type: 'stream-event';
  frameId: number;
  kind: 'new-player';
  name: string;
  fromStream: boolean;
}

export type ChatService = 'twitch' | 'youtube' | 'kick';

export type RelaySpeaker =
  | { kind: 'in-game'; ref: { stuffId: string; displayName?: string } }
  | { kind: 'external'; service: ChatService; externalName: string }
  | {
      kind: 'external-linked';
      service: ChatService;
      externalName: string;
      ref: { stuffId: string; displayName?: string };
    };

export interface RelayChatEnvelope {
  type: 'relay-chat';
  frameId: number;
  service: ChatService;
  channelHandle: string;
  speaker: RelaySpeaker;
  text: string;
}
