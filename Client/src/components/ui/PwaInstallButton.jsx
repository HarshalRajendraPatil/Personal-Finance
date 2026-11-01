import { useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Download, Check, Smartphone, Share2, PlusSquare } from 'lucide-react';

export default function PwaInstallButton({ className = '', compact = false }) {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePwaInstall();
  const [showIosModal, setShowIosModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium ${className}`}>
        <Check className="w-4 h-4 text-emerald-500" />
        <span>{!compact && 'App Installed'}</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }
    if (!isInstallable) {
      alert('To install Capise, open your browser menu (⋮ or ...) and select "Install Capise" or "Add to Home Screen".');
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
    <>
      <button
        onClick={handleClick}
        disabled={isInstalling}
        title="Install Capise as Progressive Web App"
        className={`flex items-center gap-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${compact
            ? 'p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
            : 'w-full px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/50 dark:border-indigo-800/30'
          } ${className}`}
      >
        <Download className="w-4 h-4 shrink-0 text-indigo-500" />
        {!compact && <span>Install Capise App</span>}
      </button>

      {/* iOS Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Install on Apple iOS</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Add Capise to your Home Screen</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="flex h-6 w-6 rounded-full bg-indigo-600 text-white font-bold items-center justify-center text-xs shrink-0">1</span>
                <span className="flex-1">Tap the Safari <strong>Share</strong> button at bottom</span>
                <Share2 className="w-5 h-5 text-indigo-500 shrink-0" />
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="flex h-6 w-6 rounded-full bg-indigo-600 text-white font-bold items-center justify-center text-xs shrink-0">2</span>
                <span className="flex-1">Choose <strong>Add to Home Screen</strong></span>
                <PlusSquare className="w-5 h-5 text-emerald-500 shrink-0" />
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

