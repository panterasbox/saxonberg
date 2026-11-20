/**
 * NavCard — the zone navigation card (navigation card D7): the `map`
 * card's body, docked in the Explore panel. Where you are, at zone level,
 * drawn from your own map.
 *
 * ⚠ W1 shell: the map on top, the shipped text navigator unchanged
 * beneath it, so nothing is lost between waves.
 */

import React from "react";
import { useStore } from "../../store/index";
import { whereaboutsOf } from "../../store/navSlice";
import { NavigatorBody } from "../cards/NavigatorBody";
import { MapArea } from "./MapArea";
import type { LensName } from "./ZoneMap";

const DEFAULT_LENSES: ReadonlySet<LensName> = new Set<LensName>(["frontier", "route"]);

export interface NavCardProps {
  onSendCommand: (command: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

export function NavCard(props: NavCardProps): React.ReactElement {
  const sections = useStore((s) => s.navSections);
  const where = React.useMemo(() => whereaboutsOf(sections), [sections]);
  return (
    <div data-testid="nav-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <MapArea
        sections={sections}
        lenses={DEFAULT_LENSES}
        {...(props.onCommandPreview ? { onCommandPreview: props.onCommandPreview } : {})}
      />
      {where ? <NavigatorBody where={where} {...props} /> : null}
    </div>
  );
}
