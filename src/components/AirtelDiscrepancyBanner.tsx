import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
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
  const count = mismatchedTransactions.length;

  return (
    <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-4 shadow-lg flex items-start justify-between gap-3 text-amber-200 animate-in fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="font-bold text-sm text-amber-300 flex items-center gap-2">
            <span>Attention : Écart de solde détecté sur Airtel Money (Transaction potentiellement oubliée ou rapport altéré)</span>
            {count > 1 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200">
                {count} anomalie{count > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-amber-200/90 leading-relaxed font-sans">
            La transaction <strong className="font-mono text-white">{first.id}</strong> ({first.timeStr || first.heure}) annonce un solde SMS de{' '}
            <strong className="font-mono text-white">
              {first.smsReportedBalance?.toLocaleString('fr-FR')} Ar
            </strong>{' '}
            alors que le solde théorique calculé en cascade est de{' '}
            <strong className="font-mono text-white">
              {first.theoreticalOperatorBalance?.toLocaleString('fr-FR')} Ar
            </strong>{' '}
            (Écart net de <strong className="font-mono text-amber-300">{first.balanceGap?.toLocaleString('fr-FR')} Ar</strong>).
          </p>
          <div className="text-[11px] text-amber-300/80 font-mono">
            Vérifiez si un SMS intermédiaire Airtel Money a été manqué ou si un ajustement de caisse s&apos;impose.
          </div>
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-200 p-1 rounded transition-colors shrink-0 cursor-pointer"
          aria-label="Fermer l'avertissement"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
