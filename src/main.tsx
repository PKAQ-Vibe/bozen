import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'animal-island-ui/style';
import App from './App';
import './index.css';
import { initializeStorage, runDailyCleanupMigration } from './services/storage';

void initializeStorage().then(() => {
  runDailyCleanupMigration();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
