import React from 'react';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { Transaction } from '../types';

interface MvolaDiscrepancyBannerProps {
  mismatchedTransactions: Transaction[];
  onDismiss?: () => void;
  onVerifyNetworkInversion?: (reference: string) => void;
  inversionNotification?: string | null;
}

export const MvolaDiscrepancyBanner: React.FC<MvolaDiscrepancyBannerProps> = ({
  mismatchedTransactions,
  onDismiss,
  onVerifyNetworkInversion,
  inversionNotification,
}) => {
  if (mismatchedTransactions.length === 0) return null;

  const first = mismatchedTransactions[0];
  const count = mismatchedTransactions.length;

  return (
    <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-4 shadow-lg flex items-start justify-between gap-3 text-amber-200 animate-in fade-in">
      <div className="flex items-start gap-3 flex-1">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs flex-1">
          <div className="font-bold text-sm text-amber-300 flex items-center gap-2">
            <span>Écart de solde détecté sur MVola (Transaction potentiellement oubliée)</span>
            {count > 1 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200">
                {count} anomalie{count > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-amber-200/90 leading-relaxed font-sans">
            La transaction <strong className="font-mono text-white">{first.id}</strong> ({first.timeStr}) annonce un solde SMS de{' '}
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
            Vérifiez si un SMS intermédiaire MVola a été manqué ou si un ajustement de caisse s&apos;impose.
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onVerifyNetworkInversion?.(first.reference || first.id)}
              className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
            >
              <span>🔄 Vérifier Inversion Réseau</span>
            </button>
          </div>

          {inversionNotification && (
            <div className="mt-2 p-2 bg-red-950/80 border border-red-500/60 rounded text-xs text-red-200 font-semibold flex items-center gap-1.5 animate-in fade-in">
              <span>⚠️ {inversionNotification}</span>
            </div>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-200 p-1 rounded transition-colors shrink-0"
          aria-label="Fermer l'avertissement"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
