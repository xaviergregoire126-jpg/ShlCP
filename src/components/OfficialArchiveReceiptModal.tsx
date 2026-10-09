import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { Transaction, NetworkInversionProof } from '../types';
import { extractNumericReferenceBigInt } from '../engine/accounting';

interface OfficialArchiveReceiptModalProps {
  dateStr: string;
  transactions: Transaction[];
  proofs?: NetworkInversionProof[];
  discrepancyReason?: string;
  onClose: () => void;
}

export const OfficialArchiveReceiptModal: React.FC<OfficialArchiveReceiptModalProps> = ({
  dateStr,
  transactions,
  proofs = [],
  discrepancyReason,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Synthèse journalière
  const totalOperations = transactions.length;
  const airtelCount = transactions.filter((t) => t.operator === 'AIRTEL').length;
  const mvolaCount = transactions.filter((t) => t.operator === 'MVOLA').length;
  const totalVolume = transactions.reduce((sum, t) => sum + t.montant, 0);
  const totalCommissions = transactions.reduce((sum, t) => sum + (t.commission || 0), 0);
  const totalHiddenFees = transactions.reduce((sum, t) => sum + (t.calculatedFee || 0), 0);
  const netMargin = totalCommissions;

  // Tri chronologique des transactions de la journée
  const sortedReceiptTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (a.operator === 'MVOLA' && b.operator === 'MVOLA') {
        const numA = extractNumericReferenceBigInt(a.reference);
        const numB = extractNumericReferenceBigInt(b.reference);
        if (numA !== numB) return numA < numB ? -1 : 1;
      }
      if (a.timestamp !== b.timestamp && a.timestamp !== 0 && b.timestamp !== 0) {
        return a.timestamp - b.timestamp;
      }
      return a.id.localeCompare(b.id);
    });
  }, [transactions]);

  const handleTriggerPrint = () => {
    window.print();
  };

  const modalNode = (
    <div className="modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="modal-content bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Entête de la fenêtre modale (non imprimé) */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 no-print">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Reçu d&apos;Archivage Journalier Officiel · {dateStr}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps du Reçu Imprimable (Partie 1 + Partie 2) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/40">
          <div
            ref={receiptRef}
            id="printable-archive-receipt"
            className="bg-white text-slate-950 p-4 sm:p-6 rounded-lg font-mono text-xs border border-slate-300 shadow-sm select-text space-y-4"
          >
            {/* Entête général document */}
            <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-base font-black tracking-tight uppercase text-slate-950">
                  CASHPOINT MADA — REGISTRE &amp; ARCHIVAGE
                </h2>
                <p className="text-[11px] text-slate-600">
                  Journal comptable exhaustif des transactions certifiées par SMS
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">DATE : {dateStr}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {totalOperations} opération{totalOperations > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* A) PARTIE 1 : LE TABLEAU COMPTABLE CHRONOLOGIQUE */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                A) Tableau des Opérations Chronologiques ({sortedReceiptTransactions.length})
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded">
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[9px] uppercase tracking-wider">
                      <th className="py-1.5 px-2 border-r border-slate-200">1. Référence</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">2. Opérateur</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">3. Type</th>
                      <th className="py-1.5 px-2 border-r border-slate-200">4. Numéro</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 text-right">5. Montant</th>
                      <th className="py-1.5 px-2 border-r border-slate-200 text-right">6. Commission</th>
                      <th className="py-1.5 px-2 text-right">7. Solde Après</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedReceiptTransactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        {/* 1. Référence (Pivot d'affichage : Ref MVola ou ID Airtel) */}
                        <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 font-mono font-bold text-slate-900">
                          {tx.operator === 'MVOLA' ? `Ref: ${tx.reference}` : `${tx.reference} (${tx.heure})`}
                        </td>

                        {/* 2. Opérateur (MVola / AirtelMoney) */}
                        <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 font-bold">
                          {tx.operator === 'MVOLA' ? 'MVola' : 'AirtelMoney'}
                        </td>

                        {/* 3. Type (crédit, dépôt, retrait, transfert) */}
                        <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 capitalize text-slate-700">
                          {tx.typeOperation}
                        </td>

                        {/* 4. Numéro (Numéro client ou "-" si masqué/vide) */}
                        <td className="py-1.5 px-2 whitespace-nowrap border-r border-slate-200 font-mono text-slate-800">
                          {tx.numero && tx.numero !== '-' ? tx.numero : '-'}
                        </td>

                        {/* 5. Montant (Valeur brute en Ar) */}
                        <td className="py-1.5 px-2 text-right whitespace-nowrap border-r border-slate-200 font-bold text-slate-900 tabular-nums">
                          {tx.montant.toLocaleString('fr-FR')} Ar
                        </td>

                        {/* 6. Commission (Gain réel de l'agent en Ar) */}
                        <td className="py-1.5 px-2 text-right whitespace-nowrap border-r border-slate-200 font-bold text-emerald-800 tabular-nums">
                          +{(tx.commission || 0).toLocaleString('fr-FR')} Ar
                        </td>

                        {/* 7. Solde Après (Solde de flotte officiel lu à la fin du SMS) */}
                        <td className="py-1.5 px-2 text-right whitespace-nowrap font-bold text-slate-950 tabular-nums">
                          {tx.soldeApres !== undefined ? `${tx.soldeApres.toLocaleString('fr-FR')} Ar` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* B) JUSTIFICATIONS ET CORRECTIONS RÉSEAU (ANTI-FRAUDE) */}
            {proofs && proofs.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-300">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100/90 border border-amber-300 px-2 py-1 rounded flex items-center justify-between">
                  <span>B) JUSTIFICATIONS ET CORRECTIONS RÉSEAU (ANTI-FRAUDE)</span>
                  <span className="text-[9px] font-mono font-bold text-amber-900">
                    {proofs.length} justification{proofs.length > 1 ? 's' : ''} certifiée{proofs.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2">
                  {proofs.map((proof, pIdx) => (
                    <div
                      key={proof.id || pIdx}
                      className="p-2.5 bg-slate-50 border border-slate-300 rounded text-[10px] space-y-1.5 font-mono"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800 text-[10px] border-b border-slate-200 pb-1">
                        <span>
                          🛡️ Audit Réseau · Inversion justifiée {proof.reference ? `(Ref: ${proof.reference})` : ''}
                        </span>
                        <span className="text-[9px] text-slate-500 font-normal">
                          {new Date(proof.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 text-[9px] uppercase tracking-wide">
                            SMS Preuve N°1 :
                          </span>
                          <div className="p-1.5 bg-white border border-slate-200 rounded text-[9px] text-slate-900 whitespace-pre-wrap break-words leading-relaxed select-text">
                            {proof.smsProof1 || '(Aucun texte renseigné)'}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 text-[9px] uppercase tracking-wide">
                            SMS Preuve N°2 :
                          </span>
                          <div className="p-1.5 bg-white border border-slate-200 rounded text-[9px] text-slate-900 whitespace-pre-wrap break-words leading-relaxed select-text">
                            {proof.smsProof2 || '(Aucun texte renseigné)'}
                          </div>
                        </div>
                      </div>
                      <div className="text-[8.5px] text-slate-700 font-semibold italic pt-0.5">
                        ✓ Écart de solde vérifié et corrigé par l&apos;agent : Inversion de référence opérateur validée.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JUSTIFICATION D'ÉCART DE CLÔTURE (CAISSE NÉGATIVE) */}
            {discrepancyReason && (
              <div className="space-y-1.5 pt-2 border-t border-slate-300">
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-950 bg-red-100/90 border border-red-300 px-2 py-1 rounded flex items-center justify-between">
                  <span>⚠️ AUDIT CLÔTURE · JUSTIFICATION D&apos;ÉCART DE CAISSE (CAISSE NÉGATIVE)</span>
                  <span className="text-[9px] font-mono font-bold text-red-900">Certifié par l&apos;agent</span>
                </div>
                <div className="p-2.5 bg-red-50/60 border border-red-200 rounded text-[10px] space-y-1 font-mono">
                  <div className="text-[9px] font-bold text-red-900 uppercase">
                    Raison obligatoire consignée au rapport :
                  </div>
                  <div className="p-2 bg-white border border-red-200 rounded text-[9.5px] text-slate-900 whitespace-pre-wrap break-words leading-relaxed select-text font-sans">
                    {discrepancyReason}
                  </div>
                  <div className="text-[8.5px] text-red-800 italic pt-0.5">
                    ✓ Décharge et traçabilité enregistrées : le déficit constaté a été motivé avant la bascule du Point Zéro.
                  </div>
                </div>
              </div>
            )}

            {/* C) PARTIE 2 : LE BLOC DE SYNTHÈSE JOURNALIÈRE (TICKET THERMIQUE) */}
            <div className="pt-2">
              <div className="ticket-synthese max-w-md ml-auto p-4 border-2 border-dashed border-slate-400 bg-slate-50/90 rounded-lg space-y-2 text-slate-950">
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <div className="font-black text-sm uppercase tracking-wide">CASHPOINT MADA</div>
                  <div className="text-xs font-bold text-slate-700">CLÔTURE DU {dateStr}</div>
                </div>

                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Nombre total d&apos;opérations :</span>
                    <span className="font-bold">
                      {totalOperations} ({airtelCount} Airtel op. / {mvolaCount} MVola op.)
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Volume Brut total traité :</span>
                    <span className="font-bold tabular-nums">
                      {totalVolume.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-dotted border-slate-300 text-xs">
                  <div className="flex justify-between items-center text-emerald-800 font-bold">
                    <span>Total Commissions (+) :</span>
                    <span className="tabular-nums">+{totalCommissions.toLocaleString('fr-FR')} Ar</span>
                  </div>
                  {totalHiddenFees > 0 && (
                    <div className="flex justify-between items-center text-slate-600 font-medium text-[11px]">
                      <span>Frais Opérateurs (Client, informatif) :</span>
                      <span className="tabular-nums">{totalHiddenFees.toLocaleString('fr-FR')} Ar</span>
                    </div>
                  )}
                </div>

                <div className="py-2.5 mt-2 border-y-2 border-slate-950 flex justify-between items-center text-sm sm:text-base font-black">
                  <span className="underline uppercase tracking-tight">MARGE NETTE DU JOUR :</span>
                  <span className="underline tabular-nums text-emerald-950">
                    +{netMargin.toLocaleString('fr-FR')} Ar
                  </span>
                </div>

                <div className="text-center pt-1 text-[9px] text-slate-500">
                  Cashpoint Mada · Reçu d&apos;Archivage Journalier Conforme 2026
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de la fenêtre modale (non imprimé) */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleTriggerPrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-950/50 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le Reçu d&apos;Archivage</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
