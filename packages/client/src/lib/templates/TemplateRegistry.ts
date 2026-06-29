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
import { twitchTemplate } from './twitchTemplate';

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
  { prefix: 'world.chat', template: chatTemplate },
  { prefix: 'world.speech.say', template: sayTemplate },
  { prefix: 'world.speech.dm', template: tellTemplate },
  // Back-compat for any persisted frame still carrying the old
  // `world.speech.tell` topic. Both topics render through the same
  // tellTemplate so the experience is identical pre / post rename.
  { prefix: 'world.speech.tell', template: tellTemplate },
  { prefix: 'world.expression', template: emoteTemplate },
  { prefix: 'world.twitch', template: twitchTemplate },
];

/**
 * Pick the template for a given topic. Longest-prefix-match wins so
 * `world.speech.tell` resolves to `tellTemplate` rather than the
 * shorter `world.speech.say` prefix. Falls back to defaultTemplate
 * for any topic with no match.
 *
 * Bare `'world.speech'` matches the `say` template; the system
 * doesn't ship a separate "speech root" template since say IS the
 * canonical case.
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
