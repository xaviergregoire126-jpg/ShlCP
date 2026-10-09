import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Radio, AlertOctagon } from 'lucide-react';
import { Transaction } from '../types';

interface RealtimeSingleInputProps {
  transactions?: Transaction[];
  onValidateSms: (smsText: string) => { success: boolean; isDuplicate?: boolean; message?: string };
  onOpenUnrecognizedModal: (rejectedText: string) => void;
  resetSignal?: number;
}

export const RealtimeSingleInput: React.FC<RealtimeSingleInputProps> = ({
  transactions = [],
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

  // --------------------------------------------------------------------------
  // LOGIQUE DE LA "ZONE DE CONTRÔLE ET FIL DE SUIVI" (MVOLA & AIRTEL MONEY)
  // --------------------------------------------------------------------------
  const mvolaTxs = transactions.filter((t) => t.operator === 'MVOLA');
  const airtelTxs = transactions.filter((t) => t.operator === 'AIRTEL');

  // Utilité 1 : Dernier SMS inséré
  const lastMvolaTx = mvolaTxs.length > 0 ? mvolaTxs[mvolaTxs.length - 1] : null;
  const lastAirtelTx = airtelTxs.length > 0 ? airtelTxs[airtelTxs.length - 1] : null;

  // Utilité 2 : Détection de rupture ou de saut dans la chronologie
  const mvolaJumpIndex = mvolaTxs.findIndex((t) => t.balanceMismatch);
  const mvolaHasJump = mvolaJumpIndex !== -1;
  const mvolaJumpTx = mvolaHasJump ? mvolaTxs[mvolaJumpIndex] : null;
  const mvolaRegularTx = mvolaHasJump && mvolaJumpIndex > 0 ? mvolaTxs[mvolaJumpIndex - 1] : null;

  const airtelJumpIndex = airtelTxs.findIndex((t) => t.balanceMismatch);
  const airtelHasJump = airtelJumpIndex !== -1;
  const airtelJumpTx = airtelHasJump ? airtelTxs[airtelJumpIndex] : null;
  const airtelRegularTx = airtelHasJump && airtelJumpIndex > 0 ? airtelTxs[airtelJumpIndex - 1] : null;

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

      {/* 2. ZONE DE CONTRÔLE ET FIL DE SUIVI (REMPLACE LE RAPPEL CLAVIER VERROUILLÉ) */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
              Zone de Contrôle &amp; Fil de Suivi
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Chronologie MVola &amp; Airtel
          </span>
        </div>

        {/* SUIVI MVOLA */}
        <div className="space-y-1.5">
          {mvolaHasJump && mvolaRegularTx && mvolaJumpTx ? (
            /* Utilité 2 : Point de repère / Saut de SMS détecté pour MVola */
            <div className="p-2.5 rounded-lg bg-amber-950/25 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  MVola · Rupture de chronologie détectée
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Saut détecté
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Le Dernier SMS régulier */}
                <div className="p-2.5 rounded-md bg-slate-900/90 border border-emerald-500/40 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                    Dernier SMS régulier
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Type :</span>
                      <span className="font-semibold text-slate-200">{mvolaRegularTx.typeLabel || mvolaRegularTx.typeOperation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Montant :</span>
                      <span className="font-bold text-amber-400">{mvolaRegularTx.montant.toLocaleString('fr-FR')} Ar</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Référence :</span>
                      <span className="text-slate-300 truncate max-w-[150px]">{mvolaRegularTx.reference || mvolaRegularTx.id}</span>
                    </div>
                  </div>
                </div>

                {/* Le SMS détecté en saut */}
                <div className="p-2.5 rounded-md bg-slate-900/90 border border-amber-500/60 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-amber-400">
                    SMS détecté en saut
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Type :</span>
                      <span className="font-semibold text-slate-200">{mvolaJumpTx.typeLabel || mvolaJumpTx.typeOperation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Montant :</span>
                      <span className="font-bold text-amber-400">{mvolaJumpTx.montant.toLocaleString('fr-FR')} Ar</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Référence :</span>
                      <span className="text-slate-300 truncate max-w-[150px]">{mvolaJumpTx.reference || mvolaJumpTx.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Utilité 1 : Dernier SMS inséré pour MVola */
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span className="text-[10px] font-bold font-mono text-amber-400 uppercase tracking-wide">
                  MVola · Dernier SMS inséré
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {lastMvolaTx ? 'Fil régulier' : 'En attente'}
                </span>
              </div>
              {lastMvolaTx ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-1.5">
                    <span className="text-slate-400 font-sans text-[10px]">Type :</span>
                    <span className="font-semibold text-slate-200">{lastMvolaTx.typeLabel || lastMvolaTx.typeOperation}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-1.5">
                    <span className="text-slate-400 font-sans text-[10px]">Montant :</span>
                    <span className="font-bold text-amber-400">{lastMvolaTx.montant.toLocaleString('fr-FR')} Ar</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-1.5">
                    <span className="text-slate-400 font-sans text-[10px]">Référence :</span>
                    <span className="text-slate-300 truncate">{lastMvolaTx.reference || lastMvolaTx.id}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 font-mono italic py-0.5">
                  Aucun SMS MVola inséré dans la base
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUIVI AIRTEL MONEY */}
        <div className="space-y-1.5">
          {airtelHasJump && airtelRegularTx && airtelJumpTx ? (
            /* Utilité 2 : Point de repère / Saut de SMS détecté pour Airtel Money */
            <div className="p-2.5 rounded-lg bg-amber-950/25 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  Airtel Money · Rupture de chronologie détectée
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Saut détecté
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Le Dernier SMS régulier */}
                <div className="p-2.5 rounded-md bg-slate-900/90 border border-emerald-500/40 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                    Dernier SMS régulier
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Type :</span>
                      <span className="font-semibold text-slate-200">{airtelRegularTx.typeLabel || airtelRegularTx.typeOperation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Montant :</span>
                      <span className="font-bold text-amber-400">{airtelRegularTx.montant.toLocaleString('fr-FR')} Ar</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Référence :</span>
                      <span className="text-slate-300 truncate max-w-[150px]">{airtelRegularTx.reference || airtelRegularTx.id}</span>
                    </div>
                  </div>
                </div>

                {/* Le SMS détecté en saut */}
                <div className="p-2.5 rounded-md bg-slate-900/90 border border-amber-500/60 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-amber-400">
                    SMS détecté en saut
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Type :</span>
                      <span className="font-semibold text-slate-200">{airtelJumpTx.typeLabel || airtelJumpTx.typeOperation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Montant :</span>
                      <span className="font-bold text-amber-400">{airtelJumpTx.montant.toLocaleString('fr-FR')} Ar</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[10px]">Référence :</span>
                      <span className="text-slate-300 truncate max-w-[150px]">{airtelJumpTx.reference || airtelJumpTx.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Utilité 1 : Dernier SMS inséré pour Airtel Money */
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span className="text-[10px] font-bold font-mono text-red-400 uppercase tracking-wide">
                  Airtel Money · Dernier SMS inséré
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {lastAirtelTx ? 'Fil régulier' : 'En attente'}
                </span>
              </div>
              {lastAirtelTx ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-1.5">
                    <span className="text-slate-400 font-sans text-[10px]">Type :</span>
                    <span className="font-semibold text-slate-200">{lastAirtelTx.typeLabel || lastAirtelTx.typeOperation}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-1.5">
                    <span className="text-slate-400 font-sans text-[10px]">Montant :</span>
                    <span className="font-bold text-amber-400">{lastAirtelTx.montant.toLocaleString('fr-FR')} Ar</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start sm:gap-1.5">
                    <span className="text-slate-400 font-sans text-[10px]">Référence :</span>
                    <span className="text-slate-300 truncate">{lastAirtelTx.reference || lastAirtelTx.id}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 font-mono italic py-0.5">
                  Aucun SMS Airtel inséré dans la base
                </div>
              )}
            </div>
          )}
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

