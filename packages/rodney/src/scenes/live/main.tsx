import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LiveOverlay from './LiveOverlay';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiveOverlay />
  </StrictMode>,
);
