import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { BatchAuditSummary, ExtractedFileSmsItem } from '../types';
import { extractAndDelimitFile } from '../engine/fileExtractor';

interface BatchAuditInputProps {
  onProcessBatch: (bulkInput: string | ExtractedFileSmsItem[]) => BatchAuditSummary | null;
  resetSignal?: number;
}

export const BatchAuditInput: React.FC<BatchAuditInputProps> = ({
  onProcessBatch,
  resetSignal = 0,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<BatchAuditSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RÈGLE DE RÉINITIALISATION : Remettre à zéro lors du reset global
  React.useEffect(() => {
    if (resetSignal > 0) {
      setCurrentFileName(null);
      setErrorMessage(null);
      setLastSummary(null);
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [resetSignal]);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentFileName(file.name);

    // Contrôle strict d'extension : EXCLUSIVEMENT .CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setIsProcessing(false);
      setErrorMessage("Format non accepté. Veuillez importer exclusivement un fichier au format .CSV.");
      return;
    }

    try {
      // 1. Extraction stricte selon la Règle 11-A (5ème colonne du CSV)
      const items = await extractAndDelimitFile(file);

      if (!items || items.length === 0) {
        throw new Error(
          'Aucun SMS exploitable trouvé dans le fichier CSV. Assurez-vous que le CSV respecte les 5 colonnes ("Type","Date","Nom / Numéro","Expéditeur","Contenu").'
        );
      }

      // 2. Lancement du processus algorithmique
      const summary = onProcessBatch(items);
      if (summary) {
        setLastSummary(summary);
      }
    } catch (err: any) {
      console.error('Erreur lors du traitement du fichier:', err);
      setErrorMessage(
        err?.message || "Erreur lors de la lecture du fichier. Assurez-vous qu'il s'agit d'un fichier CSV valide."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-2.5">
      {/* Input de fichier caché strictement réservé au .CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ZONE HORIZONTALE COMPACTE ET FINE (DIRECTIVE COMPACT MICRO-UI: py-3 px-4) */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`py-3 px-4 rounded-xl border border-dashed transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isProcessing
            ? 'bg-emerald-950/20 border-emerald-500/60'
            : 'bg-slate-900/90 hover:bg-slate-900 border-slate-700/80 hover:border-emerald-500/60'
        }`}
      >
        {/* À GAUCHE : Icône miniaturisée + texte en une seule ligne */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : currentFileName ? (
              <FileCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
            {isProcessing
              ? 'Traitement du fichier en cours...'
              : currentFileName
              ? `Fichier : ${currentFileName}`
              : 'Déposez ou sélectionnez votre fichier CSV'}
          </span>
        </div>

        {/* À DROITE : Bouton vert compact (py-1.5 px-3 text-xs rounded-lg) */}
        <div className="shrink-0 flex items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="py-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-lg transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Importer un fichier CSV (.csv)</span>
          </button>
        </div>
      </div>

      {/* Message d'erreur éventuel */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Résumé compact de l'audit de masse si disponible */}
      {lastSummary && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Résultat de l&apos;audit CSV
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              {lastSummary.totalExtracted} SMS traités
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/20">
              <div className="text-base font-mono font-bold text-emerald-400 tabular-nums">
                +{lastSummary.addedCount}
              </div>
              <div className="text-[10px] text-slate-400">Nouvelles lignes</div>
            </div>

            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="text-base font-mono font-bold text-slate-300 tabular-nums">
                {lastSummary.duplicatesSkipped}
              </div>
              <div className="text-[10px] text-slate-400">Doublons ignorés</div>
            </div>

            <div className="p-2 rounded bg-amber-950/40 border border-amber-500/20">
              <div className="text-base font-mono font-bold text-amber-400 tabular-nums">
                {lastSummary.hiddenFeesTotal.toLocaleString('fr-FR')} Ar
              </div>
              <div className="text-[10px] text-slate-400">Frais cachés</div>
            </div>

            <div className="p-2 rounded bg-blue-950/40 border border-blue-500/20">
              <div className="text-base font-mono font-bold text-blue-400 tabular-nums">
                {lastSummary.commissionsTotal.toLocaleString('fr-FR')} Ar
              </div>
              <div className="text-[10px] text-slate-400">Commissions</div>
            </div>
          </div>

          {lastSummary.unrecognizedCount > 0 && (
            <div className="p-2 rounded bg-red-950/30 border border-red-500/20 text-[11px] text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>
                {lastSummary.unrecognizedCount} ligne(s) non reconnues ou ignorées.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
