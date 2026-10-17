import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import StandbyOverlay from './StandbyOverlay';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandbyOverlay />
  </StrictMode>,
);
