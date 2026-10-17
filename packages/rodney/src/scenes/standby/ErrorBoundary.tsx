import { Component, type ReactNode } from 'react';

/** Renders `fallback` (default: nothing) if a child throws — e.g. the monastery
 *  texture 404s before it's been generated. Keeps the banner scene alive. */
export default class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
