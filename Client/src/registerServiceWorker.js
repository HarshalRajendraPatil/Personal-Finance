/**
 * Production Service Worker Registration for Capise PWA
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[Capise PWA] Service Worker registered with scope:', registration.scope);

          // Check for worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[Capise PWA] New update available. Reloading will apply newest updates.');
                  window.dispatchEvent(new CustomEvent('capise-sw-updated', { detail: registration }));
                } else {
                  console.log('[Capise PWA] Content is cached for offline use.');
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error('[Capise PWA] Service Worker registration failed:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

