import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

registerSW({
  immediate: true,
  onRegisterError(err) {
    console.error('[DK Car Race][PWA] Service worker registration failed:', err);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
