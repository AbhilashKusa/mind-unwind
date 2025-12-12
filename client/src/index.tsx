import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Auto-clear stale PWA cache if we detect the old "API Key" error from cached builds
const handleCacheError = async (error: ErrorEvent) => {
  const isApiKeyError = error.message?.includes('API Key must be set') ||
    error.error?.message?.includes('API Key must be set');

  if (isApiKeyError) {
    console.warn('Detected stale cache error. Auto-clearing Service Workers and cache...');

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();

      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);

      }
    }


    // Prevent infinite reload loop by checking a flag
    if (!sessionStorage.getItem('cache_cleared')) {
      sessionStorage.setItem('cache_cleared', 'true');
      window.location.reload();
    } else {
      console.error('Cache was already cleared but error persists. Please check your .env configuration.');
      sessionStorage.removeItem('cache_cleared');
    }
  }
};

window.addEventListener('error', handleCacheError);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);