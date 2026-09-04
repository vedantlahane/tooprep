import { useState, useEffect } from 'react';
import Icon, { Zap, X, ArrowRight } from './Icon';

export default function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      console.log('[PWA] Application successfully installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    setInstallPrompt(null);
  };

  // Offline status banner has highest priority
  if (isOffline) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-mono text-amber-300 flex items-center justify-center gap-2 animate-fade-in z-50">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span>Offline Mode: Using cached syllabus & offline question telemetry</span>
      </div>
    );
  }

  // Install promotion banner
  if (installPrompt && !dismissed && !installed) {
    return (
      <div className="bg-neutral-900 border-b border-primary/30 px-4 py-2.5 text-xs font-mono flex items-center justify-between gap-3 animate-fade-in z-50">
        <div className="flex items-center gap-2 text-white">
          <div className="w-5 h-5 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-[10px] font-bold">
            <Zap className="w-3 h-3 text-primary" />
          </div>
          <span>Install TooPrep App for fullscreen offline exam practice</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1 bg-primary text-black font-bold uppercase tracking-wider text-[10px] rounded hover:brightness-110 transition-all flex items-center gap-1"
          >
            <span>Install</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-white/40 hover:text-white"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
