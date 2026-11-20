/**
 * Wiki excerpt — the inbound surface behind a tooltip's wiki term
 * (tooltips D4).
 *
 * One inbound op: `wiki-excerpt { requestId, ref }` → one
 * `wiki-excerpt-result { requestId, ref, doc }`. The excerpt is rendered
 * through the wiki's own reveal gate for THIS socket's character — the
 * frame is planted with the holder as acting author, so the ceiling and
 * the appetite are exactly what `wiki <page>` would apply. There is no
 * second, ungated reader of the wiki.
 *
 * ⚠ A read, not a dispatch: nothing runs, nothing is learned or written.
 */

import { ExecutionContextApi } from '../../mud/api/execution-context';
import { MixinApi } from '../../mud/api/mixin';
import { WikiApi } from '../../mud/api/wiki';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import type { Sensor } from '../../mud/lib/message/Sensor';
import type { WikiExcerptMessage, WikiExcerptResultEnvelope } from '@saxonberg/types';
import type { InboundHandler } from './index';

export const handleWikiExcerpt: InboundHandler = async (ctx, message) => {
  const payload = message.payload as WikiExcerptMessage | undefined;
  if (!payload || typeof payload.requestId !== 'string' || typeof payload.ref !== 'string') {
    return;
  }
  const holder = ctx.interactive.getHolder();
  if (!holder || !MixinApi.isSensor(holder)) return;
  const viewer = holder as Stuff & Sensor;

  const ref = payload.ref.trim().slice(0, 200);
  const doc = ref
    ? await ExecutionContextApi.runRoot(null, 'wiki.excerpt', async () => {
        ExecutionContextApi.tagActingAuthor(viewer);
        // ⚠ One answer for *no page* and *nothing you may read*: a failure
        // to render is the same `null`, never an error that says why.
        return WikiApi.excerpt(ref).catch(() => null);
      })
    : null;

  const template: Omit<WikiExcerptResultEnvelope, 'frameId'> = {
    type: 'wiki-excerpt-result',
    requestId: payload.requestId,
    ref: payload.ref,
    doc,
  };
  viewer.onEnvelope(template);
};
