import { Alert, Box } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface MapErrorBoundaryProps {
  children: ReactNode;
}

interface MapErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches a render crash in the map (e.g. from malformed marker/character
 * data) so it's visible instead of leaving Leaflet in a silently broken,
 * unresponsive state. React error boundaries only catch errors thrown
 * during render/lifecycle, not ones thrown from Leaflet's own imperative
 * code (tile loading, pan/zoom handlers) — see main.tsx's window-level
 * handlers for those.
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(
      '[MapErrorBoundary] The map crashed while rendering:',
      error,
      errorInfo.componentStack,
    );
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <Box sx={{ position: 'absolute', inset: 0, p: 2, overflow: 'auto' }}>
          <Alert severity="error">
            The map failed to render: {this.state.error.message}. Check the browser console for
            details — this is often caused by malformed marker/character data (e.g. a marker area
            with fewer than 3 points, or a non-numeric position).
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}
