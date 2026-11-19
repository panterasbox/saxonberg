/**
 * `<Tip tip={…}>…</Tip>` — give one element a tooltip without rewiring it.
 *
 * The retrofit's workhorse: every former native title attribute becomes a `Tip`
 * around the element it was on. It clones the child with `useTip`'s
 * handlers merged over the child's own (the child's `onMouseEnter →
 * preview(cmd)` still runs), so the status bar's preview is untouched.
 *
 * `tip` is a document (most sites — a control's label and command) or a
 * spec that resolves one (a live thing, a glossary term). `null` = none.
 */

import React from "react";
import type { TooltipDoc } from "@saxonberg/types";
import { useTip, type AnchorHandlers, type TipSpec } from "./useTip";

function isSpec(t: TipSpec | TooltipDoc): t is TipSpec {
  return typeof (t as TipSpec).key === "string";
}

/** A document's own key: what it names, and what a click runs. */
export function docKey(doc: TooltipDoc): string {
  return `${doc.header?.name ?? ""}|${doc.command ?? ""}|${doc.prose ?? ""}`;
}

export function toSpec(tip: TipSpec | TooltipDoc | null): TipSpec | null {
  if (tip === null) return null;
  return isSpec(tip) ? tip : { key: docKey(tip), doc: tip };
}

export function Tip({
  tip,
  children,
}: {
  tip: TipSpec | TooltipDoc | null;
  children: React.ReactElement;
}): React.ReactElement {
  const own = children.props as AnchorHandlers & { disabled?: boolean };
  const handlers = useTip(toSpec(tip), own);
  // ⚠ A disabled control gets no pointer events, so its tooltip — very
  // often the REASON it is disabled — would never open. Its tooltip rides a
  // thin wrapper instead; the control itself is untouched.
  if (own.disabled === true && tip !== null) {
    return (
      <span data-tip-wrap="" style={{ display: "inline-flex" }} {...handlers}>
        {children}
      </span>
    );
  }
  return React.cloneElement(children, handlers);
}
