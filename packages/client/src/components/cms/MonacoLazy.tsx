/**
 * MonacoLazy — the code-split boundary for the Monaco editor.
 *
 * `React.lazy(() => import('./MonacoInner'))` makes Vite emit Monaco's
 * bundle as its own chunk, fetched ONLY when the editor card first
 * mounts (the observable lazy-load: a `monaco`-named chunk appears in the
 * network panel on first leaf open, not on initial app load). A
 * `<Suspense>` boundary shows a lightweight spinner while the chunk
 * loads.
 */

import React, { Suspense } from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import type { MonacoInnerProps } from "./MonacoInner";

const MonacoInner = React.lazy(() => import("./MonacoInner"));

const Spinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-style: italic;
`;

export const MonacoLazy: React.FC<MonacoInnerProps> = (props) => (
  <Suspense fallback={<Spinner>Loading editor…</Spinner>}>
    <MonacoInner {...props} />
  </Suspense>
);
