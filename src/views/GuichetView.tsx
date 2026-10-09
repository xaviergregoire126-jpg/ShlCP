import React, { useState } from 'react';
import {
  Smartphone,
  Layers,
  ArrowRight,
  Clock,
  RotateCcw,
  History,
  Zap,
} from 'lucide-react';
import { AnchorBalances, ExtractedFileSmsItem, RawParsedSms, Transaction } from '../types';
import { ZeroPointAnchor } from '../components/ZeroPointAnchor';
import { RealtimeSingleInput } from '../components/RealtimeSingleInput';
import { BatchAuditInput } from '../components/BatchAuditInput';
import { MvolaDiscrepancyBanner } from '../components/MvolaDiscrepancyBanner';
import { AirtelDiscrepancyBanner } from '../components/AirtelDiscrepancyBanner';
import { NetworkInversionModal } from '../components/NetworkInversionModal';

interface GuichetViewProps {
  anchor: AnchorBalances;
  onUpdateAnchor: (updated: AnchorBalances) => void;
  transactions: Transaction[];
  rawTransactions: RawParsedSms[];
  onValidateSingleSms: (smsText: string) => {
    success: boolean;
    isDuplicate?: boolean;
    message?: string;
  };
  onProcessBatch: (bulkInput: string | ExtractedFileSmsItem[]) => any;
  onDeleteTransaction: (id: string) => void;
  onOpenUnrecognizedModal: (rawText: string) => void;
  onResetSession: () => void;
  onNavigateToHistory: () => void;
  onNavigateToSettings?: () => void;
  resetSignal: number;
  isMvolaBannerDismissed: boolean;
  onDismissMvolaBanner: () => void;
  isAirtelBannerDismissed: boolean;
  onDismissAirtelBanner: () => void;
  onSaveNetworkProof?: (proof: {
    reference?: string;
    smsProof1: string;
    smsProof2: string;
    dateStr: string;
  }) => void;
}

export const GuichetView: React.FC<GuichetViewProps> = ({
  anchor,
  onUpdateAnchor,
  transactions,
  rawTransactions,
  onValidateSingleSms,
  onProcessBatch,
  onDeleteTransaction,
  onOpenUnrecognizedModal,
  onResetSession,
  onNavigateToHistory,
  onNavigateToSettings,
  resetSignal,
  isMvolaBannerDismissed,
  onDismissMvolaBanner,
  isAirtelBannerDismissed,
  onDismissAirtelBanner,
  onSaveNetworkProof,
}) => {
  const [activeTab, setActiveTab] = useState<'realtime' | 'batch'>('realtime');
  const [inversionModal, setInversionModal] = useState<{
    isOpen: boolean;
    reference?: string;
  }>({
    isOpen: false,
  });

  const mvolaTxCount = transactions.filter((t) => t.operator === 'MVOLA').length;
  // 3. SÉCURITÉ ALERTE ÉCART MVOLA : Ne s'enclenche qu'à partir du DEUXIÈME SMS de la chaîne
  const mvolaMismatches =
    mvolaTxCount >= 2
      ? transactions.filter((t) => t.operator === 'MVOLA' && t.balanceMismatch)
      : [];

  const airtelTxCount = transactions.filter((t) => t.operator === 'AIRTEL').length;
  // 22. SÉCURITÉ ALERTE ÉCART AIRTEL MONEY : Ne s'enclenche qu'à partir du DEUXIÈME SMS de la chaîne
  const airtelMismatches =
    airtelTxCount >= 2
      ? transactions.filter((t) => t.operator === 'AIRTEL' && t.balanceMismatch)
      : [];

  const handleValidateProof = (proof: {
    reference?: string;
    smsProof1: string;
    smsProof2: string;
  }) => {
    // Association de la preuve à la date de la transaction en écart
    const targetMismatch =
      mvolaMismatches.find((t) => t.reference === proof.reference) ||
      mvolaMismatches[0];
    const dateStr =
      targetMismatch?.dateStr ||
      transactions[transactions.length - 1]?.dateStr ||
      new Date().toLocaleDateString('fr-FR');

    if (onSaveNetworkProof) {
      onSaveNetworkProof({
        ...proof,
        dateStr,
      });
    }

    // Éteint définitivement l'alerte d'écart orange du Guichet
    onDismissMvolaBanner();
    setInversionModal({ isOpen: false });
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* 1. BOUTON DISCRET "Editer point zéro" TOUT EN HAUT */}
      <div className="flex items-center justify-between pb-0.5">
        <span className="text-[11px] font-mono font-medium text-slate-500">
          Guichet Opérationnel
        </span>
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="px-2.5 py-1 text-[11px] font-mono text-slate-400 hover:text-amber-300 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/30 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Modifier les soldes de départ du Point Zéro dans les Réglages"
          >
            <span>Editer point zéro</span>
            <span className="text-amber-400 font-bold">→</span>
          </button>
        )}
      </div>

      {/* ALERTE ÉCART MVOLA (COMPACTE - STRICTEMENT À PARTIR DU 2ÈME MESSAGE) */}
      {mvolaMismatches.length > 0 && !isMvolaBannerDismissed && (
        <MvolaDiscrepancyBanner
          mismatchedTransactions={mvolaMismatches}
          onDismiss={onDismissMvolaBanner}
          onVerifyNetworkInversion={(ref) =>
            setInversionModal({ isOpen: true, reference: ref })
          }
        />
      )}

      {/* 22. ALERTE ÉCART AIRTEL MONEY (COMPACTE - STRICTEMENT À PARTIR DU 2ÈME MESSAGE) */}
      {airtelMismatches.length > 0 && !isAirtelBannerDismissed && (
        <AirtelDiscrepancyBanner
          mismatchedTransactions={airtelMismatches}
          onDismiss={onDismissAirtelBanner}
        />
      )}

      {/* 2. ENVIRONNEMENT DE SAISIE COMPACT */}
      <section className="bg-slate-900/90 border border-slate-850 rounded-lg overflow-hidden">
        {/* Sélecteur d'onglets compact */}
        <div className="border-b border-slate-850 bg-slate-950/40 p-1.5 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('realtime')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'realtime'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Au fil de l&apos;eau</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Importation Groupée (CSV)</span>
            </button>
          </div>
        </div>

        {/* Corps onglet */}
        <div className="p-3">
          {activeTab === 'realtime' ? (
            <RealtimeSingleInput
              transactions={transactions}
              resetSignal={resetSignal}
              onValidateSms={onValidateSingleSms}
              onOpenUnrecognizedModal={onOpenUnrecognizedModal}
            />
          ) : (
            <BatchAuditInput
              resetSignal={resetSignal}
              onProcessBatch={onProcessBatch}
            />
          )}
        </div>
      </section>

      {/* 3. TABLEAU TEMPORAIRE DE SESSION (COMPACT & MICRO-UI) */}
      <section className="bg-slate-900/90 border border-slate-850 rounded-lg overflow-hidden space-y-2">
        <div className="px-3 py-2 border-b border-slate-850 flex items-center justify-between bg-slate-950/30">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-bold text-white">
              Transactions Récentes ({transactions.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={onResetSession}
                className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-red-300 bg-slate-800 rounded transition-colors flex items-center gap-1"
                title="Vider la session"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToHistory}
              className="px-2 py-0.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 text-[11px] font-semibold rounded border border-blue-500/20 flex items-center gap-1 transition-colors"
            >
              <History className="w-3 h-3" />
              <span>Historique</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            Aucune transaction enregistrée pour le moment. Veuillez coller un SMS ou importer un fichier CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-850">
                <tr>
                  <th className="py-1.5 px-2.5">Référence</th>
                  <th className="py-1.5 px-2.5">Opérateur</th>
                  <th className="py-1.5 px-2.5">Type</th>
                  <th className="py-1.5 px-2.5">Numéro</th>
                  <th className="py-1.5 px-2.5 text-right">Montant</th>
                  <th className="py-1.5 px-2.5 text-right">Com.</th>
                  <th className="py-1.5 px-2.5 text-right">Solde Après</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-[11px]">
                {transactions.slice(-8).reverse().map((tx) => {
                  const isMismatch = tx.balanceMismatch;
                  const isHiddenFeeTransfer = tx.airtelVerdict === 'TRANSFERT_FRAIS_CACHES' || (tx.operator === 'AIRTEL' && tx.frais > 0);
                  const isEchange = tx.typeOperation === 'echange';

                  let rowClassName = 'hover:bg-slate-850/40 transition-colors';
                  if (isMismatch) {
                    rowClassName += ' border-l-4 border-l-amber-500 bg-amber-950/30 text-amber-200';
                  } else if (isHiddenFeeTransfer) {
                    rowClassName += ' border-l-4 border-l-orange-500 bg-orange-950/25';
                  } else if (isEchange) {
                    rowClassName += ' border-l-2 border-l-indigo-500 bg-indigo-950/20';
                  }

                  return (
                    <tr key={tx.id} className={rowClassName}>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        {tx.operator === 'MVOLA' ? (
                          <span className="text-amber-400 font-bold font-mono inline-flex items-center gap-1">
                            {isMismatch && <span title={`⚠️ Écart de solde: ${tx.balanceGap?.toLocaleString('fr-FR')} Ar`}>⚠️</span>}
                            <span>Ref: {tx.reference}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 font-semibold font-mono inline-flex items-center gap-1">
                            {isMismatch && <span title={`⚠️ Écart de solde: ${tx.balanceGap?.toLocaleString('fr-FR')} Ar`}>⚠️</span>}
                            {isHiddenFeeTransfer && !isMismatch && (
                              <span title={`⚠️ Frais cachés détectés: ${tx.frais.toLocaleString('fr-FR')} Ar`}>⚠️</span>
                            )}
                            <span>{tx.reference} ({tx.heure})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            tx.operator === 'MVOLA'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-red-500/15 text-red-300'
                          }`}
                        >
                          {tx.operateur}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 font-sans">
                        {isEchange ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/50">
                            <span>🔄</span>
                            <span>Echange</span>
                          </span>
                        ) : isHiddenFeeTransfer ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-950/50 px-1.5 py-0.5 rounded border border-orange-500/40">
                            <span>Transfert (+{tx.frais.toLocaleString('fr-FR')} Ar Frais)</span>
                          </span>
                        ) : (
                          <span className="capitalize text-slate-300">{tx.typeOperation}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-400">{tx.numero}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-white tabular-nums">
                        {tx.montant.toLocaleString('fr-FR')} Ar
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-emerald-400 tabular-nums">
                        {tx.commission > 0 ? `+${tx.commission}` : '-'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-semibold tabular-nums">
                        <div className={isMismatch ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                          {tx.soldeApres.toLocaleString('fr-FR')} Ar
                        </div>
                        {isMismatch && tx.balanceGap !== undefined && tx.balanceGap !== 0 && (
                          <div className="text-[9px] text-amber-400 font-mono font-bold">
                            Écart: {tx.balanceGap > 0 ? `+${tx.balanceGap.toLocaleString('fr-FR')}` : tx.balanceGap.toLocaleString('fr-FR')} Ar
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODALE D'AUDIT & JUSTIFICATION ANTI-FRAUDE */}
      <NetworkInversionModal
        isOpen={inversionModal.isOpen}
        reference={inversionModal.reference}
        onClose={() => setInversionModal({ isOpen: false })}
        onValidate={handleValidateProof}
      />
    </div>
  );
};
