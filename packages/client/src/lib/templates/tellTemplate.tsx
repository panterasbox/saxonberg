/**
 * tellTemplate — `speech.comms` frames. The quieter palette comes
 * from the topic-cascade rule (`speech.comms: { fg: <a muted
 * foreground>, prefix: '» ' }` — high-contrast is the theme that
 * currently carries one) — the structural render is the same as
 * `defaultTemplate`. Acceptance criterion #3 gates
 * that `tell` looks visibly quieter than `say`; the stylesheet
 * delivers that.
 */

import { defaultTemplate } from './defaultTemplate';
import type { Template } from './TemplateRegistry';

export const tellTemplate: Template = (ctx) => defaultTemplate(ctx);
