'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'tasknest-pwa-prompt-dismissed-at';
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function PwaBootstrap() {
  const pathname = usePathname() || '';
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator &&
      window.isSecureContext
    ) {
      const register = () => {
        void navigator.serviceWorker
          .register('/serviceWorker.js', {
            scope: '/',
            updateViaCache: 'none',
          })
          .catch((error) => console.warn('TaskNest service worker registration failed', error));
      };

      if (document.readyState === 'complete') {
        void register();
      } else {
        window.addEventListener('load', register, { once: true });
      }
    }

  }, []);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_FOR_MS) return;
    const isAuthPage = ['/login', '/signup', '/logout'].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!isAuthPage) setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setShowIosHelp(true);
      if (!isAuthPage) setVisible(true);
    } else if (installEvent && !isAuthPage) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [installEvent, pathname]);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    setInstallEvent(null);
  };

  if (!visible) return null;

  return (
    <aside className="pwa-install" aria-label="Install TaskNest">
      <button className="pwa-install-close" type="button" onClick={dismiss} aria-label="Dismiss install prompt">
        ×
      </button>
      <span className="pwa-install-mark" aria-hidden="true">T</span>
      <div className="pwa-install-copy">
        <strong>Install TaskNest</strong>
        <span>
          {showIosHelp
            ? 'Tap Share, then “Add to Home Screen”.'
            : 'Use it from your home screen in its own window.'}
        </span>
      </div>
      {installEvent ? (
        <button className="pwa-install-action" type="button" onClick={() => void install()}>
          Install
        </button>
      ) : (
        <button className="pwa-install-action" type="button" onClick={dismiss}>
          Got it
        </button>
      )}
    </aside>
  );
}
