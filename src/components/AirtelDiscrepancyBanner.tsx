import React from 'react';
import { X } from 'lucide-react';
import { Transaction } from '../types';

interface AirtelDiscrepancyBannerProps {
  mismatchedTransactions: Transaction[];
  onDismiss?: () => void;
}

export const AirtelDiscrepancyBanner: React.FC<AirtelDiscrepancyBannerProps> = ({
  mismatchedTransactions,
  onDismiss,
}) => {
  if (mismatchedTransactions.length === 0) return null;

  const first = mismatchedTransactions[0];
  const ref = first.reference || first.id;
  const smsBal = (first.smsReportedBalance ?? first.soldeApres ?? 0).toLocaleString('fr-FR');
  const theoBal = (first.theoreticalOperatorBalance ?? 0).toLocaleString('fr-FR');
  const gap = (first.balanceGap ?? 0).toLocaleString('fr-FR');

  return (
    <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-amber-200 text-xs shadow-xs animate-in fade-in">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[11px] font-sans truncate text-amber-200">
          ⚠️ <strong className="text-amber-300 font-bold">Écart Airtel</strong> (Réf: <span className="font-mono text-white">{ref}</span>) : Solde SMS <span className="font-mono text-white font-semibold">{smsBal}</span> ≠ Théorique <span className="font-mono text-white font-semibold">{theoBal}</span> (Trou: <span className="font-mono text-amber-300 font-bold">{gap} Ar</span>). SMS manqué ?
        </span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-400 hover:text-white p-0.5 rounded transition-colors shrink-0 cursor-pointer"
          aria-label="Fermer l'alerte"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
