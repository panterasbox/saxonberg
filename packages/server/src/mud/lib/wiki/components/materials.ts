/**
 * `<materials>` — **what in this world is made of what**: the live listing
 * under a capability or a kind (material decomposition W3).
 *
 * ```
 * <materials capability="Combustion"/>   every material that burns
 * <materials kind="Metal"/>              every metal, its children included
 * ```
 *
 * A capability page explains the physics once, and this lists the
 * materials that have it; a kind page says what the substance is, and this
 * lists its members. Both are DERIVED from the warmed material index at
 * read time, so a pack that adds a row adds it to the page with no edit
 * anywhere (criterion 12).
 *
 * ⭐ The wiki is the one place allowed to ask what KIND a material is
 * (`lint:material-kinds`); it asks by the class chain's NAMES, so it imports
 * no kind module and a pack's own kind (arcana's `PotionMaterial`) lists
 * under `Drink` like any other.
 *
 * ## It annotates; it never gates
 *
 * A material's NAME is public (it is what `look` says); the listing carries
 * no measured value, so it has nothing a spoiler level would hide.
 */

import { MaterialApi } from '../../../api/material';
import { MixinApi } from '../../../api/mixin';
import type { MmlNode } from '../../../api/mml';
import type Material from '../../material/Material';
import type { ComponentContext } from '../render';

export const component = class WikiMaterials {
  static label = 'materials';

  static async render(
    props: Readonly<Record<string, string>>,
    _children: readonly MmlNode[],
    _ctx: ComponentContext,
  ): Promise<readonly MmlNode[]> {
    const capability = (props.capability ?? '').trim();
    const kind = (props.kind ?? '').trim();
    if (!capability === !kind) {
      return [note('<materials> needs exactly one of `capability` or `kind`')];
    }
    const all = await MaterialApi.all();
    const members = capability
      ? all.filter((m) => MixinApi.hasMixin(m, `${capability}Mixin`))
      : all.filter((m) => kindsOf(m).includes(kind));
    if (members.length === 0) {
      return [note(capability ? `no material has ${capability}` : `no material is a ${kind}`)];
    }
    const rows = members
      .map((m) => ({ name: m.getName() || (m.getTemplatePath() ?? ''), kind: kindsOf(m)[0] ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [
      {
        kind: 'tag',
        tag: 'table',
        attrs: {},
        children: [
          tr('th', 'Material', 'Kind'),
          ...rows.map((r) => tr('td', r.name, r.kind)),
        ],
      },
    ];
  }
};

/** The class names from the material's own kind up to (not including) the base. */
function kindsOf(m: Material): string[] {
  const out: string[] = [];
  let proto: object | null = Object.getPrototypeOf(m);
  while (proto) {
    const name = (proto as { constructor?: { name?: string } }).constructor?.name ?? '';
    if (name === 'Material') break;
    if (name && !name.endsWith('Mixin') && !out.includes(name)) out.push(name);
    proto = Object.getPrototypeOf(proto);
  }
  return out;
}

function tr(cell: 'th' | 'td', a: string, b: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'tr',
    attrs: {},
    children: [
      { kind: 'tag', tag: cell, attrs: {}, children: [{ kind: 'text', text: a }] },
      { kind: 'tag', tag: cell, attrs: {}, children: [{ kind: 'text', text: b }] },
    ],
  };
}

/** The inline marker a component failure renders as. */
function note(detail: string): MmlNode {
  return {
    kind: 'tag',
    tag: 'code',
    attrs: {},
    children: [{ kind: 'text', text: `[wiki: ${detail}]` }],
  };
}
