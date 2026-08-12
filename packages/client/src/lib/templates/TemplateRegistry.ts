/**
 * TemplateRegistry — picks a per-message-type template by frame
 * topic. Longest-prefix match against registered templates; falls
 * back to `defaultTemplate` when no prefix matches.
 *
 * Templates live as separate modules under `templates/`; the
 * registry is the dispatch surface the Terminal consults.
 *
 * Adding a new template later is purely client work: write the
 * template module, call `registerTemplate(prefix, fn)` here.
 */

import type { ReactNode } from 'react';
import type { MmlNode } from '../mml/parseMml';
import type { Stylesheet } from '../style/Stylesheet';
import type { Frame } from '../../store';
import { defaultTemplate } from './defaultTemplate';
import { chatTemplate } from './chatTemplate';
import { sayTemplate } from './sayTemplate';
import { tellTemplate } from './tellTemplate';
import { emoteTemplate } from './emoteTemplate';
import { relayTemplate } from './relayTemplate';

export interface TemplateCtx {
  frame: Frame;
  tree: MmlNode[];
  stylesheet: Stylesheet;
  onCommandClick: (cmd: string) => void;
  onCommandPreview: (cmd: string | null) => void;
  viewerStuffId?: string;
}

export type Template = (ctx: TemplateCtx) => ReactNode;

interface Registration {
  prefix: string;
  template: Template;
}

const REGISTRATIONS: Registration[] = [
  { prefix: 'speech.channel', template: chatTemplate },
  { prefix: 'speech.vocal', template: sayTemplate },
  { prefix: 'speech.comms', template: tellTemplate },
  { prefix: 'act.emote', template: emoteTemplate },
  // One entry, not three. The platform is a transport attribute on
  // `payload.service`, not a subject, so twitch / youtube / kick all
  // arrive on one topic — and a fourth platform needs no registration.
  { prefix: 'speech.relay', template: relayTemplate },
];

/**
 * Pick the template for a given topic. Longest-prefix-match wins, so a
 * future `speech.vocal.<something>` would still find `sayTemplate`.
 * Falls back to defaultTemplate for any topic with no match.
 *
 * Bare `'speech'` has no registration — the root is a mute target, not
 * a render target, and every leaf under it registers for itself.
 */
export function pickTemplate(topic: string): Template {
  let bestPrefix = '';
  let best: Template = defaultTemplate;
  for (const { prefix, template } of REGISTRATIONS) {
    if (
      (topic === prefix || topic.startsWith(prefix + '.')) &&
      prefix.length > bestPrefix.length
    ) {
      bestPrefix = prefix;
      best = template;
    }
  }
  return best;
}

/**
 * Test-only escape hatch for adding ad-hoc templates. Production
 * registrations stay in the array above so all dispatch lives in
 * one place; tests use this to verify the longest-prefix behavior
 * without baking fixtures into the production list.
 */
export function _registerTemplateForTest(
  prefix: string,
  template: Template,
): () => void {
  const entry = { prefix, template };
  REGISTRATIONS.push(entry);
  return () => {
    const idx = REGISTRATIONS.indexOf(entry);
    if (idx !== -1) REGISTRATIONS.splice(idx, 1);
  };
}

export { defaultTemplate };
