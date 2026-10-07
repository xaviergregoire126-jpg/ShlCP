import React from 'react';
import { AlertCircle, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface UnrecognizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText?: string;
}

export const UnrecognizedModal: React.FC<UnrecognizedModalProps> = ({
  isOpen,
  onClose,
  rawText,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-red-500/40 rounded-xl shadow-2xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-white tracking-tight">
                SMS non reconnu
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Insertion bloquée pour préserver l&apos;intégrité comptable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="mt-5 space-y-4 text-sm">
          <p className="text-slate-300">
            Le texte soumis ne correspond à aucun format de SMS officiel exploitable pour{' '}
            <strong className="text-white font-semibold">MVola</strong> ou{' '}
            <strong className="text-white font-semibold">Airtel Money</strong>.
          </p>

          {rawText && (
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 break-words max-h-24 overflow-y-auto">
              {rawText}
            </div>
          )}

          <div className="rounded-lg bg-slate-800/60 p-3.5 border border-slate-700/50 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Formats attendus :
            </div>
            <div className="text-xs text-slate-400 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-semibold shrink-0">MVola :</span>
                <span>
                  Doit contenir <code className="text-amber-200">Ar recu de</code>, <code className="text-amber-200">Vous avez credite</code>, ou <code className="text-amber-200">Achat de credit YAS reussi:</code>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-semibold shrink-0">Airtel :</span>
                <span>
                  Doit contenir un identifiant valide (ex: <code className="text-red-200">CI...</code>, <code className="text-red-200">CO...</code>, <code className="text-red-200">MB...</code>, <code className="text-red-200">MO...</code>).
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec action obligatoire de réinitialisation */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-950/50"
          >
            <span>Fermer et vider le champ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
