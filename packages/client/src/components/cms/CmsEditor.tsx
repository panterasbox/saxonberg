/**
 * CmsEditor — the editor pane: header + save bar + the lazy Monaco.
 *
 * Header shows `backend:path` and the node kind. The Save button is
 * disabled unless the draft is dirty and shows a spinner while saving;
 * on success it surfaces the go-live note (`reloadDetail`), on failure
 * the mapped `CmsErrorBody.message` inline — never a silent no-op
 * (acceptance criterion). Monaco loads lazily via {@link MonacoLazy} so
 * its bundle is fetched only when this pane first shows a leaf.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { MonacoLazy } from "./MonacoLazy";
import { StudioForm } from "./studio/StudioForm";
import { tokens } from "../ui";

const Pane = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  background: ${tokens.color.surfaceSunken};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const PathLabel = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Kind = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  flex: none;
`;

const Notice = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.accent};
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SaveButton = styled.button`
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.lg};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${tokens.color.primaryHover};
  }

  &:disabled {
    background: ${tokens.color.actionBg};
    color: ${tokens.color.fgMuted};
    cursor: default;
  }
`;

const Tabs = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  flex: none;
`;

const Tab = styled.button<{ $active: boolean }>`
  background: ${(p) =>
    p.$active ? tokens.color.surfaceAlt : "transparent"};
  border: 1px solid
    ${(p) => (p.$active ? tokens.color.borderEmphasis : "transparent")};
  border-radius: ${tokens.radius.md};
  color: ${(p) => (p.$active ? tokens.color.fg : tokens.color.fgMuted)};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.md};
  cursor: pointer;

  &:hover {
    color: ${tokens.color.fg};
  }
`;

const ErrorBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  background: ${tokens.color.surfaceAlt};
  border-bottom: 1px solid ${tokens.color.danger};
  color: ${tokens.color.danger};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const ErrorDismiss = styled.button`
  background: transparent;
  border: none;
  color: ${tokens.color.danger};
  cursor: pointer;
  font-size: ${tokens.font.body};
  line-height: 1;
`;

const EditorBody = styled.div`
  flex: 1;
  min-height: 0;
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-style: italic;
`;

export const CmsEditor: React.FC = () => {
  const open = useStore((s) => s.cms.open);
  const draft = useStore((s) => s.cms.draft);
  const dirty = useStore((s) => s.cms.dirty);
  const saving = useStore((s) => s.cms.saving);
  const error = useStore((s) => s.cms.error);
  const notice = useStore((s) => s.cms.notice);
  const cmsEditDraft = useStore((s) => s.cmsEditDraft);
  const cmsSave = useStore((s) => s.cmsSave);
  const cmsCloseError = useStore((s) => s.cmsCloseError);
  const studioDescribe = useStore((s) => s.studioDescribe);
  const studioLoadData = useStore((s) => s.studioLoadData);
  const studioSerialize = useStore((s) => s.studioSerialize);

  // The Studio composer is offered only for a content leaf whose template
  // has a backing `class` (the composer describes that class's schema).
  const studioEligible =
    !!open && open.backend === "content" && !!open.templateMeta?.class;

  // Editor mode is per-open-leaf UI state: `raw` (Monaco over the body)
  // vs `studio` (the schema-driven form over the same `template.data`).
  const [mode, setMode] = React.useState<"raw" | "studio">("raw");
  // Reset to raw whenever the open leaf changes.
  const openKey = open ? `${open.backend}:${open.path}` : null;
  React.useEffect(() => {
    setMode("raw");
  }, [openKey]);

  const enterStudio = React.useCallback(() => {
    if (!open || !open.templateMeta?.class) return;
    setMode("studio");
    void studioDescribe(open.templateMeta.class, open.path);
    studioLoadData(open.body);
  }, [open, studioDescribe, studioLoadData]);

  // In Studio mode, the save serializes the form overlay through the SAME
  // content-write path the raw editor uses, then adopts the serialized
  // string as the new baseline (both the CMS draft and the studio base).
  const saveStudio = React.useCallback(async () => {
    const body = studioSerialize();
    cmsEditDraft(body);
    await cmsSave();
    studioLoadData(body);
  }, [studioSerialize, cmsEditDraft, cmsSave, studioLoadData]);

  // Studio-mode dirtiness: the serialized overlay diverges from the
  // persisted body. (Computed at render; cheap for the small field set.)
  const studioDirty =
    mode === "studio" && !!open && studioSerialize() !== open.body;

  if (!open) {
    return (
      <Pane>
        {error && (
          <ErrorBar role="alert">
            <span>{error}</span>
            <ErrorDismiss onClick={cmsCloseError} aria-label="Dismiss error">
              ×
            </ErrorDismiss>
          </ErrorBar>
        )}
        <Empty>Select a leaf in the explorer to edit it.</Empty>
      </Pane>
    );
  }

  return (
    <Pane>
      <Header>
        <PathLabel title={`${open.backend}:${open.path}`}>
          {open.backend}:{open.path}
        </PathLabel>
        <Actions>
          {notice && !error && <Notice>{notice}</Notice>}
          {studioEligible && (
            <Tabs role="tablist" aria-label="Editor mode">
              <Tab
                type="button"
                role="tab"
                aria-selected={mode === "raw"}
                $active={mode === "raw"}
                onClick={() => setMode("raw")}
              >
                Raw JSON
              </Tab>
              <Tab
                type="button"
                role="tab"
                aria-selected={mode === "studio"}
                $active={mode === "studio"}
                onClick={enterStudio}
              >
                Studio
              </Tab>
            </Tabs>
          )}
          <Kind>{open.kind}</Kind>
          <SaveButton
            onClick={() =>
              mode === "studio" ? void saveStudio() : void cmsSave()
            }
            disabled={saving || (mode === "studio" ? !studioDirty : !dirty)}
          >
            {saving ? "Saving…" : "Save"}
          </SaveButton>
        </Actions>
      </Header>
      {error && (
        <ErrorBar role="alert">
          <span>{error}</span>
          <ErrorDismiss onClick={cmsCloseError} aria-label="Dismiss error">
            ×
          </ErrorDismiss>
        </ErrorBar>
      )}
      <EditorBody>
        {mode === "studio" ? (
          <StudioForm />
        ) : (
          <MonacoLazy
            language={open.language}
            value={draft}
            onChange={cmsEditDraft}
          />
        )}
      </EditorBody>
    </Pane>
  );
};
