import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Si l'application tourne déjà en mode autonome PWA installé, ne pas afficher
  if (isInstalled) {
    return null;
  }

  // Installation Chromium / Android / Desktop
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded bg-emerald-600/90 hover:bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow transition-all border border-emerald-500/30"
        title="Installer CashPoint sur cet appareil"
      >
        <Download className="w-3.5 h-3.5 text-white animate-bounce" />
        <span>Installer App</span>
      </button>
    );
  }

  // Guide d'installation iOS Safari
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-200 border border-slate-700 transition"
          title="Guide installation iPhone/iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Installer iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  Installer sur iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                1. Touchez l'icône de <strong>Partage</strong> (rectangle avec flèche vers le haut) dans la barre Safari.<br /><br />
                2. Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-amber-500 hover:bg-amber-400 py-2 text-xs font-bold text-slate-950 transition"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
