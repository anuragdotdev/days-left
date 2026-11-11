import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NewTab } from './pages/NewTab';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing');

createRoot(container).render(
  <StrictMode>
    <NewTab />
  </StrictMode>,
);
