/**
 * `<infobox>` — pure presentation, and the simplest possible component.
 *
 * Renders a titled two-column table of its `key=value` attributes: the
 * summary box every encyclopedia article carries at the top right.
 *
 * ⭐ **It reaches nothing.** No live state, no registry, no reader.
 * That is what makes it the reference implementation of the component
 * contract rather than merely the smallest one — every other component
 * is this plus a source, and the contract it demonstrates (props in,
 * nodes out, no identity) is what keeps the reveal model to one gate.
 *
 * ```
 * <infobox title="Oak" class="hardwood" density="0.75 g/cm³"/>
 * ```
 *
 * Authors can already build presentation like this with a **snippet**
 * and no developer at all — which is the point of snippets. This
 * exists because a table of attributes is common enough to be worth
 * one shipped implementation, and because the component contract
 * needs an exemplar that is entirely about form.
 *
 * A path-resolved module with a sole `component` export (the brain
 * pattern). Adding a component is dropping in a file — there is no
 * registry to edit.
 */

import type { MmlNode } from '../../../api/mml';
import type { ComponentContext } from '../render';

/** Attributes consumed as layout rather than as rows. */
const RESERVED = new Set(['title']);

export const component = class WikiInfobox {
  static label = 'infobox';

  static render(
    props: Readonly<Record<string, string>>,
    children: readonly MmlNode[],
    _ctx: ComponentContext,
  ): readonly MmlNode[] {
    const rows: MmlNode[] = [];

    const title = props.title;
    if (title) {
      rows.push({
        kind: 'tag',
        tag: 'tr',
        attrs: {},
        children: [
          {
            kind: 'tag',
            tag: 'th',
            attrs: {},
            children: [{ kind: 'text', text: title }],
          },
          { kind: 'tag', tag: 'th', attrs: {}, children: [] },
        ],
      });
    }

    for (const [key, value] of Object.entries(props)) {
      if (RESERVED.has(key)) continue;
      rows.push({
        kind: 'tag',
        tag: 'tr',
        attrs: {},
        children: [
          {
            kind: 'tag',
            tag: 'td',
            attrs: {},
            children: [{ kind: 'text', text: key }],
          },
          {
            kind: 'tag',
            tag: 'td',
            attrs: {},
            children: [{ kind: 'text', text: value }],
          },
        ],
      });
    }

    // Children become a trailing full-width row — a caption, or a
    // marked-up value an attribute could not carry. The component
    // decides what to do with its children (C2); this one uses them
    // rather than dropping them, because dropping authored content
    // silently is the behaviour that makes a widget untrustworthy.
    if (children.length > 0) {
      rows.push({
        kind: 'tag',
        tag: 'tr',
        attrs: {},
        children: [
          { kind: 'tag', tag: 'td', attrs: {}, children: [...children] },
          { kind: 'tag', tag: 'td', attrs: {}, children: [] },
        ],
      });
    }

    if (rows.length === 0) return [];
    return [{ kind: 'tag', tag: 'table', attrs: {}, children: rows }];
  }
};
