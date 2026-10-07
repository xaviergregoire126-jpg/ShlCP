import React from 'react';
import { DollarSign, Coins, Smartphone, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { AnchorBalances, Transaction } from '../types';

interface FinancialSummaryProps {
  anchor: AnchorBalances;
  transactions: Transaction[];
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  anchor,
  transactions,
}) => {
  // Soldes finaux courants (dernière transaction ou Point Zéro si 0 transaction)
  const currentCash = transactions.length > 0
    ? transactions[transactions.length - 1].cashBalanceAfter
    : anchor.cash;

  const currentMvola = transactions.length > 0
    ? transactions[transactions.length - 1].runningMvolaAfter
    : anchor.mvola;

  const currentAirtel = transactions.length > 0
    ? transactions[transactions.length - 1].runningAirtelAfter
    : anchor.airtel;

  const totalCurrentCapital = currentCash + currentMvola + currentAirtel;
  const initialTotalCapital = anchor.cash + anchor.mvola + anchor.airtel;
  const netEarnings = totalCurrentCapital - initialTotalCapital;

  const totalCommissions = transactions.reduce((acc, t) => acc + (t.commission || 0), 0);
  const totalHiddenFees = transactions.reduce((acc, t) => acc + (t.calculatedFee || 0), 0);

  const deltaCash = currentCash - anchor.cash;
  const deltaMvola = currentMvola - anchor.mvola;
  const deltaAirtel = currentAirtel - anchor.airtel;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Caisse Cash */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Caisse Physique (Cash)
          </span>
          <span className="text-[11px] font-mono text-slate-500">Espèces</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-mono font-bold text-white tabular-nums">
            {currentCash.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">Ar</span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-slate-500">Var :</span>
          <span className={`font-semibold ${deltaCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deltaCash >= 0 ? '+' : ''}{deltaCash.toLocaleString('fr-FR')} Ar
          </span>
        </div>
      </div>

      {/* 2. Flotte MVola */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Coins className="w-4 h-4 text-amber-400" />
            Flotte MVola (Telma)
          </span>
          <span className="text-[11px] font-mono text-slate-500">034 / 038</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-mono font-bold text-amber-300 tabular-nums">
            {currentMvola.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">Ar</span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-slate-500">Var :</span>
          <span className={`font-semibold ${deltaMvola >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deltaMvola >= 0 ? '+' : ''}{deltaMvola.toLocaleString('fr-FR')} Ar
          </span>
        </div>
      </div>

      {/* 3. Flotte Airtel */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Smartphone className="w-4 h-4 text-red-400" />
            Flotte Airtel Money
          </span>
          <span className="text-[11px] font-mono text-slate-500">033</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-mono font-bold text-red-300 tabular-nums">
            {currentAirtel.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">Ar</span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-slate-500">Var :</span>
          <span className={`font-semibold ${deltaAirtel >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deltaAirtel >= 0 ? '+' : ''}{deltaAirtel.toLocaleString('fr-FR')} Ar
          </span>
        </div>
      </div>

      {/* 4. Trésorerie Totale & Rentabilité */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Trésorerie Totale
          </span>
          <span className="text-[11px] font-mono text-blue-400">Global</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-mono font-bold text-white tabular-nums">
            {totalCurrentCapital.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">Ar</span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">
            Com: <strong className="text-blue-400">+{totalCommissions.toLocaleString('fr-FR')}</strong>
          </span>
          <span className="text-slate-400">
            Frais: <strong className="text-amber-400">+{totalHiddenFees.toLocaleString('fr-FR')}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
