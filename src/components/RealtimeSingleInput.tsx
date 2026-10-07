import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RealtimeSingleInputProps {
  onValidateSms: (smsText: string) => { success: boolean; isDuplicate?: boolean; message?: string };
  onOpenUnrecognizedModal: (rejectedText: string) => void;
  resetSignal?: number;
}

export const RealtimeSingleInput: React.FC<RealtimeSingleInputProps> = ({
  onValidateSms,
  onOpenUnrecognizedModal,
  resetSignal = 0,
}) => {
  const [smsText, setSmsText] = useState('');
  const [lastSuccessNotice, setLastSuccessNotice] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);

  // RÈGLE DE RÉINITIALISATION : Remettre à zéro (chaîne vide) lors du reset global
  React.useEffect(() => {
    if (resetSignal > 0) {
      setSmsText('');
      setLastSuccessNotice(null);
      setClipboardError(null);
    }
  }, [resetSignal]);

  const processValidation = (textToValidate: string) => {
    const trimmed = textToValidate.trim();
    if (!trimmed) return;

    setSmsText(trimmed);
    const result = onValidateSms(trimmed);

    if (result.success) {
      // RÈGLE DE NETTOYAGE : Après chaque validation réussie, le champ de texte se vide AUTOMATIQUEMENT
      setSmsText('');
      setClipboardError(null);
      setLastSuccessNotice(result.message || 'Transaction validée et inscrite au registre.');
      setTimeout(() => setLastSuccessNotice(null), 4500);
    } else {
      // SÉCURITÉ : Si le format n'est pas reconnu, ouvrir la modale d'alerte
      onOpenUnrecognizedModal(trimmed);
      setSmsText('');
    }
  };

  // 1. SÉCURISATION DU CHAMP DE SAISIE & BOUTON PRESSE-PAPIERS
  const handlePasteFromClipboard = async () => {
    setClipboardError(null);
    setIsReadingClipboard(true);

    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error(
          "L'accès au presse-papiers n'est pas disponible dans ce contexte navigateur. Assurez-vous d'avoir accordé l'autorisation presse-papiers."
        );
      }

      const clipboardContent = await navigator.clipboard.readText();
      const trimmed = (clipboardContent || '').trim();

      if (!trimmed) {
        setClipboardError(
          "Le presse-papiers est vide. Veuillez d'abord copier un SMS sur votre téléphone puis appuyer sur '📋 Coller le SMS'."
        );
        return;
      }

      // Injection dans le champ et lancement instantané de l'analyse
      processValidation(trimmed);
    } catch (err: any) {
      console.warn('Erreur lecture presse-papiers:', err);
      setClipboardError(
        err?.message ||
          "Accès au presse-papiers refusé. Veuillez autoriser l'accès au presse-papiers dans les paramètres du navigateur."
      );
    } finally {
      setIsReadingClipboard(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 1. BOUTON MASSIF ET ÉLÉGANT "📋 Coller le SMS" */}
      <button
        type="button"
        onClick={handlePasteFromClipboard}
        disabled={isReadingClipboard}
        className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 active:scale-[0.99] text-slate-950 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-amber-950/40 hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer border border-amber-300/40 select-none group"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
        <span className="tracking-tight uppercase font-black text-slate-950">
          {isReadingClipboard ? 'Lecture du presse-papiers...' : 'Coller le SMS'}
        </span>
        <span className="hidden sm:inline-block text-[11px] font-mono font-bold bg-slate-950/15 px-2.5 py-1 rounded-full text-slate-900 border border-slate-950/10">
          Analyse instantanée
        </span>
      </button>

      {/* CHAMP DE TEXTE EN LECTURE SEULE (BLOCAGE STRICT DU CLAVIER TACTILE ET PHYSIQUE) */}
      <div className="relative">
        <textarea
          value={smsText}
          readOnly
          inputMode="none"
          tabIndex={-1}
          rows={3}
          placeholder="Le SMS collé apparaîtra ici. La saisie au clavier est verrouillée pour garantir l'intégrité absolue des données de l'opérateur."
          className="w-full p-3.5 text-xs sm:text-sm font-mono text-slate-200 bg-slate-950/80 border border-slate-800 rounded-xl focus:outline-none placeholder:text-slate-500 placeholder:font-sans transition-colors resize-none cursor-default select-none"
        />
        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Clavier verrouillé (Lecture seule)</span>
        </div>
      </div>

      {/* Message d'erreur presse-papiers */}
      {clipboardError && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{clipboardError}</span>
        </div>
      )}

      {/* Notification de succès éphémère */}
      {lastSuccessNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{lastSuccessNotice}</span>
        </div>
      )}
    </div>
  );
};
