/**
 * `<help verb="plant">` — transclude a command's help topic.
 *
 * ```
 * <help verb="plant"/>
 * ```
 *
 * The first component that reaches a **live source**, and therefore the
 * one that demonstrates why the contract is shaped the way it is: it
 * reads the harvested help catalogue at render time, so a page that
 * transcludes a verb's help is never stale — editing the verb's YAML
 * updates every article quoting it, with no edit to any article.
 *
 * ## The division of labour with the wiki
 *
 * Help tells you **what a verb does**; the wiki tells you what a thing
 * IS and why you would want to. A guide page walking somebody through
 * farming should not *restate* `plant`'s syntax — that is the
 * cite-never-restate rule the college slate applies to courses,
 * applied one layer down. It transcludes it.
 *
 * ## ⭐ It reads a source and still cannot leak
 *
 * `HelpApi.commandTopic` is ungated reference data — the same body any
 * player gets from typing `help plant`. The component receives **no
 * reader identity**, so it could not filter by reader even if it
 * wanted to; if a help topic ever needs gating, that gate belongs on
 * the topic (where `help` itself would honour it), not here. This is
 * C1 in practice rather than in principle: annotation-only means a
 * component author has nothing to get wrong.
 */

import { HelpApi } from '../../../api/help';
import type { MmlNode } from '../../../api/mml';
import type { ComponentContext } from '../render';

export const component = class WikiHelp {
  static label = 'help';

  static render(
    props: Readonly<Record<string, string>>,
    _children: readonly MmlNode[],
    _ctx: ComponentContext,
  ): readonly MmlNode[] {
    const verb = (props.verb ?? '').trim();
    if (!verb) {
      return [inlineError('<help> needs a verb')];
    }
    const topic = HelpApi.commandTopic(verb);
    if (!topic) {
      // A verb that does not exist is an authoring error worth
      // surfacing: it usually means the verb was renamed, and the
      // article now quotes nothing.
      return [inlineError(`no help for '${verb}'`)];
    }
    return [
      {
        kind: 'tag',
        tag: 'blockquote',
        attrs: {},
        children: [
          {
            kind: 'tag',
            tag: 'strong',
            attrs: {},
            children: [{ kind: 'text', text: topic.title }],
          },
          { kind: 'text', text: '\n' },
          { kind: 'text', text: topic.body },
        ],
      },
    ];
  }
};

/** The inline marker a component failure renders as. */
function inlineError(detail: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'code',
    attrs: {},
    children: [{ kind: 'text', text: `[wiki: ${detail}]` }],
  };
}
