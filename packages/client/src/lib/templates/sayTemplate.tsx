/**
 * sayTemplate — `speech.vocal` frames. Inline render with
 * italic speech (the `<speech>` element's treatment + the
 * `speech` topic-cascade rule both contribute italic).
 *
 * For v1, the say template's structure is the same as `default` —
 * `<player> says, "<speech>foo</speech>"` already renders correctly
 * through the inline MmlRenderer + stylesheet pass. The template
 * exists so per-type customization later is one file change rather
 * than a refactor.
 */

import { defaultTemplate } from './defaultTemplate';
import type { Template } from './TemplateRegistry';

export const sayTemplate: Template = (ctx) => defaultTemplate(ctx);
