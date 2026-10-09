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
import { Transaction, NetworkInversionProof } from '../types';
import { OfficialArchiveReceiptModal } from '../components/OfficialArchiveReceiptModal';

interface DayDetailViewProps {
  dateStr: string;
  transactions: Transaction[];
  networkProofs?: NetworkInversionProof[];
  onBack: () => void;
  onDeleteTransaction: (id: string) => void;
}

export const DayDetailView: React.FC<DayDetailViewProps> = ({
  dateStr,
  transactions,
  networkProofs = [],
  onBack,
  onDeleteTransaction,
}) => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Filtres interactifs pour audit des transactions (Micro-UI)
  const [operatorFilter, setOperatorFilter] = useState<'ALL' | 'MVOLA' | 'AIRTEL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEPOT' | 'RETRAIT' | 'TRANSFERT' | 'ECHANGE'>('ALL');

  // Filtrage combiné en temps réel
  const filteredTransactions = transactions.filter((t) => {
    // 1. Filtre Opérateur
    if (operatorFilter === 'MVOLA' && t.operator !== 'MVOLA') return false;
    if (operatorFilter === 'AIRTEL' && t.operator !== 'AIRTEL') return false;

    // 2. Filtre Type de Transaction
    if (typeFilter === 'DEPOT') {
      const isDepot = t.type === 'DEPOT' || t.typeOperation?.toLowerCase() === 'dépôt' || t.typeOperation?.toLowerCase() === 'depot';
      if (!isDepot) return false;
    }
    if (typeFilter === 'RETRAIT') {
      const isRetrait = t.type === 'RETRAIT' || t.typeOperation?.toLowerCase() === 'retrait';
      if (!isRetrait) return false;
    }
    if (typeFilter === 'TRANSFERT') {
      const isTransfert = t.type === 'TRANSFERT' || t.typeOperation?.toLowerCase() === 'transfert';
      if (!isTransfert) return false;
    }
    if (typeFilter === 'ECHANGE') {
      const isEchange = t.type === 'ECHANGE' || t.typeOperation?.toLowerCase() === 'echange' || t.typeOperation?.toLowerCase() === 'échange';
      if (!isEchange) return false;
    }

    return true;
  });

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
      'Référence',
      'Opérateur',
      'Type',
      'Numéro',
      'Montant',
      'Commission',
      'Frais',
      'Solde Après',
    ];

    const rows = transactions.map((t) => [
      `"${dateStr}"`,
      `"${t.reference}"`,
      `"${t.operateur}"`,
      `"${t.typeOperation}"`,
      `"${t.numero}"`,
      t.montant,
      t.commission,
      t.frais,
      t.soldeApres,
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
    setIsArchiveModalOpen(true);
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

      {/* 1. BARRE DE FILTRES HORIZONTALE TRÈS COMPACTE (MICRO-UI) */}
      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Filtre Opérateur */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-mono font-bold mr-0.5">Réseau :</span>
            {(
              [
                { id: 'ALL', label: 'Tous' },
                { id: 'MVOLA', label: 'MVola' },
                { id: 'AIRTEL', label: 'Airtel' },
              ] as const
            ).map((op) => {
              const isActive = operatorFilter === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setOperatorFilter(op.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-slate-700 text-white border border-slate-500 shadow-xs'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-850'
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>

          {/* Filtre Type de Transaction */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-slate-400 font-mono font-bold mr-0.5">Type :</span>
            {(
              [
                { id: 'ALL', label: 'Tous' },
                { id: 'DEPOT', label: 'Dépôt' },
                { id: 'RETRAIT', label: 'Retrait' },
                { id: 'TRANSFERT', label: 'Transfert' },
                { id: 'ECHANGE', label: 'Échange' },
              ] as const
            ).map((type) => {
              const isActive = typeFilter === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setTypeFilter(type.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-slate-700 text-white border border-slate-500 shadow-xs'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-850'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* B) CARTES DE TRANSACTIONS (P-2 À PY-2 PX-3, ROUNDED-LG, MB-1.5) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
          <span>
            Transactions ({filteredTransactions.length}
            {filteredTransactions.length !== transactions.length ? ` sur ${transactions.length}` : ''})
          </span>
          <span className="text-slate-500 font-normal">Cliquer pour inspecter</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-850 text-center text-slate-500 text-xs font-mono py-6">
            Aucune transaction ne correspond aux critères sélectionnés.
          </div>
        ) : (
          [...filteredTransactions].reverse().map((tx) => {
          const dir = getOperationDirection(tx.typeOperation);

          return (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="bg-slate-900/90 rounded-lg py-2 px-3 mb-1.5 border border-slate-850 hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between gap-3 group select-none"
            >
              {/* Alignement Gauche : Logo opérateur, type avec icône, Référence & Numéro */}
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
                      <span className="text-amber-400 font-bold font-mono">Ref: {tx.reference}</span>
                    ) : (
                      <span className="text-slate-300 font-medium">{tx.reference} ({tx.heure})</span>
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
        }))}
      </div>

      {/* SECTION B : JUSTIFICATIONS ET CORRECTIONS RÉSEAU (ANTI-FRAUDE) */}
      {networkProofs && networkProofs.length > 0 && (
        <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>🛡️</span>
              <span>B) JUSTIFICATIONS ET CORRECTIONS RÉSEAU (ANTI-FRAUDE)</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {networkProofs.length} preuve(s) archivée(s)
            </span>
          </div>
          <div className="space-y-2">
            {networkProofs.map((p, idx) => (
              <div
                key={p.id || idx}
                className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono space-y-1.5"
              >
                <div className="flex items-center justify-between text-slate-300 text-[10px]">
                  <span className="font-bold text-amber-400">
                    Inversion justifiée {p.reference ? `(Réf: ${p.reference})` : ''}
                  </span>
                  <span className="text-slate-500">
                    {new Date(p.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 whitespace-pre-wrap break-words">
                    <span className="text-slate-400 font-bold block mb-0.5">Preuve N°1 :</span>
                    {p.smsProof1 || '-'}
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 whitespace-pre-wrap break-words">
                    <span className="text-slate-400 font-bold block mb-0.5">Preuve N°2 :</span>
                    {p.smsProof2 || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* REÇU D'ARCHIVAGE JOURNALIER OFFICIEL (IMPRESSION PDF) */}
      {isArchiveModalOpen && (
        <OfficialArchiveReceiptModal
          dateStr={dateStr}
          transactions={transactions}
          proofs={networkProofs}
          onClose={() => setIsArchiveModalOpen(false)}
        />
      )}

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
                    {selectedTx.operator === 'MVOLA' ? `Ref: ${selectedTx.reference}` : `${selectedTx.reference} (${selectedTx.heure})`} · {selectedTx.typeOperation.toUpperCase()}
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
