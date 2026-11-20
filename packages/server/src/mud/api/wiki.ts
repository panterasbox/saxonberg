/**
 * WikiApi — the wiki's one door for code outside the `wiki` verb.
 *
 * ⭐ It has exactly one reader: a tooltip's glossary term (tooltips D4).
 * Everything else about the wiki — reading, editing, history, moderation —
 * is the `wiki` verb, whose controllers reach the registry directly. This
 * exists because the backend may only call an Api, and the excerpt must go
 * through the wiki's own reveal gate rather than a second reader beside it.
 *
 * ⚠ It takes no reader. The reader is the ACTING character, derived by the
 * renderer from the execution context exactly as `wiki <page>` derives it —
 * so the capability ceiling and the appetite are the verb's, and a caller
 * cannot ask on somebody else's behalf.
 *
 * See [wiki.md](../../../../docs/subsystems/wiki.md).
 */

import type { TooltipDoc } from '@saxonberg/types';
import { SecurityApi, type ApiNeed } from './security';
import { StuffApi } from './stuff';
import { TemplatePaths } from '../lib/paths';
import type WikiRegistry from '../platform/idea/WikiRegistry';

export class WikiApi {
  /**
   * ⭐ What this Api's reads stand on — stood ONCE at boot with every Api's
   * needs, so no caller ever readies it.
   */
  static readonly needs: readonly ApiNeed[] = [TemplatePaths.wikiRegistry];

  /**
   * A page's opening section as a tooltip document, rendered for the
   * acting reader through the wiki's own gate — or `null`, one answer for
   * *no such page* and *nothing you may read*.
   */
  static async excerpt(ref: string): Promise<TooltipDoc | null> {
    const registry = await StuffApi.singleton<WikiRegistry>(TemplatePaths.wikiRegistry);
    return registry.excerptFor(ref);
  }
}

SecurityApi.decorateApiClass(WikiApi);
