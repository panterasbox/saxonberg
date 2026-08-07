/**
 * emoteTemplate — `act.emote` frames (catalog + free-form).
 * Italic action-shaped render (`Bobalu waves at you.`); the italic
 * comes from the `world.expression` topic-cascade rule. Same structural
 * render as `default` for v1; per-type customization (a leading "*",
 * emote categorization) lands when the visual polish slate ships.
 */

import { defaultTemplate } from './defaultTemplate';
import type { Template } from './TemplateRegistry';

export const emoteTemplate: Template = (ctx) => defaultTemplate(ctx);
