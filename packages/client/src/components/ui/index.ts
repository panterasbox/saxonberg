/**
 * Shared UI primitives for the cockpit.
 *
 * Consumers (the inspection card today; future widgets tomorrow)
 * compose `<List>` / `<ListItem>` for sequences, `<EntityName>` for
 * clickable name affordances carrying a `stuff-id`, and `<Button>`
 * for action targets. Theme treatments come from `tokens`.
 *
 * The same components are the surface a future MML layout-tag
 * renderer (per message-rendering-slate's Wave 2) will map its
 * `<table>` / `<list>` / `<field>` tags onto, so the
 * subscription-driven and the message-rendered paths converge on
 * one DOM shape.
 *
 * ## The honesty convention
 *
 * `Figure` and `UnbuiltGround` are the primitives for
 * `docs/design_handoff/CONVENTIONS.md` #1 — **never render a figure the
 * server did not send**, including "just for now". Any widget showing a
 * number reaches for `Figure` and names its state; the discriminated
 * union means the compiler, not the reviewer, is what stops a hardcoded
 * placeholder shipping. `UnbuiltGround` is for when the whole card is
 * unbuilt rather than one value inside it.
 *
 * ⭐ The **widget shelf** (`components/frame/Shelf.tsx`) is `Figure`'s
 * first consumer, and it is the shape the primitive was built for: nine
 * rows of which six are honestly hatched, each naming its own reason.
 * Being that consumer is also how `Figure` learned it needed a
 * `variant` axis — `chip` for a 30px shelf entry, `row` for the
 * connection popover, `card` the original and still the default.
 *
 * ⚠ Two carve-outs the convention states explicitly, and neither belongs
 * to these components: **prose never hedges** (a room description
 * carries no engineering stamp — if a thing cannot be described yet, it
 * is not in the room yet), and **commands refuse honestly** in the
 * machine voice rather than through a hatched widget.
 */

export { Button } from "./Button";
export { EntityName } from "./EntityName";
export { Figure } from "./Figure";
export type { FigureState, FigureProps, FigureVariant } from "./Figure";
export { List, ListItem } from "./List";
export { tokens } from "./tokens";
export type { Tokens } from "./tokens";
export { UnbuiltGround } from "./UnbuiltGround";
