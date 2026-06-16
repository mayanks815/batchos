import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar on mobile devices
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Disable install action if app is already running in standalone display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    try {
      // Show the native browser install dialog
      deferredPrompt.prompt();
      // Wait for the user to accept or reject the installation
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice result: ${outcome}`);
    } catch (err) {
      console.error('PWA Installation failed:', err);
    } finally {
      // Prompt can only be consumed once, clear it
      setDeferredPrompt(null);
      setCanInstall(false);
    }
  };

  return { canInstall, installApp };
}
