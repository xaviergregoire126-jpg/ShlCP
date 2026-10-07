import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  X,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { Transaction } from '../types';

interface DayDetailViewProps {
  dateStr: string;
  transactions: Transaction[];
  onBack: () => void;
  onDeleteTransaction: (id: string) => void;
}

export const DayDetailView: React.FC<DayDetailViewProps> = ({
  dateStr,
  transactions,
  onBack,
  onDeleteTransaction,
}) => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Synthèse
  const totalOperations = transactions.length;
  const totalCommissions = transactions.reduce((sum, t) => sum + (t.commission || 0), 0);
  const totalHiddenFees = transactions.reduce((sum, t) => sum + (t.calculatedFee || 0), 0);
  // Formule de la marge corrigée : Marge_Journée = Somme(Toutes_Les_Commissions); (sans soustraction des frais)
  const globalNetMargin = totalCommissions;
  const totalVolume = transactions.reduce((sum, t) => sum + t.montant, 0);

  // Ventilation opérateurs
  const airtelTxList = transactions.filter((t) => t.operator === 'AIRTEL');
  const airtelCount = airtelTxList.length;
  const airtelMargin = airtelTxList.reduce(
    (sum, t) => sum + (t.commission || 0),
    0
  );

  const mvolaTxList = transactions.filter((t) => t.operator === 'MVOLA');
  const mvolaCount = mvolaTxList.length;
  const mvolaMargin = mvolaTxList.reduce(
    (sum, t) => sum + (t.commission || 0),
    0
  );

  const orangeTxList = transactions.filter((t: any) => t.operator === 'ORANGE');
  const orangeCount = orangeTxList.length;
  const orangeMargin = orangeTxList.reduce(
    (sum: number, t: any) => sum + (t.commission || 0),
    0
  );

  // Export Excel
  const handleExportExcel = () => {
    const headers = [
      'Date',
      'Heure',
      'Opérateur',
      'Type',
      'Numéro',
      'Montant',
      'Commission',
      'Frais',
      'Solde Après',
      'Référence',
    ];

    const rows = transactions.map((t) => [
      `"${dateStr}"`,
      `"${t.heure}"`,
      `"${t.operateur}"`,
      `"${t.typeOperation}"`,
      `"${t.numero}"`,
      t.montant,
      t.commission,
      t.frais,
      t.soldeApres,
      `"${t.reference}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cloture_${dateStr.replace(/[\/\\]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const getOperationDirection = (type: string) => {
    switch (type.toLowerCase()) {
      case 'dépôt':
        return {
          icon: <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />,
          label: '↓ Dépôt',
        };
      case 'retrait':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />,
          label: '↑ Retrait',
        };
      case 'transfert':
        return {
          icon: <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />,
          label: '⇄ Transfert',
        };
      case 'crédit':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />,
          label: '💳 Crédit',
        };
      default:
        return {
          icon: <Coins className="w-3.5 h-3.5 text-slate-400" />,
          label: type,
        };
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* A) BANDEAU SUPÉRIEUR ET ACTIONS (COMPACT & MICRO-UI) */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-md border border-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>← Retour</span>
          </button>

          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Journée du {dateStr}
            </h2>
            <p className="text-[10px] text-slate-400">
              Journal comptable détaillé &amp; audit.
            </p>
          </div>
        </div>

        {/* Boutons d'exportation en haut à droite : "📄 PDF" et "📊 Excel" */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>📄 PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>📊 Excel</span>
          </button>
        </div>
      </div>

      {/* INDICATEURS DE SYNTHÈSE : [Nombre total d'opérations] et [Marge globale en Ar] */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-slate-400">
            Total Opérations
          </div>
          <div className="text-base font-bold font-mono text-white tabular-nums">
            {totalOperations} <span className="text-[11px] font-normal text-slate-400">op.</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Volume : {totalVolume.toLocaleString('fr-FR')} Ar
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-emerald-400">
            Marge Globale Nette
          </div>
          <div className="text-base font-bold font-mono text-emerald-500 tabular-nums">
            {globalNetMargin > 0 ? '+' : ''}
            {globalNetMargin.toLocaleString('fr-FR')}{' '}
            <span className="text-[11px] font-normal text-emerald-400/80">Ar</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            +{totalCommissions.toLocaleString('fr-FR')} Ar com.{totalHiddenFees > 0 ? ` · Frais client: ${totalHiddenFees.toLocaleString('fr-FR')} Ar` : ''}
          </div>
        </div>
      </div>

      {/* BLOC "PAR OPÉRATEUR" (Airtel, MVola, Orange avec bordure distinctive fine à gauche) */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Ventilation Réseaux
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Airtel */}
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 border-l-2 border-l-red-500 space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-red-400 font-bold">
              <span>Airtel</span>
              <span className="font-mono">{airtelCount} op.</span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-white tabular-nums">
              {airtelMargin > 0 ? '+' : ''}
              {airtelMargin.toLocaleString('fr-FR')} Ar
            </div>
          </div>

          {/* MVola */}
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 border-l-2 border-l-amber-500 space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
              <span>MVola</span>
              <span className="font-mono">{mvolaCount} op.</span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-white tabular-nums">
              {mvolaMargin > 0 ? '+' : ''}
              {mvolaMargin.toLocaleString('fr-FR')} Ar
            </div>
          </div>

          {/* Orange */}
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 border-l-2 border-l-orange-500 space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-orange-400 font-bold">
              <span>Orange</span>
              <span className="font-mono">{orangeCount} op.</span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono text-white tabular-nums">
              {orangeMargin > 0 ? '+' : ''}
              {orangeMargin.toLocaleString('fr-FR')} Ar
            </div>
          </div>
        </div>
      </div>

      {/* B) CARTES DE TRANSACTIONS (P-2 À PY-2 PX-3, ROUNDED-LG, MB-1.5) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
          <span>Transactions ({transactions.length})</span>
          <span className="text-slate-500 font-normal">Cliquer pour inspecter</span>
        </div>

        {transactions.map((tx) => {
          const dir = getOperationDirection(tx.typeOperation);

          return (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="bg-slate-900/90 rounded-lg py-2 px-3 mb-1.5 border border-slate-850 hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between gap-3 group select-none"
            >
              {/* Alignement Gauche : Logo opérateur, type avec icône, Heure & Numéro */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    tx.operator === 'MVOLA'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      : 'bg-red-500/15 text-red-300 border border-red-500/20'
                  }`}
                >
                  {tx.operator === 'MVOLA' ? 'MV' : 'AIR'}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-xs font-semibold text-white">
                    {dir.icon}
                    <span>{dir.label}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      · {tx.operateur}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                    {tx.operator === 'MVOLA' ? (
                      <span className="text-amber-400 font-medium">Ref: {tx.reference}</span>
                    ) : (
                      <span className="text-slate-300 font-medium">{tx.heure}</span>
                    )}
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{tx.numero || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Alignement Droite : Montant brut en gras, commission en vert */}
              <div className="text-right space-y-0.5">
                <div className="text-sm font-bold text-white font-mono tracking-tight tabular-nums">
                  {tx.montant.toLocaleString('fr-FR')}{' '}
                  <span className="text-[10px] font-normal text-slate-400">Ar</span>
                </div>

                <div className="text-[11px] font-bold text-emerald-500 font-mono">
                  {tx.commission > 0 ? (
                    <span>+{tx.commission.toLocaleString('fr-FR')} Ar</span>
                  ) : (
                    <span className="text-slate-600">0 Ar</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* C) MODAL DE DRILL-DOWN COMPACT (FENÊTRE FLOTTANTE) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-sm w-full p-4 shadow-xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                    selectedTx.operator === 'MVOLA'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {selectedTx.operator === 'MVOLA' ? 'MV' : 'AIR'}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Détail Transaction
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {selectedTx.heure} · {selectedTx.typeOperation.toUpperCase()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 informations extraites du SMS */}
            <div className="space-y-1.5 font-mono text-[11px]">
              {/* 1. Ref / ID complet */}
              <div className="p-2 rounded-md bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-sans">Référence :</span>
                <span className="font-bold text-amber-400">{selectedTx.reference}</span>
              </div>

              {/* 2. Frais transaction */}
              <div className="p-2 rounded-md bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-sans">Frais :</span>
                <span className={`font-bold ${selectedTx.frais > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {selectedTx.frais.toLocaleString('fr-FR')} Ar
                  {selectedTx.isSpecialAirtel && <span className="text-red-400 ml-1">(Cachés)</span>}
                </span>
              </div>

              {/* 3. Solde après officiel */}
              <div className="p-2 rounded-md bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-sans">Solde Après :</span>
                <span className="font-bold text-white">
                  {selectedTx.soldeApres.toLocaleString('fr-FR')} Ar
                </span>
              </div>

              {/* Montant & Commission */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2 rounded-md bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px] font-sans">Montant :</div>
                  <div className="font-bold text-white">{selectedTx.montant.toLocaleString('fr-FR')} Ar</div>
                </div>
                <div className="p-2 rounded-md bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px] font-sans">Commission :</div>
                  <div className="font-bold text-emerald-400">+{selectedTx.commission.toLocaleString('fr-FR')} Ar</div>
                </div>
              </div>

              {/* 4. Texte brut du SMS */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                  <span>Texte brut du SMS :</span>
                  <button
                    type="button"
                    onClick={() => handleCopyRaw(selectedTx.rawText)}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300 whitespace-pre-wrap break-words select-all">
                  {selectedTx.rawText}
                </div>
              </div>
            </div>

            {/* Actions modal */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(selectedTx.id);
                  setSelectedTx(null);
                }}
                className="px-2.5 py-1 text-red-400 hover:text-red-300 text-xs rounded-md flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
