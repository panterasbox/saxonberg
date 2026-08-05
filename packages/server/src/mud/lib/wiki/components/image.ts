/**
 * `<image key="…">` — reference an existing media asset.
 *
 * ```
 * <image key="materials/oak.png" alt="A cross-section of oak"/>
 * ```
 *
 * The key is a **bucket-relative** path, exactly what
 * `Visible.illustration` already holds, and the *client* prepends its
 * configured media base URL. So referencing an existing asset is free:
 * the client resolves a wiki `<image>` with the machinery it already
 * uses for a room's illustration.
 *
 * ## ⚠ What this deliberately does NOT do
 *
 * **It defines no upload path.** Three producers want to put bytes in
 * one bucket — the wiki, the CMS, and the offline `illustrate.ts` — and
 * building ingest inside the wiki would make it the second of three,
 * and the one that records provenance differently from the other two.
 * The route and the S3 credentials belong in the **backend tier**
 * anyway: the import boundary forbids the mudlib from reaching S3 at
 * all. The wiki *consumes* a shared media-ingest surface and does not
 * define it (M3); this component is the whole of the wiki's side.
 *
 * **It does not check `MediaAsset.status`.** Criterion 41 (an
 * unapproved asset is not served) belongs to the same shared ingest:
 * enforcing it here would put the promotion rule in the second of
 * three places that need it, and the one place it could be
 * inconsistent. Named as a dependency, not solved here.
 *
 * The subject-illustration half of criterion 39 — a subject-bound page
 * surfacing its subject's `illustration` with no authoring — rides
 * `<composition>`, which reads the subject's live fields.
 */

import type { MmlNode } from '../../../api/mml';
import type { ComponentContext } from '../render';

export const component = class WikiImage {
  static label = 'image';

  static render(
    props: Readonly<Record<string, string>>,
    _children: readonly MmlNode[],
    _ctx: ComponentContext,
  ): readonly MmlNode[] {
    const key = (props.key ?? '').trim();
    if (!key) {
      return [
        {
          kind: 'tag',
          tag: 'code',
          attrs: {},
          children: [{ kind: 'text', text: '[wiki: <image> needs a key]' }],
        },
      ];
    }
    // A key that tries to escape its bucket is refused rather than
    // normalised: the client joins it to a base URL, so `../` in a key
    // is a request to fetch something the bucket was not meant to
    // serve. Refusing names the problem; silently stripping hides it.
    if (key.includes('..') || key.startsWith('/') || key.includes('://')) {
      return [
        {
          kind: 'tag',
          tag: 'code',
          attrs: {},
          children: [
            {
              kind: 'text',
              text: `[wiki: <image> key must be bucket-relative, got '${key}']`,
            },
          ],
        },
      ];
    }
    const alt = (props.alt ?? '').trim();
    return [
      {
        kind: 'tag',
        tag: 'image',
        attrs: { key, ...(alt ? { alt } : {}) },
        children: [],
      },
    ];
  }
};
