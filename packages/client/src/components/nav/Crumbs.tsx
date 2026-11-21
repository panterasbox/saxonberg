/**
 * Crumbs — where you are in the world, as YOUR map knows it (navigation
 * card D10). The where-you-are section supplies the order and the
 * addresses; each crumb's name is your own claim's, written the first
 * time you were there. A Locality you have no claim for is shown, unnamed,
 * as a place you have not learned — the live name the section carries is
 * never shown.
 *
 * A named crumb's click is `map <address>` — what you know of it.
 */

import React from "react";
import styled from "styled-components";
import type { NavSections, TooltipDoc } from "@saxonberg/types";
import { tokens } from "../ui";
import { Tip } from "../tooltip/Tip";
import { Icon } from "../ui/icons/Icon";
import type { TipSpec } from "../tooltip/useTip";
import type { Crumb } from "../../store/navSelectors";

const Root = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${tokens.space.xs};
  color: ${tokens.color.fgDim};
  font-size: ${tokens.font.body};
`;

const CrumbButton = styled.button`
  font: inherit;
  padding: 0;
  border: none;
  background: none;
  color: ${tokens.color.fgDim};
  cursor: pointer;
  &:hover {
    color: ${tokens.color.fg};
    text-decoration: underline;
  }
`;

const Unnamed = styled.span`
  font-style: italic;
  color: ${tokens.color.fgMuted};
`;

export interface CrumbsProps {
  crumbs: readonly Crumb[];
  /** The place you stand in — the trail's last item, and the de-stutter compares against it. */
  placeName: string;
  /** The room's own tooltip (the trail's last item). */
  placeTip?: TooltipDoc | null;
  tipFor?: (crumb: Crumb) => TipSpec | TooltipDoc | null;
  onSendCommand: (command: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

/** "The Lounge › the lounge" reads as a stutter: a place named for its Locality is shown once. */
export function destutter(crumbs: readonly Crumb[], placeName: string): Crumb[] {
  const bare = (n: string): string => n.toLowerCase().replace(/^the\s+/, "");
  const last = crumbs[crumbs.length - 1];
  if (last && !last.ship && last.name !== undefined && bare(last.name) === bare(placeName)) {
    return crumbs.slice(0, -1);
  }
  return [...crumbs];
}

export function Crumbs(props: CrumbsProps): React.ReactElement | null {
  // Runs of Localities you have not learned read as one "…" — a line of
  // "a place you have not learned" said nothing a newcomer could use.
  const shown = destutter(props.crumbs, props.placeName).filter(
    (c, i, all) => c.name !== undefined || i === 0 || all[i - 1]!.name !== undefined,
  );
  // ⭐ One trail, outermost first, the room you stand in LAST and in bold
  // (owner, review: "am I in the bar or the lounge?").
  return (
    <Root aria-label="where you are" data-testid="nav-crumbs">
      {shown.length > 0 ? <Icon name="nav.area" label="area" size={13} decorative color={tokens.color.fgMuted} /> : null}
      {shown.map((c, i) => {
        const command = c.ship ? null : `map ${c.address}`;
        const label = c.name ?? "…";
        const doc =
          props.tipFor?.(c) ??
          (c.name
            ? { header: { name: c.name, kindWord: c.ship ? "the ship you are aboard" : "locality" }, ...(command ? { command } : {}) }
            : { header: { name: "Unnamed", kindWord: "area" }, prose: "Not on your map." });
        return (
          <React.Fragment key={`${c.address}|${i}`}>
            {i > 0 ? <span aria-hidden="true">›</span> : null}
            <Tip tip={doc}>
              {c.name && command ? (
                <CrumbButton
                  type="button"
                  data-testid="nav-crumb"
                  data-named="true"
                  onClick={() => props.onSendCommand(command)}
                  onMouseEnter={() => props.onCommandPreview?.(command)}
                  onMouseLeave={() => props.onCommandPreview?.(null)}
                >
                  {label}
                </CrumbButton>
              ) : c.name ? (
                <span data-testid="nav-crumb" data-named="true" tabIndex={0}>
                  {label}
                </span>
              ) : (
                <Unnamed data-testid="nav-crumb" data-named="false" tabIndex={0}>
                  {label}
                </Unnamed>
              )}
            </Tip>
          </React.Fragment>
        );
      })}
      {shown.length > 0 ? <span aria-hidden="true">›</span> : null}
      <Tip tip={props.placeTip ?? null}>
        <Here data-testid="nav-here-name" tabIndex={0}>
          <Icon name="nav.room" label="room" size={13} decorative color={tokens.color.accent} />
          {props.placeName || "somewhere"}
        </Here>
      </Tip>
    </Root>
  );
}

const Here = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: ${tokens.color.fg};
`;

/** The crumbs line as one string, for the section's summary. */
export function crumbsSummary(crumbs: readonly Crumb[], s: NavSections): string | null {
  const shown = destutter(crumbs, s.place?.name ?? "");
  if (shown.length === 0) return null;
  return shown.map((c) => c.name ?? "…").join(" › ");
}
