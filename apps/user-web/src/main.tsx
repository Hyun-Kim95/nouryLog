import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import { App } from './App';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

function Root() {
  const tree = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  if (!googleClientId) return tree;
  return <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
