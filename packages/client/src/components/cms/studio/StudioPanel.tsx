/**
 * StudioPanel — the Studio "Kinds" tab's VIEW ROUTER. It routes between the
 * four sequential, audience-distinct surfaces of the reworked IA (the split
 * the requirements demand — authoring a backing class is a wizard/code-tier act
 * whose artifact is TS source, authoring a template is an everyone/data-tier
 * act whose artifact is content data; they are NOT the same form):
 *
 *   - `catalogue` — the content author's home: browse/search the blueprint
 *     catalogue ({@link CatalogueView}).
 *   - `blueprint` — one blueprint's detail + the round-trip actions
 *     ({@link BlueprintDetailView}).
 *   - `template` — the ONLY data form: instantiate a new content template
 *     ({@link TemplateForm}, creation act #1).
 *   - `composer` — compose → scaffold → commit TS source
 *     ({@link ComposerView}, creation act #3, wizard-gated).
 *
 * A breadcrumb strip reflects the active view; each view carries its own
 * back/round-trip controls. The panel owns ZERO authorization semantics — the
 * server re-gates every write and returns a `disposition` surfaced inline.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../../store/index";
import { CatalogueView } from "./CatalogueView";
import { BlueprintDetailView } from "./BlueprintDetailView";
import { TemplateForm } from "./TemplateForm";
import { ComposerView } from "./ComposerView";
import { tokens } from "../../ui";

const Screen = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Crumb = styled.button<{ $active: boolean }>`
  background: transparent;
  border: none;
  color: ${(p) => (p.$active ? tokens.color.fg : tokens.color.fgMuted)};
  cursor: ${(p) => (p.$active ? "default" : "pointer")};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  padding: 0;

  &:hover:not(:disabled) {
    color: ${tokens.color.fg};
  }
`;

const Sep = styled.span`
  color: ${tokens.color.borderEmphasis};
`;

/** The panel receives the "open in Files" hook from the CMS surface. */
export const StudioPanel: React.FC<{
  onOpenInFiles?: (path: string) => void;
}> = ({ onOpenInFiles }) => {
  const view = useStore((s) => s.studio.view);
  const selected = useStore((s) => s.studio.selectedBlueprint);
  const goCatalogue = useStore((s) => s.studioGoCatalogue);
  const selectBlueprint = useStore((s) => s.studioSelectBlueprint);

  return (
    <Screen>
      <Breadcrumb aria-label="Studio navigation">
        <Crumb
          type="button"
          $active={view === "catalogue"}
          disabled={view === "catalogue"}
          onClick={() => goCatalogue()}
        >
          Kinds
        </Crumb>
        {(view === "blueprint" || view === "template") && selected && (
          <>
            <Sep>/</Sep>
            <Crumb
              type="button"
              $active={view === "blueprint"}
              disabled={view === "blueprint"}
              onClick={() => selectBlueprint(selected)}
            >
              {selected.name}
            </Crumb>
          </>
        )}
        {view === "template" && (
          <>
            <Sep>/</Sep>
            <Crumb type="button" $active disabled>
              New template
            </Crumb>
          </>
        )}
        {view === "composer" && (
          <>
            <Sep>/</Sep>
            <Crumb type="button" $active disabled>
              Author a new kind
            </Crumb>
          </>
        )}
      </Breadcrumb>

      {view === "catalogue" && <CatalogueView />}
      {view === "blueprint" && <BlueprintDetailView />}
      {view === "template" && <TemplateForm onOpenInFiles={onOpenInFiles} />}
      {view === "composer" && <ComposerView />}
    </Screen>
  );
};
