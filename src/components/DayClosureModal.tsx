import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, X, AlertTriangle, CheckCircle2, ShieldCheck, Wallet, Smartphone } from 'lucide-react';

interface DayClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  mvolaFinalBalance?: number;
  airtelFinalBalance?: number;
  theoreticalCash?: number;
  onConfirmClosure: (closureData: {
    realCash: number;
    discrepancyReason?: string;
  }) => void;
}

export const DayClosureModal: React.FC<DayClosureModalProps> = ({
  isOpen,
  onClose,
  mvolaFinalBalance = 0,
  airtelFinalBalance = 0,
  theoreticalCash = 0,
  onConfirmClosure,
}) => {
  const [realCashInput, setRealCashInput] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [hasInteracted, setHasInteracted] = useState(false);

  if (!isOpen) return null;

  const safeMvola = Number(mvolaFinalBalance) || 0;
  const safeAirtel = Number(airtelFinalBalance) || 0;
  const safeCash = Number(theoreticalCash) || 0;

  // Nettoyage et conversion du cash réel saisi
  const cleanedCashStr = realCashInput.replace(/\s/g, '');
  const realCashNum = cleanedCashStr !== '' && !isNaN(Number(cleanedCashStr)) ? Number(cleanedCashStr) : null;

  const isEntered = realCashNum !== null;
  const isNegativeDeficit = isEntered && realCashNum < safeCash;
  const deficitAmount = isNegativeDeficit ? safeCash - realCashNum : 0;
  const surplusAmount = isEntered && realCashNum > safeCash ? realCashNum - safeCash : 0;

  // Règle de blocage anti-fraude :
  // Si Cash Réel < Cash Théorique : Bloqué tant que la justification n'est pas remplie
  const isValidationDisabled =
    !isEntered ||
    (isNegativeDeficit && justification.trim().length === 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidationDisabled || realCashNum === null) return;

    onConfirmClosure({
      realCash: realCashNum,
      discrepancyReason: isNegativeDeficit ? justification.trim() : undefined,
    });
  };

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête Micro-UI sombre */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Audit de Clôture &amp; Passage de Relais
              </h3>
              <p className="text-[10px] text-slate-400">
                Certification des flottes, contrôle du cash et bascule du Point Zéro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps du formulaire */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* 1. Soldes finaux des flottes en lecture seule */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                Soldes Finaux Flottes (Certifiés par derniers SMS)
              </span>
              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                Lecture Seule
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Flotte MVola */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    MVola Final
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">Dernier SMS</span>
                </div>
                <div className="text-sm font-bold font-mono text-white tabular-nums">
                  {safeMvola.toLocaleString('fr-FR')}{' '}
                  <span className="text-[10px] font-normal text-slate-400">Ar</span>
                </div>
              </div>

              {/* Flotte Airtel Money */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-red-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Airtel Money Final
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">Dernier SMS</span>
                </div>
                <div className="text-sm font-bold font-mono text-white tabular-nums">
                  {safeAirtel.toLocaleString('fr-FR')}{' '}
                  <span className="text-[10px] font-normal text-slate-400">Ar</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cash Théorique attendu en caisse */}
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-300">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Cash Théorique Attendu en Caisse
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                Calculé par l&apos;application
              </span>
            </div>
            <div className="text-base font-black font-mono text-emerald-400 tabular-nums">
              {safeCash.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal text-slate-400">Ar</span>
            </div>
          </div>

          {/* 3. Champ de saisie obligatoire : Cash Physique Réel */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <label htmlFor="real-cash-input" className="block text-[11px] font-bold text-slate-200">
              Renseignez le Cash Physique Réel (Ar) : <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="real-cash-input"
                type="text"
                inputMode="numeric"
                value={realCashInput}
                onChange={(e) => {
                  setRealCashInput(e.target.value);
                  setHasInteracted(true);
                }}
                placeholder="Montant réel compté en caisse (ex: 2500000)"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white font-mono text-sm px-3 py-2 rounded-lg outline-hidden placeholder:text-slate-600 tabular-nums"
                autoFocus
                required
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-500">
                Ar
              </span>
            </div>

            {/* Diagnostic d'écart en direct */}
            {isEntered && (
              <div className="pt-1">
                {isNegativeDeficit ? (
                  <div className="p-2 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center justify-between text-[11px] text-red-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      Caisse déficitaire :
                    </span>
                    <span className="font-mono font-bold text-red-400 tabular-nums">
                      -{deficitAmount.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                ) : surplusAmount > 0 ? (
                  <div className="p-2 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between text-[11px] text-emerald-300">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Excédent de caisse :
                    </span>
                    <span className="font-mono font-bold text-emerald-400 tabular-nums">
                      +{surplusAmount.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Caisse parfaitement équilibrée (écart nul).</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. CONTRÔLE ANTI-FRAUDE : Champ de texte obligatoire si Caisse Négative */}
          {isNegativeDeficit && (
            <div className="space-y-1.5 pt-1 border-t border-red-900/40 animate-in fade-in slide-in-from-top-1 duration-200">
              <label
                htmlFor="discrepancy-reason-input"
                className="block text-[11px] font-bold text-red-400"
              >
                ⚠️ Caisse négative. Raison obligatoire pour le rapport :{' '}
                <span className="text-red-300">*</span>
              </label>
              <textarea
                id="discrepancy-reason-input"
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Expliquez obligatoirement l'origine de ce déficit (erreur de monnaie, avance autorisée, etc.)..."
                className="w-full bg-slate-950 border border-red-500/60 focus:border-red-400 focus:ring-1 focus:ring-red-400 text-slate-100 text-xs p-2.5 rounded-lg outline-hidden placeholder:text-slate-600 font-sans leading-relaxed resize-none"
                required
              />
              <p className="text-[10px] text-red-300/80 italic">
                Le bouton de validation est verrouillé jusqu&apos;à la rédaction de cette justification.
              </p>
            </div>
          )}

          {/* Pied d'action */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isValidationDisabled}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isValidationDisabled
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-lg shadow-red-950/60 border border-red-500'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Valider la Clôture &amp; Archiver (PDF)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
