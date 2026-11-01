import { useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Download, X, Share2, PlusSquare, Smartphone, Check } from 'lucide-react';

export default function PwaInstallBanner() {
  const { isInstallable, isInstalled, isIOS, isDismissed, triggerInstall, dismissPrompt } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running standalone or dismissed, do not render floating banner
  if (isInstalled || isDismissed) {
    return null;
  }

  // If not installable and not iOS, nothing to prompt yet
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(!showIosGuide);
      return;
    }

    try {
      setIsInstalling(true);
      await triggerInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="no-print fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 shadow-2xl border border-indigo-500/30 backdrop-blur-xl">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3.5">
          {/* Capise PWA Icon */}
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-0.5 shadow-md shrink-0">
            <div className="h-full w-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
              <img src="/icons/icon-96x96.png" alt="Capise App" className="h-8 w-8 object-contain" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">Install Capise App</h3>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/30 text-indigo-300 rounded border border-indigo-400/20">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Install Capise on your home screen or desktop for fast offline access and an app-like experience.
            </p>

            {/* iOS Step-by-Step Guide Drawer */}
            {showIosGuide && (
              <div className="mt-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Install on Apple iOS:
                </p>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="flex h-5 w-5 rounded-full bg-indigo-600/40 text-indigo-300 font-bold items-center justify-center text-[10px]">1</span>
                  <span>Tap Safari&apos;s Share button</span>
                  <Share2 className="w-4 h-4 text-indigo-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="flex h-5 w-5 rounded-full bg-indigo-600/40 text-indigo-300 font-bold items-center justify-center text-[10px]">2</span>
                  <span>Scroll down & tap <strong>&quot;Add to Home Screen&quot;</strong></span>
                  <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2.5">
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? (showIosGuide ? 'Hide Instructions' : 'How to Install') : 'Install Now'}</span>
              </button>
              <button
                onClick={dismissPrompt}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer px-2 py-1"
              >
                Maybe later
              </button>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissPrompt}
            className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

